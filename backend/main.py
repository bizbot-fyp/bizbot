from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from database import engine, Base, SessionLocal
from routers import auth, users, contact
import models
import security
import deps 
from sqlalchemy import select
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="BizBot Backend")

# 1. Create uploads folder if not exists
os.makedirs("static/uploads", exist_ok=True)

# 2. Mount Static Files 
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router) 
app.include_router(contact.router) 

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with SessionLocal() as db:
        result = await db.execute(select(models.User).where(models.User.email == "admin@bizbot.com"))
        admin = result.scalars().first()
        
        if not admin:
            print("Creating Static Admin User...")
            hashed_pw = security.get_password_hash("admin123")
            new_admin = models.User(
                email="admin@bizbot.com",
                username="SuperAdmin",
                password_hash=hashed_pw,
                roles=["Administrator", "Developer", "Business User"],
                is_active=True
            )
            db.add(new_admin)
            await db.commit()
            print("Admin User Created: admin@bizbot.com / admin123")

# --- Routes ---

@app.get("/api/dashboard")
async def get_dashboard_data(user: models.User = Depends(deps.get_current_user)):
    return {"message": f"Welcome back, {user.username}", "role": user.roles}


@app.get("/api/admin/system-health")
async def get_system_health(user: models.User = deps.RequireAdmin):
    return {"status": "Healthy", "cpu": "12%", "memory": "40%"}