from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

SECRET_KEY = "abc123" 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
  
    if not plain_password:
        return False
    truncated = plain_password.encode("utf-8")[:72].decode("utf-8", "ignore")
    return pwd_context.verify(truncated, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt, truncating to 72 bytes safely.
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    truncated = password.encode("utf-8")[:72].decode("utf-8", "ignore")
    
    return pwd_context.hash(truncated)


def create_access_token(data: dict) -> str:
  
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
