from jose import jwt, JWTError
from datetime import datetime, timedelta
from config import Config

def create_access_token(user_data):
    expiration = datetime.now() + timedelta(hours=Config.JWT_EXPIRATION_HOURS)

    payload = {
        'user_id': user_data['id'],
        'email': user_data['email'],
        'name': user_data['name'],
        'exp': expiration      
    }

    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITH)
    return token
