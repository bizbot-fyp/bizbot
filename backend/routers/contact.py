from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import models
import schemas
import deps 
from database import get_db

router = APIRouter(prefix="/api/contact", tags=["Contact"])

@router.post("/", response_model=schemas.ContactResponse)
async def submit_contact_form(
    contact_data: schemas.ContactCreate,
    db: AsyncSession = Depends(get_db)
):
    new_message = models.ContactMessage(
        name=contact_data.name,
        email=contact_data.email,
        mobile_number=contact_data.mobile_number,
        whatsapp_number=contact_data.whatsapp_number,
        company=contact_data.company,
        subject=contact_data.subject,
        message=contact_data.message
    )
    
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    return new_message

@router.get("/", response_model=List[schemas.ContactResponse])
async def get_all_contacts(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = deps.RequireAdmin 
):
    result = await db.execute(select(models.ContactMessage).order_by(models.ContactMessage.created_at.desc()))
    return result.scalars().all()