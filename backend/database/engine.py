from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

engine = create_engine(
    os.getenv('DATABASE_URL'),
    echo=False,
    pool_timeout=10,      
    pool_recycle=1800,    
    pool_pre_ping=True,
    # Los parámetros SQL (emails, teléfonos...) no salen en el texto de los
    # errores, que acaba en los logs y en Sentry.
    hide_parameters=True,
    connect_args={
        "options": "-c statement_timeout=15000"  
    },
)