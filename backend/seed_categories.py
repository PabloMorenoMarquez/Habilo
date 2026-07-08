from database.session import SessionLocal
from models.categoria import Categoria
import uuid

def seed_categories():
    db = SessionLocal()
    try:
        categorias_existentes = db.query(Categoria).count()
        
        if categorias_existentes == 0:
            
            categorias = [
                Categoria(id=str(uuid.uuid4()), nombre='fontaneria', icono='💧', descripcion='Instalación y reparación de tuberías, calentadores y grifería."')
            ]
            
            db.add_all(categorias)
            db.commit()
            print("Categorias creadas exitosamente")
        else:
            print("Las categorias ya existían en la base de datos")
    except Exception as e:
        db.rollback()
        print(f"Error al crear categorias: {e}")
    finally:
        db.close()
        
if __name__ == "__main__":
    seed_categories()