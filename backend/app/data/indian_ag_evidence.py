# backend/app/data/indian_ag_evidence.py
"""
Indian Agricultural Evidence Layer & National Nursery Portal Resources (AD-05).
Curated, source-linked official variety releases and biological protocols from
ICAR, ICAR-IIHR, IARI, CRURRS, and National Horticulture Board (NHB).
"""
from typing import List
from backend.app.schemas.biointel_advanced import IndianAgEvidenceRecord, NNPResourceInfo

INDIAN_AG_EVIDENCE_RECORDS: List[IndianAgEvidenceRecord] = [
    IndianAgEvidenceRecord(
        crop_name="Tomato",
        commercial_variety="Arka Rakshak (F1 Hybrid)",
        institution="ICAR - Indian Institute of Horticultural Research (IIHR), Bengaluru",
        documented_traits=[
            "Triple resistance to Tomato Leaf Curl Virus (ToLCV), Bacterial Wilt (Ralstonia solanacearum), and Early Blight (Alternaria solani)",
            "Average fruit weight 90-100g, firm pericarp, 15-20 days shelf life",
            "Yield potential 75-80 t/ha in 140 days",
        ],
        recommended_regions=["Karnataka", "Maharashtra", "Tamil Nadu", "Andhra Pradesh", "Telangana"],
        planting_season="Kharif & Rabi (year-round under irrigated conditions)",
        climate_requirements="20°C–30°C optimal; sensitive to prolonged waterlogging",
        soil_requirements="Well-drained red sandy loam to clay loam, pH 6.0–7.2",
        evidence_url="https://www.iihr.res.in/tomato-arka-rakshak",
        publication_date="2012-06-01",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
    IndianAgEvidenceRecord(
        crop_name="Tomato",
        commercial_variety="Arka Abhed (F1 Hybrid)",
        institution="ICAR - Indian Institute of Horticultural Research (IIHR), Bengaluru",
        documented_traits=[
            "Quadruple disease resistance: ToLCV, Bacterial Wilt, Early Blight, and Late Blight (Ph-2, Ph-3)",
            "Yield potential 85-90 t/ha; reduces fungicide spray load significantly",
        ],
        recommended_regions=["Karnataka", "Himachal Pradesh", "Maharashtra", "Odisha"],
        planting_season="Kharif & Rabi",
        climate_requirements="18°C–29°C; suitable for high-humidity blight-prone zones",
        soil_requirements="Well-drained loam, pH 6.2–7.5",
        evidence_url="https://www.iihr.res.in/tomato-arka-abhed",
        publication_date="2019-08-15",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
    IndianAgEvidenceRecord(
        crop_name="Tomato",
        commercial_variety="Grafted Arka Vishesh on Solanum torvum Rootstock",
        institution="ICAR-IIHR & UAS Bengaluru",
        documented_traits=[
            "High resistance to Root-Knot Nematode (Meloidogyne incognita) and soil-borne Bacterial Wilt",
            "Improved water-use efficiency under intermittent moisture stress",
        ],
        recommended_regions=["Karnataka (Tumakuru, Kolar, Mandya)", "Tamil Nadu"],
        planting_season="Kharif & Summer",
        climate_requirements="Semi-arid to tropical",
        soil_requirements="Wilt/nematode-infested red and black soils, pH 5.5–7.8",
        evidence_url="https://www.iihr.res.in/",
        publication_date="2023-03-10",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
    IndianAgEvidenceRecord(
        crop_name="Rice",
        commercial_variety="Sahbhagi Dhan (IR74371-70-1-1)",
        institution="ICAR-CRURRS Hazaribagh & IRRI",
        documented_traits=[
            "Drought-yield QTLs qDTY1.1 and qDTY2.1; matures in 105 days",
            "Yields 3.8–4.5 t/ha under reproductive-stage drought stress",
        ],
        recommended_regions=["Karnataka uplands", "Odisha", "Jharkhand", "Bihar", "Chhattisgarh"],
        planting_season="Kharif (Rainfed upland / shallow lowland)",
        climate_requirements="Tolerates 15–20 day dry spells",
        soil_requirements="Upland sandy loam to shallow lowland clay loam, pH 5.0–7.5",
        evidence_url="https://icar.org.in/",
        publication_date="2010-05-01",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
    IndianAgEvidenceRecord(
        crop_name="Chilli",
        commercial_variety="Arka Tejasvi (F1 Hybrid)",
        institution="ICAR-IIHR, Bengaluru",
        documented_traits=[
            "Resistant to Chilli Leaf Curl Virus (ChLCV) and moderately resistant to Powdery Mildew",
            "High pungency (80,000–85,000 SHU)",
        ],
        recommended_regions=["Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra"],
        planting_season="Kharif & Rabi",
        climate_requirements="20°C–32°C",
        soil_requirements="Fertile sandy loam to black cotton soil, pH 6.0–7.5",
        evidence_url="https://www.iihr.res.in/",
        publication_date="2021-07-01",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
    IndianAgEvidenceRecord(
        crop_name="Banana",
        commercial_variety="Grand Naine (G9) Tissue Cultured (NCS-TCP Certified)",
        institution="Department of Biotechnology NCS-TCP Accredited Labs & ICAR-NRCB",
        documented_traits=[
            "Virus-indexed free from BBTV, CMV, and BBrMV",
            "Uniform bunch weight 28–35 kg; synchronized harvest",
        ],
        recommended_regions=["Karnataka", "Maharashtra", "Gujarat", "Tamil Nadu"],
        planting_season="June–September & February–March",
        climate_requirements="Humid tropical, 20°C–35°C",
        soil_requirements="Deep fertile loamy soil, pH 6.5–7.5",
        evidence_url="https://dbtindia.gov.in/",
        publication_date="2020-01-15",
        verification_date="2026-10-15",
        approved_for_commercial_cultivation=True,
    ),
]


def get_indian_evidence_for_crop(crop_name: str) -> List[IndianAgEvidenceRecord]:
    key = crop_name.strip().lower()
    return [r for r in INDIAN_AG_EVIDENCE_RECORDS if key in r.crop_name.lower()]


def get_national_nursery_portal_info() -> NNPResourceInfo:
    return NNPResourceInfo(
        portal_name="National Nursery Portal (National Horticulture Board)",
        portal_url="https://nhb.gov.in/nnp",
        public_api_available=False,
        verification_workflow=[
            "1. Open National Nursery Portal (https://nhb.gov.in/nnp) and search by State/District.",
            "2. Verify NHB Star Rating / Accreditation certificate number and validity date.",
            "3. Cross-check State Horticulture Department nursery license (e.g., KA-TUM-HRT-*).",
            "4. Confirm live batch availability and unit pricing directly with the nursery before dispatch.",
        ],
        limitations="No authorized public REST API verified for nhb.gov.in/nnp; portal listing does not guarantee live stock or pricing.",
    )
