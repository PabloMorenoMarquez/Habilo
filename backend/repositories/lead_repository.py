from models.lead import Lead
from database.session import SessionLocal


class LeadRepository:

    def crear(self, datos: dict) -> Lead:
        session = SessionLocal()
        try:
            datos_lead = dict(datos)
            datos_lead.pop("website", None)
            lead = Lead(**datos_lead)
            session.add(lead)
            session.commit()
            session.refresh(lead)
            return lead
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
