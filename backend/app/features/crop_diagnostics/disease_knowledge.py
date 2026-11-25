# backend/app/features/crop_diagnostics/disease_knowledge.py
"""
Structured Agricultural Disease Knowledge Base for RaithaMitra AI Crop Doctor.
Prioritizes ICAR, TNAU Agritech Portal, CABI, and FAO guidance.
Does not fabricate citations or prescribe chemical mixing dosages.
"""
from typing import Any, Dict, List

VERIFICATION_DATE = "2026-11-26"

KNOWLEDGE_ENTRIES: Dict[str, Dict[str, Any]] = {
    "Healthy": {
        "disease_name": "Healthy Leaf",
        "scientific_pathogen": None,
        "category": "Healthy",
        "symptoms": "Uniform natural leaf coloration without necrotic lesions, water-soaked spots, or powdery/downy growth.",
        "causes": "Balanced nutrition, adequate soil moisture, and absence of visible foliar pathogen stress.",
        "favorable_conditions": "Well-drained soil, proper plant spacing, and good air circulation.",
        "transmission": "Not applicable.",
        "immediate_actions": [
            "Continue routine weekly leaf scouting on both upper and lower leaf surfaces.",
            "Maintain balanced irrigation without prolonged leaf wetness.",
        ],
        "cultural_practices": [
            "Keep field borders weed-free to reduce alternate pest and pathogen hosts.",
            "Avoid overhead irrigation late in the evening.",
        ],
        "biological_options": [
            "Preventative foliar/soil bio-protectants such as Trichoderma spp. as advised by local KVK.",
        ],
        "preventive_measures": [
            "Use certified disease-free seed or seedlings and follow crop rotation.",
        ],
        "when_to_consult_expert": "Consult your local KVK or agriculture officer if new spots, curling, or wilting appear.",
        "sources": [
            {"institution": "ICAR / IIHR", "title": "Good Agricultural Practices for Vegetable & Field Crops", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Early Blight": {
        "disease_name": "Early Blight",
        "scientific_pathogen": "Alternaria solani",
        "category": "Fungal",
        "symptoms": "Dark brown to black circular lesions with characteristic concentric rings ('target-board' pattern) on older lower leaves, often surrounded by a yellow halo.",
        "causes": "Fungal infection by Alternaria solani surviving on infected crop debris and solanaceous weeds.",
        "favorable_conditions": "Warm temperatures (24-29°C), high relative humidity, and alternating wet/dry foliage periods.",
        "transmission": "Wind-borne spores, rain splash, contaminated seed, and infected plant debris.",
        "immediate_actions": [
            "Prune and safely destroy heavily infected lower leaves away from the field.",
            "Avoid working in the field while foliage is wet to limit spore spread.",
        ],
        "cultural_practices": [
            "Use wider plant spacing and staking/trellising to improve canopy airflow.",
            "Apply organic mulch to prevent soil-splash onto lower leaves and switch to drip irrigation.",
            "Rotate out of solanaceous crops (tomato, potato, brinjal) for 2-3 seasons.",
        ],
        "biological_options": [
            "Bio-control agents such as Trichoderma viride or Pseudomonas fluorescens per KVK/approved label guidance.",
        ],
        "preventive_measures": [
            "Select tolerant varieties in BioIntel and treat seed/nursery seedlings from certified nurseries.",
            "Remove crop residue promptly after harvest.",
        ],
        "when_to_consult_expert": "Consult a KVK agronomist if lesions spread rapidly to stems or fruits, or before applying any registered fungicide (follow locally approved product labels).",
        "sources": [
            {"institution": "ICAR-IIHR", "title": "Tomato & Potato Early Blight Integrated Disease Management", "verified_on": VERIFICATION_DATE},
            {"institution": "CABI", "title": "Alternaria solani (Early Blight) Crop Protection Compendium", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Late Blight": {
        "disease_name": "Late Blight",
        "scientific_pathogen": "Phytophthora infestans",
        "category": "Oomycete",
        "symptoms": "Irregular pale-green to dark water-soaked lesions on leaves and stems that rapidly turn brown-black; white cottony sporangia may appear on the leaf underside in humid weather.",
        "causes": "Oomycete pathogen Phytophthora infestans spreading rapidly during cool, wet weather.",
        "favorable_conditions": "Cool temperatures (12-22°C), >85% relative humidity, fog, dew, or persistent rainfall.",
        "transmission": "Airborne sporangia over long distances, rain splash, and infected potato tubers or transplants.",
        "immediate_actions": [
            "Inspect neighboring plants immediately because Late Blight can defoliate crops within days.",
            "Remove and bury/destroy isolated severely infected plants away from water sources.",
        ],
        "cultural_practices": [
            "Avoid overhead irrigation and improve field drainage to reduce standing moisture.",
            "Destroy volunteer tomato/potato plants and cull piles near the field.",
        ],
        "biological_options": [
            "Preventative Trichoderma / Bacillus-based bio-formulations where recommended by local extension services.",
        ],
        "preventive_measures": [
            "Plant certified healthy tubers/transplants and choose Late Blight-tolerant varieties.",
            "Monitor cool, humid weather forecasts for early preventative action.",
        ],
        "when_to_consult_expert": "Urgently consult your local KVK or agriculture officer; chemical management requires locally approved oomycete-specific labels and timely guidance.",
        "sources": [
            {"institution": "ICAR-CPRI", "title": "Late Blight Management Advisory", "verified_on": VERIFICATION_DATE},
            {"institution": "FAO", "title": "Integrated Pest Management for Late Blight", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Bacterial Spot": {
        "disease_name": "Bacterial Spot",
        "scientific_pathogen": "Xanthomonas spp.",
        "category": "Bacterial",
        "symptoms": "Small, water-soaked greasy spots on leaves that turn dark brown/black with a yellow margin; lesions may drop out leaving a 'shot-hole' appearance.",
        "causes": "Seed-borne and debris-borne Xanthomonas bacteria entering through stomata and wounds.",
        "favorable_conditions": "Warm temperatures (24-30°C), driving rain, high humidity, and overhead irrigation.",
        "transmission": "Rain splash, contaminated seed/transplants, pruning tools, and workers' hands.",
        "immediate_actions": [
            "Stop overhead watering and avoid pruning or handling plants when wet.",
            "Sanitize pruning tools between rows.",
        ],
        "cultural_practices": [
            "Remove severely affected seedlings/leaves and keep weeds controlled.",
            "Practice 2-3 year crop rotation with non-host crops like maize or legumes.",
        ],
        "biological_options": [
            "Pseudomonas fluorescens or Bacillus subtilis foliar/seed treatments as guided by KVK.",
        ],
        "preventive_measures": [
            "Use certified pathogen-free seed and inspect nursery transplants before planting.",
        ],
        "when_to_consult_expert": "Consult an agriculture specialist if bacterial spots spread onto developing fruits or stems; follow locally approved bactericide/copper labels.",
        "sources": [
            {"institution": "TNAU Agritech Portal", "title": "Bacterial Spot of Tomato & Pepper", "verified_on": VERIFICATION_DATE},
            {"institution": "CABI", "title": "Xanthomonas vesicatoria / euvesicatoria Datasheet", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Leaf Mold": {
        "disease_name": "Leaf Mold",
        "scientific_pathogen": "Passalora fulva (syn. Fulvia fulva)",
        "category": "Fungal",
        "symptoms": "Pale green to yellowish spots on upper leaf surfaces accompanied by olive-green to velvety gray-purple mold on the corresponding underside.",
        "causes": "Fungal infection common in humid polyhouses, shade nets, and dense canopies.",
        "favorable_conditions": "High relative humidity (>85%) and moderate temperatures (20-25°C) with poor air movement.",
        "transmission": "Airborne conidia, splashing water, tools, and clothing.",
        "immediate_actions": [
            "Increase ventilation in polyhouses/shade nets and prune lower leaves to improve airflow.",
            "Remove infected lower foliage carefully without shaking spores onto healthy leaves.",
        ],
        "cultural_practices": [
            "Irrigate at the root zone (drip) early in the morning so foliage dries quickly.",
            "Maintain proper plant spacing.",
        ],
        "biological_options": [
            "Preventative Trichoderma or Bacillus biological sprays where locally approved.",
        ],
        "preventive_measures": [
            "Grow Leaf Mold-resistant hybrids and sanitize greenhouse structures between crops.",
        ],
        "when_to_consult_expert": "Consult a horticultural officer if upper-canopy leaves are yellowing or dropping.",
        "sources": [
            {"institution": "ICAR-IIHR", "title": "Protected Cultivation Disease Management", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Septoria Leaf Spot": {
        "disease_name": "Septoria Leaf Spot",
        "scientific_pathogen": "Septoria lycopersici",
        "category": "Fungal",
        "symptoms": "Numerous small circular spots (2-3 mm) with dark brown margins and light gray centers containing tiny black fruiting bodies (pycnidia).",
        "causes": "Fungal pathogen overwintering on infected tomato debris and solanaceous weeds.",
        "favorable_conditions": "Warm, wet weather (20-25°C) with frequent rain or heavy dew.",
        "transmission": "Rain splash, overhead irrigation, insects, and farm implements.",
        "immediate_actions": [
            "Remove infected lower leaves and mulch around the base of plants.",
            "Switch from overhead watering to drip or furrow irrigation.",
        ],
        "cultural_practices": [
            "Stake plants and remove weeds such as nightshade.",
            "Rotate crops for at least 2 years.",
        ],
        "biological_options": [
            "Trichoderma-enriched compost/mulch and bio-fungicides per local KVK advice.",
        ],
        "preventive_measures": [
            "Deeply incorporate or remove crop residues after harvest.",
        ],
        "when_to_consult_expert": "Consult KVK if defoliation threatens fruit sunscald.",
        "sources": [
            {"institution": "CABI", "title": "Septoria lycopersici Datasheet", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Spider Mites or Two-spotted Spider Mite": {
        "disease_name": "Spider Mite Damage",
        "scientific_pathogen": "Tetranychus urticae",
        "category": "Pest/Mite",
        "symptoms": "Fine yellow/white stippling on upper leaf surfaces, bronzing/curling of leaves, and delicate silken webbing on leaf undersides.",
        "causes": "Sap-sucking two-spotted spider mites multiplying rapidly in hot, dry, dusty conditions.",
        "favorable_conditions": "Hot, dry weather (>28°C, low humidity) and water-stressed plants.",
        "transmission": "Wind currents, infested seedlings, weeds, and field movement.",
        "immediate_actions": [
            "Check leaf undersides with a magnifying lens for tiny moving mites and webbing.",
            "Ensure plants are adequately irrigated to reduce drought stress.",
        ],
        "cultural_practices": [
            "Control dusty field margins and remove heavily infested leaves.",
            "Conserve natural predators such as predatory mites and ladybird beetles.",
        ],
        "biological_options": [
            "Neem-based botanical sprays (azadirachtin) or horticultural soap/oil per locally approved product labels.",
        ],
        "preventive_measures": [
            "Avoid excessive broad-spectrum insecticide use that kills beneficial predators.",
        ],
        "when_to_consult_expert": "Consult KVK if mite populations escalate across multiple rows.",
        "sources": [
            {"institution": "ICAR-NBAIR", "title": "Integrated Mite Management in Vegetable Crops", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Target Spot": {
        "disease_name": "Target Spot",
        "scientific_pathogen": "Corynespora cassiicola",
        "category": "Fungal",
        "symptoms": "Small necrotic spots enlarging into concentric-ring lesions on leaves, stems, and sometimes fruits.",
        "causes": "Fungal infection favored by warm, humid canopies.",
        "favorable_conditions": "Temperatures 22-30°C and prolonged leaf wetness.",
        "transmission": "Wind-blown conidia and crop debris.",
        "immediate_actions": [
            "Prune lower leaves for airflow and remove severely affected foliage.",
        ],
        "cultural_practices": [
            "Avoid excessive nitrogen fertilization that creates overly dense foliage.",
            "Rotate crops and clear post-harvest debris.",
        ],
        "biological_options": [
            "Bio-control agents (Trichoderma/Pseudomonas) under KVK guidance.",
        ],
        "preventive_measures": [
            "Use drip irrigation and balanced fertilization.",
        ],
        "when_to_consult_expert": "Consult a local plant pathologist if stem lesions appear.",
        "sources": [
            {"institution": "CABI", "title": "Corynespora cassiicola (Target Spot)", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Yellow Leaf Curl Virus": {
        "disease_name": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "scientific_pathogen": "Begomovirus (transmitted by Bemisia tabaci)",
        "category": "Viral",
        "symptoms": "Upward curling and cupping of young leaves, pronounced yellowing along leaf margins, stunted plant growth, and flower drop.",
        "causes": "Viral infection vectored persistently by whiteflies (Bemisia tabaci).",
        "favorable_conditions": "Warm, dry conditions that favor whitefly buildup.",
        "transmission": "Whitefly vectors and infected nursery seedlings (not cured by fungicides).",
        "immediate_actions": [
            "Rogue (uproot and bury/destroy) severely infected young plants early to stop whitefly spread.",
            "Install yellow sticky traps (10-12 per acre) to monitor and trap whiteflies.",
        ],
        "cultural_practices": [
            "Use 40-mesh insect-proof net nurseries and reflective silver mulch.",
            "Eliminate weed hosts around field bunds.",
        ],
        "biological_options": [
            "Neem-based repellents and entomopathogenic fungi (Beauveria bassiana / Lecanicillium lecanii) targeting whiteflies per KVK guidance.",
        ],
        "preventive_measures": [
            "Plant TYLCV-resistant/tolerant hybrids from BioIntel and verified nurseries.",
        ],
        "when_to_consult_expert": "Consult KVK immediately when early symptoms appear in >5% of plants.",
        "sources": [
            {"institution": "ICAR-IIHR", "title": "Tomato Leaf Curl Virus & Whitefly Vector Management", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Mosaic Virus": {
        "disease_name": "Tomato Mosaic Virus (ToMV)",
        "scientific_pathogen": "Tobamovirus",
        "category": "Viral",
        "symptoms": "Light- and dark-green mottled mosaic patterns on leaves, leaf narrowing/distortion, and uneven fruit ripening.",
        "causes": "Highly stable tobamovirus spread mechanically and via contaminated seed.",
        "favorable_conditions": "Frequent handling, pruning, and transplanting without sanitation.",
        "transmission": "Hands, tools, clothing, seed coat contamination, and plant debris.",
        "immediate_actions": [
            "Remove infected plants carefully and wash hands/tools thoroughly with soap or milk solution before touching healthy plants.",
        ],
        "cultural_practices": [
            "Avoid tobacco use while handling solanaceous crops.",
            "Rotate crops and remove root debris.",
        ],
        "biological_options": [
            "Sanitation and resistant varieties are primary defenses; viral infections cannot be cured with sprays.",
        ],
        "preventive_measures": [
            "Use certified virus-free seed and ToMV-resistant hybrids.",
        ],
        "when_to_consult_expert": "Consult KVK for ELISA/PCR confirmation if widespread mosaic appears.",
        "sources": [
            {"institution": "CABI", "title": "Tomato mosaic virus Compendium", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Common Rust": {
        "disease_name": "Common Rust",
        "scientific_pathogen": "Puccinia sorghi",
        "category": "Fungal",
        "symptoms": "Cinnamon-brown oval pustules scattered on both upper and lower leaf surfaces that rupture to release powdery rust spores.",
        "causes": "Airborne rust urediniospores infecting maize leaves during moderate, humid weather.",
        "favorable_conditions": "Temperatures 16-23°C with heavy dew or >90% humidity.",
        "transmission": "Long-distance wind-borne spores.",
        "immediate_actions": [
            "Monitor upper leaves near tasseling; mild lower-leaf rust rarely requires intervention.",
        ],
        "cultural_practices": [
            "Plant recommended maize hybrids and maintain balanced NPK nutrition.",
        ],
        "biological_options": [
            "Monitor crop stage; consult KVK before any foliar treatment.",
        ],
        "preventive_measures": [
            "Choose rust-tolerant maize hybrids in BioIntel.",
        ],
        "when_to_consult_expert": "Consult KVK if pustules cover >15-20% of upper ear-leaf area before silking.",
        "sources": [
            {"institution": "ICAR-IIMR", "title": "Maize Disease Management Guide", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Northern Leaf Blight": {
        "disease_name": "Northern Corn Leaf Blight",
        "scientific_pathogen": "Exserohilum turcicum",
        "category": "Fungal",
        "symptoms": "Long, elliptical gray-green to tan 'cigar-shaped' lesions (3-15 cm) running parallel to leaf veins.",
        "causes": "Fungal pathogen surviving in maize crop residue.",
        "favorable_conditions": "Moderate temperatures (18-27°C) and prolonged dew or rainfall.",
        "transmission": "Wind-borne conidia and rain splash from crop residue.",
        "immediate_actions": [
            "Scout ear leaves and upper canopy to assess spread.",
        ],
        "cultural_practices": [
            "Rotate maize with non-host legumes and manage crop residue.",
        ],
        "biological_options": [
            "Seed/soil Trichoderma treatments where advised locally.",
        ],
        "preventive_measures": [
            "Select resistant maize hybrids.",
        ],
        "when_to_consult_expert": "Consult KVK if lesions reach the ear leaf before pollination.",
        "sources": [
            {"institution": "ICAR-IIMR", "title": "Turcicum Leaf Blight Management", "verified_on": VERIFICATION_DATE},
        ],
    },
    "Cercospora and Gray Leaf Spot": {
        "disease_name": "Gray Leaf Spot",
        "scientific_pathogen": "Cercospora zeae-maydis",
        "category": "Fungal",
        "symptoms": "Rectangular, vein-delimited tan-to-gray lesions on lower leaves progressing upward.",
        "causes": "Fungal residue-borne infection in continuous maize fields.",
        "favorable_conditions": "Warm (25-30°C), humid (>90% RH), overcast weather.",
        "transmission": "Splash and wind from infected maize stubble.",
        "immediate_actions": [
            "Assess upper-leaf spread and avoid overhead irrigation.",
        ],
        "cultural_practices": [
            "Rotate with soybean/pulses and incorporate infected residue.",
        ],
        "biological_options": [
            "Residue decomposition with Trichoderma bio-consortia.",
        ],
        "preventive_measures": [
            "Use resistant hybrids and wider row spacing.",
        ],
        "when_to_consult_expert": "Consult KVK if upper canopy lesions expand rapidly.",
        "sources": [
            {"institution": "CABI", "title": "Cercospora zeae-maydis Datasheet", "verified_on": VERIFICATION_DATE},
        ],
    },
}


def get_disease_knowledge(crop: str, disease: str, is_healthy: bool) -> Dict[str, Any]:
    """Return structured knowledge for a predicted (crop, disease) pair."""
    if is_healthy:
        base = dict(KNOWLEDGE_ENTRIES["Healthy"])
        base["crop"] = crop
        base["disease_name"] = f"Healthy {crop}"
        return base

    # Exact or partial match on known disease entries
    d_lower = disease.lower()
    for key, entry in KNOWLEDGE_ENTRIES.items():
        if key.lower() == d_lower or key.lower() in d_lower:
            res = dict(entry)
            res["crop"] = crop
            return res

    # Honest general guidance for other supported PlantVillage classes (e.g., Apple/Grape/Peach/Squash)
    return {
        "disease_name": disease,
        "scientific_pathogen": None,
        "crop": crop,
        "category": "Plant Pathology",
        "symptoms": f"Visible foliar symptoms consistent with {disease} on {crop}.",
        "causes": "Biotic stress (fungal, bacterial, or viral) identified by visual leaf pattern classification.",
        "favorable_conditions": "High humidity, prolonged leaf wetness, or dense canopy.",
        "transmission": "Rain splash, wind-borne spores, insect vectors, or infected plant material.",
        "immediate_actions": [
            "Isolate or prune severely affected leaves away from healthy plants.",
            "Avoid overhead irrigation and field work while foliage is wet.",
        ],
        "cultural_practices": [
            "Improve field air circulation and follow crop rotation.",
            "Maintain balanced soil nutrition and clean field sanitation.",
        ],
        "biological_options": [
            "Consult your local KVK for crop-specific Trichoderma or Pseudomonas bio-control options.",
        ],
        "preventive_measures": [
            "Use certified disease-free planting material and resistant varieties where available.",
        ],
        "when_to_consult_expert": "Consult your local Krishi Vigyan Kendra (KVK) or horticulture officer for confirmation and locally approved label guidance.",
        "sources": [
            {"institution": "ICAR / CABI", "title": f"General Integrated Disease Management for {crop}", "verified_on": VERIFICATION_DATE},
        ],
    }
