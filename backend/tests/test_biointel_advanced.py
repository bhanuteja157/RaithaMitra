# backend/tests/test_biointel_advanced.py
"""
Targeted Backend Tests for AD-05: Advanced BioIntel & Scientific Procurement Intelligence.
Uses a dedicated FastAPI TestClient app mounting biointel_advanced.router
without modifying backend/app/api/api.py.
Separates mocked unit tests from live provider verification.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.api.endpoints.biointel_advanced import router as advanced_router
from backend.app.schemas.biointel_advanced import (
    ORToolsProcurementRequest,
    SupplierOfferInput,
)
from backend.app.services.routing_ortools_service import routing_ortools_service
from backend.app.services.evidence_validation_service import (
    evaluate_inventory_freshness,
    evidence_validation_service,
)
from backend.app.services.taxonomy_genomics_service import taxonomy_genomics_service
from backend.app.services.gemini_grounding_service import gemini_grounding_service
from backend.app.data.indian_ag_evidence import get_indian_evidence_for_crop

test_app = FastAPI()
test_app.include_router(advanced_router, prefix="/api/v1")
client = TestClient(test_app)


# ---------------------------------------------------------------------------
# 1. GBIF Species Matching & Ambiguous Crop Names
# ---------------------------------------------------------------------------
def test_gbif_species_matching_and_ambiguous_names():
    mock_gbif = {
        "usageKey": 2930137,
        "species": "Solanum lycopersicum",
        "genus": "Solanum",
        "family": "Solanaceae",
        "matchType": "EXACT",
        "confidence": 99,
    }
    with patch(
        "backend.app.services.taxonomy_genomics_service.fetch_json_with_resilience",
        new=AsyncMock(return_value=mock_gbif),
    ):
        res = client.get("/api/v1/biotech/advanced/species?crop=Tomato")
        assert res.status_code == 200
        data = res.json()
        assert data["accepted_scientific_name"] == "Solanum lycopersicum"
        assert data["taxon_key"] == 2930137
        assert data["is_live"] is True

    # Ambiguous crop name 'Pepper'
    with patch(
        "backend.app.services.taxonomy_genomics_service.fetch_json_with_resilience",
        new=AsyncMock(return_value=None),
    ):
        res_amb = client.get("/api/v1/biotech/advanced/species?crop=Pepper")
        assert res_amb.status_code == 200
        assert len(res_amb.json()["ambiguous_candidates"]) == 2


# ---------------------------------------------------------------------------
# 2. NCBI Response Parsing & Unsupported Ensembl Plants Species
# ---------------------------------------------------------------------------
def test_ncbi_parsing_and_unsupported_ensembl_species():
    async def _run():
        # Unsupported Ensembl species (Mango)
        ens_mango = await taxonomy_genomics_service.fetch_ensembl_plants("Mango", "Mangifera indica")
        assert ens_mango.is_supported is False
        assert "does not have a supported reference genome" in ens_mango.limitations

        # Mocked NCBI esearch + esummary
        async def _mock_fetch(provider_key, url, **kwargs):
            if "esearch.fcgi" in url and kwargs["params"]["db"] == "gene":
                return {"esearchresult": {"idlist": ["101264"]}}
            if "esummary.fcgi" in url and kwargs["params"]["db"] == "gene":
                return {"result": {"101264": {"name": "Ty-2", "description": "ToLCV resistance locus", "chromosome": "11"}}}
            if "esearch.fcgi" in url and kwargs["params"]["db"] == "pubmed":
                return {"esearchresult": {"idlist": ["37198421", "99999999"]}}
            if "esummary.fcgi" in url and kwargs["params"]["db"] == "pubmed":
                return {"result": {"99999999": {"title": "Tomato drought study", "pubdate": "2024", "source": "Plant Sci"}}}
            return None

        with patch("backend.app.services.taxonomy_genomics_service.fetch_json_with_resilience", side_effect=_mock_fetch):
            # 37198421 is already in existing_pmids -> must be deduplicated!
            ncbi = await taxonomy_genomics_service.fetch_ncbi_genetics("Solanum lycopersicum", ["37198421"])
            assert ncbi.is_live is True
            assert len(ncbi.genes) == 1
            assert ncbi.genes[0].symbol == "Ty-2"
            assert len(ncbi.pubmed_articles) == 1
            assert ncbi.pubmed_articles[0]["pmid"] == "99999999"

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# 3. Google Routes Fallback & Road Distance
# ---------------------------------------------------------------------------
def test_routes_fallback_to_haversine(monkeypatch):
    monkeypatch.delenv("GOOGLE_ROUTES_API_KEY", raising=False)
    rt = asyncio.run(
        routing_ortools_service.compute_supplier_route(
            supplier_id="nursery_demo_01",
            origin_lat=12.5234,
            origin_lon=76.8976,
            dest_lat=13.3409,
            dest_lon=77.1010,
        )
    )
    assert rt.route_available is False
    assert rt.distance_type == "Straight-line estimate (Haversine)"
    assert rt.distance_km > 80.0


# ---------------------------------------------------------------------------
# 4. Inventory Freshness, Missing Prices & Insufficient Stock
# ---------------------------------------------------------------------------
def test_inventory_freshness_rules():
    # Missing price -> Contact Supplier
    ok1, s1, p1 = evaluate_inventory_freshness(None, 500, datetime.now(timezone.utc).isoformat())
    assert ok1 is False
    assert p1 == "Contact Supplier"

    # Missing stock -> Availability Unknown
    ok2, s2, p2 = evaluate_inventory_freshness(1.5, None, datetime.now(timezone.utc).isoformat())
    assert ok2 is False
    assert s2 == "Availability Unknown"

    # Expired inventory -> Confirmation Required
    old_ts = (datetime.now(timezone.utc) - timedelta(days=45)).isoformat()
    ok3, s3, p3 = evaluate_inventory_freshness(1.5, 1000, old_ts)
    assert ok3 is False
    assert "Confirmation Required" in s3


# ---------------------------------------------------------------------------
# 5. Google OR-Tools CP-SAT Multi-Supplier, MOQ, Budget & Infeasibility
# ---------------------------------------------------------------------------
def test_ortools_multi_supplier_and_constraints():
    offers = [
        SupplierOfferInput(
            product_id="p1",
            nursery_id="n1",
            nursery_name="Nursery A",
            variety_name="Arka Rakshak",
            crop_name="Tomato",
            biotechnology_category="disease_resistant_varieties",
            unit_price_inr=1.20,
            available_quantity=3000,
            minimum_order_quantity=1000,
            distance_km=10.0,
        ),
        SupplierOfferInput(
            product_id="p2",
            nursery_id="n2",
            nursery_name="Nursery B",
            variety_name="Arka Rakshak",
            crop_name="Tomato",
            biotechnology_category="disease_resistant_varieties",
            unit_price_inr=1.40,
            available_quantity=4000,
            minimum_order_quantity=1000,
            distance_km=15.0,
        ),
        # Unpriced offer must be excluded
        SupplierOfferInput(
            product_id="p_unpriced",
            nursery_id="n3",
            nursery_name="Nursery C",
            variety_name="Arka Rakshak",
            crop_name="Tomato",
            biotechnology_category="disease_resistant_varieties",
            unit_price_inr=None,
            available_quantity=5000,
            minimum_order_quantity=500,
            distance_km=5.0,
        ),
    ]

    # Multi-supplier split needed for 5,000 seedlings (3000 from A + 2000 from B)
    req = ORToolsProcurementRequest(
        required_quantity=5000,
        farmer_budget_inr=15000.0,
        crop_name="Tomato",
        allow_demo_inventory=True,
        offers=offers,
    )
    res = routing_ortools_service.optimize_procurement_cp_sat(req)
    assert res.optimization_status == "Optimal"
    assert res.fulfilled_quantity == 5000
    assert res.unfulfilled_quantity == 0
    assert len(res.allocations) == 2
    assert res.budget_feasible is True
    assert any(e["product_id"] == "p_unpriced" for e in res.excluded_offers)

    # Budget too low for even MOQ -> Infeasible
    req_infeasible = ORToolsProcurementRequest(
        required_quantity=5000,
        farmer_budget_inr=500.0,
        crop_name="Tomato",
        allow_partial_fulfillment=True,
        allow_demo_inventory=True,
        offers=offers,
    )
    res_inf = routing_ortools_service.optimize_procurement_cp_sat(req_infeasible)
    assert res_inf.optimization_status == "Infeasible"
    assert res_inf.fulfilled_quantity == 0


# ---------------------------------------------------------------------------
# 6. Conflicting Scientific Evidence & Multilingual Fallback
# ---------------------------------------------------------------------------
def test_evidence_conflict_resolution_and_multilingual_fallback(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    ind = get_indian_evidence_for_crop("Tomato")
    val = evidence_validation_service.validate_and_resolve(
        crop_name="Tomato",
        scientific_name="Solanum lycopersicum",
        research_papers=[{"title": "Field trial", "publication_type": "field_trial", "is_live": True, "pub_year": 2024}],
        indian_evidence=ind,
        soil_data={
            "nutrient_status": {"soil_ph": {"value": 5.4}},
            "soilgrids_modeled_reference": {"modeled_ph": 6.8},
        },
        has_genetic_evidence=True,
    )
    assert val["overall_evidence_quality"] == "Strong"
    assert len(val["unresolved_contradictions"]) == 1

    kn_text, used_kn = asyncio.run(
        gemini_grounding_service.generate_grounded_explanation(
            "kn", "Tomato", "Solanum lycopersicum", "Arka Rakshak", "Strong", "28°C", "Red Loam", "Optimal", ["DOI:10.1007"]
        )
    )
    hi_text, used_hi = asyncio.run(
        gemini_grounding_service.generate_grounded_explanation(
            "hi", "Tomato", "Solanum lycopersicum", "Arka Rakshak", "Strong", "28°C", "Red Loam", "Optimal", ["DOI:10.1007"]
        )
    )
    assert used_kn is False and "ಟೊಮ್ಯಾಟೊ" not in "" and "ಬೆಳೆಗೆ" in kn_text
    assert used_hi is False and "वैज्ञानिक सिफारिश" in hi_text


# ---------------------------------------------------------------------------
# 7. Judges' Demo Workflow & 12-Provider Status Panel
# ---------------------------------------------------------------------------
def test_unified_workflow_judges_demo_and_12_providers():
    # Mock external HTTP calls so test is fast & deterministic
    with patch(
        "backend.app.services.taxonomy_genomics_service.fetch_json_with_resilience",
        new=AsyncMock(return_value=None),
    ):
        res = client.post(
            "/api/v1/biotech/advanced/workflow",
            json={
                "farm_id": "farm_001",
                "crop_name": "Tomato",
                "farm_area_ha": 0.809,
                "required_seedlings": 5000,
                "farmer_budget_inr": 15000.0,
                "water_availability": "Limited / Low",
                "previous_crop_diseases": ["Bacterial Wilt", "Tomato Leaf Curl Virus"],
                "include_genomics": False,
                "allow_demo_inventory": True,
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["species_validation"]["accepted_scientific_name"] == "Solanum lycopersicum"
        assert body["procurement_plan"]["optimization_status"] == "Optimal"
        assert body["procurement_plan"]["fulfilled_quantity"] == 5000
        assert body["budget_feasibility"] is True
        assert len(body["provider_statuses"]) == 12
        assert len(body["missing_data"]) >= 1
