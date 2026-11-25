# backend/app/api/endpoints/nurseries.py
"""
FastAPI router for Feature 18: Intelligent Nursery and Bio-Input Marketplace.
Provides endpoints for Google Places supplier discovery, product inventory,
product management, farmer inquiries, and supplier comparison.
"""
from fastapi import APIRouter, Query, HTTPException, status, Path
from typing import Optional, List

from backend.app.schemas.nursery import (
    Nursery,
    NurseryProduct,
    NurseryProductCreate,
    NurseryProductUpdate,
    NurseryInquiry,
    NurseryInquiryCreate,
    SupplierComparisonRequest,
    SupplierComparisonResponse,
)
from backend.app.services.nursery_service import nursery_service

router = APIRouter(prefix="/nurseries", tags=["Intelligent Nursery Marketplace"])

# -------------------------------------------------------------
# 1. FIXED ROUTES (Registered BEFORE dynamic ID routes)
# -------------------------------------------------------------

@router.get(
    "/nearby",
    response_model=List[Nursery],
    summary="Discover nearby agricultural nurseries via Google Places (New) or Demo Network",
    description="Discovers nearby suppliers within specified radius (5, 10, 25, 50, 100 km) using coordinates and Haversine distance."
)
def get_nearby_nurseries(
    lat: float = Query(..., ge=-90, le=90, description="Farmer latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Farmer longitude"),
    radius_km: float = Query(default=50.0, ge=1.0, le=200.0, description="Search radius in kilometers"),
    crop: Optional[str] = Query(None, description="Optional crop filter"),
    category: Optional[str] = Query(None, description="Biotech category filter")
):
    try:
        return nursery_service.discover_nearby_suppliers(
            lat=lat,
            lon=lon,
            radius_km=radius_km,
            crop=crop,
            category=category
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to discover nearby nurseries: {str(e)}"
        )

@router.get(
    "/products",
    response_model=List[NurseryProduct],
    summary="Search nursery products and biological inputs",
    description="Queries planting materials, certified seeds, seedlings, and biological inputs with distance, price, and category filters."
)
def get_nursery_products(
    query: Optional[str] = Query(None, description="Text query across title and description"),
    crop: Optional[str] = Query(None, description="Target crop e.g. Tomato, Chilli, Mango"),
    category: Optional[str] = Query(None, description="Biotech category"),
    variety: Optional[str] = Query(None, description="Specific variety name"),
    max_price: Optional[float] = Query(None, ge=0, description="Upper price limit per unit"),
    max_distance_km: Optional[float] = Query(None, ge=1, description="Upper distance limit in km"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Farmer latitude for distance calculation"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Farmer longitude for distance calculation"),
    in_stock_only: bool = Query(default=False, description="Filter for in-stock inventory only")
):
    try:
        return nursery_service.get_products(
            query=query,
            crop=crop,
            category=category,
            variety=variety,
            max_price=max_price,
            max_distance_km=max_distance_km,
            farmer_lat=lat,
            farmer_lon=lon,
            in_stock_only=in_stock_only
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query nursery products: {str(e)}"
        )

@router.post(
    "/products",
    response_model=NurseryProduct,
    status_code=status.HTTP_201_CREATED,
    summary="Add new product to nursery inventory",
    description="Allows authenticated nursery owners or sellers to list certified planting stock and inputs."
)
def create_nursery_product(product_in: NurseryProductCreate):
    try:
        return nursery_service.create_product(product_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create nursery product: {str(e)}"
        )

@router.patch(
    "/products/{product_id}",
    response_model=NurseryProduct,
    summary="Update nursery product pricing, stock or status",
    description="Updates specific fields of an existing product listing."
)
def update_nursery_product(
    product_id: str = Path(..., description="Product ID"),
    updates: NurseryProductUpdate = ...
):
    updated = nursery_service.update_product(product_id, updates)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID '{product_id}' not found"
        )
    return updated

@router.post(
    "/inquiries",
    response_model=NurseryInquiry,
    status_code=status.HTTP_201_CREATED,
    summary="Submit purchase or availability inquiry to nursery",
    description="Enables farmers to request availability, quotes, and delivery for required planting materials."
)
def create_nursery_inquiry(inquiry_in: NurseryInquiryCreate):
    try:
        return nursery_service.submit_inquiry(inquiry_in)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit nursery inquiry: {str(e)}"
        )

@router.post(
    "/compare",
    response_model=SupplierComparisonResponse,
    summary="Compare multiple nursery products side-by-side",
    description="Evaluates 2 to 6 supplier offerings with deterministic landed cost, distance, and certification analysis."
)
def compare_suppliers(req: SupplierComparisonRequest):
    try:
        return nursery_service.compare_suppliers(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compare suppliers: {str(e)}"
        )

# -------------------------------------------------------------
# 2. DYNAMIC ROUTE (Registered AFTER fixed routes)
# -------------------------------------------------------------

@router.get(
    "/{nursery_id}",
    response_model=Nursery,
    summary="Get single nursery details and contact profile",
    description="Retrieves nursery contact information, certification status, address, and live inventory count."
)
def get_nursery_details(
    nursery_id: str = Path(..., description="Unique Nursery ID"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Farmer latitude for distance"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Farmer longitude for distance")
):
    nursery = nursery_service.get_nursery_by_id(nursery_id, farmer_lat=lat, farmer_lon=lon)
    if not nursery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nursery with ID '{nursery_id}' was not found"
        )
    return nursery
