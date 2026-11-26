"""Authenticated FastAPI router for AD-27 Post-Harvest Intelligence."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query

from backend.app.features.finance.service import resolve_authenticated_farmer
from backend.app.features.post_harvest.economic_optimizer import evaluate_sell_vs_store
from backend.app.features.post_harvest.inventory import (
    create_inventory_lot,
    get_lot_history,
    list_inventory_lots,
    record_lot_event,
    update_lot_conditions,
)
from backend.app.features.post_harvest.schemas import (
    EconomicCompareRequest,
    HarvestRecordCreate,
    HarvestRecordUpdate,
    InventoryConditionsUpdate,
    InventoryEventRequest,
    InventoryLotCreate,
    LotListingCreateRequest,
    LotTransportPrepRequest,
    ManualFacilityCreate,
    ShelfLifeRequest,
    SpoilageRiskRequest,
    StorageRecordCreate,
)
from backend.app.features.post_harvest.service import (
    create_bidding_listing_from_lot,
    create_harvest_record,
    create_manual_facility,
    create_storage_record,
    find_facilities,
    get_post_harvest_summary,
    list_harvest_records,
    list_storage_records,
    prepare_transport_from_lot,
    update_harvest_record,
)
from backend.app.features.post_harvest.shelf_life import estimate_shelf_life
from backend.app.features.post_harvest.spoilage_risk import analyze_spoilage_risk
from backend.app.features.post_harvest.storage_knowledge import (
    get_crop_storage_profile,
    list_supported_crops,
)

router = APIRouter(prefix="/post-harvest", tags=["Post-Harvest Intelligence"])


@router.get("/knowledge")
def get_storage_knowledge(crop: Optional[str] = Query(None)):
    """Return scientifically referenced crop storage profiles (ICAR, NHB, FAO, USDA)."""
    if crop:
        return get_crop_storage_profile(crop)
    return {"crops": list_supported_crops()}


@router.get("/summary")
def get_summary(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return get_post_harvest_summary(user["user_id"], user["role"], farm_id)


@router.post("/harvests")
async def create_harvest(
    req: HarvestRecordCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return await create_harvest_record(user["user_id"], user["role"], req)


@router.get("/harvests")
def get_harvests(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return {"harvests": list_harvest_records(user["user_id"], user["role"], farm_id)}


@router.patch("/harvests/{record_id}")
def patch_harvest(
    record_id: str,
    req: HarvestRecordUpdate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_harvest_record(user["user_id"], user["role"], record_id, req)


@router.post("/inventory")
def create_lot(
    req: InventoryLotCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_inventory_lot(user["user_id"], user["role"], req)


@router.get("/inventory")
def get_lots(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return {"lots": list_inventory_lots(user["user_id"], user["role"], farm_id)}


@router.patch("/inventory/{lot_id}/conditions")
def patch_lot_conditions(
    lot_id: str,
    req: InventoryConditionsUpdate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return update_lot_conditions(user["user_id"], user["role"], lot_id, req)


@router.post("/inventory/{lot_id}/events")
def post_lot_event(
    lot_id: str,
    req: InventoryEventRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return record_lot_event(user["user_id"], user["role"], lot_id, req)


@router.get("/inventory/{lot_id}/history")
def get_inventory_history(
    lot_id: str,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return get_lot_history(user["user_id"], user["role"], lot_id)


@router.post("/inventory/{lot_id}/create-listing")
def create_listing_for_lot(
    lot_id: str,
    req: LotListingCreateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_bidding_listing_from_lot(user["user_id"], user["role"], lot_id, req)


@router.post("/inventory/{lot_id}/prepare-transport")
def prepare_transport_for_lot(
    lot_id: str,
    req: LotTransportPrepRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return prepare_transport_from_lot(user["user_id"], user["role"], lot_id, req)


@router.post("/storage")
def create_storage(
    req: StorageRecordCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_storage_record(user["user_id"], user["role"], req)


@router.get("/storage")
def get_storages(
    farm_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return {"storage_records": list_storage_records(user["user_id"], user["role"], farm_id)}


@router.get("/facilities")
async def discover_facilities(
    farm_id: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    include_demo: bool = Query(True),
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return await find_facilities(user["user_id"], user["role"], farm_id, latitude, longitude, include_demo)


@router.post("/facilities/manual")
def add_manual_facility(
    req: ManualFacilityCreate,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_manual_facility(user["user_id"], req)


@router.post("/shelf-life")
def analyze_shelf_life(
    req: ShelfLifeRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return estimate_shelf_life(**req.model_dump())


@router.post("/spoilage-risk")
def evaluate_spoilage_risk(
    req: SpoilageRiskRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return analyze_spoilage_risk(**req.model_dump())


@router.post("/economic-compare")
def compare_sell_vs_store(
    req: EconomicCompareRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return evaluate_sell_vs_store(**req.model_dump())


# ==============================================================================
# AD-38 (P1): SMART PACKAGING, COLD-CHAIN & QR PRODUCE PASSPORTS
# ==============================================================================

from pydantic import BaseModel, Field
from typing import Literal
from backend.app.features.post_harvest.packaging import recommend_packaging_and_cold_chain
from backend.app.features.post_harvest.passport import (
    create_produce_passport,
    get_public_passport,
    list_farmer_passports,
)


class PackagingRecommendRequest(BaseModel):
    crop_name: str = Field(..., min_length=2, max_length=80)
    quantity_kg: float = Field(..., gt=0)
    ripeness: Literal["underripe", "optimal", "ripe"] = "optimal"
    distance_km: float = Field(60.0, ge=0)
    transit_hours: Optional[float] = Field(None, gt=0)
    market_type: Literal["local_apmc", "regional_wholesale", "cold_chain_retail"] = "regional_wholesale"


class PassportCreateRequest(BaseModel):
    farm_id: str
    crop_name: str = Field(..., min_length=2, max_length=80)
    variety: Optional[str] = Field(None, max_length=80)
    harvest_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    quantity_kg: float = Field(..., gt=0)
    harvest_record_id: Optional[str] = None
    inventory_lot_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    transport_booking_id: Optional[str] = None
    packaging_summary: Optional[str] = Field(None, max_length=300)
    storage_conditions: Optional[str] = Field(None, max_length=200)
    quality_observations: Optional[str] = Field(None, max_length=240)
    is_demonstration: bool = False


@router.post("/packaging/recommend")
def get_packaging_recommendation(
    req: PackagingRecommendRequest,
    authorization: Optional[str] = Header(None),
):
    resolve_authenticated_farmer(authorization)
    return recommend_packaging_and_cold_chain(**req.model_dump())


@router.post("/passports", status_code=201)
def issue_produce_passport(
    req: PassportCreateRequest,
    authorization: Optional[str] = Header(None),
):
    user = resolve_authenticated_farmer(authorization)
    return create_produce_passport(farmer_id=user["user_id"], **req.model_dump())


@router.get("/passports")
def get_my_passports(authorization: Optional[str] = Header(None)):
    user = resolve_authenticated_farmer(authorization)
    return {"passports": list_farmer_passports(user["user_id"])}


@router.get("/passports/public/{batch_code}")
def get_public_batch_passport(batch_code: str):
    return get_public_passport(batch_code)
