from fastapi import FastAPI
from database.engine import engine

app = FastAPI()

try:
    engine.connect()
    print("Conexion exitosa")
except Exception as e:
    print("Error", e)
    
@app.get("/")
def read_root():
    return {"Hello": "World"}
