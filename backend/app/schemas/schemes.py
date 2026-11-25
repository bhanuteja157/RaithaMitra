# backend/app/schemas/schemes.py
from pydantic import BaseModel, Field
from typing import List, Optional

class GovernmentScheme(BaseModel):
    id: str
    name: str
    name_kannada: Optional[str] = None
    name_hindi: Optional[str] = None
    name_telugu: Optional[str] = None
    nodal_agency: str
    objective: str
    objective_localized: Optional[str] = None
    financial_benefit: str
    financial_benefit_localized: Optional[str] = None
    lang: Optional[str] = "en"
    eligibility_criteria: List[str]
    required_documents: List[str]
    application_portal: str
    category: str
    applicable_states: List[str]
