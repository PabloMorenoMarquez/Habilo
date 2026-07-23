from sqlalchemy import select, and_
from models.reporte import Reporte
from database.session import SessionLocal
from uuid import UUID
from fastapi import HTTPException

class ReporteRepository:
    
    def crear(self, autor_id: UUID, usuario_reportado_id: UUID, motivo: str,
              descripcion: str = None, solicitud_id: UUID = None): 
        session = SessionLocal()
        try:
            reporte = Reporte(autor_id = autor_id, usuario_reportado_id= usuario_reportado_id, motivo= motivo, descripcion= descripcion, solicitud_id= solicitud_id)
            session.add(reporte)
            session.commit()
            session.refresh(reporte)
            return reporte
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
            
    def listar(self, estado: str = None):
        from sqlalchemy.orm import aliased
        from models.usuario import Usuario

        AutorUsuario = aliased(Usuario)
        ReportadoUsuario = aliased(Usuario)

        session = SessionLocal()
        try:
            stmt = (
                select(
                    Reporte,
                    AutorUsuario.nombre.label("autor_nombre"),
                    AutorUsuario.email.label("autor_email"),
                    ReportadoUsuario.nombre.label("reportado_nombre"),
                    ReportadoUsuario.email.label("reportado_email"),
                )
                .join(AutorUsuario, Reporte.autor_id == AutorUsuario.id)
                .join(ReportadoUsuario, Reporte.usuario_reportado_id == ReportadoUsuario.id)
            )
            if estado:
                stmt = stmt.where(Reporte.estado == estado)
            stmt = stmt.order_by(Reporte.fecha.desc())

            rows = session.execute(stmt).all()
            resultado = []
            for row in rows:
                reporte = row[0]
                resultado.append({
                    "id": reporte.id,
                    "autor_id": reporte.autor_id,
                    "autor_nombre": row.autor_nombre,
                    "autor_email": row.autor_email,
                    "usuario_reportado_id": reporte.usuario_reportado_id,
                    "reportado_nombre": row.reportado_nombre,
                    "reportado_email": row.reportado_email,
                    "motivo": reporte.motivo,
                    "descripcion": reporte.descripcion,
                    "solicitud_id": reporte.solicitud_id,
                    "estado": reporte.estado,
                    "fecha": reporte.fecha,
                })
            return resultado
        finally:
            session.close()

    def obtener_detalle(self, reporte_id: UUID):
        from sqlalchemy.orm import aliased
        from models.usuario import Usuario

        AutorUsuario = aliased(Usuario)
        ReportadoUsuario = aliased(Usuario)

        session = SessionLocal()
        try:
            stmt = (
                select(
                    Reporte,
                    AutorUsuario.nombre.label("autor_nombre"),
                    AutorUsuario.email.label("autor_email"),
                    ReportadoUsuario.nombre.label("reportado_nombre"),
                    ReportadoUsuario.email.label("reportado_email"),
                )
                .join(AutorUsuario, Reporte.autor_id == AutorUsuario.id)
                .join(ReportadoUsuario, Reporte.usuario_reportado_id == ReportadoUsuario.id)
                .where(Reporte.id == reporte_id)
            )
            row = session.execute(stmt).first()
            if not row:
                return None
            reporte = row[0]
            return {
                "id": reporte.id,
                "autor_id": reporte.autor_id,
                "autor_nombre": row.autor_nombre,
                "autor_email": row.autor_email,
                "usuario_reportado_id": reporte.usuario_reportado_id,
                "reportado_nombre": row.reportado_nombre,
                "reportado_email": row.reportado_email,
                "motivo": reporte.motivo,
                "descripcion": reporte.descripcion,
                "solicitud_id": reporte.solicitud_id,
                "estado": reporte.estado,
                "fecha": reporte.fecha,
            }
        finally:
            session.close()

    def actualizar_estado(self, reporte_id: UUID, estado: str):
        session = SessionLocal()
        try:
            stmt = select(Reporte).where(Reporte.id == reporte_id)
            reporte = session.scalar(stmt)
            if not reporte:
                return None
            reporte.estado = estado
            session.commit()
            session.refresh(reporte)
            return reporte
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()