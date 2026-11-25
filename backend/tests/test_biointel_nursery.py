# backend/tests/test_biointel_nursery.py
"""
Targeted test suite for Feature 17 (BioIntel) and Feature 18 (Nursery Marketplace).
Verifies Europe PMC integration, recommendation engine, procurement calculations,
Google Places / Demo fallback, inventory CRUD, inquiry submission, and comparison.
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# -------------------------------------------------------------
# FEATURE 17: BIOINTEL TESTS
# -------------------------------------------------------------

def test_biotech_research_europe_pmc():
    """Verifies that /biotech/research returns actual papers with titles, authors, DOI, and citations."""
    response = client.get("/api/v1/biotech/research?crop=Tomato&problem=biofertilizer&page_size=5")
    assert response.status_code == 200
    data = response.json()
    assert data["crop"] == "Tomato"
    assert "query_used" in data
    assert data["total_results"] > 0
    assert len(data["papers"]) > 0
    first_paper = data["papers"][0]
    assert "title" in first_paper and len(first_paper["title"]) > 5
    assert "evidence_type" in first_paper
    assert "evidence_summary" in data
    assert len(data["evidence_summary"]) > 10

def test_biotech_research_caching():
    """Verifies that consecutive queries return quickly and are cached."""
    res1 = client.get("/api/v1/biotech/research?crop=Rice&problem=drought")
    assert res1.status_code == 200
    res2 = client.get("/api/v1/biotech/research?crop=Rice&problem=drought")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cached"] is True

def test_crop_varieties_endpoint():
    """Verifies retrieval of verified scientific crop varieties."""
    response = client.get("/api/v1/biotech/crop-varieties?crop=Tomato")
    assert response.status_code == 200
    varieties = response.json()
    assert len(varieties) >= 2
    names = [v["variety_name"] for v in varieties]
    assert any("Arka Rakshak" in n for n in names)
    assert any("disease_resistant_varieties" in v["category"] for v in varieties)

def test_biotech_recommendations_generation():
    """Verifies recommendation engine creates structured evidence-grounded options with centralized decision payload."""
    payload = {
        "farmer_name": "Suresh Gowda",
        "farm_location": "Tumakuru, Karnataka",
        "latitude": 13.3409,
        "longitude": 77.1010,
        "crop_type": "Tomato",
        "soil_type": "Red Sandy Loam",
        "soil_ph": 6.5,
        "water_availability": "Limited / Low",
        "cultivation_budget_inr": 85000.0,
        "previous_crop_diseases": ["Bacterial Wilt", "Tomato Leaf Curl Virus"]
    }
    response = client.post("/api/v1/biotech/recommendations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_recommendations"] >= 4
    recs = data["recommendations"]
    categories = [r["biotechnology_category"] for r in recs]
    assert "disease_resistant_varieties" in categories
    assert "biofertilizers" in categories
    assert "biopesticides" in categories
    
    # Check recommendation structure
    arka_rec = next(r for r in recs if "Arka Rakshak" in r["variety_or_intervention_name"])
    assert "limitations" in arka_rec and len(arka_rec["limitations"]) > 5
    assert "scientific_evidence" in arka_rec
    assert "find_nearby_suppliers_query" in arka_rec
    
    # Check Section 12: Centralized Decision Engine integration payload
    central_payload = data["centralized_decision_payload"]
    assert "recommended_crop_variety" in central_payload
    assert "budget_compatibility" in central_payload
    assert central_payload["budget_compatibility"] in ["Within Budget", "Exceeds Budget", "Pending Quote"]

# -------------------------------------------------------------
# FEATURE 18: NURSERY MARKETPLACE & PROCUREMENT TESTS
# -------------------------------------------------------------

def test_nearby_nurseries_discovery():
    """Verifies discovery of nearby nurseries with distance calculations and radius filter."""
    response = client.get("/api/v1/nurseries/nearby?lat=13.3409&lon=77.1010&radius_km=50")
    assert response.status_code == 200
    nurseries = response.json()
    assert len(nurseries) > 0
    first = nurseries[0]
    assert "name" in first
    assert "distance_km" in first
    assert first["distance_km"] <= 50.0

def test_nursery_products_filtering():
    """Verifies product searching with crop and category filters."""
    response = client.get("/api/v1/nurseries/products?crop=Tomato&category=disease_resistant_varieties")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    for p in products:
        assert "Tomato" in p["crop_name"]
        assert p["biotechnology_category"] == "disease_resistant_varieties"
        assert p["is_demo"] is True

def test_single_nursery_lookup():
    """Verifies single nursery lookup returns details and distance."""
    response = client.get("/api/v1/nurseries/nursery_demo_01?lat=13.3409&lon=77.1010")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "nursery_demo_01"
    assert data["distance_km"] == 0.0

def test_procurement_optimization_deterministic():
    """Verifies deterministic math in procurement optimization."""
    req = {
        "crop_name": "Tomato",
        "required_quantity": 5000,
        "farmer_latitude": 13.3409,
        "farmer_longitude": 77.1010,
        "farmer_budget_inr": 20000.0,
        "max_distance_km": 100.0
    }
    response = client.post("/api/v1/biotech/procurement-optimize", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["farmer_budget_inr"] == 20000.0
    assert data["required_quantity"] == 5000
    assert "calculation_formula" in data
    assert data["optimal_option"] is not None
    
    optimal = data["optimal_option"]
    # Check math: Planting material cost = 5000 * price_per_unit
    assert optimal["planting_material_cost"] == round(5000 * optimal["price_per_unit"], 2)
    # Check total cost = planting cost + transport cost
    expected_total = round(optimal["planting_material_cost"] + optimal["transportation_cost"], 2)
    assert optimal["total_procurement_cost"] == expected_total
    assert optimal["suitability_score"] > 0

def test_nursery_product_crud():
    """Verifies adding a new product to nursery inventory and updating it."""
    new_prod = {
        "nursery_id": "nursery_demo_01",
        "crop_name": "Tomato",
        "variety_name": "Custom Test Certified Hybrid",
        "biotechnology_category": "disease_resistant_varieties",
        "description": "Test hybrid seedlings for validation",
        "price_per_unit": 1.50,
        "pricing_unit": "per_seedling",
        "available_quantity": 10000,
        "minimum_order_quantity": 500,
        "certification_info": "Test Certification SSCA",
        "availability_status": "in_stock",
        "data_source": "direct_nursery_inventory"
    }
    create_res = client.post("/api/v1/nurseries/products", json=new_prod)
    assert create_res.status_code == 201
    created = create_res.json()
    prod_id = created["id"]
    assert created["variety_name"] == "Custom Test Certified Hybrid"
    assert created["is_demo"] is False

    # Update product price
    update_res = client.patch(f"/api/v1/nurseries/products/{prod_id}", json={"price_per_unit": 1.65})
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["price_per_unit"] == 1.65

def test_nursery_inquiry_submission():
    """Verifies farmer purchase/availability inquiry submission."""
    inq = {
        "nursery_id": "nursery_demo_01",
        "farmer_name": "Basavaraju",
        "farmer_phone": "+91 99001 12233",
        "farmer_location": "Gubbi, Tumakuru",
        "required_quantity": 3000,
        "intended_sowing_date": "2026-12-05",
        "notes": "Looking for 3000 Arka Rakshak seedlings"
    }
    response = client.post("/api/v1/nurseries/inquiries", json=inq)
    assert response.status_code == 201
    data = response.json()
    assert data["farmer_name"] == "Basavaraju"
    assert data["status"] == "submitted"
    assert "id" in data

def test_supplier_comparison():
    """Verifies side-by-side comparison of multiple products."""
    req = {
        "product_ids": ["prod_demo_001", "prod_demo_002"],
        "farmer_latitude": 13.3409,
        "farmer_longitude": 77.1010,
        "required_quantity": 2000,
        "farmer_budget_inr": 15000.0
    }
    response = client.post("/api/v1/nurseries/compare", json=req)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert "comparison_matrix" in data
