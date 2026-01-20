from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # Used as Full Name
    email = Column(String, unique=True, index=True)
    password_hash = Column(String) 
    
    roles = Column(JSON, default=["Business User"]) 
    
    is_active = Column(Boolean, default=True)
    google_sub = Column(String, unique=True, nullable=True)
    profile_picture_url = Column(String, nullable=True)
    
    job_title = Column(String, nullable=True)
    company = Column(String, nullable=True)
    notification_preferences = Column(JSON, default={
        "emailNotifications": True,
        "pushNotifications": True,
        "weeklyDigest": False,
        "workflowAlerts": True,
        "securityAlerts": True,
        "marketingEmails": False
    })
  

    created_at = Column(DateTime, default=utcnow)
    
    whatsapp_conversations = relationship(
        "WhatsAppConversation", 
        back_populates="user",
        foreign_keys="[WhatsAppConversation.user_id]"
    )
    assigned_conversations = relationship(
        "WhatsAppConversation", 
        back_populates="assigned_agent",
        foreign_keys="[WhatsAppConversation.assigned_agent_id]"
    )

class WhatsAppConversation(Base):
    __tablename__ = "whatsapp_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    business_id = Column(String, index=True)
    customer_phone = Column(String)
    status = Column(String, default="open") 
    assigned_agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)


    user = relationship(
        "User", 
        back_populates="whatsapp_conversations",
        foreign_keys=[user_id]
    )
    assigned_agent = relationship(
        "User", 
        back_populates="assigned_conversations",
        foreign_keys=[assigned_agent_id]
    )
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("whatsapp_conversations.id"))
    sender_type = Column(String) 
    content = Column(String)
    timestamp = Column(DateTime, default=utcnow)
    
    conversation = relationship("WhatsAppConversation", back_populates="messages")

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String, index=True)
    name = Column(String)
    status = Column(String, default="active")
    triggers = Column(JSON) 
    actions = Column(JSON) 
    created_at = Column(DateTime, default=utcnow)



class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String)
    mobile_number = Column(String, nullable=True)
    whatsapp_number = Column(String, nullable=True)
    company = Column(String, nullable=True)
    subject = Column(String)
    message = Column(String)
    created_at = Column(DateTime, default=utcnow)