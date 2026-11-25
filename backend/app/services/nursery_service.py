# backend/app/services/nursery_service.py
"""
Service layer for Feature 18: Intelligent Nursery and Bio-Input Marketplace.
Handles nearby supplier discovery (Google Places API New + Demo Network),
nursery inventory management, supplier comparison, inquiry routing,
and deterministic procurement optimization.
"""
from typing import List, Dict, Any, Optional, Tuple
import math
import requests
from datetime import datetime, timezone
import uuid

from backend.app.core.config import settings
from backend.app.schemas.nursery import (
    Nursery,
    NurseryProduct,
    NurseryProductCreate,
    NurseryProductUpdate,
    NurseryInquiry,
    NurseryInquiryCreate,
    ProcurementCalculationRequest,
    ProcurementOption,
    ProcurementOptimizationResponse,
    SupplierComparisonRequest,
    SupplierComparisonResponse,
)
from backend.app.data.nursery_data import nursery_store

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two geographic coordinates using the Haversine formula.
    Returns distance in kilometers rounded to two decimal places.
    """
    R = 6371.0  # Earth's mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

class NurseryService:
    def __init__(self):
        self.google_places_api_key = settings.GOOGLE_PLACES_API_KEY
        self.google_places_url = "https://places.googleapis.com/v1/places:searchText"

    def discover_nearby_suppliers(
        self,
        lat: float,
        lon: float,
        radius_km: float = 50.0,
        crop: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Nursery]:
        """
        Discovers nearby agricultural nurseries and suppliers.
        Attempts Google Places API (New) if API key is present.
        Gracefully falls back to clearly labelled demonstration nursery network.
        """
        results: List[Nursery] = []
        used_google_places = False

        if self.google_places_api_key:
            try:
                search_text = f"Agricultural nursery plant suppliers near {crop or 'horticulture'}"
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": self.google_places_api_key,
                    "X-Goog-FieldMask": (
                        "places.id,places.displayName,places.formattedAddress,"
                        "places.location,places.rating,places.nationalPhoneNumber,"
                        "places.regularOpeningHours,places.websiteUri,places.googleMapsUri"
                    )
                }
                body = {
                    "textQuery": search_text,
                    "locationBias": {
                        "circle": {
                            "center": {"latitude": lat, "longitude": lon},
                            "radius": min(radius_km * 1000, 50000.0)  # meters
                        }
                    },
                    "maxResultCount": 10
                }
                resp = requests.post(self.google_places_url, json=body, headers=headers, timeout=4.0)
                if resp.status_code == 200:
                    places = resp.json().get("places", [])
                    for p in places:
                        loc = p.get("location", {})
                        p_lat = loc.get("latitude")
                        p_lon = loc.get("longitude")
                        if p_lat is not None and p_lon is not None:
                            dist = calculate_haversine_distance(lat, lon, p_lat, p_lon)
                            if dist <= radius_km:
                                disp_name = p.get("displayName", {}).get("text", "Agricultural Nursery")
                                open_hours = None
                                if "regularOpeningHours" in p:
                                    open_hours = ", ".join(p["regularOpeningHours"].get("weekdayDescriptions", [])[:2])
                                
                                results.append(Nursery(
                                    id=f"gp_{p.get('id', uuid.uuid4().hex[:8])}",
                                    name=disp_name,
                                    license_number=None,
                                    contact_person="Nursery Desk",
                                    phone=p.get("nationalPhoneNumber") or "Contact via Google Maps",
                                    email=None,
                                    address=p.get("formattedAddress") or "Regional Location",
                                    village_or_taluk=None,
                                    district="Local Region",
                                    state="Karnataka",
                                    latitude=p_lat,
                                    longitude=p_lon,
                                    is_verified=False,
                                    rating=p.get("rating", 4.3),
                                    data_source="google_places_supplier",
                                    google_place_id=p.get("id"),
                                    website_uri=p.get("websiteUri"),
                                    google_maps_uri=p.get("googleMapsUri"),
                                    opening_hours=open_hours,
                                    created_at=datetime.now(timezone.utc),
                                    updated_at=datetime.now(timezone.utc),
                                    distance_km=dist,
                                    product_count=0,
                                    is_demo=False
                                ))
                    if results:
                        used_google_places = True
            except Exception:
                # Fall back to local demo network
                pass

        # If Google Places API is unavailable or yielded no results, query local demo store
        all_nurseries = nursery_store.get_all_nurseries()
        for nd in all_nurseries:
            dist = calculate_haversine_distance(lat, lon, nd["latitude"], nd["longitude"])
            if dist <= radius_km or len(results) == 0:
                # Count available products
                prod_count = sum(1 for p in nursery_store.get_all_products() if p.get("nursery_id") == nd["id"])
                results.append(Nursery(
                    id=nd["id"],
                    name=nd["name"],
                    license_number=nd.get("license_number"),
                    contact_person=nd["contact_person"],
                    phone=nd["phone"],
                    email=nd.get("email"),
                    address=nd["address"],
                    village_or_taluk=nd.get("village_or_taluk"),
                    district=nd["district"],
                    state=nd["state"],
                    latitude=nd["latitude"],
                    longitude=nd["longitude"],
                    is_verified=nd.get("is_verified", False),
                    rating=nd.get("rating", 4.5),
                    data_source="demo_data" if nd.get("is_demo", True) else "direct_nursery_inventory",
                    google_place_id=nd.get("google_place_id"),
                    website_uri=nd.get("website_uri"),
                    google_maps_uri=nd.get("google_maps_uri"),
                    opening_hours=nd.get("opening_hours"),
                    created_at=datetime.fromisoformat(nd.get("created_at", datetime.now(timezone.utc).isoformat())),
                    updated_at=datetime.fromisoformat(nd.get("updated_at", datetime.now(timezone.utc).isoformat())),
                    distance_km=dist,
                    product_count=prod_count,
                    is_demo=nd.get("is_demo", True)
                ))

        # Sort by distance
        results.sort(key=lambda x: x.distance_km if x.distance_km is not None else 9999.0)
        return results

    def get_products(
        self,
        query: Optional[str] = None,
        crop: Optional[str] = None,
        category: Optional[str] = None,
        variety: Optional[str] = None,
        max_price: Optional[float] = None,
        max_distance_km: Optional[float] = None,
        farmer_lat: Optional[float] = None,
        farmer_lon: Optional[float] = None,
        in_stock_only: bool = False
    ) -> List[NurseryProduct]:
        """
        Searches products with multi-criteria filtering across crop, category, price, and distance.
        """
        all_raw = nursery_store.get_all_products()
        results: List[NurseryProduct] = []

        for p in all_raw:
            # Crop filter
            if crop and crop.lower() not in p["crop_name"].lower() and p["crop_name"] != "All Crops":
                continue
            # Category filter
            if category and category != p["biotechnology_category"]:
                continue
            # Variety filter
            if variety and variety.lower() not in p["variety_name"].lower():
                continue
            # Price filter
            if max_price is not None and p.get("price_per_unit") is not None and p["price_per_unit"] > max_price:
                continue
            # Stock filter
            if in_stock_only and p.get("availability_status") == "out_of_stock":
                continue
            # General text search
            if query:
                q = query.lower()
                text = f"{p['crop_name']} {p['variety_name']} {p['biotechnology_category']} {p['description']}".lower()
                if q not in text:
                    continue

            # Lookup parent nursery for contact & distance
            nursery = nursery_store.get_nursery(p["nursery_id"])
            dist = None
            if farmer_lat is not None and farmer_lon is not None and nursery:
                dist = calculate_haversine_distance(farmer_lat, farmer_lon, nursery["latitude"], nursery["longitude"])
                if max_distance_km is not None and dist > max_distance_km:
                    continue

            results.append(NurseryProduct(
                id=p["id"],
                nursery_id=p["nursery_id"],
                crop_name=p["crop_name"],
                variety_name=p["variety_name"],
                biotechnology_category=p["biotechnology_category"],
                description=p["description"],
                price_per_unit=p.get("price_per_unit"),
                pricing_unit=p.get("pricing_unit", "per_seedling"),
                available_quantity=p.get("available_quantity"),
                minimum_order_quantity=p.get("minimum_order_quantity", 1),
                certification_info=p.get("certification_info"),
                availability_status=p.get("availability_status", "in_stock"),
                data_source=p.get("data_source", "demo_data"),
                last_updated=datetime.fromisoformat(p.get("last_updated", datetime.now(timezone.utc).isoformat())),
                nursery_name=nursery.get("name") if nursery else "Regional Nursery",
                nursery_phone=nursery.get("phone") if nursery else None,
                nursery_district=nursery.get("district") if nursery else None,
                nursery_state=nursery.get("state") if nursery else None,
                nursery_latitude=nursery.get("latitude") if nursery else None,
                nursery_longitude=nursery.get("longitude") if nursery else None,
                distance_km=dist,
                is_demo=p.get("is_demo", True)
            ))

        if farmer_lat is not None and farmer_lon is not None:
            results.sort(key=lambda x: (x.distance_km if x.distance_km is not None else 9999.0))
        return results

    def get_nursery_by_id(self, nursery_id: str, farmer_lat: Optional[float] = None, farmer_lon: Optional[float] = None) -> Optional[Nursery]:
        raw = nursery_store.get_nursery(nursery_id)
        if not raw:
            return None
        dist = None
        if farmer_lat is not None and farmer_lon is not None:
            dist = calculate_haversine_distance(farmer_lat, farmer_lon, raw["latitude"], raw["longitude"])
        prod_count = sum(1 for p in nursery_store.get_all_products() if p.get("nursery_id") == raw["id"])
        return Nursery(
            id=raw["id"],
            name=raw["name"],
            license_number=raw.get("license_number"),
            contact_person=raw["contact_person"],
            phone=raw["phone"],
            email=raw.get("email"),
            address=raw["address"],
            village_or_taluk=raw.get("village_or_taluk"),
            district=raw["district"],
            state=raw["state"],
            latitude=raw["latitude"],
            longitude=raw["longitude"],
            is_verified=raw.get("is_verified", False),
            rating=raw.get("rating", 4.5),
            data_source=raw.get("data_source", "demo_data"),
            google_place_id=raw.get("google_place_id"),
            website_uri=raw.get("website_uri"),
            google_maps_uri=raw.get("google_maps_uri"),
            opening_hours=raw.get("opening_hours"),
            created_at=datetime.fromisoformat(raw.get("created_at", datetime.now(timezone.utc).isoformat())),
            updated_at=datetime.fromisoformat(raw.get("updated_at", datetime.now(timezone.utc).isoformat())),
            distance_km=dist,
            product_count=prod_count,
            is_demo=raw.get("is_demo", True)
        )

    def create_product(self, product_in: NurseryProductCreate) -> NurseryProduct:
        created_dict = nursery_store.add_product(product_in.model_dump())
        nursery = nursery_store.get_nursery(created_dict["nursery_id"])
        return NurseryProduct(
            id=created_dict["id"],
            nursery_id=created_dict["nursery_id"],
            crop_name=created_dict["crop_name"],
            variety_name=created_dict["variety_name"],
            biotechnology_category=created_dict["biotechnology_category"],
            description=created_dict["description"],
            price_per_unit=created_dict.get("price_per_unit"),
            pricing_unit=created_dict.get("pricing_unit", "per_seedling"),
            available_quantity=created_dict.get("available_quantity"),
            minimum_order_quantity=created_dict.get("minimum_order_quantity", 1),
            certification_info=created_dict.get("certification_info"),
            availability_status=created_dict.get("availability_status", "in_stock"),
            data_source="direct_nursery_inventory",
            last_updated=datetime.fromisoformat(created_dict["last_updated"]),
            nursery_name=nursery.get("name") if nursery else None,
            nursery_phone=nursery.get("phone") if nursery else None,
            nursery_district=nursery.get("district") if nursery else None,
            is_demo=False
        )

    def update_product(self, product_id: str, updates: NurseryProductUpdate) -> Optional[NurseryProduct]:
        update_data = updates.model_dump(exclude_unset=True)
        updated_dict = nursery_store.update_product(product_id, update_data)
        if not updated_dict:
            return None
        nursery = nursery_store.get_nursery(updated_dict["nursery_id"])
        return NurseryProduct(
            id=updated_dict["id"],
            nursery_id=updated_dict["nursery_id"],
            crop_name=updated_dict["crop_name"],
            variety_name=updated_dict["variety_name"],
            biotechnology_category=updated_dict["biotechnology_category"],
            description=updated_dict["description"],
            price_per_unit=updated_dict.get("price_per_unit"),
            pricing_unit=updated_dict.get("pricing_unit", "per_seedling"),
            available_quantity=updated_dict.get("available_quantity"),
            minimum_order_quantity=updated_dict.get("minimum_order_quantity", 1),
            certification_info=updated_dict.get("certification_info"),
            availability_status=updated_dict.get("availability_status", "in_stock"),
            data_source=updated_dict.get("data_source", "demo_data"),
            last_updated=datetime.fromisoformat(updated_dict["last_updated"]),
            nursery_name=nursery.get("name") if nursery else None,
            nursery_phone=nursery.get("phone") if nursery else None,
            nursery_district=nursery.get("district") if nursery else None,
            is_demo=updated_dict.get("is_demo", False)
        )

    def submit_inquiry(self, inquiry_in: NurseryInquiryCreate) -> NurseryInquiry:
        inq_dict = nursery_store.add_inquiry(inquiry_in.model_dump())
        return NurseryInquiry(
            id=inq_dict["id"],
            nursery_id=inq_dict["nursery_id"],
            product_id=inq_dict.get("product_id"),
            farmer_name=inq_dict["farmer_name"],
            farmer_phone=inq_dict["farmer_phone"],
            farmer_location=inq_dict["farmer_location"],
            required_quantity=inq_dict["required_quantity"],
            intended_sowing_date=inq_dict.get("intended_sowing_date"),
            notes=inq_dict.get("notes"),
            status="submitted",
            created_at=datetime.fromisoformat(inq_dict["created_at"])
        )

    def optimize_procurement(self, req: ProcurementCalculationRequest) -> ProcurementOptimizationResponse:
        """
        Deterministic Procurement Optimizer (Requirement 8).
        Calculates planting material cost, transportation cost, and total expenses.
        Compares suitable suppliers against farmer budget and ranks by multi-objective suitability.
        """
        # Search candidate products
        candidates = self.get_products(
            crop=req.crop_name,
            category=req.biotech_category,
            farmer_lat=req.farmer_latitude,
            farmer_lon=req.farmer_longitude,
            max_distance_km=req.max_distance_km
        )

        options: List[ProcurementOption] = []
        base_logistics_inr = 250.0  # Base dispatch/packaging fee
        per_km_rate_inr = 12.0     # Flat logistics freight per kilometer

        for p in candidates:
            nursery = nursery_store.get_nursery(p.nursery_id)
            dist = p.distance_km if p.distance_km is not None else 35.0
            price = p.price_per_unit
            
            if price is not None:
                planting_cost = round(req.required_quantity * price, 2)
                transport_cost = round(base_logistics_inr + (dist * per_km_rate_inr), 2)
                total_cost = round(planting_cost + transport_cost, 2)
                is_feasible = total_cost <= req.farmer_budget_inr
                budget_diff = round(req.farmer_budget_inr - total_cost, 2)

                # Deterministic Multi-Objective Suitability Score (0 - 100)
                # 1. Cost Score (up to 40 pts): lower cost = higher score
                cost_ratio = min(total_cost / max(req.farmer_budget_inr, 1.0), 2.0)
                cost_score = max(0.0, 40.0 * (1.0 - (cost_ratio * 0.5)))

                # 2. Distance Proximity Score (up to 25 pts)
                dist_score = max(0.0, 25.0 * (1.0 - (dist / max(req.max_distance_km, 1.0))))

                # 3. Verification & Certification (up to 20 pts)
                cert_score = 20.0 if (nursery and nursery.get("is_verified")) else 10.0

                # 4. Stock Availability (up to 15 pts)
                stock = p.available_quantity or 0
                stock_score = 15.0 if stock >= req.required_quantity else 5.0

                suitability = round(cost_score + dist_score + cert_score + stock_score, 1)

                rationale = (
                    f"Direct inventory match: ₹{price:.2f}/{p.pricing_unit} from {p.nursery_name} ({dist:.1f} km). "
                    f"Total landed cost is ₹{total_cost:,.2f} ({'within budget by ₹' + str(abs(budget_diff)) if is_feasible else 'exceeds budget by ₹' + str(abs(budget_diff))})."
                )
                limitations = "Seedling viability requires transplanting within 48 hours of nursery dispatch."
            else:
                planting_cost = None
                transport_cost = round(base_logistics_inr + (dist * per_km_rate_inr), 2)
                total_cost = None
                is_feasible = False
                budget_diff = None
                suitability = 35.0
                rationale = f"Contact nursery for quotation and live inventory confirmation ({dist:.1f} km)."
                limitations = "Stock confirmation required directly with nursery proprietor."

            options.append(ProcurementOption(
                product_id=p.id,
                nursery_id=p.nursery_id,
                nursery_name=p.nursery_name or "Regional Supplier",
                crop_name=p.crop_name,
                variety_name=p.variety_name,
                biotechnology_category=p.biotechnology_category,
                distance_km=dist,
                price_per_unit=price,
                pricing_unit=p.pricing_unit,
                required_quantity=req.required_quantity,
                planting_material_cost=planting_cost,
                transportation_cost=transport_cost,
                total_procurement_cost=total_cost,
                is_budget_feasible=is_feasible,
                budget_surplus_or_deficit=budget_diff,
                certification_info=p.certification_info,
                availability_status=p.availability_status,
                phone_number=p.nursery_phone or "+91 94800 00000",
                directions_url=nursery.get("google_maps_uri") if nursery else None,
                suitability_score=suitability,
                recommendation_rationale=rationale,
                limitations=limitations,
                is_demo=p.is_demo,
                data_source=p.data_source
            ))

        # Rank by suitability score descending
        options.sort(key=lambda x: x.suitability_score, reverse=True)
        optimal = options[0] if options else None

        return ProcurementOptimizationResponse(
            optimal_option=optimal,
            comparison_options=options,
            farmer_budget_inr=req.farmer_budget_inr,
            required_quantity=req.required_quantity,
            calculation_formula={
                "planting_material_cost": "Required quantity × Price per unit",
                "transportation_cost": f"Base logistics rate (₹{base_logistics_inr:.0f}) + (Distance in km × ₹{per_km_rate_inr:.0f}/km)",
                "total_procurement_cost": "Planting material cost + Transportation cost",
                "feasibility_rule": "Total procurement cost ≤ Farmer budget"
            },
            generated_at=datetime.now(timezone.utc)
        )

    def compare_suppliers(self, req: SupplierComparisonRequest) -> SupplierComparisonResponse:
        """
        Side-by-side comparison of 2-6 selected supplier options.
        """
        all_prods = [nursery_store.get_product(pid) for pid in req.product_ids]
        items: List[ProcurementOption] = []
        base_logistics_inr = 250.0
        per_km_rate_inr = 12.0

        for p in all_prods:
            if not p:
                continue
            nursery = nursery_store.get_nursery(p["nursery_id"])
            dist = 35.0
            if nursery:
                dist = calculate_haversine_distance(req.farmer_latitude, req.farmer_longitude, nursery["latitude"], nursery["longitude"])
            price = p.get("price_per_unit")
            if price is not None:
                planting_cost = round(req.required_quantity * price, 2)
                transport_cost = round(base_logistics_inr + (dist * per_km_rate_inr), 2)
                total_cost = round(planting_cost + transport_cost, 2)
                budget = req.farmer_budget_inr or 999999.0
                is_feasible = total_cost <= budget
                diff = round(budget - total_cost, 2) if req.farmer_budget_inr else None
                score = round(max(10.0, 100.0 - (dist * 0.4) - (total_cost / 1000.0)), 1)
            else:
                planting_cost = None
                transport_cost = round(base_logistics_inr + (dist * per_km_rate_inr), 2)
                total_cost = None
                is_feasible = False
                diff = None
                score = 30.0

            items.append(ProcurementOption(
                product_id=p["id"],
                nursery_id=p["nursery_id"],
                nursery_name=nursery.get("name") if nursery else "Regional Nursery",
                crop_name=p["crop_name"],
                variety_name=p["variety_name"],
                biotechnology_category=p["biotechnology_category"],
                distance_km=dist,
                price_per_unit=price,
                pricing_unit=p.get("pricing_unit", "per_unit"),
                required_quantity=req.required_quantity,
                planting_material_cost=planting_cost,
                transportation_cost=transport_cost,
                total_procurement_cost=total_cost,
                is_budget_feasible=is_feasible,
                budget_surplus_or_deficit=diff,
                certification_info=p.get("certification_info"),
                availability_status=p.get("availability_status", "in_stock"),
                phone_number=nursery.get("phone") if nursery else "+91 94800 00000",
                directions_url=nursery.get("google_maps_uri") if nursery else None,
                suitability_score=score,
                recommendation_rationale=f"Option: {p['variety_name']} at ₹{price or 'Quote'}",
                limitations="Standard nursery dispatch terms apply.",
                is_demo=p.get("is_demo", False),
                data_source=p.get("data_source", "direct_nursery_inventory")
            ))

        matrix = {
            "lowest_cost_option": min([i.total_procurement_cost for i in items if i.total_procurement_cost is not None], default=None),
            "closest_option_km": min([i.distance_km for i in items], default=None),
            "highest_rated_supplier": items[0].nursery_name if items else None
        }

        return SupplierComparisonResponse(items=items, comparison_matrix=matrix)

nursery_service = NurseryService()
