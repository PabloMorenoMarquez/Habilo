from uuid import UUID
from repositories.proveedor_repository import ProveedorRepository
from fastapi import HTTPException 

class ProveedorService:
    def __init__(self):
        self.proveedor_repository = ProveedorRepository()

    def create_or_update(self, usuario_id:UUID, descripcion:str, radio_km_disponible:int, experiencia_años:int=None):
        return self.proveedor_repository.crear_perfil(usuario_id, descripcion, radio_km_disponible, experiencia_años)

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
            