from sqlalchemy import select
from models.solicitud import Solicitud
from models.servicio import Servicio
from database.session import SessionLocal
from uuid import UUID


class SolicitudRepository:
    def __init__(self):
        self.session = SessionLocal()

    def crear(self, servicio_id:UUID, cliente_id:UUID):
        session = SessionLocal()
        try:
            solicitud = Solicitud(servicio_id=servicio_id, cliente_id=cliente_id)
            session.add(solicitud)
            session.commit()
            session.refresh(solicitud)
            return solicitud
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    def get_by_id(self, solicitud_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.id == solicitud_id)
            return session.scalar(stmt)
        finally:
            session.close()

    def listar_por_cliente(self, cliente_id:UUID):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.cliente_id == cliente_id)
            return list(session.scalars(stmt))
        finally:
            session.close()

    def listar_por_proveedor(self, proveedor_id:UUID):
        session = SessionLocal()
        try:
            stmt = (
                select(Solicitud)
                .join(Servicio, Solicitud.servicio_id == Servicio.id)
                .where(Servicio.proveedor_id == proveedor_id)
            )
            return list(session.scalars(stmt))
        finally:
            session.close()

    def actualizar_estado(self, solicitud_id:UUID, estado:str):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(Solicitud.id == solicitud_id)
            solicitud = session.scalar(stmt)
            if not solicitud:
                return None
            solicitud.estado = estado
            session.commit()
            session.refresh(solicitud)
            return solicitud
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def buscar_activa_de_cliente(self, servicio_id: UUID, cliente_id: UUID):
        session = SessionLocal()
        try:
            stmt = select(Solicitud).where(
                Solicitud.servicio_id == servicio_id,
                Solicitud.cliente_id == cliente_id,
                Solicitud.estado.in_(["pendiente", "aceptada"]),
            )
            return session.scalar(stmt)
        finally:
            session.close()
            
    def listar_conversaciones_base(self, usuario_id: UUID):
        from sqlalchemy.orm import aliased
        from models.servicio import Servicio
        from models.perfil_proveedor import Perfil_Proveedor
        from models.usuario import Usuario

        UsuarioCliente = aliased(Usuario)
        UsuarioProveedor = aliased(Usuario)

        session = SessionLocal()
        try:
            stmt = (
                select(
                    Solicitud,
                    Servicio.titulo.label("servicio_titulo"),
                    Solicitud.cliente_id.label("cliente_id"),
                    UsuarioCliente.nombre.label("cliente_nombre"),
                    UsuarioCliente.foto_url.label("cliente_avatar"),
                    Perfil_Proveedor.usuario_id.label("proveedor_usuario_id"),
                    UsuarioProveedor.nombre.label("proveedor_nombre"),
                    UsuarioProveedor.foto_url.label("proveedor_avatar"),
                )
                .join(Servicio, Solicitud.servicio_id == Servicio.id)
                .join(Perfil_Proveedor, Servicio.proveedor_id == Perfil_Proveedor.id)
                .join(UsuarioCliente, Solicitud.cliente_id == UsuarioCliente.id)
                .join(UsuarioProveedor, Perfil_Proveedor.usuario_id == UsuarioProveedor.id)
                .where(
                    (Solicitud.cliente_id == usuario_id) | (Perfil_Proveedor.usuario_id == usuario_id)
                )
                .order_by(Solicitud.fecha.desc())
            )
            rows = session.execute(stmt).all()

            resultado = []
            for row in rows:
                solicitud = row[0]
                soy_cliente = str(row.cliente_id) == str(usuario_id)
                resultado.append({
                    "id": solicitud.id,
                    "servicio_id": solicitud.servicio_id,
                    "servicio_titulo": row.servicio_titulo,
                    "estado": solicitud.estado,
                    "fecha": solicitud.fecha,
                    "cliente_id": solicitud.cliente_id,
                    "otro_usuario_id": row.proveedor_usuario_id if soy_cliente else row.cliente_id,
                    "otro_usuario_nombre": row.proveedor_nombre if soy_cliente else row.cliente_nombre,
                    "otro_usuario_avatar": row.proveedor_avatar if soy_cliente else row.cliente_avatar,
                })
            return resultado
        finally:
            session.close()
