"""
Scientific Disease Knowledge Base & Transmission Profiles for AD-40C.

Covers major diseases across 8 priority Indian crops:
Tomato, Chilli, Paddy, Maize, Potato, Cotton, Onion, Groundnut.

Design constraints:
- Explicit transmission vectors (airborne spores vs insect vector vs soil/water-borne vs rain splash).
- Never assumes all diseases spread through wind.
- Evidence-based cultural/IPM preventive recommendations without unsafe pesticide dosages.
- Recommends professional confirmation (KVK / Plant Clinic) when identity is uncertain.
"""
from typing import Any, Dict, List, Optional, Tuple


DISEASE_PROFILES: List[Dict[str, Any]] = [
    # --- TOMATO ---
    {
        "disease_id": "tomato_early_blight",
        "disease_name": "Early Blight (Alternaria solani)",
        "crop": "Tomato",
        "pathogen_type": "fungal",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 22.0,
        "incubation_half_life_days": 10.0,
        "favorable_temp_min_c": 22.0,
        "favorable_temp_max_c": 31.0,
        "favorable_humidity_min_pct": 70,
        "rain_trigger_mm": 3.0,
        "stage_weights": {
            "Initial": 0.75,
            "Crop Development": 0.95,
            "Mid-Season": 1.15,
            "Late Season": 1.25,
            "Harvest Ready": 1.1,
        },
        "typical_symptoms": [
            "Dark brown concentric rings (target-board lesions) on lower older leaves",
            "Yellow halo surrounding necrotic leaf spots",
            "Premature defoliation exposing fruits to sunscald",
        ],
        "preventive_actions": [
            "Prune and safely destroy heavily infected lower leaves away from the field.",
            "Switch from overhead sprinkler watering to morning drip irrigation to keep foliage dry.",
            "Ensure balanced potassium nutrition and widen plant spacing for canopy airflow.",
            "Inspect older leaves twice weekly and seek KVK / agronomist confirmation before targeted crop protection.",
        ],
        "scientific_references": [
            "ICAR-IIHR Tomato Integrated Pest & Disease Management Advisory",
            "TNAU Agritech Portal — Alternaria solani Epidemiology & Cultural Control",
        ],
    },
    {
        "disease_id": "tomato_late_blight",
        "disease_name": "Late Blight (Phytophthora infestans)",
        "crop": "Tomato",
        "pathogen_type": "oomycete",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 35.0,
        "incubation_half_life_days": 7.0,
        "favorable_temp_min_c": 14.0,
        "favorable_temp_max_c": 24.0,
        "favorable_humidity_min_pct": 82,
        "rain_trigger_mm": 2.0,
        "stage_weights": {
            "Initial": 0.9,
            "Crop Development": 1.1,
            "Mid-Season": 1.25,
            "Late Season": 1.25,
            "Harvest Ready": 1.15,
        },
        "typical_symptoms": [
            "Water-soaked pale green to dark brown patches spreading rapidly on leaves",
            "White cottony sporangial growth under leaves during cool humid mornings",
            "Firm greasy brown blotches on green and ripening fruits",
        ],
        "preventive_actions": [
            "Monitor cool overcast mornings closely; rogue and bag severely blighted plants immediately.",
            "Eliminate volunteer tomato/potato hosts and cull piles near irrigation channels.",
            "Avoid evening irrigation and improve ridge drainage during persistent rain.",
            "Consult local KVK plant pathologist urgently when rapid water-soaked lesions appear.",
        ],
        "scientific_references": [
            "ICAR-CPRI / IIHR Late Blight Early Warning Principles",
            "FAO Good Agricultural Practices for Solanaceous Oomycete Management",
        ],
    },
    {
        "disease_id": "tomato_tolcv",
        "disease_name": "Tomato Leaf Curl Virus (ToLCV)",
        "crop": "Tomato",
        "pathogen_type": "viral",
        "transmission_mode": "insect_vector",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 12.0,
        "incubation_half_life_days": 14.0,
        "favorable_temp_min_c": 26.0,
        "favorable_temp_max_c": 38.0,
        "favorable_humidity_min_pct": 35,
        "rain_trigger_mm": 0.0,
        "stage_weights": {
            "Initial": 1.3,
            "Crop Development": 1.2,
            "Mid-Season": 0.95,
            "Late Season": 0.7,
            "Harvest Ready": 0.55,
        },
        "typical_symptoms": [
            "Upward cupping and severe curling of young terminal leaves",
            "Interveinal yellowing, stunted bushy growth, and flower drop",
            "Presence of tiny whiteflies (Bemisia tabaci) on leaf undersides",
        ],
        "preventive_actions": [
            "Install yellow sticky traps (10–12 per acre) at canopy height to monitor whitefly vectors.",
            "Raise seedlings under 40-mesh insect-proof nylon net and plant resistant varieties such as Arka Rakshak.",
            "Rogue symptomatic young plants carefully in sealed bags to stop vector transmission.",
            "Remove Solanaceous weeds around bunds that harbor whiteflies.",
        ],
        "scientific_references": [
            "ICAR-IIHR Triple-Disease Resistant Tomato Guidelines (Arka Rakshak)",
            "NBAIR Integrated Vector Management for Bemisia tabaci",
        ],
    },
    {
        "disease_id": "tomato_bacterial_wilt",
        "disease_name": "Bacterial Wilt (Ralstonia solanacearum)",
        "crop": "Tomato",
        "pathogen_type": "bacterial",
        "transmission_mode": "soil_water_borne",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 5.0,
        "incubation_half_life_days": 18.0,
        "favorable_temp_min_c": 25.0,
        "favorable_temp_max_c": 35.0,
        "favorable_humidity_min_pct": 65,
        "rain_trigger_mm": 8.0,
        "stage_weights": {
            "Initial": 1.0,
            "Crop Development": 1.15,
            "Mid-Season": 1.2,
            "Late Season": 1.0,
            "Harvest Ready": 0.85,
        },
        "typical_symptoms": [
            "Sudden green wilting of entire plant during warm afternoon without leaf yellowing",
            "Milky bacterial ooze stream when cut stem base is suspended in clear water",
        ],
        "preventive_actions": [
            "Do NOT share surface runoff water or unwashed cultivating tools from affected plots.",
            "Prevent soil waterlogging on raised beds and rotate non-Solanaceous crops (maize/marigold).",
            "Graft onto wilt-resistant rootstock or choose IIHR-resistant hybrids in endemic pockets.",
            "Confirm via clean-water stem ooze test or local agricultural lab before soil treatment.",
        ],
        "scientific_references": [
            "ICAR-IIHR Soil-Borne Bacterial Wilt Management Protocol",
        ],
    },
    # --- CHILLI ---
    {
        "disease_id": "chilli_anthracnose",
        "disease_name": "Anthracnose / Fruit Rot (Colletotrichum capsici)",
        "crop": "Chilli",
        "pathogen_type": "fungal",
        "transmission_mode": "rain_splash",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 10.0,
        "incubation_half_life_days": 10.0,
        "favorable_temp_min_c": 24.0,
        "favorable_temp_max_c": 32.0,
        "favorable_humidity_min_pct": 80,
        "rain_trigger_mm": 5.0,
        "stage_weights": {
            "Initial": 0.65,
            "Crop Development": 0.85,
            "Mid-Season": 1.15,
            "Late Season": 1.3,
            "Harvest Ready": 1.25,
        },
        "typical_symptoms": [
            "Sunken circular brown-black lesions on maturing green and red chilli pods",
            "Concentric rings of salmon-pink spore masses inside pod lesions after rain",
            "Dieback of tender apical twigs",
        ],
        "preventive_actions": [
            "Pick and remove infected pods before rainwater splashes conidia onto healthy fruits.",
            "Maintain weed-free ridges and drain standing rainwater quickly.",
            "Use disease-free certified seed and avoid harvesting while foliage is wet.",
        ],
        "scientific_references": [
            "ICAR-IIVR / TNAU Chilli Dieback and Fruit Rot Management",
        ],
    },
    {
        "disease_id": "chilli_leaf_curl",
        "disease_name": "Chilli Leaf Curl Complex",
        "crop": "Chilli",
        "pathogen_type": "viral",
        "transmission_mode": "insect_vector",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 12.0,
        "incubation_half_life_days": 14.0,
        "favorable_temp_min_c": 26.0,
        "favorable_temp_max_c": 37.0,
        "favorable_humidity_min_pct": 35,
        "rain_trigger_mm": 0.0,
        "stage_weights": {
            "Initial": 1.25,
            "Crop Development": 1.2,
            "Mid-Season": 1.0,
            "Late Season": 0.75,
            "Harvest Ready": 0.6,
        },
        "typical_symptoms": [
            "Upward curling (thrips) or downward cupping (mites) with thickened distorted veins",
            "Stunted internodes and reduced pod set",
        ],
        "preventive_actions": [
            "Deploy blue & yellow sticky traps and border barrier rows (e.g., maize/sorghum).",
            "Rogue heavily curled plants early and confirm thrips vs mite vs virus pressure with KVK.",
        ],
        "scientific_references": [
            "TNAU Crop Protection Guide — Chilli Leaf Curl Complex",
        ],
    },
    # --- PADDY ---
    {
        "disease_id": "paddy_blast",
        "disease_name": "Rice Blast (Magnaporthe oryzae)",
        "crop": "Paddy",
        "pathogen_type": "fungal",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 30.0,
        "incubation_half_life_days": 9.0,
        "favorable_temp_min_c": 20.0,
        "favorable_temp_max_c": 28.0,
        "favorable_humidity_min_pct": 85,
        "rain_trigger_mm": 2.0,
        "stage_weights": {
            "Initial": 0.9,
            "Crop Development": 1.15,
            "Mid-Season": 1.2,
            "Late Season": 1.3,
            "Harvest Ready": 0.85,
        },
        "typical_symptoms": [
            "Spindle-shaped or diamond-shaped lesions with gray centers and brown margins on leaves",
            "Blackish necrotic lesions on panicle neck causing chaffy white earheads",
        ],
        "preventive_actions": [
            "Avoid excessive nitrogen top-dressing, which creates lush blast-susceptible foliage.",
            "Maintain shallow standing water rather than alternating drought stress.",
            "Destroy collateral grass hosts along bunds and request KVK inspection during panicle emergence.",
        ],
        "scientific_references": [
            "ICAR-NRRI / IRRI Rice Blast Surveillance & Nitrogen Balance Advisory",
        ],
    },
    {
        "disease_id": "paddy_bacterial_blight",
        "disease_name": "Bacterial Leaf Blight (Xanthomonas oryzae)",
        "crop": "Paddy",
        "pathogen_type": "bacterial",
        "transmission_mode": "rain_splash",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 15.0,
        "incubation_half_life_days": 10.0,
        "favorable_temp_min_c": 25.0,
        "favorable_temp_max_c": 34.0,
        "favorable_humidity_min_pct": 80,
        "rain_trigger_mm": 6.0,
        "stage_weights": {
            "Initial": 0.85,
            "Crop Development": 1.15,
            "Mid-Season": 1.25,
            "Late Season": 1.1,
            "Harvest Ready": 0.75,
        },
        "typical_symptoms": [
            "Yellowish-white wavy water-soaked streaks starting from leaf tips and margins",
            "Milky bacterial droplets drying as yellowish beads on young leaf surfaces in mornings",
        ],
        "preventive_actions": [
            "Drain standing field water temporarily during severe outbreaks and halt nitrogen urea application.",
            "Prevent paddy field-to-field water overflow from upstream infected plots.",
        ],
        "scientific_references": [
            "ICAR-IIRR Bacterial Leaf Blight Integrated Management",
        ],
    },
    # --- MAIZE ---
    {
        "disease_id": "maize_nclb",
        "disease_name": "Northern Corn Leaf Blight (Exserohilum turcicum)",
        "crop": "Maize",
        "pathogen_type": "fungal",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 25.0,
        "incubation_half_life_days": 11.0,
        "favorable_temp_min_c": 18.0,
        "favorable_temp_max_c": 27.0,
        "favorable_humidity_min_pct": 80,
        "rain_trigger_mm": 3.0,
        "stage_weights": {
            "Initial": 0.7,
            "Crop Development": 1.0,
            "Mid-Season": 1.25,
            "Late Season": 1.15,
            "Harvest Ready": 0.7,
        },
        "typical_symptoms": [
            "Long elliptical cigar-shaped grayish-green to tan lesions (2.5–15 cm) along leaves",
            "Lower leaves affected first before progressing toward ear leaves",
        ],
        "preventive_actions": [
            "Scout ear-leaf and surrounding leaves weekly from knee-high to silking.",
            "Incorporate or remove infected crop residue after harvest and rotate with pulses/oilseeds.",
        ],
        "scientific_references": [
            "ICAR-IIMR Maize Pathology & Residue Management Compendium",
        ],
    },
    {
        "disease_id": "maize_stalk_rot",
        "disease_name": "Maize Bacterial/Charcoal Stalk Rot",
        "crop": "Maize",
        "pathogen_type": "bacterial",
        "transmission_mode": "soil_water_borne",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 6.0,
        "incubation_half_life_days": 15.0,
        "favorable_temp_min_c": 28.0,
        "favorable_temp_max_c": 38.0,
        "favorable_humidity_min_pct": 55,
        "rain_trigger_mm": 10.0,
        "stage_weights": {
            "Initial": 0.5,
            "Crop Development": 0.75,
            "Mid-Season": 1.1,
            "Late Season": 1.3,
            "Harvest Ready": 1.15,
        },
        "typical_symptoms": [
            "Softening or hollowing of lower internodes leading to plant lodging",
            "Foul odor (bacterial) or shredded dark pith (charcoal rot) inside split stalks",
        ],
        "preventive_actions": [
            "Avoid prolonged moisture stress during grain filling followed by sudden waterlogging.",
            "Improve field drainage and harvest lodged cobs early to avoid soil contamination.",
        ],
        "scientific_references": [
            "ICAR-IIMR / CIMMYT Maize Stalk Rot Guidelines",
        ],
    },
    # --- POTATO ---
    {
        "disease_id": "potato_late_blight",
        "disease_name": "Potato Late Blight (Phytophthora infestans)",
        "crop": "Potato",
        "pathogen_type": "oomycete",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 38.0,
        "incubation_half_life_days": 6.0,
        "favorable_temp_min_c": 12.0,
        "favorable_temp_max_c": 22.0,
        "favorable_humidity_min_pct": 85,
        "rain_trigger_mm": 1.5,
        "stage_weights": {
            "Initial": 0.85,
            "Crop Development": 1.15,
            "Mid-Season": 1.3,
            "Late Season": 1.25,
            "Harvest Ready": 1.0,
        },
        "typical_symptoms": [
            "Rapidly expanding dark water-soaked foliage lesions with white mildew ring underneath",
            "Blackened stems and firm reddish-brown tuber rot beneath skin",
        ],
        "preventive_actions": [
            "Earth up ridges properly to shield developing tubers from washed-down spores.",
            "Dehaulm (cut and remove infected tops) cleanly before digging tubers in wet conditions.",
            "Seek immediate KVK advisory when night humidity exceeds 85% with cool temperatures.",
        ],
        "scientific_references": [
            "ICAR-CPRI Indo-Blightcast Forecasting Principles",
        ],
    },
    # --- COTTON ---
    {
        "disease_id": "cotton_leaf_curl",
        "disease_name": "Cotton Leaf Curl Virus (CLCuV)",
        "crop": "Cotton",
        "pathogen_type": "viral",
        "transmission_mode": "insect_vector",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 14.0,
        "incubation_half_life_days": 14.0,
        "favorable_temp_min_c": 28.0,
        "favorable_temp_max_c": 40.0,
        "favorable_humidity_min_pct": 40,
        "rain_trigger_mm": 0.0,
        "stage_weights": {
            "Initial": 1.3,
            "Crop Development": 1.2,
            "Mid-Season": 0.95,
            "Late Season": 0.7,
            "Harvest Ready": 0.5,
        },
        "typical_symptoms": [
            "Thickened dark-green veins and cup-shaped leaf-like outgrowths (enations) under leaves",
            "Upward or downward leaf curling with stunted sympodial branching",
        ],
        "preventive_actions": [
            "Monitor whitefly population early using yellow sticky cards and remove malvaceous weeds.",
            "Prioritize tolerant hybrids/varieties and avoid excess nitrogen fertilization.",
        ],
        "scientific_references": [
            "ICAR-CICR Whitefly & Cotton Leaf Curl Advisory",
        ],
    },
    {
        "disease_id": "cotton_bacterial_blight",
        "disease_name": "Cotton Bacterial Blight / Angular Leaf Spot",
        "crop": "Cotton",
        "pathogen_type": "bacterial",
        "transmission_mode": "rain_splash",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 12.0,
        "incubation_half_life_days": 11.0,
        "favorable_temp_min_c": 26.0,
        "favorable_temp_max_c": 35.0,
        "favorable_humidity_min_pct": 78,
        "rain_trigger_mm": 5.0,
        "stage_weights": {
            "Initial": 0.9,
            "Crop Development": 1.1,
            "Mid-Season": 1.2,
            "Late Season": 1.05,
            "Harvest Ready": 0.8,
        },
        "typical_symptoms": [
            "Angular water-soaked leaf spots bounded by small veins turning dark brown/black",
            "Black stem lesions (black arm) and sunken greasy boll spots",
        ],
        "preventive_actions": [
            "Avoid field entry or inter-cultivation while cotton foliage is wet after rain.",
            "Use acid-delinted certified seed and deep-incorporate infected stalks post-harvest.",
        ],
        "scientific_references": [
            "ICAR-CICR Bacterial Blight Surveillance Manual",
        ],
    },
    # --- ONION ---
    {
        "disease_id": "onion_purple_blotch",
        "disease_name": "Purple Blotch (Alternaria porri)",
        "crop": "Onion",
        "pathogen_type": "fungal",
        "transmission_mode": "airborne_spores",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 20.0,
        "incubation_half_life_days": 10.0,
        "favorable_temp_min_c": 21.0,
        "favorable_temp_max_c": 30.0,
        "favorable_humidity_min_pct": 78,
        "rain_trigger_mm": 3.0,
        "stage_weights": {
            "Initial": 0.8,
            "Crop Development": 1.1,
            "Mid-Season": 1.25,
            "Late Season": 1.2,
            "Harvest Ready": 0.9,
        },
        "typical_symptoms": [
            "Small sunken whitish flecks enlarging into purplish-brown zonate lesions on tubular leaves",
            "Girdled leaves yellowing and snapping downward from lesion sites",
        ],
        "preventive_actions": [
            "Manage onion thrips simultaneously because thrips feeding punctures accelerate Alternaria entry.",
            "Irrigate via drip or furrow on well-drained raised beds rather than overhead sprinklers.",
        ],
        "scientific_references": [
            "ICAR-DOGR Onion & Garlic Purple Blotch Integrated Advisory",
        ],
    },
    # --- GROUNDNUT ---
    {
        "disease_id": "groundnut_tikka",
        "disease_name": "Tikka Leaf Spot (Early & Late Leaf Spot)",
        "crop": "Groundnut",
        "pathogen_type": "fungal",
        "transmission_mode": "rain_splash",
        "wind_dispersal_relevant": True,
        "max_effective_spread_km": 16.0,
        "incubation_half_life_days": 12.0,
        "favorable_temp_min_c": 24.0,
        "favorable_temp_max_c": 32.0,
        "favorable_humidity_min_pct": 78,
        "rain_trigger_mm": 4.0,
        "stage_weights": {
            "Initial": 0.7,
            "Crop Development": 1.0,
            "Mid-Season": 1.25,
            "Late Season": 1.2,
            "Harvest Ready": 0.85,
        },
        "typical_symptoms": [
            "Circular dark brown to black spots with bright yellow halo (early) or black velvet undersides (late)",
            "Severe defoliation weakening peg strength prior to pod maturity",
        ],
        "preventive_actions": [
            "Remove volunteer groundnut plants and practice cereal/pulse rotation next season.",
            "Avoid excessive canopy moisture and consult local KVK for safe protective threshold spraying.",
        ],
        "scientific_references": [
            "ICAR-DGR Groundnut Foliar Disease Management Guide",
        ],
    },
    {
        "disease_id": "groundnut_stem_rot",
        "disease_name": "Groundnut Stem Rot (Sclerotium rolfsii)",
        "crop": "Groundnut",
        "pathogen_type": "fungal",
        "transmission_mode": "soil_water_borne",
        "wind_dispersal_relevant": False,
        "max_effective_spread_km": 4.0,
        "incubation_half_life_days": 18.0,
        "favorable_temp_min_c": 26.0,
        "favorable_temp_max_c": 36.0,
        "favorable_humidity_min_pct": 70,
        "rain_trigger_mm": 6.0,
        "stage_weights": {
            "Initial": 0.9,
            "Crop Development": 1.05,
            "Mid-Season": 1.2,
            "Late Season": 1.2,
            "Harvest Ready": 1.0,
        },
        "typical_symptoms": [
            "Sudden wilting of lateral branches with white fan-like mycelial mat at soil collar",
            "Mustard-seed-sized brown sclerotia clustered around stem base",
        ],
        "preventive_actions": [
            "Avoid throwing soil/crop trash against stem collars during inter-cultivation.",
            "Improve drainage and rotate with non-host cereals.",
        ],
        "scientific_references": [
            "ICAR-DGR Soil-Borne Disease Management Bulletin",
        ],
    },
]

SUPPORTED_CROPS: List[str] = [
    "Tomato",
    "Chilli",
    "Paddy",
    "Maize",
    "Potato",
    "Cotton",
    "Onion",
    "Groundnut",
]

DEFAULT_UNKNOWN_PROFILE: Dict[str, Any] = {
    "disease_id": "unclassified_crop_condition",
    "disease_name": "Unclassified Crop Disease / Symptom",
    "crop": "General",
    "pathogen_type": "unknown",
    "transmission_mode": "unknown",
    "wind_dispersal_relevant": False,
    "max_effective_spread_km": 10.0,
    "incubation_half_life_days": 10.0,
    "favorable_temp_min_c": 20.0,
    "favorable_temp_max_c": 32.0,
    "favorable_humidity_min_pct": 75,
    "rain_trigger_mm": 4.0,
    "stage_weights": {
        "Initial": 0.9,
        "Crop Development": 1.0,
        "Mid-Season": 1.05,
        "Late Season": 1.05,
        "Harvest Ready": 0.95,
    },
    "typical_symptoms": [
        "Abnormal leaf spotting, wilting, yellowing, curling, or lesion formation",
    ],
    "preventive_actions": [
        "Isolate or tag suspected symptomatic plants and avoid moving soil/tools across plots.",
        "Capture sharp daylight photos of leaf undersides and stem collars for KVK / plant clinic confirmation.",
        "Avoid unverified broad-spectrum chemical sprays until pathogen identity is confirmed.",
    ],
    "scientific_references": [
        "ICAR National Plant Protection & Integrated Pest Management Framework",
    ],
}


def resolve_disease_profile(crop: Optional[str], disease_name: Optional[str]) -> Tuple[Dict[str, Any], bool]:
    """
    Matches crop + disease string cleanly against scientific profiles.
    Returns (profile_dict, is_exact_known_match).
    """
    d_low = (disease_name or "").strip().lower()
    c_low = (crop or "").strip().lower()

    if not d_low:
        return dict(DEFAULT_UNKNOWN_PROFILE, crop=crop or "General"), False

    for p in DISEASE_PROFILES:
        p_crop = p["crop"].lower()
        p_name = p["disease_name"].lower()
        p_id = p["disease_id"].lower()
        if d_low == p_name or d_low == p_id:
            return p, True
        if c_low and p_crop == c_low and (d_low in p_name or any(tok in p_name for tok in d_low.split() if len(tok) >= 4)):
            return p, True

    for p in DISEASE_PROFILES:
        p_name = p["disease_name"].lower()
        if d_low in p_name or any(tok in p_name for tok in d_low.split() if len(tok) >= 5):
            return p, True

    fallback = dict(DEFAULT_UNKNOWN_PROFILE)
    fallback["crop"] = crop or "General"
    fallback["disease_name"] = disease_name or "Unclassified Crop Condition"
    return fallback, False


def list_guidance_catalog(crop: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns scientific guidance entries filtered optionally by crop."""
    if not crop:
        return DISEASE_PROFILES
    c_low = crop.strip().lower()
    return [p for p in DISEASE_PROFILES if p["crop"].lower() == c_low]
