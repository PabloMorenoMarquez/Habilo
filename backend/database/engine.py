from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()

engine = create_engine(
    os.getenv('DATABASE_URL'),
    echo=False,
    pool_timeout=10,      
    pool_recycle=1800,    
    connect_args={
        "options": "-c statement_timeout=15000"  
    },
)