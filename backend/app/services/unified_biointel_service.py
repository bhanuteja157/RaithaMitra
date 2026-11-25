# backend/app/services/unified_biointel_service.py
"""
Unified Advanced BioIntel & Scientific Procurement Workflow (AD-05).
Orchestrates all 12 API/service integrations in parallel without blocking on optional
genomic or unconfigured providers, and produces Centralized Decision Engine output.
"""
import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

from backend.app.schemas.biointel_advanced import (
    UnifiedBioIntelRequest,
    UnifiedBioIntelResponse,
    ORToolsProcurementRequest,
    SupplierOfferInput,
)
from backend.app.schemas.biotech import FarmerProfileInput
from backend.app.schemas.scientific import IrrigationRequest, SoilAnalysisRequest
from backend.app.services.taxonomy_genomics_service import taxonomy_genomics_service
from backend.app.services.biotech_service import biotech_service
from backend.app.services.weather_service import weather_service
from backend.app.services.scientific_irrigation_service import scientific_irrigation_service
from backend.app.services.soil_service import soil_service
from backend.app.services.nursery_service import nursery_service
from backend.app.services.routing_ortools_service import routing_ortools_service
from backend.app.services.evidence_validation_service import (
    evidence_validation_service,
    evaluate_inventory_freshness,
)
from backend.app.services.gemini_grounding_service import gemini_grounding_service
from backend.app.services.http_client import get_all_provider_statuses, record_provider_result
from backend.app.data.indian_ag_evidence import (
    get_indian_evidence_for_crop,
    get_national_nursery_portal_info,
)


class UnifiedBioIntelService:
    async def run_unified_workflow(self, req: UnifiedBioIntelRequest) -> UnifiedBioIntelResponse:
        # Step 1: Validate crop species via GBIF
        species_match = await taxonomy_genomics_service.validate_species_gbif(req.crop_name)
        sci_name = species_match.accepted_scientific_name

        # Step 2: Parallel retrieval of literature, weather/irrigation, soil, and optional genomics
        lit_task = taxonomy_genomics_service.fetch_enhanced_europe_pmc(
            req.crop_name, sci_name, req.previous_crop_diseases
        )
        weather_task = weather_service.get_weather(req.latitude, req.longitude)
        irr_task = scientific_irrigation_service.calculate_irrigation(
            IrrigationRequest(
                farm_id=req.farm_id,
                latitude=req.latitude,
                longitude=req.longitude,
                crop_type=req.crop_name,
                crop_stage="Initial",
                farm_area_ha=req.farm_area_ha,
                soil_type=req.soil_type,
                available_water_m3=5000.0 if req.water_availability == "Limited / Low" else 15000.0,
                irrigation_method="Drip Irrigation",
            )
        )
        soil_task = asyncio.to_thread(
            soil_service.analyze_soil,
            SoilAnalysisRequest(
                farm_id=req.farm_id,
                latitude=req.latitude,
                longitude=req.longitude,
                crop_type=req.crop_name,
                soil_texture=req.soil_type,
                nitrogen_kg_ha=req.nitrogen_kg_ha,
                phosphorus_kg_ha=req.phosphorus_kg_ha,
                potassium_kg_ha=req.potassium_kg_ha,
                soil_ph=req.soil_ph,
                measurement_source=(
                    "laboratory_soil_health_card"
                    if any(v is not None for v in [req.nitrogen_kg_ha, req.phosphorus_kg_ha, req.potassium_kg_ha])
                    else "user_estimate"
                ),
                fetch_soilgrids=True,
            ),
        )

        ensembl_task = (
            taxonomy_genomics_service.fetch_ensembl_plants(req.crop_name, sci_name)
            if req.include_genomics
            else asyncio.sleep(0, result=None)
        )

        research_papers, weather, irr_out, soil_out, ensembl_out = await asyncio.gather(
            lit_task, weather_task, irr_task, soil_task, ensembl_task
        )

        if weather.provenance.is_live:
            record_provider_result("open_meteo", True)
        if soil_out.results.get("soilgrids_modeled_reference", {}).get("available"):
            record_provider_result("soilgrids", True)
        if research_papers and any(p.get("is_live") for p in research_papers):
            record_provider_result("europe_pmc", True)

        existing_pmids = [str(p["pmid"]) for p in research_papers if p.get("pmid")]
        ncbi_out = (
            await taxonomy_genomics_service.fetch_ncbi_genetics(sci_name, existing_pmids)
            if req.include_genomics
            else None
        )

        # Step 3: Indian Agricultural Evidence & Biotech Recommendations
        indian_evidence = get_indian_evidence_for_crop(req.crop_name)
        nnp_info = get_national_nursery_portal_info()

        biotech_recs = biotech_service.generate_recommendations(
            FarmerProfileInput(
                farm_id=req.farm_id,
                farmer_name=req.farmer_name,
                latitude=req.latitude,
                longitude=req.longitude,
                crop_type=req.crop_name,
                soil_type=req.soil_type,
                soil_ph=req.soil_ph,
                water_availability=req.water_availability,
                land_area_ha=req.farm_area_ha,
                cultivation_budget_inr=req.farmer_budget_inr,
                previous_crop_diseases=req.previous_crop_diseases,
            )
        )

        primary_variety = (
            indian_evidence[0].commercial_variety
            if indian_evidence
            else biotech_recs.recommendations[0].variety_or_intervention_name
        )

        # Step 4: Climate & Soil Suitability Synthesis
        cur_temp = weather.current.temperature_c
        heat_stress = cur_temp >= 35.0
        rain_48h = sum(d.precipitation_sum_mm for d in weather.daily_forecast[:2]) if weather.daily_forecast else 0.0
        climate_suitability = {
            "current_temperature_c": cur_temp,
            "humidity_pct": weather.current.relative_humidity_pct,
            "et0_mm_day": weather.current.et0_fao56_mm,
            "forecast_rain_48h_mm": round(rain_48h, 2),
            "heat_stress_risk": "High" if heat_stress else "Low to Moderate",
            "drought_risk": "Elevated" if req.water_availability == "Limited / Low" and rain_48h < 5.0 else "Moderate",
            "planting_suitability": "Suitable with drip irrigation" if not heat_stress else "Delay transplanting to cooler evening hours",
            "daily_irrigation_requirement_mm": irr_out.results.get("gross_irrigation_mm"),
            "daily_irrigation_volume_m3": irr_out.results.get("gross_volume_m3"),
            "source": weather.provenance.source,
            "is_live": weather.provenance.is_live,
            "limitations": "Short-term NWP forecast only; long-term crop suitability requires seasonal climatology.",
        }

        soil_suitability = {
            "soil_texture": req.soil_type,
            "soil_ph": req.soil_ph,
            "optimal_ph_range": soil_out.results.get("optimal_ph_range"),
            "deficiencies": soil_out.results.get("deficiencies", []),
            "soilgrids_modeled_reference": soil_out.results.get("soilgrids_modeled_reference"),
            "data_quality": soil_out.data_quality,
            "limitations": "Laboratory NPK measurements take priority over 250m SoilGrids global estimates.",
        }

        # Step 5: Nursery Discovery, Distance Matrix & OR-Tools Optimization
        nearby_nurseries = nursery_service.discover_nearby_suppliers(
            lat=req.latitude,
            lon=req.longitude,
            radius_km=req.search_radius_km,
            crop=req.crop_name,
        )
        products = nursery_service.get_products(
            crop=req.crop_name,
            farmer_lat=req.latitude,
            farmer_lon=req.longitude,
            max_distance_km=req.search_radius_km,
        )

        # Compute road/Haversine route for candidate nurseries
        route_map: Dict[str, Any] = {}
        for p in products[:8]:
            if p.nursery_id not in route_map and p.nursery_latitude is not None and p.nursery_longitude is not None:
                route_map[p.nursery_id] = await routing_ortools_service.compute_supplier_route(
                    supplier_id=p.nursery_id,
                    origin_lat=req.latitude,
                    origin_lon=req.longitude,
                    dest_lat=p.nursery_latitude,
                    dest_lon=p.nursery_longitude,
                )

        offers: List[SupplierOfferInput] = []
        supplier_cards: List[Dict[str, Any]] = []
        for p in products:
            fresh_ok, stock_lbl, price_lbl = evaluate_inventory_freshness(
                p.price_per_unit, p.available_quantity, p.last_updated.isoformat()
            )
            rt = route_map.get(p.nursery_id)
            dist_km = rt.distance_km if rt else (p.distance_km or 25.0)
            dist_type = rt.distance_type if rt else "Straight-line estimate (Haversine)"

            offers.append(SupplierOfferInput(
                product_id=p.id,
                nursery_id=p.nursery_id,
                nursery_name=p.nursery_name or "Nursery",
                variety_name=p.variety_name,
                crop_name=p.crop_name,
                biotechnology_category=p.biotechnology_category,
                unit_price_inr=p.price_per_unit,
                pricing_unit=p.pricing_unit,
                available_quantity=p.available_quantity,
                minimum_order_quantity=p.minimum_order_quantity,
                is_verified=not p.is_demo,
                is_demo=p.is_demo,
                inventory_fresh=fresh_ok,
                freshness_status=stock_lbl,
                distance_km=dist_km,
                distance_type=dist_type,
            ))

            supplier_cards.append({
                "product_id": p.id,
                "nursery_id": p.nursery_id,
                "nursery_name": p.nursery_name,
                "variety_name": p.variety_name,
                "price_display": price_lbl,
                "stock_status": stock_lbl,
                "distance_km": dist_km,
                "distance_type": dist_type,
                "estimated_transport_cost_inr": rt.estimated_transport_cost_inr if rt else round(250 + dist_km * 12, 2),
                "is_demo": p.is_demo,
                "phone": p.nursery_phone,
                "certification": p.certification_info,
            })

        ortools_plan = routing_ortools_service.optimize_procurement_cp_sat(
            ORToolsProcurementRequest(
                required_quantity=req.required_seedlings,
                farmer_budget_inr=req.farmer_budget_inr,
                crop_name=req.crop_name,
                allow_partial_fulfillment=True,
                allow_demo_inventory=req.allow_demo_inventory,
                offers=offers,
            )
        )

        # Step 6: Scientific Evidence Validation
        validation = evidence_validation_service.validate_and_resolve(
            crop_name=req.crop_name,
            scientific_name=sci_name,
            research_papers=research_papers,
            indian_evidence=indian_evidence,
            soil_data=soil_out.results,
            has_genetic_evidence=bool(ncbi_out and ncbi_out.genes),
        )

        # Step 7: Grounded Explanation (Gemini or deterministic multilingual fallback)
        citations = [
            p.get("doi") or p.get("title", "")
            for p in research_papers[:2]
        ] + [ind.evidence_url for ind in indian_evidence[:1]]

        grounded_text, gemini_used = await gemini_grounding_service.generate_grounded_explanation(
            language=req.language,
            crop_name=req.crop_name,
            scientific_name=sci_name,
            recommended_variety=primary_variety,
            evidence_quality=validation["overall_evidence_quality"],
            climate_summary=f"{cur_temp}°C, ET0={weather.current.et0_fao56_mm} mm/day, {climate_suitability['planting_suitability']}",
            soil_summary=f"{req.soil_type} (pH {req.soil_ph or 'N/A'})",
            procurement_explanation=ortools_plan.explanation,
            citations=citations,
        )

        missing_data: List[str] = []
        if req.nitrogen_kg_ha is None or req.phosphorus_kg_ha is None or req.potassium_kg_ha is None:
            missing_data.append("Laboratory Soil Health Card NPK values not provided.")
        if not any(not n.is_demo for n in nearby_nurseries):
            missing_data.append("No verified live non-demo nursery inventory found; demonstration dataset used for optimization.")

        disease_traits = []
        for ind in indian_evidence:
            disease_traits.extend(ind.documented_traits[:2])

        return UnifiedBioIntelResponse(
            farm_id=req.farm_id,
            crop_id=str(species_match.taxon_key or sci_name),
            crop_variety=primary_variety,
            source="RaithaMitra Unified BioIntel Workflow (12-Provider Orchestration)",
            timestamp=datetime.now(timezone.utc).isoformat(),
            data_quality="Official documented information" if indian_evidence else "Scientific research evidence",
            species_validation=species_match,
            scientific_research=research_papers[:6],
            genetic_evidence=ncbi_out,
            genomic_evidence=ensembl_out,
            indian_agricultural_evidence=indian_evidence,
            climate_suitability=climate_suitability,
            soil_suitability=soil_suitability,
            disease_resistance=disease_traits[:4] or ["See scientific research records"],
            drought_tolerance="Drip fertigation recommended; grafted rootstocks / drought QTL varieties reduce stress.",
            recommended_interventions=[r.model_dump() for r in biotech_recs.recommendations],
            nearby_suppliers=supplier_cards,
            national_nursery_portal=nnp_info,
            procurement_plan=ortools_plan,
            procurement_cost=ortools_plan.total_procurement_cost_inr,
            budget_feasibility=ortools_plan.budget_feasible,
            evidence_validation=validation,
            evidence_quality=validation["overall_evidence_quality"],
            grounded_explanation=grounded_text,
            gemini_used=gemini_used,
            provider_statuses=get_all_provider_statuses(),
            sources=[
                species_match.source_provider,
                weather.provenance.source,
                soil_out.source,
                ortools_plan.solver_used,
            ],
            assumptions=[
                "Experimental lab/preprint papers are separated from commercial recommendations.",
                "OR-Tools CP-SAT optimizes strictly over confirmed priced/in-stock offers in integer paise.",
                "Demonstration suppliers are clearly labelled and never represented as live commercial stock.",
            ],
            limitations=[
                "Gene annotations (NCBI/Ensembl) do not guarantee commercial cultivar resistance without pedigree verification.",
                "Google Places listings confirm business existence only, not seedling inventory.",
            ],
            missing_data=missing_data,
            recommended_actions=[
                f"Prioritize {primary_variety} backed by {validation['overall_evidence_quality']} evidence.",
                ortools_plan.explanation,
                "Verify final seedling batch availability and NHB accreditation before dispatch.",
            ],
        )


unified_biointel_service = UnifiedBioIntelService()
