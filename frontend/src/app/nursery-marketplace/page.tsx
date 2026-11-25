// frontend/src/app/nursery-marketplace/page.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import {
  fetchNearbyNurseries,
  fetchNurseryProducts,
  optimizeProcurement,
  submitNurseryInquiry,
  createNurseryProduct,
  compareSuppliers,
} from '@/lib/biointelApi';
import {
  Nursery,
  NurseryProduct,
  NurseryProductCreate,
  ProcurementOptimizationResponse,
  SupplierComparisonResponse,
  Language,
} from '@/types';
import { localizeCropName, formatLocalizedCurrency } from '@/lib/translations';

const NURSERY_MKT_I18N: Record<Language, {
  bannerTitle: string; bannerBadge: string; bannerSub: string;
  comparePrefix: string; sellerPortalBtn: string;
  calcTitle: string; calcDesc: string; collapseCalc: string; expandCalc: string;
  targetCrop: string; reqUnits: string; budgetLbl: string; calcBtn: string;
  recOptBadge: string; suitLbl: string; withinBudgetSurplus: string; exceedsDeficit: string;
  fromText: string; plantingLbl: string; transportLbl: string; totalLbl: string; callNursery: string;
  searchingNear: string; hideLoc: string; changeLoc: string; locTitle: string; locSub: string; locApply: string;
  searchPh: string; radiusPrefix: string; kmUnit: string; maxPricePh: string; inStockOnly: string;
  nearbyTitle: string; radiusSub: string; placesDisclaimer: string; nhbPortal: string;
  distEst: string; regional: string; gPlaces: string; demoNursery: string; directions: string;
  productsTitle: string; selectCompareHint: string; loadingInv: string; noMatch: string; noMatchHint: string;
  demoData: string; contactNursery: string; stockLbl: string; units: string; confReq: string; minOrder: string;
  compareLbl: string; inquireBtn: string; max4Alert: string;
  compModalTitle: string; compModalSub: string; unitPrice: string; quote: string; plantingCost: string; freightCost: string; totalLanded: string; certLbl: string; callBtn: string;
  inqModalTitle: string; inqModalSub: string; inqSuccess: string; inqSuccessSub: string;
  farmerNameLbl: string; phoneLbl: string; reqQtyLbl: string; sowingDateLbl: string; notesLbl: string; notesPh: string; submitInq: string;
  addModalTitle: string; addModalSub: string; varNameLbl: string; biotechCatLbl: string; priceUnitLbl: string; pricingUnitLbl: string; availQtyLbl: string; certInfoLbl: string; descLbl: string; saveProdBtn: string;
  loadingPage: string;
  cats: Record<string, string>;
  unitsMap: Record<string, string>;
}> = {
  en: {
    bannerTitle: 'Nursery & Bio-Input Marketplace', bannerBadge: 'Verified Suppliers',
    bannerSub: 'Regional certified nurseries, stock comparison, and lowest landed cost planner',
    comparePrefix: 'Compare', sellerPortalBtn: 'Seller Inventory Portal',
    calcTitle: 'Procurement Cost & Freight Optimizer', calcDesc: 'Landed Cost = (Quantity × Unit Price) + Transport Freight',
    collapseCalc: 'Hide Calculator', expandCalc: 'Show Calculator',
    targetCrop: 'Target Crop', reqUnits: 'Required Plants / Seed Units', budgetLbl: 'Allocated Budget (₹)', calcBtn: 'Calculate Total Cost',
    recOptBadge: 'Best Value Option', suitLbl: 'Match:', withinBudgetSurplus: 'Within Budget (Saved', exceedsDeficit: 'Over Budget (Shortfall',
    fromText: 'from', plantingLbl: 'Seeds / Plants:', transportLbl: 'Transport:', totalLbl: 'Total:', callNursery: 'Call Nursery',
    searchingNear: 'Searching near:', hideLoc: 'Hide Location Selector', changeLoc: 'Change Search Location',
    locTitle: 'Nursery Search Center', locSub: 'Pick location to recalculate supplier distance & freight.', locApply: 'Apply Location',
    searchPh: 'Search variety, seed, biofertilizer...', radiusPrefix: 'Radius:', kmUnit: 'km', maxPricePh: 'Max ₹', inStockOnly: 'In Stock Only',
    nearbyTitle: 'Nearby Nurseries & Seed Centers', radiusSub: 'within', placesDisclaimer: '*Google Places results do not confirm live stock', nhbPortal: 'Verify on National Nursery Portal',
    distEst: 'km (est.)', regional: 'Regional', gPlaces: 'Google Places', demoNursery: 'Certified Demo Nursery', directions: 'Directions',
    productsTitle: 'Certified Seeds, Saplings & Bio-Inputs', selectCompareHint: 'Select items to compare total cost & transport',
    loadingInv: 'Loading nursery inventory...', noMatch: 'No products match current filters.', noMatchHint: 'Try increasing radius or selecting All Categories.',
    demoData: 'Sample Data', contactNursery: 'Contact Nursery', stockLbl: 'Stock:', units: 'units', confReq: 'Ask nursery', minOrder: 'Min Order:',
    compareLbl: 'Compare', inquireBtn: 'Check Availability', max4Alert: 'You can compare up to 4 suppliers at once.',
    compModalTitle: 'Supplier Side-by-Side Comparison', compModalSub: 'Total landed cost breakdown for selected nurseries',
    unitPrice: 'Unit Price:', quote: 'Quote', plantingCost: 'Seed/Plant Cost:', freightCost: 'Transport Freight:', totalLanded: 'Total Landed Cost:', certLbl: 'Certification:', callBtn: 'Call',
    inqModalTitle: 'Send Inquiry to', inqModalSub: 'Check stock availability for',
    inqSuccess: 'Inquiry Sent!', inqSuccessSub: 'The nursery has received your request and will contact you shortly.',
    farmerNameLbl: 'Farmer Name', phoneLbl: 'Phone Number', reqQtyLbl: 'Required Quantity', sowingDateLbl: 'Planned Sowing Date',
    notesLbl: 'Notes / Delivery Request', notesPh: 'Need farm-gate delivery; check seedling hardening...', submitInq: 'Submit Inquiry',
    addModalTitle: 'Add Product to Nursery Stock', addModalSub: 'Authorized Nursery / Seller Inventory',
    varNameLbl: 'Variety Name', biotechCatLbl: 'Category', priceUnitLbl: 'Price per Unit (₹)', pricingUnitLbl: 'Pricing Unit',
    availQtyLbl: 'Available Quantity', certInfoLbl: 'Certification Info', descLbl: 'Description', saveProdBtn: 'Save Listing',
    loadingPage: 'Loading Nursery Marketplace...',
    cats: {
      '': 'All Categories',
      disease_resistant_varieties: 'Disease-Resistant Varieties',
      drought_tolerant_varieties: 'Drought-Tolerant Varieties',
      hybrid_varieties: 'Hybrid Seeds & Varieties',
      tissue_cultured_plants: 'Tissue-Cultured Plants',
      grafted_plants: 'Grafted Saplings',
      biofertilizers: 'Biofertilizers',
      biopesticides: 'Biopesticides',
      beneficial_soil_microorganisms: 'Soil Microbials',
      biological_nutrient_management: 'Biological Nutrients',
      agricultural_waste_bioconversion: 'Agro-Waste Compost',
    },
    unitsMap: { per_seedling: 'per seedling', per_sapling: 'per sapling', per_kg: 'per kg', per_liter: 'per liter', per_packet_500g: 'per 500g packet' },
  },
  kn: {
    bannerTitle: 'ನರ್ಸರಿ ಮತ್ತು ಬೀಜ ಮಾರುಕಟ್ಟೆ', bannerBadge: 'ಪರಿಶೀಲಿತ ಪೂರೈಕೆದಾರರು',
    bannerSub: 'ಪ್ರಮಾಣೀಕೃತ ನರ್ಸರಿಗಳು, ಬೆಲೆ ಹೋಲಿಕೆ ಮತ್ತು ಕಡಿಮೆ ಸಾಗಾಣಿಕೆ ವೆಚ್ಚದ ಯೋಜಕ',
    comparePrefix: 'ಹೋಲಿಸಿ', sellerPortalBtn: 'ಮಾರಾಟಗಾರರ ದಾಸ್ತಾನು ಸೇರಿಸಿ',
    calcTitle: 'ಬೀಜ ಖರೀದಿ ಮತ್ತು ಸಾಗಾಣಿಕೆ ವೆಚ್ಚ ಲೆಕ್ಕಾಚಾರ', calcDesc: 'ಒಟ್ಟು ವೆಚ್ಚ = (ಪ್ರಮಾಣ × ಬೆಲೆ) + ಸಾರಿಗೆ ವೆಚ್ಚ',
    collapseCalc: 'ಲೆಕ್ಕಾಚಾರ ಮುಚ್ಚಿ', expandCalc: 'ಲೆಕ್ಕಾಚಾರ ತೆರೆಯಿರಿ',
    targetCrop: 'ಆಯ್ಕೆ ಬೆಳೆ', reqUnits: 'ಬೇಕಾಗುವ ಸಸಿ / ಬೀಜ ಪ್ರಮಾಣ', budgetLbl: 'ಲಭ್ಯ ಬಜೆಟ್ (₹)', calcBtn: 'ಒಟ್ಟು ವೆಚ್ಚ ಲೆಕ್ಕಹಾಕಿ',
    recOptBadge: 'ಅತ್ಯುತ್ತಮ ಆಯ್ಕೆ', suitLbl: 'ಹೊಂದಾಣಿಕೆ:', withinBudgetSurplus: 'ಬಜೆಟ್ ಒಳಗಿದೆ (ಉಳಿತಾಯ', exceedsDeficit: 'ಬಜೆಟ್ ಮೀರಿದೆ (ಕೊರತೆ',
    fromText: 'ಮಾರಾಟಗಾರ:', plantingLbl: 'ಸಸಿ/ಬೀಜ ವೆಚ್ಚ:', transportLbl: 'ಸಾರಿಗೆ:', totalLbl: 'ಒಟ್ಟು:', callNursery: 'ನರ್ಸರಿಗೆ ಕರೆ ಮಾಡಿ',
    searchingNear: 'ಹುಡುಕಾಟ ಸ್ಥಳ:', hideLoc: 'ಸ್ಥಳ ಆಯ್ಕೆ ಮುಚ್ಚಿ', changeLoc: 'ಸ್ಥಳ ಬದಲಾಯಿಸಿ',
    locTitle: 'ನರ್ಸರಿ ಹುಡುಕಾಟ ಸ್ಥಳ', locSub: 'ದೂರ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ ಲೆಕ್ಕಹಾಕಲು ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ.', locApply: 'ಸ್ಥಳ ಅನ್ವಯಿಸಿ',
    searchPh: 'ತಳಿ, ಬೀಜ, ಗೊಬ್ಬರ ಹುಡುಕಿ...', radiusPrefix: 'ದೂರ:', kmUnit: 'ಕಿ.ಮೀ', maxPricePh: 'ಗರಿಷ್ಠ ₹', inStockOnly: 'ದಾಸ್ತಾನು ಇರುವವು ಮಾತ್ರ',
    nearbyTitle: 'ಹತ್ತಿರದ ನರ್ಸರಿ ಮತ್ತು ಬೀಜ ಕೇಂದ್ರಗಳು', radiusSub: 'ಒಳಗೆ', placesDisclaimer: '*Google Places ಮಾಹಿತಿ ನೇರ ದಾಸ್ತಾನು ತೋರಿಸುವುದಿಲ್ಲ', nhbPortal: 'ರಾಷ್ಟ್ರೀಯ ನರ್ಸರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ',
    distEst: 'ಕಿ.ಮೀ (ಅಂದಾಜು)', regional: 'ಪ್ರಾದೇಶಿಕ', gPlaces: 'Google Places', demoNursery: 'ಪ್ರಮಾಣೀಕೃತ ಡೆಮೊ ನರ್ಸರಿ', directions: 'ದಾರಿ ನೋಡಿ',
    productsTitle: 'ಪ್ರಮಾಣೀಕೃತ ಬೀಜ, ಸಸಿ ಮತ್ತು ಜೈವಿಕ ಉತ್ಪನ್ನಗಳು', selectCompareHint: 'ಬೆಲೆ ಹೋಲಿಕೆಗೆ ಉತ್ಪನ್ನಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    loadingInv: 'ನರ್ಸರಿ ದಾಸ್ತಾನು ಲೋಡ್ ಆಗುತ್ತಿದೆ...', noMatch: 'ನಿಮ್ಮ ಹುಡುಕಾಟಕ್ಕೆ ಯಾವುದೇ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ.', noMatchHint: 'ದೂರ ಹೆಚ್ಚಿಸಿ ಅಥವಾ ಎಲ್ಲಾ ವಿಭಾಗಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
    demoData: 'ಮಾದರಿ ಮಾಹಿತಿ', contactNursery: 'ನರ್ಸರಿ ಸಂಪರ್ಕಿಸಿ', stockLbl: 'ದಾಸ್ತಾನು:', units: 'ಘಟಕಗಳು', confReq: 'ವಿಚಾರಿಸಿ', minOrder: 'ಕನಿಷ್ಠ ಆರ್ಡರ್:',
    compareLbl: 'ಹೋಲಿಸಿ', inquireBtn: 'ಲಭ್ಯತೆ ವಿಚಾರಿಸಿ', max4Alert: 'ಒಮ್ಮೆ ಗರಿಷ್ಠ 4 ನರ್ಸರಿಗಳನ್ನು ಹೋಲಿಸಬಹುದು.',
    compModalTitle: 'ನರ್ಸರಿಗಳ ಪಕ್ಕ-ಪಕ್ಕದ ಬೆಲೆ ಹೋಲಿಕೆ', compModalSub: 'ಆಯ್ಕೆಮಾಡಿದ ನರ್ಸರಿಗಳ ಒಟ್ಟು ಖರೀದಿ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ',
    unitPrice: 'ಪ್ರತಿ ಘಟಕ ಬೆಲೆ:', quote: 'ದರ ಕೇಳಿ', plantingCost: 'ಸಸಿ/ಬೀಜ ವೆಚ್ಚ:', freightCost: 'ಸಾರಿಗೆ ವೆಚ್ಚ:', totalLanded: 'ಒಟ್ಟು ವೆಚ್ಚ:', certLbl: 'ಪ್ರಮಾಣೀಕರಣ:', callBtn: 'ಕರೆ ಮಾಡಿ',
    inqModalTitle: 'ವಿಚಾರಣೆ ಕಳುಹಿಸಿ:', inqModalSub: 'ಲಭ್ಯತೆ ಮತ್ತು ದರ ತಿಳಿಯಲು:',
    inqSuccess: 'ವಿಚಾರಣೆ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ!', inqSuccessSub: 'ನರ್ಸರಿಯವರು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಸ್ವೀಕರಿಸಿದ್ದಾರೆ, ಶೀಘ್ರದಲ್ಲೇ ಕರೆ ಮಾಡುತ್ತಾರೆ.',
    farmerNameLbl: 'ರೈತರ ಹೆಸರು', phoneLbl: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ', reqQtyLbl: 'ಬೇಕಾಗುವ ಪ್ರಮಾಣ', sowingDateLbl: 'ನಾಟಿ / ಬಿತ್ತನೆ ದಿನಾಂಕ',
    notesLbl: 'ವಿಶೇಷ ಸೂಚನೆಗಳು', notesPh: 'ಜಮೀನಿಗೆ ವಿತರಣೆ ಬೇಕು; ಉತ್ತಮ ಸಸಿಗಳಿರಲಿ...', submitInq: 'ವಿಚಾರಣೆ ಸಲ್ಲಿಸಿ',
    addModalTitle: 'ನರ್ಸರಿ ದಾಸ್ತಾನು ಸೇರಿಸಿ', addModalSub: 'ಅಧಿಕೃತ ನರ್ಸರಿ / ಮಾರಾಟಗಾರರ ವಿಭಾಗ',
    varNameLbl: 'ತಳಿಯ ಹೆಸರು', biotechCatLbl: 'ವಿಭಾಗ', priceUnitLbl: 'ಪ್ರತಿ ಘಟಕ ಬೆಲೆ (₹)', pricingUnitLbl: 'ಬೆಲೆ ಘಟಕ',
    availQtyLbl: 'ಲಭ್ಯ ಪ್ರಮಾಣ', certInfoLbl: 'ಪ್ರಮಾಣೀಕರಣ ವಿವರ', descLbl: 'ವಿವರಣೆ', saveProdBtn: 'ಉತ್ಪನ್ನ ಉಳಿಸಿ',
    loadingPage: 'ನರ್ಸರಿ ಮಾರುಕಟ್ಟೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    cats: {
      '': 'ಎಲ್ಲಾ ವಿಭಾಗಗಳು',
      disease_resistant_varieties: 'ರೋಗ ನಿರೋಧಕ ತಳಿಗಳು',
      drought_tolerant_varieties: 'ಬರ ನಿರೋಧಕ ತಳಿಗಳು',
      hybrid_varieties: 'ಹೈಬ್ರಿಡ್ ಬೀಜ ಮತ್ತು ತಳಿಗಳು',
      tissue_cultured_plants: 'ಟಿಶ್ಯೂ ಕಲ್ಚರ್ ಸಸಿಗಳು',
      grafted_plants: 'ಕಸಿ ಸಸಿಗಳು',
      biofertilizers: 'ಜೈವಿಕ ಗೊಬ್ಬರಗಳು',
      biopesticides: 'ಜೈವಿಕ ಕೀಟನಾಶಕಗಳು',
      beneficial_soil_microorganisms: 'ಮಣ್ಣಿನ ಸೂಕ್ಷ್ಮಜೀವಿಗಳು',
      biological_nutrient_management: 'ಜೈವಿಕ ಪೋಷಕಾಂಶಗಳು',
      agricultural_waste_bioconversion: 'ಕೃಷಿ ತ್ಯಾಜ್ಯ ಗೊಬ್ಬರ',
    },
    unitsMap: { per_seedling: 'ಪ್ರತಿ ಸಸಿಗೆ', per_sapling: 'ಪ್ರತಿ ಗಿಡಕ್ಕೆ', per_kg: 'ಪ್ರತಿ ಕೆ.ಜಿಗೆ', per_liter: 'ಪ್ರತಿ ಲೀಟರ್‌ಗೆ', per_packet_500g: 'ಪ್ರತಿ 500g ಪ್ಯಾಕೆಟ್‌ಗೆ' },
  },
  hi: {
    bannerTitle: 'नर्सरी और जैव-उत्पाद बाज़ार', bannerBadge: 'सत्यापित विक्रेता',
    bannerSub: 'क्षेत्रीय प्रमाणित नर्सरी, कीमत तुलना और सबसे कम परिवहन लागत योजना',
    comparePrefix: 'तुलना करें', sellerPortalBtn: 'विक्रेता स्टॉक जोड़ें',
    calcTitle: 'खरीद लागत और माल ढुलाई अनुकूलक', calcDesc: 'कुल लागत = (मात्रा × कीमत) + परिवहन भाड़ा',
    collapseCalc: 'कैलकुलेटर समेटें', expandCalc: 'कैलकुलेटर खोलें',
    targetCrop: 'लक्ष्य फसल', reqUnits: 'आवश्यक पौधे / बीज मात्रा', budgetLbl: 'उपलब्ध बजट (₹)', calcBtn: 'कुल लागत जोड़ें',
    recOptBadge: 'सर्वोत्तम विकल्प', suitLbl: 'अनुकूलता:', withinBudgetSurplus: 'बजट के भीतर (बचत', exceedsDeficit: 'बजट से अधिक (कमी',
    fromText: 'विक्रेता:', plantingLbl: 'पौध लागत:', transportLbl: 'परिवहन:', totalLbl: 'कुल:', callNursery: 'नर्सरी को कॉल करें',
    searchingNear: 'खोज स्थान:', hideLoc: 'स्थान चयन छुपाएं', changeLoc: 'खोज स्थान बदलें',
    locTitle: 'नर्सरी खोज केंद्र', locSub: 'दूरी और किराया गणना के लिए स्थान चुनें।', locApply: 'स्थान लागू करें',
    searchPh: 'किस्म, बीज, जैव खाद खोजें...', radiusPrefix: 'दूरी:', kmUnit: 'किमी', maxPricePh: 'अधिकतम ₹', inStockOnly: 'केवल उपलब्ध स्टॉक',
    nearbyTitle: 'नज़दीकी नर्सरी व बीज केंद्र', radiusSub: 'के भीतर', placesDisclaimer: '*Google Places लाइव स्टॉक की पुष्टि नहीं करता', nhbPortal: 'राष्ट्रीय नर्सरी पोर्टल पर जांचें',
    distEst: 'किमी (अनुमान)', regional: 'क्षेत्रीय', gPlaces: 'Google Places', demoNursery: 'प्रमाणित डेमो नर्सरी', directions: 'दिशा देखें',
    productsTitle: 'प्रमाणित बीज, पौध और जैव उत्पाद', selectCompareHint: 'लागत तुलना के लिए उत्पाद चुनें',
    loadingInv: 'नर्सरी स्टॉक लोड हो रहा है...', noMatch: 'कोई उत्पाद मेल नहीं खाता।', noMatchHint: 'खोज दायरा बढ़ाएं या सभी श्रेणियाँ चुनें।',
    demoData: 'नमूना डेटा', contactNursery: 'नर्सरी से पूछें', stockLbl: 'स्टॉक:', units: 'इकाइयाँ', confReq: 'पूछताछ करें', minOrder: 'न्यूनतम ऑर्डर:',
    compareLbl: 'तुलना', inquireBtn: 'उपलब्धता पूछें', max4Alert: 'आप एक साथ अधिकतम 4 नर्सरी की तुलना कर सकते हैं।',
    compModalTitle: 'नर्सरी तुलना तालिका', compModalSub: 'चुनी गई नर्सरियों की कुल भूमिगत लागत',
    unitPrice: 'प्रति इकाई मूल्य:', quote: 'कोटेशन', plantingCost: 'पौध लागत:', freightCost: 'परिवहन खर्च:', totalLanded: 'कुल लागत:', certLbl: 'प्रमाणन:', callBtn: 'कॉल करें',
    inqModalTitle: 'पूछताछ भेजें:', inqModalSub: 'उपलब्धता व दर पूछें:',
    inqSuccess: 'पूछताछ सफलतापूर्वक भेजी गई!', inqSuccessSub: 'नर्सरी को आपका अनुरोध मिल गया है और वे शीघ्र संपर्क करेंगे।',
    farmerNameLbl: 'किसान का नाम', phoneLbl: 'फोन नंबर', reqQtyLbl: 'आवश्यक मात्रा', sowingDateLbl: 'संभावित बुवाई तिथि',
    notesLbl: 'विशेष निर्देश / नोट्स', notesPh: 'खेत पर डिलीवरी चाहिए...', submitInq: 'पूछताछ जमा करें',
    addModalTitle: 'नर्सरी स्टॉक में उत्पाद जोड़ें', addModalSub: 'अधिकृत नर्सरी / विक्रेता पोर्टल',
    varNameLbl: 'किस्म का नाम', biotechCatLbl: 'श्रेणी', priceUnitLbl: 'प्रति इकाई मूल्य (₹)', pricingUnitLbl: 'मूल्य इकाई',
    availQtyLbl: 'उपलब्ध मात्रा', certInfoLbl: 'प्रमाणन विवरण', descLbl: 'विवरण', saveProdBtn: 'उत्पाद सहेजें',
    loadingPage: 'नर्सरी बाज़ार लोड हो रहा है...',
    cats: {
      '': 'सभी श्रेणियाँ',
      disease_resistant_varieties: 'रोग-प्रतिरोधी किस्में',
      drought_tolerant_varieties: 'सूखा-सहनशील किस्में',
      hybrid_varieties: 'हाइब्रिड बीज व किस्में',
      tissue_cultured_plants: 'टिश्यू कल्चर पौधे',
      grafted_plants: 'ग्राफ्टेड पौधे',
      biofertilizers: 'जैव उर्वरक',
      biopesticides: 'जैव कीटनाशक',
      beneficial_soil_microorganisms: 'मिट्टी के सूक्ष्मजीव',
      biological_nutrient_management: 'जैविक पोषक तत्व',
      agricultural_waste_bioconversion: 'कृषि कचरा खाद',
    },
    unitsMap: { per_seedling: 'प्रति पौधा', per_sapling: 'प्रति कलम', per_kg: 'प्रति किग्रा', per_liter: 'प्रति लीटर', per_packet_500g: 'प्रति 500g पैकेट' },
  },
  te: {
    bannerTitle: 'నర్సరీ & విత్తన మార్కెట్', bannerBadge: 'ధృవీకరించిన డీలర్లు',
    bannerSub: 'ప్రాంతీయ నర్సరీలు, ధరల పోలిక మరియు తక్కువ రవాణా ఖర్చు ప్లానర్',
    comparePrefix: 'పోల్చండి', sellerPortalBtn: 'విక్రేత స్టాక్ చేర్చండి',
    calcTitle: 'కొనుగోలు & రవాణా ఖర్చు ఆప్టిమైజర్', calcDesc: 'మొత్తం ఖర్చు = (పరిమాణం × ధర) + రవాణా చార్జీ',
    collapseCalc: 'క్యాలిక్యులేటర్ దాచండి', expandCalc: 'క్యాలిక్యులేటర్ తెరవండి',
    targetCrop: 'పంట పేరు', reqUnits: 'అవసరమైన మొక్కలు / విత్తన యూనిట్లు', budgetLbl: 'బడ్జెట్ (₹)', calcBtn: 'మొత్తం ఖర్చు లెక్కించండి',
    recOptBadge: 'ఉత్తమ ఎంపిక', suitLbl: 'సరిపోలిక:', withinBudgetSurplus: 'బడ్జెట్ లోపల (మిగులు', exceedsDeficit: 'బడ్జెట్ మించింది (లోటు',
    fromText: 'డీలర్:', plantingLbl: 'మొక్కల ఖర్చు:', transportLbl: 'రవాణా:', totalLbl: 'మొత్తం:', callNursery: 'నర్సరీకి కాల్ చేయండి',
    searchingNear: 'వెతుకుతున్న స్థలం:', hideLoc: 'స్థానం దాచండి', changeLoc: 'స్థానం మార్చండి',
    locTitle: 'నర్సరీ వెతుకు స్థానం', locSub: 'దూరం & రవాణా ఖర్చు కోసం మీ స్థానాన్ని ఎంచుకోండి.', locApply: 'స్థానాన్ని వర్తింపజేయండి',
    searchPh: 'రకం, విత్తనం, ఎరువులు వెతకండి...', radiusPrefix: 'దూరం:', kmUnit: 'కి.మీ', maxPricePh: 'గరిష్ట ₹', inStockOnly: 'స్టాక్ ఉన్నవి మాత్రమే',
    nearbyTitle: 'సమీప నర్సరీలు & విత్తన కేంద్రాలు', radiusSub: 'లోపు', placesDisclaimer: '*Google Places లైవ్ స్టాక్‌ను నిర్ధారించదు', nhbPortal: 'జాతీయ నర్సరీ పోర్టల్‌లో తనిఖీ చేయండి',
    distEst: 'కి.మీ (అంచనా)', regional: 'ప్రాంతీయ', gPlaces: 'Google Places', demoNursery: 'ధృవీకరించిన డెమో నర్సరీ', directions: 'దారి చూడండి',
    productsTitle: 'ధృవీకరించిన విత్తనాలు, నారు & బయో-ఉత్పత్తులు', selectCompareHint: 'ధరలు పోల్చడానికి అంశాలను ఎంచుకోండి',
    loadingInv: 'నర్సరీ స్టాక్ లోడ్ అవుతోంది...', noMatch: 'ఫిల్టర్లకు సరిపోయే ఉత్పత్తులు లేవు.', noMatchHint: 'దూరాన్ని పెంచండి లేదా అన్ని విభాగాలు ఎంచుకోండి.',
    demoData: 'నమూనా డేటా', contactNursery: 'నర్సరీని అడగండి', stockLbl: 'స్టాక్:', units: 'యూనిట్లు', confReq: 'అడిగి తెలుసుకోండి', minOrder: 'కనీస ఆర్డర్:',
    compareLbl: 'పోల్చండి', inquireBtn: 'అందుబాటు అడగండి', max4Alert: 'ఒకేసారి గరిష్టంగా 4 నర్సరీలను మాత్రమే పోల్చవచ్చు.',
    compModalTitle: 'నర్సరీల వారీగా ఖర్చు పోలిక', compModalSub: 'ఎంచుకున్న నర్సరీల మొత్తం రవాణా & విత్తన ఖర్చు',
    unitPrice: 'యూనిట్ ధర:', quote: 'కోట్', plantingCost: 'మొక్కల ఖర్చు:', freightCost: 'రవాణా ఖర్చు:', totalLanded: 'మొత్తం ఖర్చు:', certLbl: 'ధృవీకరణ:', callBtn: 'కాల్ చేయండి',
    inqModalTitle: 'విచారణ పంపండి:', inqModalSub: 'స్టాక్ & ధర వివరాలు:',
    inqSuccess: 'విచారణ పంపబడింది!', inqSuccessSub: 'నర్సరీ మీ అభ్యర్థనను అందుకుంది. వారు త్వరలో ఫోన్ చేస్తారు.',
    farmerNameLbl: 'రైతు పేరు', phoneLbl: 'ఫోన్ నంబర్', reqQtyLbl: 'అవసరమైన పరిమాణం', sowingDateLbl: 'నాట్లు వేసే తేదీ',
    notesLbl: 'ప్రత్యేక సూచనలు', notesPh: 'పొలానికి డెలివరీ కావాలి...', submitInq: 'విచారణ పంపండి',
    addModalTitle: 'నర్సరీ స్టాక్‌లో ఉత్పత్తి చేర్చండి', addModalSub: 'నర్సరీ / విక్రేత పోర్టల్',
    varNameLbl: 'రకం పేరు', biotechCatLbl: 'వర్గం', priceUnitLbl: 'యూనిట్ ధర (₹)', pricingUnitLbl: 'ధర యూనిట్',
    availQtyLbl: 'అందుబాటు పరిమాణం', certInfoLbl: 'ధృవీకరణ వివరాలు', descLbl: 'వివరణ', saveProdBtn: 'సేవ్ చేయండి',
    loadingPage: 'నర్సరీ మార్కెట్ లోడ్ అవుతోంది...',
    cats: {
      '': 'అన్ని విభాగాలు',
      disease_resistant_varieties: 'వ్యాధి-నిరోధక రకాలు',
      drought_tolerant_varieties: 'కరువు-తట్టుకునే రకాలు',
      hybrid_varieties: 'హైబ్రిడ్ విత్తనాలు',
      tissue_cultured_plants: 'టిష్యూ కల్చర్ మొక్కలు',
      grafted_plants: 'అంటుకట్టిన మొక్కలు',
      biofertilizers: 'జీవ ఎరువులు',
      biopesticides: 'జీవ పురుగుమందులు',
      beneficial_soil_microorganisms: 'నేల సూక్ష్మజీవులు',
      biological_nutrient_management: 'సేంద్రీయ పోషకాలు',
      agricultural_waste_bioconversion: 'వ్యర్థాల కంపోస్టు',
    },
    unitsMap: { per_seedling: 'మొక్కకు', per_sapling: 'అంటు మొక్కకు', per_kg: 'కిలోకు', per_liter: 'లీటరుకు', per_packet_500g: '500g ప్యాకెట్‌కు' },
  },
};
import {
  Store,
  MapPin,
  Phone,
  Search,
  Filter,
  Truck,
  Calculator,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Send,
  Layers,
  ChevronRight,
  Star,
  Info,
  X,
  RotateCw,
  ShoppingBag,
} from 'lucide-react';

const BIOTECH_CATEGORIES: { id: string; label: string }[] = [
  { id: '', label: 'All Categories' },
  { id: 'disease_resistant_varieties', label: 'Disease-Resistant Varieties' },
  { id: 'drought_tolerant_varieties', label: 'Drought-Tolerant Varieties' },
  { id: 'hybrid_varieties', label: 'Hybrid Seeds & Varieties' },
  { id: 'tissue_cultured_plants', label: 'Tissue-Cultured Plants' },
  { id: 'grafted_plants', label: 'Grafted Saplings' },
  { id: 'biofertilizers', label: 'Biofertilizers' },
  { id: 'biopesticides', label: 'Biopesticides' },
  { id: 'beneficial_soil_microorganisms', label: 'Beneficial Microbials' },
  { id: 'biological_nutrient_management', label: 'Biological Nutrients' },
  { id: 'agricultural_waste_bioconversion', label: 'Agro-Waste Bioconversion' },
];

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

function NurseryMarketplaceContent() {
  const searchParams = useSearchParams();
  const { currentFarm, language, t } = useFarm();
  const L = NURSERY_MKT_I18N[language] || NURSERY_MKT_I18N.en;

  // Search & Filter parameters
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('query') || '');
  const [selectedCrop, setSelectedCrop] = useState<string>(searchParams.get('crop') || 'Tomato');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedRadius, setSelectedRadius] = useState<number>(50);
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  // Farmer location state (defaults to active farm, can be overridden for marketplace filtering)
  const [overrideLocation, setOverrideLocation] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [showLocationFilter, setShowLocationFilter] = useState<boolean>(false);
  const farmerLat = overrideLocation?.lat ?? currentFarm?.latitude ?? 13.3409;
  const farmerLon = overrideLocation?.lon ?? currentFarm?.longitude ?? 77.1010;
  const farmerBudget = currentFarm?.cultivation_budget_inr || 75000;

  // Data states
  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [products, setProducts] = useState<NurseryProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Procurement Calculator state
  const [calculatorOpen, setCalculatorOpen] = useState<boolean>(true);
  const [calcQuantity, setCalcQuantity] = useState<number>(5000);
  const [calcBudget, setCalcBudget] = useState<number>(farmerBudget);
  const [calcResult, setCalcResult] = useState<ProcurementOptimizationResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Supplier Comparison state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [comparisonResult, setComparisonResult] = useState<SupplierComparisonResponse | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Inquiry Modal state
  const [activeInquiryProduct, setActiveInquiryProduct] = useState<NurseryProduct | null>(null);
  const [inquiryName, setInquiryName] = useState<string>(currentFarm?.farmer_name || 'Basavaraju');
  const [inquiryPhone, setInquiryPhone] = useState<string>('+91 94801 55678');
  const [inquiryQuantity, setInquiryQuantity] = useState<number>(5000);
  const [inquiryDate, setInquiryDate] = useState<string>('2026-12-10');
  const [inquiryNotes, setInquiryNotes] = useState<string>('');
  const [inquirySubmitted, setInquirySubmitted] = useState<boolean>(false);

  // Seller Inventory Management (Buyer Dashboard Integration)
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [newProductForm, setNewProductForm] = useState<NurseryProductCreate>({
    nursery_id: 'nursery_demo_01',
    crop_name: 'Tomato',
    variety_name: '',
    biotechnology_category: 'disease_resistant_varieties',
    description: '',
    price_per_unit: 1.5,
    pricing_unit: 'per_seedling',
    available_quantity: 10000,
    minimum_order_quantity: 500,
    certification_info: 'State Seed Certification Agency (SSCA)',
    availability_status: 'in_stock',
  });

  // Load Nurseries & Products
  const loadMarketplaceData = async () => {
    setIsLoading(true);
    try {
      const [nList, pList] = await Promise.all([
        fetchNearbyNurseries(farmerLat, farmerLon, selectedRadius, selectedCrop || undefined, selectedCategory || undefined),
        fetchNurseryProducts({
          query: searchQuery || undefined,
          crop: selectedCrop === 'All' ? undefined : selectedCrop,
          category: selectedCategory || undefined,
          maxPrice: maxPrice !== '' ? Number(maxPrice) : undefined,
          lat: farmerLat,
          lon: farmerLon,
          inStockOnly: inStockOnly,
        }),
      ]);
      setNurseries(nList);
      setProducts(pList);
    } catch (err) {
      console.error('Error loading marketplace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplaceData();
  }, [selectedCrop, selectedCategory, selectedRadius, maxPrice, inStockOnly, farmerLat, farmerLon]);

  // Execute Procurement Optimization
  const handleCalculateProcurement = async (qty = calcQuantity, budget = calcBudget) => {
    setIsCalculating(true);
    try {
      const result = await optimizeProcurement({
        cropName: selectedCrop,
        requiredQuantity: qty,
        farmerLatitude: farmerLat,
        farmerLongitude: farmerLon,
        farmerBudgetInr: budget,
        maxDistanceKm: selectedRadius,
      });
      setCalcResult(result);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (selectedCrop) {
      handleCalculateProcurement();
    }
  }, [selectedCrop, farmerLat, farmerLon]);

  // Toggle selection for comparison
  const toggleSelectForComparison = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== prodId));
    } else {
      if (selectedProductIds.length >= 4) {
        alert(L.max4Alert);
        return;
      }
      setSelectedProductIds([...selectedProductIds, prodId]);
    }
  };

  // Run Comparison
  const handleRunComparison = async () => {
    if (selectedProductIds.length < 1) return;
    setIsComparing(true);
    try {
      const res = await compareSuppliers(selectedProductIds, farmerLat, farmerLon, calcQuantity, calcBudget);
      setComparisonResult(res);
      setShowComparisonModal(true);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setIsComparing(false);
    }
  };

  // Submit Inquiry
  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInquiryProduct) return;
    try {
      await submitNurseryInquiry({
        nursery_id: activeInquiryProduct.nursery_id,
        product_id: activeInquiryProduct.id,
        farmer_name: inquiryName,
        farmer_phone: inquiryPhone,
        farmer_location: currentFarm ? `${currentFarm.district}, ${currentFarm.state}` : 'Karnataka',
        required_quantity: inquiryQuantity,
        intended_sowing_date: inquiryDate,
        notes: inquiryNotes,
      });
      setInquirySubmitted(true);
      setTimeout(() => {
        setInquirySubmitted(false);
        setActiveInquiryProduct(null);
      }, 2200);
    } catch (err) {
      console.error('Inquiry error:', err);
    }
  };

  // Seller Inventory Submission
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNurseryProduct(newProductForm);
      setShowAddProductModal(false);
      loadMarketplaceData();
    } catch (err) {
      console.error('Create product error:', err);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-gradient-to-r from-green-900 to-green-800 text-white rounded-3xl shadow-md gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <Store className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {L.bannerTitle}
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {L.bannerBadge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-green-100/80">
                {L.bannerSub}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedProductIds.length > 0 && (
            <button
              onClick={handleRunComparison}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs transition shadow-sm"
            >
              <Layers className="w-4 h-4" />
              {L.comparePrefix} ({selectedProductIds.length})
            </button>
          )}

          {/* Seller Inventory Management Shortcut (Buyer Dashboard Integration) */}
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition border border-white/20"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            {L.sellerPortalBtn}
          </button>
        </div>
      </div>

      {/* Deterministic Procurement Optimization Calculator (Requirement 8) */}
      <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                {L.calcTitle}
              </h2>
              <p className="text-xs text-zinc-500">
                {L.calcDesc}
              </p>
            </div>
          </div>
          <button
            onClick={() => setCalculatorOpen(!calculatorOpen)}
            className="text-xs font-semibold text-zinc-500 hover:underline"
          >
            {calculatorOpen ? L.collapseCalc : L.expandCalc}
          </button>
        </div>

        {calculatorOpen && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.targetCrop}</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="Tomato">{localizeCropName('Tomato', language)}</option>
                  <option value="Chilli">{localizeCropName('Chilli', language)}</option>
                  <option value="Banana">{localizeCropName('Banana', language)}</option>
                  <option value="Mango">Mango</option>
                  <option value="Rice">{localizeCropName('Rice', language)}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  {L.reqUnits}
                </label>
                <input
                  type="number"
                  step="500"
                  min="100"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(parseInt(e.target.value) || 1000)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  {L.budgetLbl}
                </label>
                <input
                  type="number"
                  step="1000"
                  value={calcBudget}
                  onChange={(e) => setCalcBudget(parseFloat(e.target.value) || 10000)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleCalculateProcurement(calcQuantity, calcBudget)}
                  disabled={isCalculating}
                  className="w-full p-2.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                >
                  {isCalculating ? <RotateCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  {L.calcBtn}
                </button>
              </div>
            </div>

            {/* Optimal Option Result Banner */}
            {calcResult?.optimal_option && (
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  calcResult.optimal_option.is_budget_feasible
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide bg-emerald-600 text-white">
                      {L.recOptBadge}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      {L.suitLbl} {calcResult.optimal_option.suitability_score}/100
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        calcResult.optimal_option.is_budget_feasible
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                          : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                      }`}
                    >
                      {calcResult.optimal_option.is_budget_feasible
                        ? `${L.withinBudgetSurplus} ${formatLocalizedCurrency(calcResult.optimal_option.budget_surplus_or_deficit, language)})`
                        : `${L.exceedsDeficit} ${formatLocalizedCurrency(Math.abs(calcResult.optimal_option.budget_surplus_or_deficit || 0), language)})`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {calcResult.optimal_option.variety_name} {L.fromText} {calcResult.optimal_option.nursery_name}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {calcResult.optimal_option.recommendation_rationale}
                  </p>
                </div>

                <div className="text-right text-xs shrink-0 self-end md:self-auto space-y-1">
                  <div className="text-xs text-zinc-500">
                    {L.plantingLbl} {formatLocalizedCurrency(calcResult.optimal_option.planting_material_cost, language)} + {L.transportLbl} {formatLocalizedCurrency(calcResult.optimal_option.transportation_cost, language)}
                  </div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {L.totalLbl} {formatLocalizedCurrency(calcResult.optimal_option.total_procurement_cost, language)}
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <a
                      href={`tel:${calcResult.optimal_option.phone_number}`}
                      className="px-3 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-lg text-xs hover:opacity-90 transition flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> {L.callNursery}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Discovery Controls */}
      <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
            <MapPin className="w-4 h-4 text-green-700" />
            <span>
              {L.searchingNear}{' '}
              <strong>
                {overrideLocation?.label ||
                  (currentFarm ? `${currentFarm.village}, ${currentFarm.district}` : 'Tumakuru, Karnataka')}
              </strong>{' '}
              ({farmerLat.toFixed(4)}, {farmerLon.toFixed(4)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLocationFilter(!showLocationFilter)}
            className="text-xs font-semibold text-green-700 dark:text-green-400 hover:underline"
          >
            {showLocationFilter ? L.hideLoc : L.changeLoc}
          </button>
        </div>

        {showLocationFilter && (
          <div className="pt-1 pb-2">
            <SmartLocationSelector
              role="farmer"
              compactMap={true}
              title={L.locTitle}
              subtitle={L.locSub}
              confirmLabel={L.locApply}
              initialLocation={{
                latitude: farmerLat,
                longitude: farmerLon,
                village: currentFarm?.village || 'Tumakuru',
                district: currentFarm?.district || 'Tumakuru',
                state: currentFarm?.state || 'Karnataka',
              }}
              onConfirmLocation={(loc) => {
                setOverrideLocation({
                  lat: loc.latitude,
                  lon: loc.longitude,
                  label: `${loc.village}, ${loc.district}`,
                });
                setShowLocationFilter(false);
              }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={L.searchPh}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadMarketplaceData()}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            >
              {BIOTECH_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {L.cats[cat.id] || cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(parseInt(e.target.value))}
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {L.radiusPrefix} {r} {L.kmUnit}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={L.maxPricePh}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-1/2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
            <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-green-700"
              />
              {L.inStockOnly}
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 1: NEARBY SUPPLIERS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {L.nearbyTitle}
            </h2>
            <span className="text-xs text-zinc-500">
              ({selectedRadius} {L.kmUnit} {L.radiusSub})
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
            <span>{L.placesDisclaimer}</span>
            <a
              href="https://nhb.gov.in/nnp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
            >
              {L.nhbPortal} <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {nurseries.slice(0, 6).map((n) => (
            <div
              key={n.id}
              className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow transition space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">{n.name}</h3>
                    {n.is_verified && (
                      <span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{n.address}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 shrink-0 flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                  {n.rating}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {n.distance_km !== undefined ? `${n.distance_km} ${L.distEst}` : L.regional}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {n.data_source === 'google_places_supplier' ? L.gPlaces : L.demoNursery}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <a
                  href={`tel:${n.phone}`}
                  className="font-medium text-green-700 dark:text-green-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" /> {n.phone}
                </a>

                {n.google_maps_uri && (
                  <a
                    href={n.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1"
                  >
                    {L.directions} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PRODUCT INVENTORY CATALOG */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {L.productsTitle} ({products.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {L.selectCompareHint}
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-green-700" />
            <p className="text-xs">{L.loadingInv}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <p className="text-sm font-semibold">{L.noMatch}</p>
            <p className="text-xs mt-1">{L.noMatchHint}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const isSelected = selectedProductIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`p-5 bg-white dark:bg-zinc-900 border rounded-3xl shadow-sm transition space-y-3 relative flex flex-col justify-between ${
                    isSelected ? 'border-green-600 ring-2 ring-green-600/20' : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300">
                            {localizeCropName(p.crop_name, language)}
                          </span>
                          {p.is_demo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {L.demoData}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400">
                            {p.distance_km !== undefined ? `${p.distance_km} ${L.kmUnit}` : ''}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                          {p.variety_name}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium">{p.nursery_name}</p>
                      </div>

                      <div className="text-right shrink-0">
                        {p.price_per_unit !== undefined && p.price_per_unit !== null ? (
                          <>
                            <div className="text-base font-bold text-emerald-600">
                              ₹{p.price_per_unit}
                            </div>
                            <div className="text-[10px] text-zinc-400">{L.unitsMap[p.pricing_unit] || p.pricing_unit}</div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500">{L.contactNursery}</span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">{p.description}</p>

                    {/* Stock & Certification Badges */}
                    <div className="space-y-1 text-xs">
                      {p.certification_info && (
                        <div className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">
                          ✓ {p.certification_info}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span>
                          {L.stockLbl} {p.available_quantity ? `${p.available_quantity.toLocaleString('en-IN')} ${L.units}` : L.confReq}
                        </span>
                        <span>{L.minOrder} {p.minimum_order_quantity}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectForComparison(p.id)}
                        className="rounded text-green-700"
                      />
                      {L.compareLbl}
                    </label>

                    <button
                      onClick={() => setActiveInquiryProduct(p)}
                      className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> {L.inquireBtn}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPARISON MODAL */}
      {showComparisonModal && comparisonResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {L.compModalTitle}
                </h3>
                <p className="text-xs text-zinc-500">
                  {L.compModalSub} ({calcQuantity.toLocaleString('en-IN')} {L.units} · {formatLocalizedCurrency(calcBudget, language)})
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                aria-label={t('close')}
                className="p-2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {comparisonResult.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3 text-xs"
                >
                  <div className="border-b border-zinc-200 dark:border-zinc-700 pb-2">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">
                      {L.suitLbl} {item.suitability_score}/100
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{item.variety_name}</h4>
                    <p className="text-zinc-500">{item.nursery_name} ({item.distance_km} {L.kmUnit})</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{L.unitPrice}</span>
                      <span className="font-semibold">{item.price_per_unit ? `₹${item.price_per_unit}` : L.quote}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{L.plantingCost}</span>
                      <span className="font-semibold">{item.planting_material_cost ? formatLocalizedCurrency(item.planting_material_cost, language) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{L.freightCost}</span>
                      <span className="font-semibold">{item.transportation_cost ? formatLocalizedCurrency(item.transportation_cost, language) : '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1 text-sm font-bold">
                      <span>{L.totalLanded}</span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        {item.total_procurement_cost ? formatLocalizedCurrency(item.total_procurement_cost, language) : '-'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 pt-1">
                      {L.certLbl} {item.certification_info || L.demoNursery}
                    </div>
                  </div>

                  <a
                    href={`tel:${item.phone_number}`}
                    className="w-full py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-center block text-xs"
                  >
                    {L.callBtn} {item.phone_number}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INQUIRY MODAL */}
      {activeInquiryProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {L.inqModalTitle} {activeInquiryProduct.nursery_name}
                </h3>
                <p className="text-xs text-zinc-500">
                  {L.inqModalSub} {activeInquiryProduct.variety_name}
                </p>
              </div>
              <button
                onClick={() => setActiveInquiryProduct(null)}
                aria-label={t('close')}
                className="p-1.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">{L.inqSuccess}</h4>
                <p className="text-xs text-zinc-500">
                  {L.inqSuccessSub}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.farmerNameLbl}</label>
                  <input
                    type="text"
                    required
                    value={inquiryName}
                    onChange={(e) => setInquiryName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.phoneLbl}</label>
                    <input
                      type="text"
                      required
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.reqQtyLbl}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={inquiryQuantity}
                      onChange={(e) => setInquiryQuantity(parseInt(e.target.value) || 100)}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.sowingDateLbl}</label>
                  <input
                    type="date"
                    value={inquiryDate}
                    onChange={(e) => setInquiryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.notesLbl}</label>
                  <textarea
                    rows={2}
                    placeholder={L.notesPh}
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveInquiryProduct(null)}
                    className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl text-xs"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> {L.submitInq}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* SELLER INVENTORY PORTAL MODAL (Buyer Dashboard Integration) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {L.addModalTitle}
                </h3>
                <p className="text-xs text-zinc-500">
                  {L.addModalSub}
                </p>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                aria-label={t('close')}
                className="p-1.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.targetCrop}</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.crop_name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, crop_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.varNameLbl}</label>
                  <input
                    type="text"
                    required
                    placeholder="Arka Rakshak F1"
                    value={newProductForm.variety_name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, variety_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.biotechCatLbl}</label>
                <select
                  value={newProductForm.biotechnology_category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, biotechnology_category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  {BIOTECH_CATEGORIES.filter((c) => c.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {L.cats[cat.id] || cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.priceUnitLbl}</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={newProductForm.price_per_unit || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.pricingUnitLbl}</label>
                  <select
                    value={newProductForm.pricing_unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, pricing_unit: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="per_seedling">{L.unitsMap.per_seedling}</option>
                    <option value="per_sapling">{L.unitsMap.per_sapling}</option>
                    <option value="per_kg">{L.unitsMap.per_kg}</option>
                    <option value="per_liter">{L.unitsMap.per_liter}</option>
                    <option value="per_packet_500g">{L.unitsMap.per_packet_500g}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.availQtyLbl}</label>
                  <input
                    type="number"
                    value={newProductForm.available_quantity || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, available_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.certInfoLbl}</label>
                  <input
                    type="text"
                    value={newProductForm.certification_info || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, certification_info: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.descLbl}</label>
                <textarea
                  rows={2}
                  required
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-xl text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> {L.saveProdBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function NurserySuspenseFallback() {
  const { language } = useFarm();
  const txt: Record<Language, string> = {
    en: 'Loading Nursery Marketplace...',
    kn: 'ನರ್ಸರಿ ಮಾರುಕಟ್ಟೆ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    hi: 'नर्सरी मार्केटप्लेस लोड हो रहा है...',
    te: 'నర్సరీ మార్కెట్‌ప్లేస్ లోడ్ అవుతోంది...',
  };
  return <div className="p-8 text-center text-xs text-zinc-400">{txt[language] || txt.en}</div>;
}

export default function NurseryMarketplacePage() {
  return (
    <Suspense fallback={<NurserySuspenseFallback />}>
      <NurseryMarketplaceContent />
    </Suspense>
  );
}

