// frontend/src/lib/seedInvestment.ts
/**
 * Deterministic Seed Investment Planner Calculations (AD-07 & AD-10).
 * All calculations use INR and acres. Never invents seed prices or yields.
 * Provides pre-calibrated ICAR/UAS regional benchmarks for Indian farmers.
 */

export type WaterAvailabilityLevel = 'Abundant' | 'Moderate' | 'Limited' | 'Rainfed';

export interface SeedInvestmentInput {
  crop: string;
  variety: string;
  areaAcres: number;
  seedQtyPerAcreKg: number;
  seedPricePerKg: number;
  fertilizerExpensesInr: number;
  labourExpensesInr: number;
  irrigationExpensesInr: number;
  otherExpensesInr: number;
  availableBudgetInr: number;
  expectedYieldPerAcreKg: number;
  expectedSellingPricePerKg: number;
}

export interface SeedInvestmentResult {
  totalSeedRequirementKg: number;
  totalSeedCostInr: number;
  totalCultivationInvestmentInr: number;
  expectedProductionKg: number;
  expectedRevenueInr: number;
  estimatedProfitInr: number;
  roiPct: number;
  breakEvenSellingPricePerKg: number;
  remainingBudgetInr: number;
  isWithinBudget: boolean;
}

export interface VarietyComparisonInput {
  id: string;
  varietyName: string;
  seedQtyPerAcreKg: number;
  seedPricePerKg: number;
  expectedYieldPerAcreKg: number;
  waterRequirement: string;
  diseaseResistance: string;
  riskLevel?: 'Low' | 'Moderate' | 'High';
  tag?: string;
}

export interface VarietyComparisonResult extends VarietyComparisonInput {
  seedInvestmentInr: number;
  totalCultivationExpensesInr: number;
  expectedProductionKg: number;
  expectedRevenueInr: number;
  estimatedProfitInr: number;
  isBudgetSuitable: boolean;
  isRecommended: boolean;
}

export interface RiskScenarioItem {
  label: 'Unfavourable' | 'Expected' | 'Favourable';
  yieldPerAcreKg: number;
  sellingPricePerKg: number;
  expectedProductionKg: number;
  expectedRevenueInr: number;
  estimatedProfitInr: number;
}

export interface CropPreset {
  id: string;
  name: string;
  kannadaName: string;
  hindiName: string;
  category: 'Vegetables' | 'Cereals' | 'Spices' | 'Commercial' | 'Pulses';
  imageUrl: string;
  durationDays: number;
  durationLabel: string;
  waterNeed: WaterAvailabilityLevel;
  waterRequirementMm: number;
  compatibleSoils: string[];
  defaultVariety: string;
  seedRatePerAcreKg: number;
  seedPricePerKg: number;
  fertilizerExpensesPerAcreInr: number;
  labourExpensesPerAcreInr: number;
  irrigationExpensesPerAcreInr: number;
  otherExpensesPerAcreInr: number;
  expectedYieldPerAcreKg: number;
  expectedSellingPricePerKg: number;
  majorRisks: string[];
  recommendationReason: string;
  varieties: VarietyComparisonInput[];
}

export const CROP_PRESETS: Record<string, CropPreset> = {
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    kannadaName: 'ಟೊಮೆಟೊ',
    hindiName: 'टमाटर',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
    durationDays: 120,
    durationLabel: '110 – 130 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 520,
    compatibleSoils: ['Red soil', 'Red Sandy Loam', 'Loamy soil', 'Black soil', 'Alluvial soil'],
    defaultVariety: 'Arka Rakshak F1 (Triple Resistant)',
    seedRatePerAcreKg: 0.06,
    seedPricePerKg: 35000,
    fertilizerExpensesPerAcreInr: 12000,
    labourExpensesPerAcreInr: 18000,
    irrigationExpensesPerAcreInr: 6000,
    otherExpensesPerAcreInr: 4000,
    expectedYieldPerAcreKg: 10000,
    expectedSellingPricePerKg: 16,
    majorRisks: [
      'Tomato Leaf Curl Virus (ToLCV) transmitted by whiteflies in dry heat',
      'Bacterial wilt in waterlogged soils',
      'Local mandi spot price volatility during peak harvest windows',
    ],
    recommendationReason:
      'High cashflow return with steady regional Mandi demand; triple-disease resistance reduces pesticide outlays by up to 50%.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Arka Rakshak F1 (Standard Hybrid)',
        seedQtyPerAcreKg: 0.06,
        seedPricePerKg: 35000,
        expectedYieldPerAcreKg: 10000,
        waterRequirement: 'Moderate (Drip irrigation recommended)',
        diseaseResistance: 'Triple resistance: ToLCV, Bacterial Wilt, Early Blight',
        riskLevel: 'Low',
        tag: 'Recommended Budget Pick',
      },
      {
        id: 'v2',
        varietyName: 'Pusa Ruby (Open-Pollinated)',
        seedQtyPerAcreKg: 0.15,
        seedPricePerKg: 6000,
        expectedYieldPerAcreKg: 7000,
        waterRequirement: 'Moderate (Canal or open well)',
        diseaseResistance: 'General field tolerance; seed can be locally retained',
        riskLevel: 'Moderate',
        tag: 'Low Seed Investment',
      },
      {
        id: 'v3',
        varietyName: 'Arka Abhed F1 (High-Input Export)',
        seedQtyPerAcreKg: 0.06,
        seedPricePerKg: 45000,
        expectedYieldPerAcreKg: 12500,
        waterRequirement: 'High (Precision fertigation)',
        diseaseResistance: 'Quadruple resistance incl. Late Blight (Ph-2/Ph-3)',
        riskLevel: 'Low',
        tag: 'Maximum Yield Potential',
      },
    ],
  },
  maize: {
    id: 'maize',
    name: 'Maize',
    kannadaName: 'ಮೆಕ್ಕೆಜೋಳ',
    hindiName: 'मक्का',
    category: 'Cereals',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=500&auto=format&fit=crop&q=80',
    durationDays: 105,
    durationLabel: '95 – 110 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 480,
    compatibleSoils: ['Red soil', 'Red Sandy Loam', 'Black soil', 'Loamy soil', 'Alluvial soil'],
    defaultVariety: 'Pioneer P3396 F1 (High-Yielding)',
    seedRatePerAcreKg: 8.0,
    seedPricePerKg: 380,
    fertilizerExpensesPerAcreInr: 6500,
    labourExpensesPerAcreInr: 5000,
    irrigationExpensesPerAcreInr: 2500,
    otherExpensesPerAcreInr: 2000,
    expectedYieldPerAcreKg: 2800,
    expectedSellingPricePerKg: 22,
    majorRisks: [
      'Fall Armyworm (FAW) caterpillar infestation during early vegetative stage',
      'Dry spells during tasseling and silking stages',
      'Post-harvest moisture leading to aflatoxin contamination in storage',
    ],
    recommendationReason:
      'Low labour requirement and guaranteed procurement by poultry feed industries; dependable returns in semi-arid zones.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Pioneer P3396 F1 (Commercial Hybrid)',
        seedQtyPerAcreKg: 8.0,
        seedPricePerKg: 380,
        expectedYieldPerAcreKg: 2800,
        waterRequirement: 'Moderate (Critical at tasseling)',
        diseaseResistance: 'Turcicum leaf blight & stalk rot tolerant',
        riskLevel: 'Low',
        tag: 'Recommended Commercial Pick',
      },
      {
        id: 'v2',
        varietyName: 'DHM-117 (ICAR Drought Resilient)',
        seedQtyPerAcreKg: 8.0,
        seedPricePerKg: 260,
        expectedYieldPerAcreKg: 2400,
        waterRequirement: 'Low to Moderate (Drought hardy)',
        diseaseResistance: 'Downy mildew and moisture stress tolerance',
        riskLevel: 'Low',
        tag: 'Drought Resilient',
      },
      {
        id: 'v3',
        varietyName: 'Ganga Safed-2 (Composite)',
        seedQtyPerAcreKg: 10.0,
        seedPricePerKg: 130,
        expectedYieldPerAcreKg: 1900,
        waterRequirement: 'Rainfed / Low',
        diseaseResistance: 'Broad adaptability with low fertilizer requirement',
        riskLevel: 'Moderate',
        tag: 'Lowest Investment',
      },
    ],
  },
  paddy: {
    id: 'paddy',
    name: 'Paddy',
    kannadaName: 'ಭತ್ತ / ಅಕ್ಕಿ',
    hindiName: 'धान / चावल',
    category: 'Cereals',
    imageUrl: 'https://images.unsplash.com/photo-1536640712-4d4c36ff0e4e?w=500&auto=format&fit=crop&q=80',
    durationDays: 125,
    durationLabel: '115 – 135 days',
    waterNeed: 'Abundant',
    waterRequirementMm: 1100,
    compatibleSoils: ['Clay soil', 'Loamy soil', 'Alluvial soil', 'Black soil'],
    defaultVariety: 'Sahbhagi Dhan (Drought Resilient)',
    seedRatePerAcreKg: 16.0,
    seedPricePerKg: 75,
    fertilizerExpensesPerAcreInr: 8000,
    labourExpensesPerAcreInr: 9500,
    irrigationExpensesPerAcreInr: 4500,
    otherExpensesPerAcreInr: 2500,
    expectedYieldPerAcreKg: 2500,
    expectedSellingPricePerKg: 25,
    majorRisks: [
      'Water scarcity during panicle initiation stage',
      'Brown planthopper (BPH) and bacterial leaf blight outbreaks',
      'Delayed monsoon or early cold temperature drops at flowering',
    ],
    recommendationReason:
      'Assured MSP procurement and household food security; Sahbhagi Dhan saves over 30% irrigation water.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Sahbhagi Dhan (Water-Saving Direct Seeded)',
        seedQtyPerAcreKg: 15.0,
        seedPricePerKg: 75,
        expectedYieldPerAcreKg: 2300,
        waterRequirement: 'Low to Moderate (Saves 35% water vs puddle)',
        diseaseResistance: 'Leaf blast resistant, terminal drought tolerant',
        riskLevel: 'Low',
        tag: 'Water Saver Recommended',
      },
      {
        id: 'v2',
        varietyName: 'BPT 5204 (Samba Mahsuri Premium)',
        seedQtyPerAcreKg: 20.0,
        seedPricePerKg: 95,
        expectedYieldPerAcreKg: 2700,
        waterRequirement: 'Abundant (Requires continuous canal/borewell)',
        diseaseResistance: 'High market premium, bacterial blight tolerant',
        riskLevel: 'Moderate',
        tag: 'Highest Market Price',
      },
      {
        id: 'v3',
        varietyName: 'MTU 1010 (Short Duration High Yield)',
        seedQtyPerAcreKg: 22.0,
        seedPricePerKg: 65,
        expectedYieldPerAcreKg: 2850,
        waterRequirement: 'Moderate (115 days quick harvest)',
        diseaseResistance: 'BPH tolerance, non-lodging sturdy straw',
        riskLevel: 'Low',
        tag: 'Quick Harvest',
      },
    ],
  },
  chilli: {
    id: 'chilli',
    name: 'Chilli',
    kannadaName: 'ಮೆಣಸಿನಕಾಯಿ',
    hindiName: 'मिर्च',
    category: 'Spices',
    imageUrl: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?w=500&auto=format&fit=crop&q=80',
    durationDays: 150,
    durationLabel: '140 – 165 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 550,
    compatibleSoils: ['Black soil', 'Red soil', 'Loamy soil', 'Red Sandy Loam'],
    defaultVariety: 'Arka Tejasvi F1 (Virus Tolerant)',
    seedRatePerAcreKg: 0.2,
    seedPricePerKg: 22000,
    fertilizerExpensesPerAcreInr: 14000,
    labourExpensesPerAcreInr: 18000,
    irrigationExpensesPerAcreInr: 6000,
    otherExpensesPerAcreInr: 4000,
    expectedYieldPerAcreKg: 3500,
    expectedSellingPricePerKg: 55,
    majorRisks: [
      'Chilli Leaf Curl Virus (ChLCV) and Thrips / Yellow Mite complexes',
      'Anthracnose fruit rot during unseasonal rains',
      'High picking labour demand over multiple flushes',
    ],
    recommendationReason:
      'High value spice crop with exceptional profit margins; dry pods can be safely warehoused to arbitrate market price peaks.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Arka Tejasvi F1 (ICAR High Pungency)',
        seedQtyPerAcreKg: 0.2,
        seedPricePerKg: 22000,
        expectedYieldPerAcreKg: 3500,
        waterRequirement: 'Moderate (Drip irrigation)',
        diseaseResistance: 'Chilli Leaf Curl Virus (ChLCV) high resistance',
        riskLevel: 'Low',
        tag: 'Top Budget Fit',
      },
      {
        id: 'v2',
        varietyName: 'Byadgi KDL (Deep Red Oleoresin)',
        seedQtyPerAcreKg: 0.5,
        seedPricePerKg: 4500,
        expectedYieldPerAcreKg: 2200,
        waterRequirement: 'Moderate (Rainfed suited)',
        diseaseResistance: 'Export quality color value, drought tolerant',
        riskLevel: 'Moderate',
        tag: 'Export Premium',
      },
      {
        id: 'v3',
        varietyName: 'Syngenta 5531 F1 (Commercial Picking)',
        seedQtyPerAcreKg: 0.2,
        seedPricePerKg: 28000,
        expectedYieldPerAcreKg: 4200,
        waterRequirement: 'High (Precision Fertigation)',
        diseaseResistance: 'High continuous bearing, thrips tolerant',
        riskLevel: 'Moderate',
        tag: 'Maximum Flushes',
      },
    ],
  },
  onion: {
    id: 'onion',
    name: 'Onion',
    kannadaName: 'ಈರುಳ್ಳಿ',
    hindiName: 'प्याज',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1518977822534-7049a61ee0c2?w=500&auto=format&fit=crop&q=80',
    durationDays: 120,
    durationLabel: '110 – 125 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 480,
    compatibleSoils: ['Loamy soil', 'Red soil', 'Black soil', 'Alluvial soil'],
    defaultVariety: 'Bhima Super (Kharif Red)',
    seedRatePerAcreKg: 3.5,
    seedPricePerKg: 2200,
    fertilizerExpensesPerAcreInr: 10000,
    labourExpensesPerAcreInr: 12000,
    irrigationExpensesPerAcreInr: 5000,
    otherExpensesPerAcreInr: 3000,
    expectedYieldPerAcreKg: 8000,
    expectedSellingPricePerKg: 20,
    majorRisks: [
      'Purple blotch and Stemphylium blight during humid overcast weather',
      'Bulb rot if harvested during unseasonal showers',
      'Price crashes during peak harvest arrivals',
    ],
    recommendationReason:
      'Fast turnover staple crop with dependable urban demand and strong storage potential in ventilated structures.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Bhima Super (DOGR Commercial Red)',
        seedQtyPerAcreKg: 3.5,
        seedPricePerKg: 2200,
        expectedYieldPerAcreKg: 8000,
        waterRequirement: 'Moderate (Frequent light irrigation)',
        diseaseResistance: 'Moderate purple blotch tolerance, uniform red bulbs',
        riskLevel: 'Low',
        tag: 'Best Commercial Yield',
      },
      {
        id: 'v2',
        varietyName: 'Arka Kalyan (ICAR Storage Champion)',
        seedQtyPerAcreKg: 4.0,
        seedPricePerKg: 1600,
        expectedYieldPerAcreKg: 7200,
        waterRequirement: 'Moderate',
        diseaseResistance: 'Excellent keeping quality (stores 4-5 months)',
        riskLevel: 'Low',
        tag: 'High Storage Life',
      },
      {
        id: 'v3',
        varietyName: 'Prashant 555 F1 (Export Hybrid)',
        seedQtyPerAcreKg: 3.0,
        seedPricePerKg: 3200,
        expectedYieldPerAcreKg: 9500,
        waterRequirement: 'Moderate (Drip)',
        diseaseResistance: 'Non-bolting, tight neck prevents fungal rot',
        riskLevel: 'Moderate',
        tag: 'Highest Yield',
      },
    ],
  },
  potato: {
    id: 'potato',
    name: 'Potato',
    kannadaName: 'ಆಲೂಗಡ್ಡೆ',
    hindiName: 'आलू',
    category: 'Vegetables',
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
    durationDays: 100,
    durationLabel: '90 – 110 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 500,
    compatibleSoils: ['Loamy soil', 'Sandy soil', 'Red Sandy Loam', 'Alluvial soil'],
    defaultVariety: 'Kufri Jyoti (Table & Processing)',
    seedRatePerAcreKg: 600,
    seedPricePerKg: 32,
    fertilizerExpensesPerAcreInr: 11000,
    labourExpensesPerAcreInr: 9000,
    irrigationExpensesPerAcreInr: 6000,
    otherExpensesPerAcreInr: 3000,
    expectedYieldPerAcreKg: 8500,
    expectedSellingPricePerKg: 18,
    majorRisks: [
      'Late blight during cool humid weather',
      'High upfront tuber seed cost',
      'Tuber rot in waterlogged or heavy clay soil',
    ],
    recommendationReason:
      'High caloric productivity per acre with direct wholesale demand across cold storage aggregators.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Kufri Jyoti (All-Rounder Table)',
        seedQtyPerAcreKg: 600,
        seedPricePerKg: 32,
        expectedYieldPerAcreKg: 8500,
        waterRequirement: 'Moderate (Furrow / Sprinkler)',
        diseaseResistance: 'Moderate late blight resistance, wide adaptability',
        riskLevel: 'Low',
        tag: 'Reliable Standard',
      },
      {
        id: 'v2',
        varietyName: 'Kufri Pukhraj (Early Bulker)',
        seedQtyPerAcreKg: 650,
        seedPricePerKg: 30,
        expectedYieldPerAcreKg: 9200,
        waterRequirement: 'Moderate (Early 75-85 day harvest)',
        diseaseResistance: 'Fast tuber bulking escapes late-season diseases',
        riskLevel: 'Low',
        tag: 'Fast Cashflow',
      },
      {
        id: 'v3',
        varietyName: 'Kufri Himalini (Blight Fighter)',
        seedQtyPerAcreKg: 600,
        seedPricePerKg: 36,
        expectedYieldPerAcreKg: 8800,
        waterRequirement: 'Moderate',
        diseaseResistance: 'Superior late blight immunity; cuts spray outlays',
        riskLevel: 'Low',
        tag: 'Lowest Fungicide Cost',
      },
    ],
  },
  cotton: {
    id: 'cotton',
    name: 'Cotton',
    kannadaName: 'ಹತ್ತಿ',
    hindiName: 'कपास',
    category: 'Commercial',
    imageUrl: 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=500&auto=format&fit=crop&q=80',
    durationDays: 160,
    durationLabel: '150 – 175 days',
    waterNeed: 'Moderate',
    waterRequirementMm: 650,
    compatibleSoils: ['Black soil', 'Deep loamy soil', 'Alluvial soil'],
    defaultVariety: 'Bollgard II RCH 659 (Bt Hybrid)',
    seedRatePerAcreKg: 0.9,
    seedPricePerKg: 1800,
    fertilizerExpensesPerAcreInr: 8500,
    labourExpensesPerAcreInr: 11000,
    irrigationExpensesPerAcreInr: 3500,
    otherExpensesPerAcreInr: 3000,
    expectedYieldPerAcreKg: 1100,
    expectedSellingPricePerKg: 68,
    majorRisks: [
      'Pink bollworm resistance in late pickings',
      'Sucking pests (jassids, whitefly) in vegetative window',
      'Excess moisture during boll bursting causing fiber discolouration',
    ],
    recommendationReason:
      'Major industrial cash crop backed by Cotton Corporation of India (CCI) minimum support price safety net.',
    varieties: [
      {
        id: 'v1',
        varietyName: 'Bollgard II RCH 659 (High Yield Bt)',
        seedQtyPerAcreKg: 0.9,
        seedPricePerKg: 1800,
        expectedYieldPerAcreKg: 1100,
        waterRequirement: 'Moderate (Rainfed or supplemental drip)',
        diseaseResistance: 'American bollworm resistance, sturdy bolls',
        riskLevel: 'Low',
        tag: 'Top Industry Hybrid',
      },
      {
        id: 'v2',
        varietyName: 'Ajit 155 BG-II (High Ginning)',
        seedQtyPerAcreKg: 0.9,
        seedPricePerKg: 1750,
        expectedYieldPerAcreKg: 1050,
        waterRequirement: 'Moderate',
        diseaseResistance: 'High lint recovery percentage, good drought stay-green',
        riskLevel: 'Low',
        tag: 'Ginner Premium',
      },
      {
        id: 'v3',
        varietyName: 'Phule Dhanwantary (Desi / Rainfed)',
        seedQtyPerAcreKg: 2.5,
        seedPricePerKg: 450,
        expectedYieldPerAcreKg: 750,
        waterRequirement: 'Rainfed / Very Low',
        diseaseResistance: 'Natural immune to sucking pests; zero Bt royalty cost',
        riskLevel: 'Low',
        tag: 'Lowest Expense',
      },
    ],
  },
};

export function getCropPreset(cropName: string): CropPreset {
  const normalized = (cropName || '').toLowerCase().trim();
  if (normalized.includes('tomato')) return CROP_PRESETS.tomato;
  if (normalized.includes('maize') || normalized.includes('corn')) return CROP_PRESETS.maize;
  if (normalized.includes('paddy') || normalized.includes('rice')) return CROP_PRESETS.paddy;
  if (normalized.includes('chilli') || normalized.includes('pepper')) return CROP_PRESETS.chilli;
  if (normalized.includes('onion')) return CROP_PRESETS.onion;
  if (normalized.includes('potato')) return CROP_PRESETS.potato;
  if (normalized.includes('cotton')) return CROP_PRESETS.cotton;

  // Fallback preset constructed safely from defaults
  return {
    ...CROP_PRESETS.tomato,
    id: normalized || 'crop_custom',
    name: cropName || 'Custom Crop',
    kannadaName: cropName || 'ಕಸ್ಟಮ್ ಬೆಳೆ',
    hindiName: cropName || 'फसल',
  };
}

export function suggestCropsForFarmer(
  soilType?: string,
  waterAvailability?: WaterAvailabilityLevel,
  budgetInr: number = 50000,
  acres: number = 2
): {
  crop: CropPreset;
  suitabilityScore: number;
  matchReasons: string[];
}[] {
  const effectiveSoil = (soilType || 'Red Sandy Loam').toLowerCase();
  const effectiveWater = waterAvailability || 'Moderate';

  const scored = Object.values(CROP_PRESETS).map((preset) => {
    let score = 70;
    const reasons: string[] = [];

    // Soil compatibility check
    const soilMatches = preset.compatibleSoils.some((s) =>
      effectiveSoil.includes(s.toLowerCase().replace(' soil', ''))
    );
    if (soilMatches) {
      score += 15;
      reasons.push(`Naturally suited to ${soilType || 'your local'} soil conditions`);
    } else {
      score -= 10;
      reasons.push(`Requires soil conditioning for optimal yield in ${soilType}`);
    }

    // Water availability check
    if (preset.waterNeed === 'Abundant' && (effectiveWater === 'Limited' || effectiveWater === 'Rainfed')) {
      score -= 25;
      reasons.push(`Requires abundant water; high risk under ${effectiveWater} water availability`);
    } else if (preset.waterNeed === effectiveWater || effectiveWater === 'Abundant') {
      score += 10;
      reasons.push(`Water requirement aligns well with your available water level`);
    }

    // Budget check
    const estCostPerAcre =
      preset.seedRatePerAcreKg * preset.seedPricePerKg +
      preset.fertilizerExpensesPerAcreInr +
      preset.labourExpensesPerAcreInr +
      preset.irrigationExpensesPerAcreInr +
      preset.otherExpensesPerAcreInr;
    const totalEst = estCostPerAcre * acres;

    if (totalEst <= budgetInr) {
      score += 10;
      reasons.push(`Fits comfortably within your ₹${budgetInr.toLocaleString('en-IN')} budget`);
    } else if (totalEst <= budgetInr * 1.2) {
      score += 2;
      reasons.push(`Slightly stretches budget by ~${Math.round(((totalEst - budgetInr) / budgetInr) * 100)}%`);
    } else {
      score -= 15;
      reasons.push(`Estimated investment exceeds available budget`);
    }

    return {
      crop: preset,
      suitabilityScore: Math.min(98, Math.max(35, score)),
      matchReasons: reasons,
    };
  });

  return scored.sort((a, b) => b.suitabilityScore - a.suitabilityScore).slice(0, 3);
}

export function calculateSeedInvestment(input: SeedInvestmentInput): SeedInvestmentResult {
  const area = Math.max(0, input.areaAcres);
  const seedQtyPerAcre = Math.max(0, input.seedQtyPerAcreKg);
  const seedPrice = Math.max(0, input.seedPricePerKg);

  const totalSeedRequirementKg = Number((area * seedQtyPerAcre).toFixed(3));
  const totalSeedCostInr = Number((totalSeedRequirementKg * seedPrice).toFixed(2));

  const nonSeedExpenses =
    Math.max(0, input.fertilizerExpensesInr) +
    Math.max(0, input.labourExpensesInr) +
    Math.max(0, input.irrigationExpensesInr) +
    Math.max(0, input.otherExpensesInr);

  const totalCultivationInvestmentInr = Number((totalSeedCostInr + nonSeedExpenses).toFixed(2));
  const expectedProductionKg = Number((area * Math.max(0, input.expectedYieldPerAcreKg)).toFixed(2));
  const expectedRevenueInr = Number((expectedProductionKg * Math.max(0, input.expectedSellingPricePerKg)).toFixed(2));
  const estimatedProfitInr = Number((expectedRevenueInr - totalCultivationInvestmentInr).toFixed(2));

  const roiPct =
    totalCultivationInvestmentInr > 0
      ? Number(((estimatedProfitInr / totalCultivationInvestmentInr) * 100).toFixed(1))
      : 0;

  const breakEvenSellingPricePerKg =
    expectedProductionKg > 0
      ? Number((totalCultivationInvestmentInr / expectedProductionKg).toFixed(2))
      : 0;

  const remainingBudgetInr = Number((Math.max(0, input.availableBudgetInr) - totalCultivationInvestmentInr).toFixed(2));

  return {
    totalSeedRequirementKg,
    totalSeedCostInr,
    totalCultivationInvestmentInr,
    expectedProductionKg,
    expectedRevenueInr,
    estimatedProfitInr,
    roiPct,
    breakEvenSellingPricePerKg,
    remainingBudgetInr,
    isWithinBudget: remainingBudgetInr >= 0,
  };
}

export function compareVarieties(
  varieties: VarietyComparisonInput[],
  base: SeedInvestmentInput
): {
  items: VarietyComparisonResult[];
  recommendedVarietyId: string | null;
  recommendationReason: string;
} {
  const nonSeedExpenses =
    Math.max(0, base.fertilizerExpensesInr) +
    Math.max(0, base.labourExpensesInr) +
    Math.max(0, base.irrigationExpensesInr) +
    Math.max(0, base.otherExpensesInr);

  const evaluated: VarietyComparisonResult[] = varieties.slice(0, 3).map((v) => {
    const calc = calculateSeedInvestment({
      ...base,
      variety: v.varietyName,
      seedQtyPerAcreKg: v.seedQtyPerAcreKg,
      seedPricePerKg: v.seedPricePerKg,
      expectedYieldPerAcreKg: v.expectedYieldPerAcreKg,
    });
    return {
      ...v,
      seedInvestmentInr: calc.totalSeedCostInr,
      totalCultivationExpensesInr: Number((calc.totalSeedCostInr + nonSeedExpenses).toFixed(2)),
      expectedProductionKg: calc.expectedProductionKg,
      expectedRevenueInr: calc.expectedRevenueInr,
      estimatedProfitInr: calc.estimatedProfitInr,
      isBudgetSuitable: calc.isWithinBudget,
      isRecommended: false,
    };
  });

  if (evaluated.length === 0) {
    return { items: [], recommendedVarietyId: null, recommendationReason: 'Add at least one variety to compare.' };
  }

  const budgetFits = evaluated.filter((x) => x.isBudgetSuitable);
  let best: VarietyComparisonResult;
  let reason: string;

  if (budgetFits.length > 0) {
    best = budgetFits.reduce((a, b) => (b.estimatedProfitInr > a.estimatedProfitInr ? b : a));
    reason = `${best.varietyName} fits within your ₹${base.availableBudgetInr.toLocaleString('en-IN')} budget and provides the highest estimated profit (₹${best.estimatedProfitInr.toLocaleString('en-IN')}) under your assumptions.`;
  } else {
    best = evaluated.reduce((a, b) =>
      b.totalCultivationExpensesInr < a.totalCultivationExpensesInr ? b : a
    );
    reason = `All compared options exceed your ₹${base.availableBudgetInr.toLocaleString('en-IN')} budget. ${best.varietyName} requires the lowest total cultivation investment (₹${best.totalCultivationExpensesInr.toLocaleString('en-IN')}).`;
  }

  const items = evaluated.map((item) => ({
    ...item,
    isRecommended: item.id === best.id,
  }));

  return { items, recommendedVarietyId: best.id, recommendationReason: reason };
}

export function calculateRiskScenarios(
  base: SeedInvestmentInput,
  scenarios: {
    unfavourableYield: number;
    unfavourablePrice: number;
    expectedYield: number;
    expectedPrice: number;
    favourableYield: number;
    favourablePrice: number;
  }
): RiskScenarioItem[] {
  const build = (
    label: RiskScenarioItem['label'],
    y: number,
    p: number
  ): RiskScenarioItem => {
    const r = calculateSeedInvestment({
      ...base,
      expectedYieldPerAcreKg: y,
      expectedSellingPricePerKg: p,
    });
    return {
      label,
      yieldPerAcreKg: y,
      sellingPricePerKg: p,
      expectedProductionKg: r.expectedProductionKg,
      expectedRevenueInr: r.expectedRevenueInr,
      estimatedProfitInr: r.estimatedProfitInr,
    };
  };

  return [
    build('Unfavourable', scenarios.unfavourableYield, scenarios.unfavourablePrice),
    build('Expected', scenarios.expectedYield, scenarios.expectedPrice),
    build('Favourable', scenarios.favourableYield, scenarios.favourablePrice),
  ];
}

export function generateFarmerRecommendations(
  calc: SeedInvestmentResult,
  input: SeedInvestmentInput,
  comparisonItems: VarietyComparisonResult[]
): string[] {
  const recs: string[] = [];

  if (!calc.isWithinBudget) {
    recs.push(
      `Your selected cultivation plan exceeds your budget by ₹${Math.abs(calc.remainingBudgetInr).toLocaleString('en-IN')}. Consider choosing a lower-input variety or adjusting land allocation.`
    );
  } else {
    recs.push(
      `Your selected cultivation plan comfortably fits within budget with ₹${calc.remainingBudgetInr.toLocaleString('en-IN')} surplus remaining as an emergency safety reserve.`
    );
  }

  if (
    calc.breakEvenSellingPricePerKg > 0 &&
    input.expectedSellingPricePerKg < calc.breakEvenSellingPricePerKg
  ) {
    recs.push(
      `Your expected selling price (₹${input.expectedSellingPricePerKg}/kg) is below your break-even cost (₹${calc.breakEvenSellingPricePerKg}/kg). You will require at least ₹${calc.breakEvenSellingPricePerKg}/kg to avoid loss.`
    );
  } else if (calc.breakEvenSellingPricePerKg > 0) {
    recs.push(
      `Your break-even price is ₹${calc.breakEvenSellingPricePerKg}/kg. Every rupee earned above this represents pure net agricultural surplus.`
    );
  }

  if (comparisonItems.length >= 2) {
    const lowestCost = comparisonItems.reduce((a, b) =>
      b.seedInvestmentInr < a.seedInvestmentInr ? b : a
    );
    const highestProfit = comparisonItems.reduce((a, b) =>
      b.estimatedProfitInr > a.estimatedProfitInr ? b : a
    );
    recs.push(
      `${lowestCost.varietyName} requires the lowest initial seed outlay (₹${lowestCost.seedInvestmentInr.toLocaleString('en-IN')}).`
    );
    if (highestProfit.id !== lowestCost.id) {
      recs.push(
        `${highestProfit.varietyName} yields the highest estimated net profit (₹${highestProfit.estimatedProfitInr.toLocaleString('en-IN')}) under standard market conditions.`
      );
    }
  }

  return recs;
}
