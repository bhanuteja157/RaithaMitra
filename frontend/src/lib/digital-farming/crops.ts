// frontend/src/lib/digital-farming/crops.ts
// 20-crop catalog + deterministic suitability scoring engine for Digital Farming.
import type { Language } from '@/types';

const _cropLoc = (lang: Language = 'en') =>
  lang === 'kn' ? 'kn-IN' : lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';

export type CropCategory =
  | 'Vegetables'
  | 'Fruits'
  | 'Cereals'
  | 'Pulses'
  | 'Oilseeds'
  | 'Commercial crops'
  | 'Spices';

export type SoilType =
  | 'Red soil'
  | 'Black soil'
  | 'Sandy soil'
  | 'Clay soil'
  | 'Loamy soil'
  | 'Alluvial soil'
  | 'Unknown soil';

export type IrrigationType = 'Drip' | 'Sprinkler' | 'Flood / Canal' | 'Rainfed Only';

export type PlantVisualType = 'vine' | 'tall_cereal' | 'paddy' | 'bush' | 'root' | 'tree' | 'cane';

export interface DigitalFarmProfile {
  soilType: SoilType;
  soilPh: number | null;
  soilDataSource: 'Measured / Lab Tested' | 'Farmer Estimate' | 'Unknown';
  irrigationAvailable: boolean;
  irrigationType: IrrigationType;
  waterSource: 'Borewell' | 'Canal' | 'Farm Pond' | 'Rainwater' | 'River' | 'Unknown';
  availableWaterLevel: 'Low' | 'Moderate' | 'Adequate' | 'Abundant';
  budgetInr: number;
  expectedSowingDate: string;
  availableLabour: 'Low' | 'Moderate' | 'Adequate';
  previousCrop: string;
  farmingExperience: 'Beginner' | 'Intermediate' | 'Experienced';
  existingProblems: string;
}

export interface CropCatalogItem {
  id: string;
  name: string;
  category: CropCategory;
  isPerennial: boolean;
  durationDays: number;
  waterRequirementMm: number;
  waterDemandLevel: 'Low' | 'Moderate' | 'High';
  optimalTempMinC: number;
  optimalTempMaxC: number;
  compatibleSoils: SoilType[];
  labourNeed: 'Low' | 'Moderate' | 'High';
  seedRateKgPerAcre: number;
  illustrativeSeedPricePerKg: number;
  illustrativeOtherInputCostPerAcre: number;
  illustrativeYieldKgPerAcre: number;
  illustrativePricePerKg: number;
  visualType: PlantVisualType;
  perishability: 'High' | 'Moderate' | 'Low';
  keyRisks: string[];
  notes: string;
}

export interface CropRecommendation {
  crop: CropCatalogItem;
  suitabilityScore: number;
  excluded: boolean;
  exclusionReason?: string;
  dataCompletenessPct: number;
  confidenceLabel: 'Low (Prototype Estimate)' | 'Moderate (User Inputs)' | 'Higher (Detailed Inputs)';
  estimatedInvestmentInr: number;
  expectedYieldKg: number;
  estimatedRevenueInr: number;
  estimatedProfitInr: number;
  modeledRiskLevel: 'Low' | 'Moderate' | 'High';
  reasons: string[];
}

export const CROP_CATALOG: CropCatalogItem[] = [
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 110,
    waterRequirementMm: 520,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 18,
    optimalTempMaxC: 30,
    compatibleSoils: ['Red soil', 'Loamy soil', 'Black soil', 'Alluvial soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 0.06,
    illustrativeSeedPricePerKg: 35000,
    illustrativeOtherInputCostPerAcre: 24000,
    illustrativeYieldKgPerAcre: 10000,
    illustrativePricePerKg: 16,
    visualType: 'vine',
    perishability: 'High',
    keyRisks: ['Leaf curl virus / blight', 'Price volatility', 'Heat stress at flowering'],
    notes: 'Illustrative hybrid open-field parameters; high return potential with drip irrigation.',
  },
  {
    id: 'onion',
    name: 'Onion',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 120,
    waterRequirementMm: 480,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 15,
    optimalTempMaxC: 30,
    compatibleSoils: ['Loamy soil', 'Red soil', 'Black soil', 'Alluvial soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 3.5,
    illustrativeSeedPricePerKg: 1800,
    illustrativeOtherInputCostPerAcre: 20000,
    illustrativeYieldKgPerAcre: 7500,
    illustrativePricePerKg: 20,
    visualType: 'root',
    perishability: 'Moderate',
    keyRisks: ['Purple blotch / thrips', 'Excessive rain at bulb maturity'],
    notes: 'Requires well-drained soil to avoid bulb rot.',
  },
  {
    id: 'potato',
    name: 'Potato',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 100,
    waterRequirementMm: 500,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 14,
    optimalTempMaxC: 25,
    compatibleSoils: ['Loamy soil', 'Sandy soil', 'Alluvial soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 600,
    illustrativeSeedPricePerKg: 32,
    illustrativeOtherInputCostPerAcre: 21000,
    illustrativeYieldKgPerAcre: 8500,
    illustrativePricePerKg: 18,
    visualType: 'root',
    perishability: 'Moderate',
    keyRisks: ['Late blight in humid weather', 'High tuber seed cost', 'Heat stress > 28°C'],
    notes: 'Prefers cooler nights for tuber bulking.',
  },
  {
    id: 'chilli',
    name: 'Chilli',
    category: 'Spices',
    isPerennial: false,
    durationDays: 150,
    waterRequirementMm: 550,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 20,
    optimalTempMaxC: 32,
    compatibleSoils: ['Black soil', 'Red soil', 'Loamy soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 0.25,
    illustrativeSeedPricePerKg: 18000,
    illustrativeOtherInputCostPerAcre: 26000,
    illustrativeYieldKgPerAcre: 3500,
    illustrativePricePerKg: 55,
    visualType: 'bush',
    perishability: 'Moderate',
    keyRisks: ['Thrips and mites', 'Anthracnose fruit rot', 'Multiple picking labour'],
    notes: 'Suited to warm semi-arid zones; red dry chilli can be stored longer.',
  },
  {
    id: 'brinjal',
    name: 'Brinjal',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 130,
    waterRequirementMm: 500,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 20,
    optimalTempMaxC: 32,
    compatibleSoils: ['Loamy soil', 'Red soil', 'Alluvial soil', 'Clay soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 0.15,
    illustrativeSeedPricePerKg: 14000,
    illustrativeOtherInputCostPerAcre: 19000,
    illustrativeYieldKgPerAcre: 9000,
    illustrativePricePerKg: 15,
    visualType: 'bush',
    perishability: 'High',
    keyRisks: ['Shoot and fruit borer', 'Bacterial wilt in waterlogged soils'],
    notes: 'Hardy vegetable with staggered harvests.',
  },
  {
    id: 'cabbage',
    name: 'Cabbage',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 90,
    waterRequirementMm: 420,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 15,
    optimalTempMaxC: 25,
    compatibleSoils: ['Loamy soil', 'Alluvial soil', 'Clay soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 0.15,
    illustrativeSeedPricePerKg: 22000,
    illustrativeOtherInputCostPerAcre: 18000,
    illustrativeYieldKgPerAcre: 11000,
    illustrativePricePerKg: 12,
    visualType: 'bush',
    perishability: 'High',
    keyRisks: ['Diamondback moth', 'Head splitting from irregular irrigation'],
    notes: 'Short-duration cool-season brassica.',
  },
  {
    id: 'carrot',
    name: 'Carrot',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 85,
    waterRequirementMm: 380,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 15,
    optimalTempMaxC: 26,
    compatibleSoils: ['Sandy soil', 'Loamy soil', 'Red soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 2.0,
    illustrativeSeedPricePerKg: 2500,
    illustrativeOtherInputCostPerAcre: 16000,
    illustrativeYieldKgPerAcre: 7000,
    illustrativePricePerKg: 20,
    visualType: 'root',
    perishability: 'Moderate',
    keyRisks: ['Forking in heavy clay soils', 'Damping-off at germination'],
    notes: 'Needs loose, stone-free soil for straight root formation.',
  },
  {
    id: 'cucumber',
    name: 'Cucumber',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 65,
    waterRequirementMm: 360,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 20,
    optimalTempMaxC: 32,
    compatibleSoils: ['Loamy soil', 'Sandy soil', 'Red soil', 'Alluvial soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 0.8,
    illustrativeSeedPricePerKg: 4500,
    illustrativeOtherInputCostPerAcre: 15000,
    illustrativeYieldKgPerAcre: 6500,
    illustrativePricePerKg: 18,
    visualType: 'vine',
    perishability: 'High',
    keyRisks: ['Downy mildew', 'Fruit fly', 'Fast perishability'],
    notes: 'Very short cycle for quick cash turnover.',
  },
  {
    id: 'beans',
    name: 'Beans',
    category: 'Vegetables',
    isPerennial: false,
    durationDays: 70,
    waterRequirementMm: 340,
    waterDemandLevel: 'Low',
    optimalTempMinC: 18,
    optimalTempMaxC: 28,
    compatibleSoils: ['Loamy soil', 'Red soil', 'Alluvial soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 20,
    illustrativeSeedPricePerKg: 220,
    illustrativeOtherInputCostPerAcre: 14000,
    illustrativeYieldKgPerAcre: 3600,
    illustrativePricePerKg: 34,
    visualType: 'bush',
    perishability: 'High',
    keyRisks: ['Pod borer', 'Rust under high humidity'],
    notes: 'Fixes atmospheric nitrogen and fits well in short rotations.',
  },
  {
    id: 'maize',
    name: 'Maize',
    category: 'Cereals',
    isPerennial: false,
    durationDays: 105,
    waterRequirementMm: 480,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 18,
    optimalTempMaxC: 34,
    compatibleSoils: ['Red soil', 'Black soil', 'Loamy soil', 'Alluvial soil'],
    labourNeed: 'Low',
    seedRateKgPerAcre: 8,
    illustrativeSeedPricePerKg: 350,
    illustrativeOtherInputCostPerAcre: 13000,
    illustrativeYieldKgPerAcre: 2600,
    illustrativePricePerKg: 22,
    visualType: 'tall_cereal',
    perishability: 'Low',
    keyRisks: ['Fall armyworm', 'Moisture stress at tasseling'],
    notes: 'Lower labour and lower perishability cereal crop.',
  },
  {
    id: 'paddy',
    name: 'Paddy',
    category: 'Cereals',
    isPerennial: false,
    durationDays: 125,
    waterRequirementMm: 1150,
    waterDemandLevel: 'High',
    optimalTempMinC: 20,
    optimalTempMaxC: 35,
    compatibleSoils: ['Clay soil', 'Alluvial soil', 'Loamy soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 20,
    illustrativeSeedPricePerKg: 65,
    illustrativeOtherInputCostPerAcre: 18000,
    illustrativeYieldKgPerAcre: 2500,
    illustrativePricePerKg: 24,
    visualType: 'paddy',
    perishability: 'Low',
    keyRisks: ['High water demand / drought sensitivity', 'Blast & brown plant hopper'],
    notes: 'Requires assured canal/borewell water or heavy monsoon.',
  },
  {
    id: 'wheat',
    name: 'Wheat',
    category: 'Cereals',
    isPerennial: false,
    durationDays: 120,
    waterRequirementMm: 450,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 12,
    optimalTempMaxC: 25,
    compatibleSoils: ['Alluvial soil', 'Loamy soil', 'Clay soil', 'Black soil'],
    labourNeed: 'Low',
    seedRateKgPerAcre: 40,
    illustrativeSeedPricePerKg: 55,
    illustrativeOtherInputCostPerAcre: 13000,
    illustrativeYieldKgPerAcre: 1800,
    illustrativePricePerKg: 26,
    visualType: 'tall_cereal',
    perishability: 'Low',
    keyRisks: ['Terminal heat stress', 'Yellow/brown rust'],
    notes: 'Cool-season rabi cereal with good storage life.',
  },
  {
    id: 'ragi',
    name: 'Ragi',
    category: 'Cereals',
    isPerennial: false,
    durationDays: 105,
    waterRequirementMm: 320,
    waterDemandLevel: 'Low',
    optimalTempMinC: 20,
    optimalTempMaxC: 34,
    compatibleSoils: ['Red soil', 'Loamy soil', 'Sandy soil'],
    labourNeed: 'Low',
    seedRateKgPerAcre: 4,
    illustrativeSeedPricePerKg: 110,
    illustrativeOtherInputCostPerAcre: 10500,
    illustrativeYieldKgPerAcre: 1200,
    illustrativePricePerKg: 38,
    visualType: 'tall_cereal',
    perishability: 'Low',
    keyRisks: ['Neck blast in continuous rain', 'Bird damage near maturity'],
    notes: 'Drought-resilient staple millet suited for rainfed red soils.',
  },
  {
    id: 'groundnut',
    name: 'Groundnut',
    category: 'Oilseeds',
    isPerennial: false,
    durationDays: 110,
    waterRequirementMm: 400,
    waterDemandLevel: 'Low',
    optimalTempMinC: 22,
    optimalTempMaxC: 33,
    compatibleSoils: ['Sandy soil', 'Red soil', 'Loamy soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 45,
    illustrativeSeedPricePerKg: 120,
    illustrativeOtherInputCostPerAcre: 13500,
    illustrativeYieldKgPerAcre: 1000,
    illustrativePricePerKg: 62,
    visualType: 'bush',
    perishability: 'Low',
    keyRisks: ['Tikka leaf spot', 'Aflatoxin if harvested in wet soil'],
    notes: 'Well-suited to friable red & sandy loam soils.',
  },
  {
    id: 'cotton',
    name: 'Cotton',
    category: 'Commercial crops',
    isPerennial: false,
    durationDays: 165,
    waterRequirementMm: 650,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 21,
    optimalTempMaxC: 35,
    compatibleSoils: ['Black soil', 'Alluvial soil', 'Loamy soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 0.9,
    illustrativeSeedPricePerKg: 1900,
    illustrativeOtherInputCostPerAcre: 20000,
    illustrativeYieldKgPerAcre: 950,
    illustrativePricePerKg: 70,
    visualType: 'bush',
    perishability: 'Low',
    keyRisks: ['Pink bollworm / whitefly', 'Rain at boll opening'],
    notes: 'Thrives in deep black cotton soils.',
  },
  {
    id: 'sugarcane',
    name: 'Sugarcane',
    category: 'Commercial crops',
    isPerennial: false,
    durationDays: 330,
    waterRequirementMm: 1600,
    waterDemandLevel: 'High',
    optimalTempMinC: 20,
    optimalTempMaxC: 36,
    compatibleSoils: ['Black soil', 'Alluvial soil', 'Loamy soil', 'Clay soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 3000,
    illustrativeSeedPricePerKg: 4,
    illustrativeOtherInputCostPerAcre: 32000,
    illustrativeYieldKgPerAcre: 40000,
    illustrativePricePerKg: 3.2,
    visualType: 'cane',
    perishability: 'Low',
    keyRisks: ['Very high water demand', 'Long capital lock-in (11 months)', 'Lodging in high winds'],
    notes: 'Long-duration high-water commercial crop.',
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'Fruits',
    isPerennial: true,
    durationDays: 320,
    waterRequirementMm: 1500,
    waterDemandLevel: 'High',
    optimalTempMinC: 20,
    optimalTempMaxC: 34,
    compatibleSoils: ['Loamy soil', 'Alluvial soil', 'Red soil', 'Black soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 1200, // illustrative sucker/tissue-culture equivalent weight/unit proxy
    illustrativeSeedPricePerKg: 18,
    illustrativeOtherInputCostPerAcre: 42000,
    illustrativeYieldKgPerAcre: 22000,
    illustrativePricePerKg: 14,
    visualType: 'tree',
    perishability: 'High',
    keyRisks: ['Wind lodging', 'Panama wilt / Sigatoka', 'High water requirement'],
    notes: 'Long-cycle semi-perennial fruit crop requiring assured irrigation.',
  },
  {
    id: 'mango',
    name: 'Mango',
    category: 'Fruits',
    isPerennial: true,
    durationDays: 365,
    waterRequirementMm: 750,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 20,
    optimalTempMaxC: 36,
    compatibleSoils: ['Red soil', 'Loamy soil', 'Alluvial soil'],
    labourNeed: 'Moderate',
    seedRateKgPerAcre: 60,
    illustrativeSeedPricePerKg: 180,
    illustrativeOtherInputCostPerAcre: 22000,
    illustrativeYieldKgPerAcre: 4500,
    illustrativePricePerKg: 45,
    visualType: 'tree',
    perishability: 'Moderate',
    keyRisks: ['Multi-year orchard establishment', 'Unseasonal rain during flowering', 'Fruit fly'],
    notes: 'Perennial orchard crop: 365-day simulation represents an annual fruiting cycle on established trees.',
  },
  {
    id: 'grapes',
    name: 'Grapes',
    category: 'Fruits',
    isPerennial: true,
    durationDays: 300,
    waterRequirementMm: 900,
    waterDemandLevel: 'Moderate',
    optimalTempMinC: 18,
    optimalTempMaxC: 34,
    compatibleSoils: ['Red soil', 'Loamy soil', 'Sandy soil'],
    labourNeed: 'High',
    seedRateKgPerAcre: 400,
    illustrativeSeedPricePerKg: 45,
    illustrativeOtherInputCostPerAcre: 55000,
    illustrativeYieldKgPerAcre: 9000,
    illustrativePricePerKg: 48,
    visualType: 'vine',
    perishability: 'High',
    keyRisks: ['High capital investment', 'Downy/powdery mildew in rain', 'Trellis infrastructure'],
    notes: 'Perennial high-value vineyard crop; annual pruning-to-harvest cycle modeled.',
  },
  {
    id: 'chickpea',
    name: 'Chickpea',
    category: 'Pulses',
    isPerennial: false,
    durationDays: 100,
    waterRequirementMm: 260,
    waterDemandLevel: 'Low',
    optimalTempMinC: 14,
    optimalTempMaxC: 28,
    compatibleSoils: ['Black soil', 'Loamy soil', 'Alluvial soil'],
    labourNeed: 'Low',
    seedRateKgPerAcre: 30,
    illustrativeSeedPricePerKg: 95,
    illustrativeOtherInputCostPerAcre: 9500,
    illustrativeYieldKgPerAcre: 850,
    illustrativePricePerKg: 58,
    visualType: 'bush',
    perishability: 'Low',
    keyRisks: ['Pod borer', 'Wilt in waterlogged soils'],
    notes: 'Low-water rabi pulse crop with strong soil nitrogen benefit.',
  },
];

export type CropSortOption =
  | 'suitability'
  | 'max_profit'
  | 'min_investment'
  | 'min_water'
  | 'low_risk'
  | 'short_duration';

export function recommendCrops(
  areaAcres: number,
  profile: DigitalFarmProfile,
  avgForecastTempC: number | null = null,
  lang: Language = 'en'
): CropRecommendation[] {
  const safeArea = Math.max(0.05, areaAcres);
  const loc = _cropLoc(lang);

  // Compute data completeness
  let knownFields = 0;
  if (profile.soilType !== 'Unknown soil') knownFields++;
  if (profile.soilPh !== null) knownFields++;
  if (profile.waterSource !== 'Unknown') knownFields++;
  if (profile.budgetInr > 0) knownFields++;
  if (profile.expectedSowingDate) knownFields++;
  if (profile.previousCrop.trim()) knownFields++;
  const dataCompletenessPct = Math.round((knownFields / 6) * 100);
  const confidenceLabel: CropRecommendation['confidenceLabel'] =
    dataCompletenessPct >= 80
      ? 'Higher (Detailed Inputs)'
      : dataCompletenessPct >= 45
        ? 'Moderate (User Inputs)'
        : 'Low (Prototype Estimate)';

  return CROP_CATALOG.map((crop) => {
    const reasons: string[] = [];
    let score = 60;
    let excluded = false;
    let exclusionReason: string | undefined;

    const perAcreCost =
      crop.seedRateKgPerAcre * crop.illustrativeSeedPricePerKg + crop.illustrativeOtherInputCostPerAcre;
    const estimatedInvestmentInr = Math.round(perAcreCost * safeArea);
    const expectedYieldKg = Math.round(crop.illustrativeYieldKgPerAcre * safeArea);
    const estimatedRevenueInr = Math.round(expectedYieldKg * crop.illustrativePricePerKg);
    const estimatedProfitInr = estimatedRevenueInr - estimatedInvestmentInr;

    // 1. Soil compatibility
    if (profile.soilType === 'Unknown soil') {
      reasons.push(
        lang === 'kn'
          ? 'ಮಣ್ಣಿನ ಪ್ರಕಾರ ನಿರ್ದಿಷ್ಟಪಡಿಸಲಾಗಿಲ್ಲ — ಸಾಮಾನ್ಯ ಮಾದರಿ ಊಹೆ ಬಳಸಲಾಗಿದೆ.'
          : lang === 'hi'
            ? 'मिट्टी का प्रकार निर्दिष्ट नहीं है — सामान्य प्रोटोटाइप अनुमान लागू।'
            : lang === 'te'
              ? 'నేల రకం పేర్కొనబడలేదు — సాధారణ ప్రోటోటైప్ అంచనా ఉపయోగించబడింది.'
              : 'Soil type not specified — using neutral prototype assumption.'
      );
    } else if (crop.compatibleSoils.includes(profile.soilType)) {
      score += 15;
      reasons.push(
        lang === 'kn'
          ? `${profile.soilType} ಜೊತೆ ಉತ್ತಮವಾಗಿ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ.`
          : lang === 'hi'
            ? `${profile.soilType} के लिए उपयुक्त है।`
            : lang === 'te'
              ? `${profile.soilType} కు అనుకూలంగా ఉంటుంది.`
              : `Compatible with ${profile.soilType}.`
      );
    } else {
      score -= 18;
      reasons.push(
        lang === 'kn'
          ? `${profile.soilType} ಈ ಬೆಳೆಗೆ ಸಂಪೂರ್ಣ ಸೂಕ್ತವಲ್ಲ; ಮಣ್ಣು ಸುಧಾರಣೆ ಬೇಕಾಗಬಹುದು.`
          : lang === 'hi'
            ? `${profile.soilType} इस फसल के लिए उपयुक्त नहीं है; मिट्टी सुधार आवश्यक हो सकता है।`
            : lang === 'te'
              ? `${profile.soilType} ఈ పంటకు అంతగా అనుకూలం కాదు; నేల సవరణ అవసరం కావచ్చు.`
              : `${profile.soilType} is suboptimal for ${crop.name}; additional soil amendment may be needed.`
      );
    }

    // 2. Water & irrigation constraint
    if (!profile.irrigationAvailable && crop.waterDemandLevel === 'High') {
      excluded = true;
      exclusionReason =
        lang === 'kn'
          ? `ಹೊರಗಿಡಲಾಗಿದೆ: ${crop.name} ಗೆ ಹೆಚ್ಚಿನ ನೀರು (${crop.waterRequirementMm} mm) ಬೇಕು, ಆದರೆ ನೀರಾವರಿ ಲಭ್ಯವಿಲ್ಲ.`
          : lang === 'hi'
            ? `अलग किया गया: ${crop.name} को अधिक पानी (${crop.waterRequirementMm} mm) चाहिए, पर सिंचाई उपलब्ध नहीं है।`
            : lang === 'te'
              ? `తొలగించబడింది: ${crop.name} కు ఎక్కువ నీరు (${crop.waterRequirementMm} mm) అవసరం, కానీ నీటిపారుదల లేదు.`
              : `Excluded: ${crop.name} requires high assured water (${crop.waterRequirementMm} mm), but irrigation is marked unavailable.`;
      score -= 40;
    } else if (profile.availableWaterLevel === 'Low' && crop.waterDemandLevel === 'High') {
      excluded = true;
      exclusionReason =
        lang === 'kn'
          ? `ಹೊರಗಿಡಲಾಗಿದೆ: ಹೆಚ್ಚಿನ ನೀರಿನ ಬೇಡಿಕೆ (${crop.waterRequirementMm} mm) ಕಡಿಮೆ ನೀರಿನ ಲಭ್ಯತೆಯನ್ನು ಮೀರಿದೆ.`
          : lang === 'hi'
            ? `अलग किया गया: अधिक जल आवश्यकता (${crop.waterRequirementMm} mm) कम उपलब्ध पानी से अधिक है।`
            : lang === 'te'
              ? `తొలగించబడింది: ఎక్కువ నీటి అవసరం (${crop.waterRequirementMm} mm) తక్కువ నీటి లభ్యతను మించింది.`
              : `Excluded: High water demand (${crop.waterRequirementMm} mm) exceeds Low available water.`;
      score -= 35;
    } else if (profile.availableWaterLevel === 'Low' && crop.waterDemandLevel === 'Low') {
      score += 15;
      reasons.push(
        lang === 'kn'
          ? `ಕಡಿಮೆ ನೀರಿನ ಬೇಡಿಕೆ (${crop.waterRequirementMm} mm) ಸೀಮಿತ ನೀರಿಗೆ ಸೂಕ್ತವಾಗಿದೆ.`
          : lang === 'hi'
            ? `कम जल मांग (${crop.waterRequirementMm} mm) सीमित पानी के अनुकूल है।`
            : lang === 'te'
              ? `తక్కువ నీటి అవసరం (${crop.waterRequirementMm} mm) పరిమిత నీటికి సరిపోతుంది.`
              : `Low water demand (${crop.waterRequirementMm} mm) fits limited water supply.`
      );
    } else if (profile.irrigationAvailable) {
      score += 8;
      reasons.push(
        lang === 'kn'
          ? `ನೀರಾವರಿ ವ್ಯವಸ್ಥೆ (${profile.irrigationType}) ಬೆಳೆಯ ನೀರಿನ ಅಗತ್ಯವನ್ನು ಪೂರೈಸುತ್ತದೆ.`
          : lang === 'hi'
            ? `सिंचाई (${profile.irrigationType}) फसल की जल आवश्यकता को पूरा करती है।`
            : lang === 'te'
              ? `నీటిపారుదల (${profile.irrigationType}) పంట నీటి అవసరాన్ని తీరుస్తుంది.`
              : `Irrigation (${profile.irrigationType}) supports ${crop.waterDemandLevel.toLowerCase()} water needs.`
      );
    }

    // 3. Budget check
    if (profile.budgetInr > 0) {
      const estStr = estimatedInvestmentInr.toLocaleString(loc);
      const budStr = profile.budgetInr.toLocaleString(loc);
      if (estimatedInvestmentInr <= profile.budgetInr) {
        score += 12;
        reasons.push(
          lang === 'kn'
            ? `ಅಂದಾಜು ಹೂಡಿಕೆ (₹${estStr}) ನಿಮ್ಮ ₹${budStr} ಬಜೆಟ್ ಒಳಗೆ ಸರಿಹೊಂದುತ್ತದೆ.`
            : lang === 'hi'
              ? `अनुमानित निवेश (₹${estStr}) आपके ₹${budStr} बजट के भीतर है।`
              : lang === 'te'
                ? `అంచనా పెట్టుబడి (₹${estStr}) మీ ₹${budStr} బడ్జెట్‌లో సరిపోతుంది.`
                : `Estimated investment (₹${estStr}) fits within your ₹${budStr} budget.`
        );
      } else if (estimatedInvestmentInr > profile.budgetInr * 1.6) {
        score -= 20;
        reasons.push(
          lang === 'kn'
            ? `ಅಂದಾಜು ಹೂಡಿಕೆ (₹${estStr}) ಬಜೆಟ್‌ಗಿಂತ ಬಹಳಷ್ಟು ಹೆಚ್ಚಾಗಿದೆ.`
            : lang === 'hi'
              ? `अनुमानित निवेश (₹${estStr}) बजट से काफी अधिक है।`
              : lang === 'te'
                ? `అంచనా పెట్టుబడి (₹${estStr}) బడ్జెట్ కంటే చాలా ఎక్కువగా ఉంది.`
                : `Estimated investment (₹${estStr}) significantly exceeds budget.`
        );
      } else {
        score -= 8;
        reasons.push(
          lang === 'kn'
            ? `ಬಜೆಟ್‌ಗಿಂತ ಸ್ವಲ್ಪ ಹೆಚ್ಚು (₹${estStr} vs ₹${budStr}).`
            : lang === 'hi'
              ? `बजट से थोड़ा अधिक (₹${estStr} बनाम ₹${budStr})।`
              : lang === 'te'
                ? `బడ్జెట్ కంటే కొంచెం ఎక్కువ (₹${estStr} vs ₹${budStr}).`
                : `Slightly above budget (₹${estStr} vs ₹${budStr}).`
        );
      }
    }

    // 4. Labour check
    if (profile.availableLabour === 'Low' && crop.labourNeed === 'High') {
      score -= 10;
      reasons.push(
        lang === 'kn'
          ? 'ಹೆಚ್ಚು ಕಾರ್ಮಿಕರ ಅಗತ್ಯವಿದೆ; ಸಕಾಲಿಕ ಕೂಲಿ ನಿಯೋಜನೆ ಅಥವಾ ಕಡಿಮೆ ಕಾರ್ಮಿಕ ಬೇಡಿಕೆಯ ಬೆಳೆ ಪರಿಗಣಿಸಿ.'
          : lang === 'hi'
            ? 'अधिक श्रमिकों की आवश्यकता है; मौसमी श्रमिक बुकिंग या कम-श्रम फसल पर विचार करें।'
            : lang === 'te'
              ? 'ఎక్కువ కూలీలు అవసరం; సీజనల్ కూలీలను బుక్ చేయండి లేదా తక్కువ కూలీల పంటను పరిశీలించండి.'
              : 'Requires high labour; consider hiring seasonal labour or choosing lower-labour crops.'
      );
    } else if (crop.labourNeed === 'Low') {
      score += 5;
      reasons.push(
        lang === 'kn'
          ? 'ಸುಲಭವಾಗಿ ನಿರ್ವಹಿಸಬಹುದಾದ ಕಾರ್ಮಿಕ ಅಗತ್ಯ.'
          : lang === 'hi'
            ? 'आसानी से प्रबंधनीय श्रमिक आवश्यकता।'
            : lang === 'te'
              ? 'సులభంగా నిర్వహించగల కూలీల అవసరం.'
              : 'Manageable labour requirement.'
      );
    }

    // 5. Temperature check if live forecast available
    if (avgForecastTempC !== null) {
      const tCur = avgForecastTempC.toFixed(1);
      if (avgForecastTempC >= crop.optimalTempMinC && avgForecastTempC <= crop.optimalTempMaxC) {
        score += 6;
        reasons.push(
          lang === 'kn'
            ? `ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಸರಾಸರಿ (${tCur}°C) ಸೂಕ್ತ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C).`
            : lang === 'hi'
              ? `वर्तमान मौसम औसत (${tCur}°C) उपयुक्त सीमा (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C) में है।`
              : lang === 'te'
                ? `ప్రస్తుత వాతావరణ సగటు (${tCur}°C) అనుకూల పరిధిలో (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C) ఉంది.`
                : `Current forecast avg (${tCur}°C) is within optimal range (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C).`
        );
      } else {
        score -= 10;
        reasons.push(
          lang === 'kn'
            ? `ಪ್ರಸ್ತುತ ಹವಾಮಾನ ಸರಾಸರಿ (${tCur}°C) ಸೂಕ್ತ ವ್ಯಾಪ್ತಿಗಿಂತ (${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C) ಹೊರಗಿದೆ.`
            : lang === 'hi'
              ? `वर्तमान मौसम औसत (${tCur}°C) उपयुक्त ${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C से बाहर है।`
              : lang === 'te'
                ? `ప్రస్తుత వాతావరణ సగటు (${tCur}°C) అనుకూల ${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C పరిధికి వెలుపల ఉంది.`
                : `Current forecast avg (${tCur}°C) is outside optimal ${crop.optimalTempMinC}–${crop.optimalTempMaxC}°C.`
        );
      }
    }

    // 6. Rotation hint
    if (profile.previousCrop && profile.previousCrop.toLowerCase().includes(crop.name.toLowerCase())) {
      score -= 8;
      reasons.push(
        lang === 'kn'
          ? `ಹಿಂದಿನ ಬೆಳೆಯಂತೆಯೇ ಇದೆ (${profile.previousCrop}); ಬೆಳೆ ಪರ್ಯಾಯ ಉತ್ತಮ.`
          : lang === 'hi'
            ? `पिछली फसल (${profile.previousCrop}) जैसी ही है; फसल चक्र अपनाना बेहतर होगा।`
            : lang === 'te'
              ? `మునుపటి పంట లాగే ఉంది (${profile.previousCrop}); పంట మార్పిడి చేయడం మంచిది.`
              : `Same as previous crop (${profile.previousCrop}); crop rotation is generally advisable.`
      );
    }

    const clampedScore = Math.max(5, Math.min(98, Math.round(score)));
    const modeledRiskLevel: 'Low' | 'Moderate' | 'High' =
      excluded || clampedScore < 50 ? 'High' : clampedScore < 72 ? 'Moderate' : 'Low';

    return {
      crop,
      suitabilityScore: clampedScore,
      excluded,
      exclusionReason,
      dataCompletenessPct,
      confidenceLabel,
      estimatedInvestmentInr,
      expectedYieldKg,
      estimatedRevenueInr,
      estimatedProfitInr,
      modeledRiskLevel,
      reasons,
    };
  });
}

export function sortRecommendations(
  items: CropRecommendation[],
  sortBy: CropSortOption
): CropRecommendation[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
    switch (sortBy) {
      case 'max_profit':
        return b.estimatedProfitInr - a.estimatedProfitInr;
      case 'min_investment':
        return a.estimatedInvestmentInr - b.estimatedInvestmentInr;
      case 'min_water':
        return a.crop.waterRequirementMm - b.crop.waterRequirementMm;
      case 'low_risk': {
        const rank = { Low: 0, Moderate: 1, High: 2 };
        return rank[a.modeledRiskLevel] - rank[b.modeledRiskLevel] || b.suitabilityScore - a.suitabilityScore;
      }
      case 'short_duration':
        return a.crop.durationDays - b.crop.durationDays;
      case 'suitability':
      default:
        return b.suitabilityScore - a.suitabilityScore;
    }
  });
  return copy;
}
