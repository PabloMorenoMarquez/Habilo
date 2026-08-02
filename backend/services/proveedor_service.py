from uuid import UUID
from repositories.proveedor_repository import ProveedorRepository
from utils.stripe_client import get_stripe
from fastapi import HTTPException 

class ProveedorService:
    def __init__(self):
        self.proveedor_repository = ProveedorRepository()
        self.stripe = get_stripe()

    def create_or_update(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None):
        return self.proveedor_repository.crear_perfil(usuario_id, descripcion, radio_km_disponible, experiencia_años)

    def actualizar_perfil(self, perfil_id: UUID, **campos):
        return self.proveedor_repository.actualizar(perfil_id, **campos)

    def obtener_por_usuario(self, usuario_id:UUID):
        return self.proveedor_repository.get_by_usuario_id(usuario_id)

    def obtener_por_id(self, perfil_id:UUID):
        return self.proveedor_repository.get_by_id(perfil_id)

    def actualizar_documento(self, perfil_id:UUID, url_documento:str):
        return self.proveedor_repository.actualizar_documento(perfil_id, url_documento)
    
    def listar_pendientes(self):
        return self.proveedor_repository.listar_pendientes_verificacion()
    
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
    
    def iniciar_onboarding_stripe(self, usuario_id: UUID, email_usuario: str, frontend_return_url: str, frontend_refresh_url: str):
        from utils.stripe_client import get_stripe
        stripe = get_stripe()

        perfil = self.proveedor_repository.get_by_usuario_id(usuario_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")

        if not perfil.stripe_account_id:
            cuenta = stripe.Account.create(
                type="express",
                country="ES",
                email=email_usuario,
                capabilities={"transfers": {"requested": True}},
            )
            perfil = self.proveedor_repository.guardar_stripe_account_id(perfil.id, cuenta.id)

        enlace = stripe.AccountLink.create(
            account=perfil.stripe_account_id,
            refresh_url=frontend_refresh_url,
            return_url=frontend_return_url,
            type="account_onboarding",
        )
        return enlace.url

    def actualizar_estado_onboarding(self, stripe_account_id: str, cuenta_stripe: dict):
        completado = getattr(cuenta_stripe, "payouts_enabled", False)
        return self.proveedor_repository.marcar_onboarding_por_stripe_account_id(stripe_account_id, completado)
    
    def iniciar_verificacion_identidad(self, usuario_id:UUID):
        perfil = self.proveedor_repository.get_by_usuario_id(usuario_id)
        if not perfil:
            raise HTTPException(status_code=404, detail="No tienes perfil de proveedor")
        
        if perfil.stripe_identity_session_id:
            session = self.stripe.identity.VerificationSession.retrieve(perfil.stripe_identity_session_id)
            if session.status == "verified":
                raise HTTPException(status_code=400, detail="Ya estás verificado")
            else:
                return session.client_secret
        else:
            session = self.stripe.identity.VerificationSession.create(
                type="document",
                options={"document": {"require_matching_selfie": True}},
                metadata={"perfil_proveedor_id": str(perfil.id)}
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
            