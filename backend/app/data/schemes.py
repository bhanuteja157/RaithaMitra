# backend/app/data/schemes.py
from backend.app.schemas.schemes import GovernmentScheme

INDIAN_GOVERNMENT_SCHEMES = [
    GovernmentScheme(
        id="pm_kisan",
        name="Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        name_kannada="ಪ್ರಧಾನ ಮಂತ್ರಿ ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ",
        name_hindi="प्रधानमंत्री किसान सम्मान निधि",
        name_telugu="ప్రధాన మంత్రి కిసాన్ సమ్మాన్ నిధి (PM-KISAN)",
        nodal_agency="Ministry of Agriculture & Farmers Welfare, GoI",
        objective="Direct income support of ₹6,000 per year to landholding farmer families across India.",
        financial_benefit="₹6,000 per annum paid in three equal installments of ₹2,000 every four months.",
        eligibility_criteria=[
            "All landholding farmer families with cultivable landholding in their names.",
            "Valid Aadhaar and bank account linked with NPCI.",
            "Land ownership records verified with state revenue department."
        ],
        required_documents=["Aadhaar Card", "Land Ownership Record (RTC/Pahani)", "Bank Passbook"],
        application_portal="https://pmkisan.gov.in",
        category="Direct Income Support",
        applicable_states=["All States"]
    ),
    GovernmentScheme(
        id="pmfby",
        name="Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        name_kannada="ಪ್ರಧಾನ ಮಂತ್ರಿ ಫಸಲ್ ಬಿಮಾ ಯೋಜನೆ",
        name_hindi="प्रधानमंत्री फसल बीमा योजना",
        name_telugu="ప్రధాన మంత్రి ఫసల్ బీమా యోజన (PMFBY)",
        nodal_agency="Department of Agriculture and Farmers Welfare, GoI",
        objective="Comprehensive risk insurance cover against non-preventable natural risks from pre-sowing to post-harvest.",
        financial_benefit="Maximum farmer premium of 2% for Kharif crops, 1.5% for Rabi crops, and 5% for annual commercial/horticultural crops; balance subsidized by Government.",
        eligibility_criteria=[
            "All farmers growing notified crops in notified areas.",
            "Sharecroppers and tenant farmers are also eligible with cultivation proof."
        ],
        required_documents=["Aadhaar Card", "Sowing Certificate / Declaration", "Land Record / Tenancy Agreement", "Bank Details"],
        application_portal="https://pmfby.gov.in",
        category="Crop Insurance",
        applicable_states=["All States"]
    ),
    GovernmentScheme(
        id="soil_health_card",
        name="Soil Health Card Scheme (SHC)",
        name_kannada="ಮಣ್ಣು ಆರೋಗ್ಯ ಕಾರ್ಡ್ ಯೋಜನೆ",
        name_hindi="मृदा स्वास्थ्य कार्ड योजना",
        name_telugu="నేల ఆరోగ్య కార్డు పథకం (SHC)",
        nodal_agency="Department of Agriculture, Cooperation & Farmers Welfare",
        objective="Provide customized nutrient status and fertilizer dosage recommendations for 12 essential soil parameters.",
        financial_benefit="Free soil sampling, macro/micronutrient testing, and customized advisory issued every 2 years.",
        eligibility_criteria=["All agricultural landholding farmers across Indian states."],
        required_documents=["Farmer ID / Aadhaar", "Field Survey Number"],
        application_portal="https://soilhealth.dac.gov.in",
        category="Soil & Nutrient Health",
        applicable_states=["All States"]
    ),
    GovernmentScheme(
        id="pmksy_per_drop_more_crop",
        name="Pradhan Mantri Krishi Sinchayee Yojana (PMKSY) — Per Drop More Crop",
        name_kannada="ಪ್ರಧಾನ ಮಂತ್ರಿ ಕೃಷಿ ಸಿಂಚಾಯಿ ಯೋಜನೆ - ಹನಿ ನೀರಾವರಿ",
        name_hindi="प्रधानमंत्री कृषि सिंचाई योजना - प्रति बूंद अधिक फसल",
        name_telugu="ప్రధాన మంత్రి కృషి సించాయీ యోజన - బిందు సేద్యం",
        nodal_agency="Ministry of Agriculture & Farmers Welfare",
        objective="Promoting micro-irrigation technologies (drip and sprinkler) to maximize water use efficiency and crop productivity.",
        financial_benefit="Up to 55% subsidy for Small & Marginal Farmers, up to 45% for other farmers on micro-irrigation system installation costs.",
        eligibility_criteria=[
            "Farmers possessing assured water source on their land.",
            "Applicable for horticulture, cash crops, and field crops."
        ],
        required_documents=["Aadhaar", "Land Record (Pahani/RTC)", "Water Source Certificate", "Bank Account"],
        application_portal="https://pmksy.gov.in",
        category="Precision Irrigation",
        applicable_states=["All States"]
    ),
    GovernmentScheme(
        id="kcc",
        name="Kisan Credit Card (KCC)",
        name_kannada="ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್",
        name_hindi="किसान क्रेडिट कार्ड",
        name_telugu="కిసాన్ క్రెడిట్ కార్డ్ (KCC)",
        nodal_agency="NABARD & Commercial Banks",
        objective="Timely and affordable institutional credit for crop cultivation, post-harvest expenses, and maintenance.",
        financial_benefit="Subsidized interest rate at 4% per annum (with prompt repayment incentive of 3% subvention) up to ₹3,00,000 credit limit.",
        eligibility_criteria=["Individual farmers, joint liability groups, tenant farmers, and SHGs."],
        required_documents=["Identity Proof", "Address Proof", "Land Ownership / Cultivation Record"],
        application_portal="https://www.myscheme.gov.in/schemes/kcc",
        category="Agricultural Credit",
        applicable_states=["All States"]
    )
]
