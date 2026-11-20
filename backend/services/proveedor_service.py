from utils.avatar import avatar_publico
from uuid import UUID
from repositories.proveedor_repository import ProveedorRepository
from repositories.servicio_repository import ServicioRepository
from repositories.valoracion_repository import ValoracionRepository
from utils.stripe_client import get_stripe
from fastapi import HTTPException 
from utils.storage import generar_signed_download_url
from cachetools import TTLCache
from starlette.concurrency import run_in_threadpool
from utils.paginacion import paginar
from repositories.referido_repository import ReferidoRepository

_perfil_publico_cache = TTLCache(maxsize=200, ttl=60)
class ProveedorService:
    def __init__(self):
        self.proveedor_repository = ProveedorRepository()
        self.servicio_repository = ServicioRepository()
        self.valoracion_repository = ValoracionRepository()
        self.stripe = get_stripe()
        self.referido_repository = ReferidoRepository()

    def create_or_update(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None, codigo_referido:str=None,
                         ciudad:str=None, zona:str=None, materias:list[str]=[], niveles:list[str]=[],
                         perfil_publico:bool=False, consentimiento_marketing:bool=False):
        perfil = self.proveedor_repository.crear_perfil(
            usuario_id, descripcion, radio_km_disponible, experiencia_años,
            ciudad=ciudad, zona=zona, materias=materias, niveles=niveles,
            perfil_publico=perfil_publico, consentimiento_marketing=consentimiento_marketing,
        )

        if codigo_referido:
            referidor = self.proveedor_repository.get_by_codigo_referido(codigo_referido)
            # Nunca auto-referido, y el código debe existir de verdad
            if referidor and str(referidor.usuario_id) != str(usuario_id):
                try:
                    self.referido_repository.crear(referidor.id, perfil.id)
                except Exception:
                    pass 

        return perfil

    def actualizar_perfil(self, perfil_id: UUID, **campos):
        perfil = self.proveedor_repository.actualizar(perfil_id, **campos)
        _perfil_publico_cache.pop(str(perfil_id), None)
        return perfil

    def obtener_por_usuario(self, usuario_id:UUID):
        return self.proveedor_repository.get_by_usuario_id(usuario_id)

    def obtener_por_id(self, perfil_id:UUID):
        clave = str(perfil_id)
        if clave in _perfil_publico_cache:
            return _perfil_publico_cache[clave]

        perfil = self.proveedor_repository.get_by_id(perfil_id)
        if perfil:
            _perfil_publico_cache[clave] = perfil
        return perfil

    def obtener_perfil_publico(self, perfil_id: UUID) -> dict | None:
        datos = self.proveedor_repository.get_publico(perfil_id)
        if not datos:
            return None

        perfil = datos["perfil"]
        es_publico = perfil.perfil_publico is True

        if es_publico:
            servicios = self.servicio_repository.listar_por_proveedor_publico(perfil.id)
            resenas = self._listar_resenas_publicas(perfil.usuario_id)
        else:
            servicios = []
            resenas = []

        return {
            "id": perfil.id,
            "nombre_publico": datos.get("usuario_nombre") if es_publico else "Profesional de Habilo",
            "avatar_publico": avatar_publico(datos.get("usuario_avatar"), perfil.usuario_id) if es_publico else None,
            "descripcion": perfil.descripcion if es_publico else None,
            "experiencia_años": perfil.experiencia_años,
            "radio_km_disponible": perfil.radio_km_disponible,
            "ciudad": perfil.ciudad if es_publico else None,
            "zona": perfil.zona if es_publico else None,
            "materias": perfil.materias or [],
            "niveles": perfil.niveles or [],
            "valoracion_media": perfil.valoracion_media,
            "num_valoraciones": perfil.num_valoraciones or 0,
            "verificado": perfil.verificado,
            "dias_disponibles": perfil.dias_disponibles,
            "hora_inicio": perfil.hora_inicio,
            "hora_fin": perfil.hora_fin,
            "perfil_publico": es_publico,
            "servicios": servicios,
            "resenas": resenas,
        }

    def listar_para_sitemap(self) -> list[dict]:
        return self.proveedor_repository.listar_para_sitemap()

    def _listar_resenas_publicas(self, usuario_id: UUID) -> list[dict]:
        resenas = self.valoracion_repository.listar_publicas_por_destinatario(usuario_id)
        return [
            {
                "puntuacion": resena["puntuacion"],
                "comentario": resena["comentario"],
                "fecha": resena["fecha"],
                "autor_nombre": self._primer_nombre(resena["autor_nombre"]),
            }
            for resena in resenas
        ]

    @staticmethod
    def _primer_nombre(nombre: str):
        partes = (nombre or "").strip().split()
        return partes[0] if partes else ""

    def actualizar_documento(self, perfil_id:UUID, url_documento:str):
        return self.proveedor_repository.actualizar_documento(perfil_id, url_documento)
    
    def listar_pendientes(self, limit: int = 20, offset: int = 0):
        pendientes = self.proveedor_repository.listar_pendientes_verificacion(limit=limit, offset=offset)
        pendientes, has_more = paginar(pendientes, limit)
        return pendientes, has_more
    
    def verificar(self, perfil_id:UUID):
        perfil = self.proveedor_repository.verificar(perfil_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
        return perfil
    
    def rechazar(self, perfil_id:UUID, motivo:str):
        perfil = self.proveedor_repository.rechazar(perfil_id, motivo)
        if not perfil:
            raise HTTPException(status_code=404, detail="Perfil no encontrado")
        return perfil
    
    async def iniciar_onboarding_stripe(self, usuario_id: UUID, email_usuario: str, frontend_return_url: str, frontend_refresh_url: str):
        from utils.stripe_client import get_stripe
        stripe = get_stripe()

        perfil = self.proveedor_repository.get_by_usuario_id(usuario_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")

        if not perfil.stripe_account_id:
            cuenta = await run_in_threadpool(
                self.stripe.Account.create,
                type="express",
                country="ES",
                email=email_usuario,
                capabilities={"transfers": {"requested": True}},
            )
            perfil = self.proveedor_repository.guardar_stripe_account_id(perfil.id, cuenta.id)

        enlace = await run_in_threadpool(
            self.stripe.AccountLink.create,
            account=perfil.stripe_account_id,
            refresh_url=frontend_refresh_url,
            return_url=frontend_return_url,
            type="account_onboarding",
        )
        return enlace.url

    def actualizar_estado_onboarding(self, stripe_account_id: str, cuenta_stripe: dict):
        completado = getattr(cuenta_stripe, "payouts_enabled", False)
        return self.proveedor_repository.marcar_onboarding_por_stripe_account_id(stripe_account_id, completado)
    
    async def iniciar_verificacion_identidad(self, usuario_id:UUID):
        perfil = self.proveedor_repository.get_by_usuario_id(usuario_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")
        
        if perfil.stripe_identity_session_id:
            session = await run_in_threadpool(
                self.stripe.identity.VerificationSession.retrieve,
                perfil.stripe_identity_session_id,
            )
            if session.status == "verified":
                raise HTTPException(status_code=400, detail="Ya estás verificado")
            else:
                return session.client_secret
        else:
            session = await run_in_threadpool(
                self.stripe.identity.VerificationSession.create,
                type="document",
                options={"document": {"require_matching_selfie": True}},
                metadata={"perfil_proveedor_id": str(perfil.id)},
            )
            self.proveedor_repository.guardar_stripe_identity_session_id(perfil.id, session.id)
            return session.client_secret
        
    def procesar_verificacion_identidad(self, verification_session: dict):
        session_id = getattr(verification_session, "id", None)
        estado = getattr(verification_session, "status", None)
        verificado = estado == "verified"
        motivo_rechazo = None
        if not verificado:
            last_error = getattr(verification_session, "last_error", None)
            motivo_rechazo = getattr(last_error, "reason", "Verificación no completada") if last_error else "Verificación no completada"
        return self.proveedor_repository.resolver_verificacion_identidad(session_id, verificado, motivo_rechazo)
    
    async def _generar_url_desde_perfil(self, perfil):
        if not perfil:
            raise HTTPException(status_code=404, detail="Perfil de proveedor no encontrado")
        path = perfil.url_documento
        if not path:
            raise HTTPException(status_code=404, detail="No hay ningún documento subido")
        result = await generar_signed_download_url("documentos", path)
        return result["signed_url"]

    async def obtener_url_documento(self, perfil_id: UUID):
        return await self._generar_url_desde_perfil(self.proveedor_repository.get_by_id(perfil_id))

    async def obtener_url_documento_por_usuario(self, usuario_id: UUID):
        return await self._generar_url_desde_perfil(self.obtener_por_usuario(usuario_id))