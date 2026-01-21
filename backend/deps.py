from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from schemas import TokenData
from security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# =========================
# CURRENT USER DEPENDENCY
# =========================
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        roles = payload.get("roles", [])

        if email is None:
            raise credentials_exception

        token_data = TokenData(email=email, roles=roles)

    except JWTError as error:
        raise credentials_exception from error

    result = await db.execute(select(User).where(User.email == token_data.email))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception

    return user


# =========================
# ROLE-BASED ACCESS CONTROL
# =========================
def require_role(required_role: str):
  

    async def role_checker(current_user: User = Depends(get_current_user)):
        if required_role not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires {required_role} privileges",
            )
        return current_user

    return Depends(role_checker)  


# =========================
# PRE-DEFINED ROLE DEPENDENCIES
# =========================
RequireAdmin = require_role("Administrator")   
RequireDeveloper = require_role("Developer")
