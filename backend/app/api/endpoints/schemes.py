# backend/app/api/endpoints/schemes.py
from fastapi import APIRouter, Query
from typing import List, Optional
from backend.app.schemas.schemes import GovernmentScheme
from backend.app.data.schemes import INDIAN_GOVERNMENT_SCHEMES

router = APIRouter()

@router.get("/schemes", response_model=List[GovernmentScheme], summary="Browse Indian agricultural government schemes")
async def list_schemes(
    category: Optional[str] = Query(None, description="Filter by category"),
    state: Optional[str] = Query(None, description="Filter by applicable state")
):
    schemes = INDIAN_GOVERNMENT_SCHEMES
    if category and category.lower() != "all":
        schemes = [s for s in schemes if category.lower() in s.category.lower()]
    if state and state.lower() != "all states":
        schemes = [s for s in schemes if "All States" in s.applicable_states or state.lower() in [st.lower() for st in s.applicable_states]]
    return schemes
