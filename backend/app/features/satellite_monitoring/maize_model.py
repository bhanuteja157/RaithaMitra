# backend/app/features/satellite_monitoring/maize_model.py
"""
Documented Maize Variety, Seed Quantity, Plant Population & 15-Stage Biological Phenology Model.
Uses ICAR-IIMR & Karnataka UAS package-of-practices reference values rather than universal defaults.
Marks modeled/derived estimates explicitly as ESTIMATED / ILLUSTRATIVE where appropriate.
"""
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

SQ_METERS_PER_ACRE = 4046.8564224

MAIZE_VARIETIES: Dict[str, Dict[str, Any]] = {
    "nah-1137": {
        "id": "nah-1137",
        "name": "NAH-1137 (Nithyashree Hybrid)",
        "duration_days": 110,
        "recommended_row_spacing_cm": 60.0,
        "recommended_plant_spacing_cm": 20.0,
        "thousand_grain_weight_g": 290.0,
        "default_germination_pct": 90.0,
        "baseline_seed_rate_kg_acre": 8.0,
        "expected_yield_kg_per_acre_min": 2400,
        "expected_yield_kg_per_acre_max": 3200,
        "gdd_maturity": 1480.0,
        "source": "UAS Bengaluru / ICAR-IIMR Maize Package of Practices",
    },
    "pmh-1": {
        "id": "pmh-1",
        "name": "PMH-1 (Punjab Maize Hybrid)",
        "duration_days": 95,
        "recommended_row_spacing_cm": 60.0,
        "recommended_plant_spacing_cm": 20.0,
        "thousand_grain_weight_g": 265.0,
        "default_germination_pct": 90.0,
        "baseline_seed_rate_kg_acre": 8.5,
        "expected_yield_kg_per_acre_min": 2100,
        "expected_yield_kg_per_acre_max": 2800,
        "gdd_maturity": 1320.0,
        "source": "ICAR-IIMR Medium-Early Hybrid Compendium",
    },
    "deccan-103": {
        "id": "deccan-103",
        "name": "Deccan-103 (Full-Season Hybrid)",
        "duration_days": 120,
        "recommended_row_spacing_cm": 60.0,
        "recommended_plant_spacing_cm": 25.0,
        "thousand_grain_weight_g": 310.0,
        "default_germination_pct": 88.0,
        "baseline_seed_rate_kg_acre": 7.5,
        "expected_yield_kg_per_acre_min": 2500,
        "expected_yield_kg_per_acre_max": 3400,
        "gdd_maturity": 1620.0,
        "source": "ANGRAU / ICAR Full-Season Peninsular Hybrid Profile",
    },
}

MAIZE_BIOLOGICAL_STAGES = [
    (1, "Seed Sowing", "Sowing", 0.00, 0.02, "Seed placed at 4-5 cm furrow depth."),
    (2, "Seed Imbibition", "VE-Pre", 0.02, 0.04, "Seed absorbs ~30-35% moisture to activate enzymes."),
    (3, "Radicle Emergence", "VE-Root", 0.04, 0.06, "Primary radicle emerges downward to anchor the seed."),
    (4, "Coleoptile Emergence", "VE", 0.06, 0.10, "Coleoptile pushes above soil surface."),
    (5, "Seedling Establishment", "V1-V2", 0.10, 0.16, "First collared leaves unfold; nodal roots initiate."),
    (6, "Early Vegetative Development", "V3-V5", 0.16, 0.28, "Growing point near soil surface; leaf & ear row potential initiates."),
    (7, "Progressive Leaf Formation", "V6-V9", 0.28, 0.42, "Stalk begins rapid lengthening; V6-V8 collar emergence."),
    (8, "Stem Elongation", "V10-V14", 0.42, 0.56, "Rapid internode elongation and brace root development."),
    (9, "Tassel Emergence", "VT", 0.56, 0.62, "Lowest tassel branch visible; maximum vegetative height reached."),
    (10, "Silk Emergence", "R1", 0.62, 0.67, "Silks emerge from ear husks; critical moisture & heat stage."),
    (11, "Pollination Period", "R1-R2", 0.67, 0.73, "Pollen shed fertilizes silks; blister kernels form."),
    (12, "Ear Development", "R2-R3", 0.73, 0.80, "Cob lengthens and watery kernels enter milk stage."),
    (13, "Kernel Filling", "R4-R5", 0.80, 0.91, "Starch accumulates through dough and dent kernel stages."),
    (14, "Physiological Maturity", "R6", 0.91, 0.96, "Black layer forms at kernel base; dry matter complete."),
    (15, "Grain Drying & Harvest", "Harvest", 0.96, 1.00, "Kernels dry to 18-22% moisture; husks turn golden-tan."),
]


def compute_maize_agronomy(
    *,
    area_acres: float,
    variety_id: str = "nah-1137",
    sowing_date: Optional[str] = None,
    row_spacing_cm: Optional[float] = None,
    plant_spacing_cm: Optional[float] = None,
    germination_pct: Optional[float] = None,
    custom_seed_rate_kg_per_acre: Optional[float] = None,
    mean_daily_temp_c: float = 25.5,
) -> Dict[str, Any]:
    v = MAIZE_VARIETIES.get(variety_id, MAIZE_VARIETIES["nah-1137"])
    row_cm = row_spacing_cm or v["recommended_row_spacing_cm"]
    plant_cm = plant_spacing_cm or v["recommended_plant_spacing_cm"]
    germ_pct = germination_pct or v["default_germination_pct"]
    tgw_g = v["thousand_grain_weight_g"]

    # Area -> Theoretical Population -> Established Population
    area_sq_m = area_acres * SQ_METERS_PER_ACRE
    area_per_plant_m2 = (row_cm / 100.0) * (plant_cm / 100.0)
    theoretical_population = int(round(area_sq_m / max(0.01, area_per_plant_m2)))
    established_population = int(round(theoretical_population * (germ_pct / 100.0)))

    # Seed weight from target established population + TGW + germination compensation
    seeds_per_kg = round(1000.0 / (tgw_g / 1000.0), 1)
    if custom_seed_rate_kg_per_acre is not None:
        required_seed_kg = round(custom_seed_rate_kg_per_acre * area_acres, 2)
        seed_formula = f"User custom seed rate ({custom_seed_rate_kg_per_acre} kg/acre) × {area_acres} acres"
    else:
        # Needed seeds to achieve theoretical stand given germination % (+5% sowing allowance)
        needed_seeds = (theoretical_population / max(0.1, germ_pct / 100.0)) * 1.05
        required_seed_kg = round(needed_seeds / seeds_per_kg, 2)
        seed_formula = (
            f"(({theoretical_population} target plants ÷ {germ_pct/100:.2f} germ) × 1.05) ÷ {seeds_per_kg} seeds/kg"
        )

    sow_dt = date.today()
    if sowing_date:
        try:
            sow_dt = date.fromisoformat(sowing_date[:10])
        except ValueError:
            pass
    harvest_dt = sow_dt + timedelta(days=v["duration_days"])

    # Growing Degree Days (base 10C for Maize, cap 30C)
    daily_gdd = round(max(0.0, min(30.0, mean_daily_temp_c) - 10.0), 2)

    stages_out = []
    for idx, name, code, p0, p1, desc in MAIZE_BIOLOGICAL_STAGES:
        d_start = int(round(p0 * v["duration_days"]))
        d_end = int(round(p1 * v["duration_days"]))
        stages_out.append(
            {
                "stage_number": idx,
                "name": name,
                "code": code,
                "start_day": d_start,
                "end_day": d_end,
                "description": desc,
            }
        )

    return {
        "data_quality": "ESTIMATED",
        "variety": v,
        "area_acres": round(area_acres, 3),
        "spacing_cm": {"row": row_cm, "plant": plant_cm},
        "germination_pct": germ_pct,
        "theoretical_plant_population": theoretical_population,
        "estimated_established_population": established_population,
        "estimated_seeds_per_kg": seeds_per_kg,
        "required_seed_kg": required_seed_kg,
        "estimated_seed_count": int(round(required_seed_kg * seeds_per_kg)),
        "seed_formula": seed_formula,
        "duration_days": v["duration_days"],
        "sowing_date": sow_dt.isoformat(),
        "expected_harvest_date": harvest_dt.isoformat(),
        "expected_yield_kg_range": [
            int(round(v["expected_yield_kg_per_acre_min"] * area_acres)),
            int(round(v["expected_yield_kg_per_acre_max"] * area_acres)),
        ],
        "daily_gdd_at_temp": daily_gdd,
        "gdd_to_maturity": v["gdd_maturity"],
        "biological_stages": stages_out,
    }
