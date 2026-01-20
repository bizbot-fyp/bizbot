from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import shutil
import os
from sqlalchemy import select
from typing import List 
import security
import models
import schemas
import deps
from database import get_db

router = APIRouter(prefix="/api/users", tags=["Users"])

# Admin Endpoint to Get All Users 
@router.get("/", response_model=List[schemas.UserResponse])
async def get_all_users(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = deps.RequireAdmin # Only Admins can access
):
    result = await db.execute(select(models.User))
    return result.scalars().all()

# Current User Profile
@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

# Update Profile Info (Name, Job, Company)
@router.put("/me/profile", response_model=schemas.UserResponse)
async def update_user_profile(
    profile_data: schemas.UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    current_user.username = profile_data.full_name
    current_user.job_title = profile_data.job_title
    current_user.company = profile_data.company
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

# Update Password
@router.put("/me/password")
async def update_password(
    password_data: schemas.UserPasswordUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # If user registered via Google, they might not have a password hash
    if not current_user.password_hash:
        raise HTTPException(status_code=400, detail="This account uses Google Login. Password cannot be changed.")

    if not security.verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    current_user.password_hash = security.get_password_hash(password_data.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully"}

# Update Notification Settings
@router.put("/me/notifications", response_model=schemas.UserResponse)
async def update_notifications(
    prefs: schemas.NotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Store as JSON in the database
    current_user.notification_preferences = prefs.dict()
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

# Upload Avatar
@router.post("/me/avatar", response_model=schemas.UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):

    os.makedirs("static/uploads", exist_ok=True)
    
    # Create unique filename: user_ID_avatar.ext
    file_extension = file.filename.split(".")[-1]
    filename = f"user_{current_user.id}_avatar.{file_extension}"
    file_location = f"static/uploads/{filename}"
    
    # Save file to disk
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update User DB Record
    # NOTE: In production, use an environment variable for the domain (e.g. os.getenv("BASE_URL"))
    current_user.profile_picture_url = f"http://localhost:8000/{file_location}"
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user