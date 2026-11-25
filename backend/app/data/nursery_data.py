# backend/app/data/nursery_data.py
"""
Sample Demonstration Inventory and Local Persistence Store for Feature 18.
Includes clearly labelled fictional demonstration nurseries and products covering
seedlings, tissue-cultured plants, grafted saplings, biofertilizers, and biopesticides.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid

# Fictional demonstration nurseries in Karnataka (clearly labelled demo data)
DEMO_NURSERIES: List[Dict[str, Any]] = [
    {
        "id": "nursery_demo_01",
        "name": "Tumakuru Bio-Horticulture Research Nursery",
        "license_number": "KA-TUM-HRT-2024-D01",
        "contact_person": "Ramesh Chandra (Senior Horticulturist)",
        "phone": "+91 94801 22341",
        "email": "tumakuru.biohort@demo.raithamitra.in",
        "address": "NH-73 Agro-Park, Near University Campus, Tumakuru",
        "village_or_taluk": "Tumakuru Taluk",
        "district": "Tumakuru",
        "state": "Karnataka",
        "latitude": 13.3409,
        "longitude": 77.1010,
        "is_verified": True,
        "rating": 4.8,
        "data_source": "demo_data",
        "google_place_id": None,
        "website_uri": "https://tumakuru-biohort.demo.raithamitra.in",
        "google_maps_uri": "https://maps.google.com/?q=13.3409,77.1010",
        "opening_hours": "Mon-Sat: 07:30 AM - 06:00 PM",
        "created_at": "2026-01-10T08:00:00Z",
        "updated_at": "2026-11-20T10:00:00Z",
        "is_demo": True
    },
    {
        "id": "nursery_demo_02",
        "name": "Cauvery Agri-Biotech & Seedling Hub",
        "license_number": "KA-MDY-SD-2023-D02",
        "contact_person": "Venkatesh Gowda",
        "phone": "+91 98452 77190",
        "email": "cauvery.seedlings@demo.raithamitra.in",
        "address": "State Highway 17, Sugar Town Bypass, Mandya",
        "village_or_taluk": "Mandya Rural",
        "district": "Mandya",
        "state": "Karnataka",
        "latitude": 12.5234,
        "longitude": 76.8976,
        "is_verified": True,
        "rating": 4.7,
        "data_source": "demo_data",
        "google_place_id": None,
        "website_uri": "https://cauvery-seedlings.demo.raithamitra.in",
        "google_maps_uri": "https://maps.google.com/?q=12.5234,76.8976",
        "opening_hours": "Mon-Sat: 07:00 AM - 06:30 PM",
        "created_at": "2026-02-15T09:00:00Z",
        "updated_at": "2026-11-22T11:00:00Z",
        "is_demo": True
    },
    {
        "id": "nursery_demo_03",
        "name": "Hessaraghatta Micropropagation & Tissue Culture Center",
        "license_number": "KA-BLR-TC-2024-D03",
        "contact_person": "Dr. Shobha Murthy",
        "phone": "+91 80 2846 9912",
        "email": "hessaraghatta.tc@demo.raithamitra.in",
        "address": "Near Lake Road, Hessaraghatta Post, Bengaluru Rural",
        "village_or_taluk": "Bengaluru North",
        "district": "Bengaluru Rural",
        "state": "Karnataka",
        "latitude": 13.1492,
        "longitude": 77.4891,
        "is_verified": True,
        "rating": 4.9,
        "data_source": "demo_data",
        "google_place_id": None,
        "website_uri": "https://hessaraghatta-tc.demo.raithamitra.in",
        "google_maps_uri": "https://maps.google.com/?q=13.1492,77.4891",
        "opening_hours": "Mon-Fri: 08:30 AM - 05:30 PM",
        "created_at": "2026-01-20T08:00:00Z",
        "updated_at": "2026-11-24T12:00:00Z",
        "is_demo": True
    },
    {
        "id": "nursery_demo_04",
        "name": "Malnad Grafted Fruit & Plantation Nursery",
        "license_number": "KA-HSN-GR-2023-D04",
        "contact_person": "Giridhar Bhat",
        "phone": "+91 94481 33022",
        "email": "malnad.nursery@demo.raithamitra.in",
        "address": "Belur Road Industrial Estate, Hassan",
        "village_or_taluk": "Hassan Rural",
        "district": "Hassan",
        "state": "Karnataka",
        "latitude": 13.0072,
        "longitude": 76.1029,
        "is_verified": True,
        "rating": 4.6,
        "data_source": "demo_data",
        "google_place_id": None,
        "website_uri": "https://malnad-grafting.demo.raithamitra.in",
        "google_maps_uri": "https://maps.google.com/?q=13.0072,76.1029",
        "opening_hours": "Mon-Sat: 08:00 AM - 06:00 PM",
        "created_at": "2026-03-01T08:00:00Z",
        "updated_at": "2026-11-21T09:00:00Z",
        "is_demo": True
    },
    {
        "id": "nursery_demo_05",
        "name": "Silk City Agro-Bio Inputs & Organic Depot",
        "license_number": "KA-RM-BIO-2024-D05",
        "contact_person": "Syed Altaf",
        "phone": "+91 97410 88234",
        "email": "silkcity.bio@demo.raithamitra.in",
        "address": "Bangalore-Mysore Expressway Service Road, Ramanagara",
        "village_or_taluk": "Ramanagara",
        "district": "Ramanagara",
        "state": "Karnataka",
        "latitude": 12.7209,
        "longitude": 77.2799,
        "is_verified": False,
        "rating": 4.4,
        "data_source": "demo_data",
        "google_place_id": None,
        "website_uri": None,
        "google_maps_uri": "https://maps.google.com/?q=12.7209,77.2799",
        "opening_hours": "Mon-Sun: 07:00 AM - 07:00 PM",
        "created_at": "2026-04-10T10:00:00Z",
        "updated_at": "2026-11-19T14:00:00Z",
        "is_demo": True
    }
]

# Fictional demonstration products (clearly labelled demo data)
DEMO_PRODUCTS: List[Dict[str, Any]] = [
    {
        "id": "prod_demo_001",
        "nursery_id": "nursery_demo_01",
        "crop_name": "Tomato",
        "variety_name": "Arka Rakshak F1 Hybrid Seedlings",
        "biotechnology_category": "disease_resistant_varieties",
        "description": "[DEMO DATA] Pro-tray raised 25-day-old hardened seedlings. Triple disease resistant to ToLCV, Bacterial Wilt, and Early Blight. High fruit firmness and yield potential.",
        "price_per_unit": 1.25,
        "pricing_unit": "per_seedling",
        "available_quantity": 45000,
        "minimum_order_quantity": 1000,
        "certification_info": "Demo Data - ICAR-IIHR Certified Breeder Seed Source",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-25T08:00:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_002",
        "nursery_id": "nursery_demo_02",
        "crop_name": "Tomato",
        "variety_name": "Arka Abhed Quad-Resistant Seedlings",
        "biotechnology_category": "disease_resistant_varieties",
        "description": "[DEMO DATA] Quadruple resistant hybrid seedlings (ToLCV + Bacterial Wilt + Early Blight + Late Blight). Raised in sterlized cocopeat media with bio-inoculants.",
        "price_per_unit": 1.40,
        "pricing_unit": "per_seedling",
        "available_quantity": 30000,
        "minimum_order_quantity": 1000,
        "certification_info": "Demo Data - SSCA Certified Nursery Seedlings",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-24T09:30:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_003",
        "nursery_id": "nursery_demo_01",
        "crop_name": "Tomato",
        "variety_name": "Grafted Arka Vishesh on Solanum torvum Rootstock",
        "biotechnology_category": "grafted_plants",
        "description": "[DEMO DATA] Cleft-grafted tomato saplings on wild solanum rootstock. 100% immune to root-knot nematodes and bacterial wilt under sick soil conditions.",
        "price_per_unit": 8.50,
        "pricing_unit": "per_seedling",
        "available_quantity": 12000,
        "minimum_order_quantity": 500,
        "certification_info": "Demo Data - UAS Bangalore Grafting Protocols",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-25T07:15:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_004",
        "nursery_id": "nursery_demo_02",
        "crop_name": "Chilli",
        "variety_name": "Arka Tejasvi ChLCV Resistant Seedlings",
        "biotechnology_category": "disease_resistant_varieties",
        "description": "[DEMO DATA] High pungency (80,000 SHU) chilli seedlings with genetic resistance to whitefly-borne Chilli Leaf Curl Virus. 30-day hardened pro-tray plants.",
        "price_per_unit": 1.10,
        "pricing_unit": "per_seedling",
        "available_quantity": 25000,
        "minimum_order_quantity": 1000,
        "certification_info": "Demo Data - IIHR Pedigree Source",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-23T10:00:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_005",
        "nursery_id": "nursery_demo_03",
        "crop_name": "Banana",
        "variety_name": "Grand Naine (G9) Tissue Cultured Hardened Plantlets",
        "biotechnology_category": "tissue_cultured_plants",
        "description": "[DEMO DATA] NCS-TCP virus-indexed secondary hardened plantlets. Ex-agar certified free from BBTV, CMV, and Bract Mosaic. Uniform heavy bunches (30+ kg).",
        "price_per_unit": 18.00,
        "pricing_unit": "per_sapling",
        "available_quantity": 15000,
        "minimum_order_quantity": 100,
        "certification_info": "Demo Data - NCS-TCP Certified Virus-Indexed",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-24T14:00:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_006",
        "nursery_id": "nursery_demo_04",
        "crop_name": "Mango",
        "variety_name": "Epicotyl Grafted Alphonso / Mallika Saplings",
        "biotechnology_category": "grafted_plants",
        "description": "[DEMO DATA] Vigorously rooted epicotyl grafts on local polyembryonic rootstocks. Precocious bearing starting from 3rd year. Dwarf canopy suitable for high density.",
        "price_per_unit": 95.00,
        "pricing_unit": "per_sapling",
        "available_quantity": 3500,
        "minimum_order_quantity": 25,
        "certification_info": "Demo Data - State Horticulture Certified True-to-Type",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-22T16:00:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_007",
        "nursery_id": "nursery_demo_01",
        "crop_name": "All Crops",
        "variety_name": "ICAR-IIHR Microbial Consortium (Liquid Form)",
        "biotechnology_category": "biofertilizers",
        "description": "[DEMO DATA] Multi-strain biofertilizer combining N-fixer, P-solubilizer, K-mobilizer, and Zn-solubilizer. Replaces 25% synthetic fertilizers and increases yield.",
        "price_per_unit": 220.00,
        "pricing_unit": "per_liter",
        "available_quantity": 400,
        "minimum_order_quantity": 1,
        "certification_info": "Demo Data - ICAR-IIHR Commercial Technology License",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-25T08:30:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_008",
        "nursery_id": "nursery_demo_05",
        "crop_name": "All Crops",
        "variety_name": "Trichoderma harzianum 2% WP Bio-Fungicide",
        "biotechnology_category": "biopesticides",
        "description": "[DEMO DATA] CIB&RC registered biocontrol agent for root rot, damping off, collar rot, and bacterial wilt suppression. High CFU count (2x10^6 cfu/g).",
        "price_per_unit": 160.00,
        "pricing_unit": "per_kg",
        "available_quantity": 250,
        "minimum_order_quantity": 2,
        "certification_info": "Demo Data - CIB&RC Registered Bio-pesticide",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-24T11:00:00Z",
        "is_demo": True
    },
    {
        "id": "prod_demo_009",
        "nursery_id": "nursery_demo_05",
        "crop_name": "All Crops",
        "variety_name": "Glomus intraradices VAM Endomycorrhiza Bio-Inoculant",
        "biotechnology_category": "beneficial_soil_microorganisms",
        "description": "[DEMO DATA] High-infectivity granular mycorrhizal inoculant (100 infective propagules/g). Dramatically expands root nutrient mining and water-use efficiency.",
        "price_per_unit": 180.00,
        "pricing_unit": "per_kg",
        "available_quantity": 180,
        "minimum_order_quantity": 2,
        "certification_info": "Demo Data - NPOP Organic Approved",
        "availability_status": "in_stock",
        "data_source": "demo_data",
        "last_updated": "2026-11-23T15:00:00Z",
        "is_demo": True
    }
]

class NurseryStore:
    """
    Local thread-safe persistence adapter for Nurseries, Products, and Inquiries.
    Ensures seamless offline development and rapid hackathon execution.
    """
    def __init__(self):
        self.nurseries: Dict[str, Dict[str, Any]] = {n["id"]: dict(n) for n in DEMO_NURSERIES}
        self.products: Dict[str, Dict[str, Any]] = {p["id"]: dict(p) for p in DEMO_PRODUCTS}
        self.inquiries: Dict[str, Dict[str, Any]] = {}

    def get_all_nurseries(self) -> List[Dict[str, Any]]:
        return list(self.nurseries.values())

    def get_nursery(self, nursery_id: str) -> Optional[Dict[str, Any]]:
        return self.nurseries.get(nursery_id)

    def add_nursery(self, nursery_data: Dict[str, Any]) -> Dict[str, Any]:
        n_id = nursery_data.get("id") or f"nursery_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        nursery = {
            **nursery_data,
            "id": n_id,
            "created_at": now,
            "updated_at": now
        }
        self.nurseries[n_id] = nursery
        return nursery

    def get_all_products(self) -> List[Dict[str, Any]]:
        return list(self.products.values())

    def get_product(self, product_id: str) -> Optional[Dict[str, Any]]:
        return self.products.get(product_id)

    def add_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        p_id = product_data.get("id") or f"prod_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        product = {
            **product_data,
            "id": p_id,
            "last_updated": now,
            "is_demo": product_data.get("is_demo", False)
        }
        self.products[p_id] = product
        return product

    def update_product(self, product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if product_id not in self.products:
            return None
        now = datetime.now(timezone.utc).isoformat()
        current = self.products[product_id]
        # Only update non-None fields
        for k, v in updates.items():
            if v is not None:
                current[k] = v
        current["last_updated"] = now
        self.products[product_id] = current
        return current

    def add_inquiry(self, inquiry_data: Dict[str, Any]) -> Dict[str, Any]:
        i_id = f"inq_{uuid.uuid4().hex[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        inquiry = {
            **inquiry_data,
            "id": i_id,
            "status": "submitted",
            "created_at": now
        }
        self.inquiries[i_id] = inquiry
        return inquiry

    def get_inquiries_for_nursery(self, nursery_id: str) -> List[Dict[str, Any]]:
        return [inq for inq in self.inquiries.values() if inq.get("nursery_id") == nursery_id]

nursery_store = NurseryStore()
