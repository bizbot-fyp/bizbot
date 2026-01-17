from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.oauth2 import id_token
from google.auth.transport import requests
import security
import models
import schemas
from database import get_db
from fastapi.security import OAuth2PasswordRequestForm

router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = "837661787288-f8q3h98e5viu62h6v14ot4lel8m0tc8l.apps.googleusercontent.com" # From Google Cloud Console

@router.post("/signup", response_model=schemas.UserResponse)
async def signup(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_pw = security.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        username=user.username,
        password_hash=hashed_pw,
        roles=["Business User"] # Default role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalars().first()

    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate Token
    access_token = security.create_access_token(
        data={"sub": user.email, "roles": user.roles}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=schemas.Token)
async def google_login(request: schemas.GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Verify the token with Google
        id_info = id_token.verify_oauth2_token(
            request.id_token, requests.Request(), GOOGLE_CLIENT_ID
        )
        
        email = id_info['email']
        google_sub = id_info['sub']
        name = id_info.get('name', email.split('@')[0])
        picture = id_info.get('picture')

        # 2. Check if user exists in DB
        result = await db.execute(select(models.User).where(models.User.email == email))
        user = result.scalars().first()

        # 3. If not, register them automatically
        if not user:
            user = models.User(
                email=email,
                username=name,
                google_sub=google_sub,
                profile_picture_url=picture,
                roles=["Business User"], # Default role
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # 4. Generate internal JWT
        access_token = security.create_access_token(
            data={"sub": user.email, "roles": user.roles}
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google Token")