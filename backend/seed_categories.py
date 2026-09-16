from database.session import SessionLocal
from models.categoria import Categoria
import uuid


def seed_categories():
    db = SessionLocal()
    try:
        categorias_existentes = db.query(Categoria).count()

        if categorias_existentes == 0:

            categorias = [
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='fontaneria',
                    icono='💧',
                    descripcion='Instalación y reparación de tuberías, calentadores y grifería.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='electricidad',
                    icono='⚡',
                    descripcion='Instalaciones eléctricas, reparaciones, enchufes, iluminación y cuadros eléctricos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='albanileria',
                    icono='🧱',
                    descripcion='Obras, reformas, reparación de paredes, suelos, techos y estructuras.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='pintura',
                    icono='🎨',
                    descripcion='Pintura de interiores y exteriores, paredes, techos y fachadas.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='carpinteria',
                    icono='🪚',
                    descripcion='Fabricación, reparación e instalación de muebles, puertas y elementos de madera.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='cerrajeria',
                    icono='🔐',
                    descripcion='Apertura, reparación e instalación de cerraduras, puertas y sistemas de seguridad.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='climatizacion',
                    icono='❄️',
                    descripcion='Instalación, reparación y mantenimiento de aire acondicionado, calefacción y climatización.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='calefaccion',
                    icono='🔥',
                    descripcion='Instalación, reparación y mantenimiento de calderas, radiadores y sistemas de calefacción.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='limpieza',
                    icono='🧹',
                    descripcion='Limpieza de viviendas, oficinas, locales, comunidades y otros espacios.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='jardineria',
                    icono='🌱',
                    descripcion='Mantenimiento de jardines, poda, césped, plantas y espacios exteriores.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='mudanzas',
                    icono='📦',
                    descripcion='Mudanzas, transporte de muebles, embalaje y traslado de objetos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='montaje_de_muebles',
                    icono='🔧',
                    descripcion='Montaje y desmontaje de muebles, estanterías, armarios y otros elementos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='reformas',
                    icono='🏠',
                    descripcion='Reformas integrales o parciales de viviendas, locales, cocinas y baños.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='cristaleria',
                    icono='🪟',
                    descripcion='Instalación y reparación de cristales, ventanas, espejos y cerramientos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='persianas',
                    icono='🪟',
                    descripcion='Instalación y reparación de persianas, estores y sistemas de protección solar.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='tejados_y_cubiertas',
                    icono='🏠',
                    descripcion='Reparación, mantenimiento e impermeabilización de tejados y cubiertas.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='impermeabilizacion',
                    icono='🛡️',
                    descripcion='Impermeabilización de terrazas, tejados, sótanos, paredes y otras superficies.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='soldadura',
                    icono='🔥',
                    descripcion='Trabajos de soldadura, reparación y fabricación de estructuras metálicas.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='ceramica_y_azulejos',
                    icono='🔲',
                    descripcion='Colocación y reparación de azulejos, baldosas y revestimientos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='parquet_y_suelos',
                    icono='🪵',
                    descripcion='Instalación, reparación y mantenimiento de parquet, tarima y otros tipos de suelo.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='yeseria_y_pladur',
                    icono='🏗️',
                    descripcion='Instalación y reparación de pladur, falsos techos, tabiques y trabajos de yeso.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='antenas_y_telecomunicaciones',
                    icono='📡',
                    descripcion='Instalación y reparación de antenas, televisión, cableado y redes.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='electrodomesticos',
                    icono='🔌',
                    descripcion='Instalación, reparación y mantenimiento de electrodomésticos.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='reparacion_de_muebles',
                    icono='🛠️',
                    descripcion='Reparación, restauración y mantenimiento de muebles.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='tapiceria',
                    icono='🛋️',
                    descripcion='Tapizado y reparación de sofás, sillas, sillones y otros muebles.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='control_de_plagas',
                    icono='🐜',
                    descripcion='Control y eliminación de insectos, roedores y otras plagas.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='piscinas',
                    icono='🏊',
                    descripcion='Mantenimiento, limpieza y reparación de piscinas y sistemas de filtración.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='automatismos',
                    icono='⚙️',
                    descripcion='Instalación y reparación de puertas automáticas, persianas y sistemas de automatización.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='energia_solar',
                    icono='☀️',
                    descripcion='Instalación y mantenimiento de placas solares y sistemas de energía solar.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='construccion',
                    icono='👷',
                    descripcion='Trabajos de construcción, obra nueva y trabajos generales de edificación.'
                ),
                Categoria(
                    id=str(uuid.uuid4()),
                    nombre='otros',
                    icono='🔨',
                    descripcion='Otros servicios y trabajos profesionales que no encajan en las categorías disponibles.'
                ),
            ]

            db.add_all(categorias)
            db.commit()
            print(f"{len(categorias)} categorias creadas exitosamente")
        else:
            print("Las categorias ya existían en la base de datos")

    except Exception as e:
        db.rollback()
        print(f"Error al crear categorias: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()