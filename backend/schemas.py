from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    roles: List[str] = []

class GoogleLoginRequest(BaseModel):
    id_token: str

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserProfileUpdate(BaseModel):
    full_name: str
    job_title: Optional[str] = None
    company: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    emailNotifications: bool
    pushNotifications: bool
    weeklyDigest: bool
    workflowAlerts: bool
    securityAlerts: bool
    marketingEmails: bool

class UserResponse(UserBase):
    id: int
    roles: List[str]
    is_active: bool
    profile_picture_url: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
        
class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    mobile_number: Optional[str] = None
    whatsapp_number: Optional[str] = None
    company: Optional[str] = None
    subject: str
    message: str

class ContactResponse(ContactCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True