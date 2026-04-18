"""
File: workflows.py
Author: Hiba Noor

Purpose:
    Provides API endpoints for managing workflows in the BizBot system.
    This module handles creation, retrieval, updating, and deletion of workflows,
    along with status management.

    Features:
    - Create new workflows with triggers and actions
    - Retrieve workflows (all, by user, or single workflow)
    - Update workflow details including name, triggers, actions, and status
    - Delete workflows from the system
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Any, Optional, Dict
from datetime import datetime

import models
from database import get_db  # Import the correct dependency

router = APIRouter(prefix="/workflows", tags=["Workflows"])


class WorkflowCreate(BaseModel):
    business_id: str
    name: str
    triggers: List[Any] = []
    actions: Dict[str, Any] = {"nodes": [], "connections": []}


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    triggers: Optional[List[Any]] = None
    actions: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class WorkflowResponse(BaseModel):
    id: int
    business_id: str
    name: str
    status: str
    triggers: List[Any]
    actions: Dict[str, Any]
    created_at: Optional[datetime] = None
    

# =========================
# GET WORKFLOWS BY USER ID
# =========================
@router.get("/user/{user_id}")
async def get_user_workflows(
    user_id: str,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db, not SessionLocal
):
    """Get all workflows for a specific user."""
    result = await db.execute(
        select(models.Workflow).where(models.Workflow.business_id == user_id)
    )
    workflows = result.scalars().all()
    
    return [
        WorkflowResponse(
            id=wf.id,
            business_id=wf.business_id,
            name=wf.name,
            status=wf.status,
            triggers=wf.triggers or [],
            actions=wf.actions or {"nodes": [], "connections": []},
            created_at=wf.created_at,
            
        )
        for wf in workflows
    ]


# =========================
# GET ALL WORKFLOWS
# =========================
@router.get("/")
async def get_all_workflows(
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    result = await db.execute(select(models.Workflow))
    workflows = result.scalars().all()
    
    return [
        WorkflowResponse(
            id=wf.id,
            business_id=wf.business_id,
            name=wf.name,
            status=wf.status,
            triggers=wf.triggers or [],
            actions=wf.actions or {"nodes": [], "connections": []},
            created_at=wf.created_at,
        
        )
        for wf in workflows
    ]


# =========================
# GET SINGLE WORKFLOW
# =========================
@router.get("/{workflow_id}")
async def get_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    result = await db.execute(
        select(models.Workflow).where(models.Workflow.id == workflow_id)
    )
    workflow = result.scalars().first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return WorkflowResponse(
        id=workflow.id,
        business_id=workflow.business_id,
        name=workflow.name,
        status=workflow.status,
        triggers=workflow.triggers or [],
        actions=workflow.actions or {"nodes": [], "connections": []},
        created_at=workflow.created_at,
       
    )


# =========================
# CREATE WORKFLOW
# =========================
@router.post("/")
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    """Create workflow. business_id should be the user_id."""
    # Ensure actions has the proper structure
    actions = data.actions
    if not actions:
        actions = {"nodes": [], "connections": []}
    elif "nodes" not in actions:
        actions = {"nodes": [], "connections": [], "canvas": actions}
    
    wf = models.Workflow(
        name=data.name,
        business_id=data.business_id,
        triggers=data.triggers or [],
        actions=actions,
        status="active",
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    
    return WorkflowResponse(
        id=wf.id,
        business_id=wf.business_id,
        name=wf.name,
        status=wf.status,
        triggers=wf.triggers or [],
        actions=wf.actions,
        created_at=wf.created_at,
      
    )


# =========================
# UPDATE WORKFLOW
# =========================
@router.put("/{workflow_id}")
async def update_workflow(
    workflow_id: int,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    result = await db.execute(
        select(models.Workflow).where(models.Workflow.id == workflow_id)
    )
    wf = result.scalars().first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if data.name is not None:
        wf.name = data.name
    if data.triggers is not None:
        wf.triggers = data.triggers
    if data.actions is not None:
        actions = data.actions
        if "nodes" not in actions:
            actions = {"nodes": [], "connections": [], "canvas": actions}
        wf.actions = actions
    if data.status is not None:
        wf.status = data.status
    
   

    await db.commit()
    await db.refresh(wf)
    
    return WorkflowResponse(
        id=wf.id,
        business_id=wf.business_id,
        name=wf.name,
        status=wf.status,
        triggers=wf.triggers or [],
        actions=wf.actions,
        created_at=wf.created_at,
      
    )


# =========================
# DELETE WORKFLOW
# =========================
@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: int,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    result = await db.execute(
        select(models.Workflow).where(models.Workflow.id == workflow_id)
    )
    wf = result.scalars().first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    await db.delete(wf)
    await db.commit()
    return {"detail": "Workflow deleted successfully"}


# =========================
# PARTIAL UPDATE (PATCH)
# =========================
@router.patch("/{workflow_id}/status")
async def update_workflow_status(
    workflow_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),  # FIXED: Use get_db
):
    """Quickly toggle workflow status."""
    if status not in ["active", "paused", "error"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.execute(
        select(models.Workflow).where(models.Workflow.id == workflow_id)
    )
    wf = result.scalars().first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    wf.status = status
    await db.commit()
    await db.refresh(wf)
    
    return {"id": wf.id, "status": wf.status}