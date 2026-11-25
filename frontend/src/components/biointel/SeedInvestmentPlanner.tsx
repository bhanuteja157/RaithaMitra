// frontend/src/components/biointel/SeedInvestmentPlanner.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { saveSeedToDigitalFarmTransfer } from '@/lib/workflowBridge';
import {
  localizeCropName,
  localizeCondition,
  formatLocalizedCurrency,
  getIntlLocale,
} from '@/lib/translations';
import { Language } from '@/types';

const SEED_PLANNER_I18N: Record<Language, {
  badgeSub: string; autoSynced: string; soilLbl: string;
  step1Title: string; step1Hint: string; helpChooseBtn: string;
  acresLbl: string; acShort: string; budgetQ: string; waterQ: string; cropNeedLbl: string;
  autoPopNote: string; formulating: string;
  recPlanBadge: string; updatedLbl: string; seedReqLbl: string; seedOutlayLbl: string;
  ofTotalCost: string; expHarvestLbl: string; quintalsLbl: string; targetPriceLbl: string; breakEvenPrefix: string;
  totalInvLbl: string; seedPlusInputs: string; budgetStatusLbl: string; withinBudget: string; budgetDeficit: string;
  expProdLbl: string; revPrefix: string; netProfitRoi: string; breakEvenTitle: string; breakEvenHint: string;
  adviceTitle: string; risksTitle: string;
  varCompTitle: string; varCompSub: string; benchNote: string; recRibbon: string;
  exceedsBudget: string; seedPriceLbl: string; totalCultLbl: string; expProdShort: string; estProfitColon: string;
  waterTag: string; resTag: string; selectedNurseryFarm: string; selectVariety: string;
  cultivateInDfPrefix: string; cultivateInDfSuffix: string; profitChartTitle: string; profitBarName: string;
  advTitle: string; advOpenDesc: string; advClosedDesc: string; collapse: string; expand: string;
  advNote: string; cropNameLbl: string; varNameLbl: string; seedRateLbl: string; fertExpLbl: string;
  labExpLbl: string; irrigExpLbl: string; otherExpLbl: string; expYieldAcLbl: string; expSellPriceLbl: string;
  editTableTitle: string; colVarName: string; colSeedRate: string; colPriceKg: string; colYieldAc: string; colWaterRes: string;
  riskParamTitle: string; unfavYield: string; unfavPrice: string; favYield: string; favPrice: string; projProfit: string;
  helpTitle: string; helpDescSoil: string; helpDescWater: string; helpDescBudget: string; matchSuffix: string; selectCropBtn: string;
  disclaimerLeft: string; disclaimerRight: string;
  waterLevels: Record<WaterAvailabilityLevel, string>;
}> = {
  en: {
    badgeSub: 'Farmer-Friendly Seed Planner', autoSynced: 'Auto-Synced', soilLbl: 'Soil:',
    step1Title: 'Cultivation Essentials', step1Hint: '(Only 4 simple inputs)', helpChooseBtn: 'Help Me Choose Crop',
    acresLbl: 'Acres', acShort: 'Ac', budgetQ: 'What is your available budget?', waterQ: 'How much water is available?', cropNeedLbl: 'Crop need:',
    autoPopNote: 'Parameters pre-filled from regional agricultural benchmarks.', formulating: 'Preparing Plan...',
    recPlanBadge: 'Recommended Cultivation Plan', updatedLbl: 'Updated:', seedReqLbl: 'Seed Quantity Required', seedOutlayLbl: 'Seed Outlay',
    ofTotalCost: '% of total cost', expHarvestLbl: 'Expected Harvest', quintalsLbl: 'Quintals', targetPriceLbl: 'Expected Selling Price', breakEvenPrefix: 'Break-even:',
    totalInvLbl: 'Total Investment', seedPlusInputs: 'Seed + Inputs', budgetStatusLbl: 'Budget Status', withinBudget: 'Within Budget', budgetDeficit: 'Budget Deficit',
    expProdLbl: 'Expected Production', revPrefix: 'Rev:', netProfitRoi: 'Est. Net Profit & ROI', breakEvenTitle: 'Break-Even Price', breakEvenHint: 'Minimum needed to avoid loss',
    adviceTitle: 'Cultivation Financial Advice', risksTitle: 'Major Crop & Market Risks',
    varCompTitle: 'Seed Variety Comparison — 3 Options', varCompSub: 'Compare hybrid, resilient, and standard seed options for your budget.',
    benchNote: 'Illustrative Estimates', recRibbon: 'Recommended for Budget',
    exceedsBudget: 'Exceeds Budget', seedPriceLbl: 'Seed Price', totalCultLbl: 'Total Cost', expProdShort: 'Exp. Yield', estProfitColon: 'Est. Net Profit:',
    waterTag: 'Water:', resTag: 'Resistance:', selectedNurseryFarm: 'Selected for Nursery & Farm', selectVariety: 'Select This Variety',
    cultivateInDfPrefix: 'Grow', cultivateInDfSuffix: 'in Digital Farm', profitChartTitle: 'Estimated Profit Comparison Across Varieties', profitBarName: 'Est. Net Profit (₹)',
    advTitle: 'Advanced Settings — Customize Estimates',
    advOpenDesc: 'Manually fine-tune seed rate, fertilizer, labour, irrigation, yield and prices',
    advClosedDesc: 'Click here to customize specific farm costs and yield prices',
    collapse: 'Collapse', expand: 'Expand', advNote: 'Adjust any value below. Profit and break-even recalculate immediately.',
    cropNameLbl: 'Crop Name', varNameLbl: 'Seed Variety', seedRateLbl: 'Seed Rate (kg/acre)', fertExpLbl: 'Fertilizer Expenses (₹)',
    labExpLbl: 'Labour Expenses (₹)', irrigExpLbl: 'Irrigation Expenses (₹)', otherExpLbl: 'Other Expenses (₹)', expYieldAcLbl: 'Expected Yield (kg/acre)', expSellPriceLbl: 'Selling Price (₹/kg)',
    editTableTitle: 'Editable Variety Parameters', colVarName: 'Variety Name', colSeedRate: 'Seed Rate (kg/ac)', colPriceKg: 'Price (₹/kg)', colYieldAc: 'Yield (kg/ac)', colWaterRes: 'Water Need',
    riskParamTitle: 'Risk Scenario Simulation Parameters', unfavYield: 'Low Yield (kg/ac)', unfavPrice: 'Low Price (₹/kg)', favYield: 'High Yield (kg/ac)', favPrice: 'High Price (₹/kg)', projProfit: 'Projected Profit (₹)',
    helpTitle: 'Help Me Choose a Crop', helpDescSoil: 'Soil:', helpDescWater: 'Water:', helpDescBudget: 'Budget:', matchSuffix: '% Match', selectCropBtn: 'Select Crop',
    disclaimerLeft: 'Deterministic calculations from your inputs and regional benchmarks. Not a guaranteed financial return.',
    disclaimerRight: 'RaithaMitra Crop Planning Engine',
    waterLevels: { Abundant: 'Abundant (Canal/River)', Moderate: 'Moderate (Borewell/Drip)', Limited: 'Limited water', Rainfed: 'Rainfed (Monsoon)' },
  },
  kn: {
    badgeSub: 'ಸರಳ ಬೀಜ ಮತ್ತು ಬೆಳೆ ಹೂಡಿಕೆ ಯೋಜಕ', autoSynced: 'ಸ್ವಯಂ ಸಂಪರ್ಕಿತ', soilLbl: 'ಮಣ್ಣು:',
    step1Title: 'ಬೇಸಾಯದ ಪ್ರಮುಖ ವಿವರಗಳು', step1Hint: '(ಕೇವಲ 4 ಸರಳ ಪ್ರಶ್ನೆಗಳು)', helpChooseBtn: 'ಬೆಳೆ ಆಯ್ಕೆಗೆ ಸಹಾಯ ಮಾಡಿ',
    acresLbl: 'ಎಕರೆ', acShort: 'ಎಕರೆ', budgetQ: 'ನಿಮ್ಮ ಬಳಿ ಇರುವ ಬಜೆಟ್ ಎಷ್ಟು?', waterQ: 'ನೀರಿನ ಲಭ್ಯತೆ ಹೇಗಿದೆ?', cropNeedLbl: 'ಬೆಳೆಗೆ ನೀರಿನ ಅಗತ್ಯ:',
    autoPopNote: 'ಪ್ರಾದೇಶಿಕ ಕೃಷಿ ವಿಶ್ವವಿದ್ಯಾಲಯದ ಮಾನದಂಡಗಳ ಪ್ರಕಾರ ಲೆಕ್ಕಹಾಕಲಾಗಿದೆ.', formulating: 'ಯೋಜನೆ ತಯಾರಾಗುತ್ತಿದೆ...',
    recPlanBadge: 'ಶಿಫಾರಸು ಮಾಡಿದ ಬೇಸಾಯ ಯೋಜನೆ', updatedLbl: 'ನವೀಕರಣ:', seedReqLbl: 'ಬೇಕಾಗುವ ಬೀಜ', seedOutlayLbl: 'ಬೀಜದ ವೆಚ್ಚ',
    ofTotalCost: '% ಒಟ್ಟು ವೆಚ್ಚದಲ್ಲಿ', expHarvestLbl: 'ನಿರೀಕ್ಷಿತ ಇಳುವರಿ', quintalsLbl: 'ಕ್ವಿಂಟಾಲ್', targetPriceLbl: 'ನಿರೀಕ್ಷಿತ ಮಾರಾಟ ಬೆಲೆ', breakEvenPrefix: 'ಕನಿಷ್ಠ ಬೆಲೆ:',
    totalInvLbl: 'ಒಟ್ಟು ಹೂಡಿಕೆ', seedPlusInputs: 'ಬೀಜ + ಇತರೆ ವೆಚ್ಚ', budgetStatusLbl: 'ಬಜೆಟ್ ಸ್ಥಿತಿ', withinBudget: 'ಬಜೆಟ್ ಒಳಗಿದೆ', budgetDeficit: 'ಬಜೆಟ್ ಕೊರತೆ',
    expProdLbl: 'ನಿರೀಕ್ಷಿತ ಉತ್ಪಾದನೆ', revPrefix: 'ಆದಾಯ:', netProfitRoi: 'ಅಂದಾಜು ನಿವ್ವಳ ಲಾಭ & ROI', breakEvenTitle: 'ನಷ್ಟವಿಲ್ಲದ ಕನಿಷ್ಠ ಬೆಲೆ', breakEvenHint: 'ನಷ್ಟ ತಪ್ಪಿಸಲು ಕನಿಷ್ಠ ದರ',
    adviceTitle: 'ಬೇಸಾಯ ಮತ್ತು ಹಣಕಾಸು ಸಲಹೆ', risksTitle: 'ಪ್ರಮುಖ ಬೆಳೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಅಪಾಯಗಳು',
    varCompTitle: 'ಬೀಜ ತಳಿಗಳ ಹೋಲಿಕೆ — 3 ಆಯ್ಕೆಗಳು', varCompSub: 'ನಿಮ್ಮ ಬಜೆಟ್ ಪ್ರಕಾರ ಹೈಬ್ರಿಡ್ ಮತ್ತು ರೋಗ ನಿರೋಧಕ ತಳಿಗಳನ್ನು ಹೋಲಿಸಿ.',
    benchNote: 'ಅಂದಾಜು ಮಾದರಿ', recRibbon: 'ನಿಮ್ಮ ಬಜೆಟ್‌ಗೆ ಸೂಕ್ತ',
    exceedsBudget: 'ಬಜೆಟ್ ಮೀರಿದೆ', seedPriceLbl: 'ಬೀಜದ ದರ', totalCultLbl: 'ಒಟ್ಟು ವೆಚ್ಚ', expProdShort: 'ನಿರೀಕ್ಷಿತ ಇಳುವರಿ', estProfitColon: 'ಅಂದಾಜು ಲಾಭ:',
    waterTag: 'ನೀರು:', resTag: 'ರೋಗ ನಿರೋಧಕತೆ:', selectedNurseryFarm: 'ನರ್ಸರಿ ಮತ್ತು ಜಮೀನಿಗೆ ಆಯ್ಕೆಯಾಗಿದೆ', selectVariety: 'ಈ ತಳಿ ಆಯ್ಕೆಮಾಡಿ',
    cultivateInDfPrefix: 'ಡಿಜಿಟಲ್ ಜಮೀನಿನಲ್ಲಿ', cultivateInDfSuffix: 'ಬೆಳೆಯಿರಿ', profitChartTitle: 'ತಳಿಗಳ ಪ್ರಕಾರ ಅಂದಾಜು ಲಾಭದ ಹೋಲಿಕೆ', profitBarName: 'ಅಂದಾಜು ಲಾಭ (₹)',
    advTitle: 'ಹೆಚ್ಚುವರಿ ಸೆಟ್ಟಿಂಗ್ಸ್ — ಅಂದಾಜು ಬದಲಿಸಿ',
    advOpenDesc: 'ಬೀಜದ ದರ, ಗೊಬ್ಬರ, ಕೂಲಿ, ನೀರಾವರಿ ಮತ್ತು ಮಾರಾಟ ಬೆಲೆಯನ್ನು ನೀವೇ ಬದಲಾಯಿಸಿ',
    advClosedDesc: 'ವೆಚ್ಚ ಮತ್ತು ಬೆಲೆಗಳನ್ನು ಸ್ವತಃ ಬದಲಾಯಿಸಲು ಇಲ್ಲಿ ಒತ್ತಿ',
    collapse: 'ಮರೆಮಾಡಿ', expand: 'ತೆರೆಯಿರಿ', advNote: 'ಕೆಳಗಿನ ಯಾವುದೇ ಅಂಕಿ ಬದಲಿಸಿದರೆ ಲಾಭ ತಕ್ಷಣವೇ ಮರು-ಲೆಕ್ಕಾಚಾರಗೊಳ್ಳುತ್ತದೆ.',
    cropNameLbl: 'ಬೆಳೆ ಹೆಸರು', varNameLbl: 'ಬೀಜ ತಳಿ', seedRateLbl: 'ಬೀಜದ ಪ್ರಮಾಣ (kg/ಎಕರೆ)', fertExpLbl: 'ಗೊಬ್ಬರ ವೆಚ್ಚ (₹)',
    labExpLbl: 'ಕೂಲಿ ವೆಚ್ಚ (₹)', irrigExpLbl: 'ನೀರಾವರಿ ವೆಚ್ಚ (₹)', otherExpLbl: 'ಇತರೆ ವೆಚ್ಚ (₹)', expYieldAcLbl: 'ಇಳುವರಿ (kg/ಎಕರೆ)', expSellPriceLbl: 'ಮಾರಾಟ ಬೆಲೆ (₹/kg)',
    editTableTitle: 'ತಳಿಗಳ ವಿವರ ಬದಲಾಯಿಸಿ', colVarName: 'ತಳಿಯ ಹೆಸರು', colSeedRate: 'ಬೀಜ ಪ್ರಮಾಣ (kg/ಎ)', colPriceKg: 'ಬೆಲೆ (₹/kg)', colYieldAc: 'ಇಳುವರಿ (kg/ಎ)', colWaterRes: 'ನೀರಿನ ಅಗತ್ಯ',
    riskParamTitle: 'ಅಪಾಯ ಪರಿಸ್ಥಿತಿ ಲೆಕ್ಕಾಚಾರ', unfavYield: 'ಕಡಿಮೆ ಇಳುವರಿ (kg/ಎ)', unfavPrice: 'ಕಡಿಮೆ ಬೆಲೆ (₹/kg)', favYield: 'ಹೆಚ್ಚು ಇಳುವರಿ (kg/ಎ)', favPrice: 'ಹೆಚ್ಚು ಬೆಲೆ (₹/kg)', projProfit: 'ಅಂದಾಜು ಲಾಭ (₹)',
    helpTitle: 'ಸೂಕ್ತ ಬೆಳೆ ಆಯ್ಕೆ ಸಹಾಯಕ', helpDescSoil: 'ಮಣ್ಣು:', helpDescWater: 'ನೀರು:', helpDescBudget: 'ಬಜೆಟ್:', matchSuffix: '% ಹೊಂದಾಣಿಕೆ', selectCropBtn: 'ಬೆಳೆ ಆಯ್ಕೆಮಾಡಿ',
    disclaimerLeft: 'ನೀವು ನೀಡಿದ ವಿಸ್ತೀರ್ಣ ಮತ್ತು ಬಜೆಟ್ ಆಧಾರದ ಅಂದಾಜು ಲೆಕ್ಕ. ನಿಖರ ಲಾಭ ಮಾರುಕಟ್ಟೆ ಬೆಲೆಗೆ ಒಳಪಟ್ಟಿರುತ್ತದೆ.',
    disclaimerRight: 'ರೈತ ಮಿತ್ರ ಬೆಳೆ ಯೋಜನಾ ವ್ಯವಸ್ಥೆ',
    waterLevels: { Abundant: 'ಹೆಚ್ಚು ನೀರು (ಕಾಲುವೆ/ನದಿ)', Moderate: 'ಮಧ್ಯಮ ನೀರು (ಬೋರ್‌ವೆಲ್/ಹನಿ)', Limited: 'ಕಡಿಮೆ ನೀರು', Rainfed: 'ಮಳೆಯಾಶ್ರಿತ' },
  },
  hi: {
    badgeSub: 'सरल बीज एवं फसल निवेश योजनाकार', autoSynced: 'स्वतः सिंक', soilLbl: 'मिट्टी:',
    step1Title: 'खेती की बुनियादी जानकारी', step1Hint: '(सिर्फ 4 आसान सवाल)', helpChooseBtn: 'सही फसल चुनने में मदद करें',
    acresLbl: 'एकड़', acShort: 'एकड़', budgetQ: 'आपका उपलब्ध बजट कितना है?', waterQ: 'सिंचाई के लिए पानी कितना है?', cropNeedLbl: 'फसल की पानी जरूरत:',
    autoPopNote: 'क्षेत्रीय कृषि मानकों के अनुसार सभी आंकड़े स्वतः भरे गए हैं।', formulating: 'योजना बन रही है...',
    recPlanBadge: 'अनुशंसित खेती योजना', updatedLbl: 'अपडेट:', seedReqLbl: 'आवश्यक बीज मात्रा', seedOutlayLbl: 'बीज खर्च',
    ofTotalCost: '% कुल खर्च का', expHarvestLbl: 'संभावित उपज', quintalsLbl: 'क्विंटल', targetPriceLbl: 'संभावित बिक्री भाव', breakEvenPrefix: 'न्यूनतम भाव:',
    totalInvLbl: 'कुल निवेश', seedPlusInputs: 'बीज + खाद व अन्य', budgetStatusLbl: 'बजट स्थिति', withinBudget: 'बजट के भीतर', budgetDeficit: 'बजट से अधिक',
    expProdLbl: 'अनुमानित उत्पादन', revPrefix: 'आमदनी:', netProfitRoi: 'अनुमानित शुद्ध लाभ व ROI', breakEvenTitle: 'ब्रेक-ईवन कीमत', breakEvenHint: 'नुकसान से बचने का न्यूनतम भाव',
    adviceTitle: 'खेती व वित्तीय सलाह', risksTitle: 'प्रमुख फसल और बाज़ार जोखिम',
    varCompTitle: 'बीज किस्म तुलना — 3 विकल्प', varCompSub: 'अपने बजट के अनुसार हाइब्रिड और रोग-प्रतिरोधी किस्मों की तुलना करें।',
    benchNote: 'अनुमानित तुलना', recRibbon: 'आपके बजट के अनुकूल',
    exceedsBudget: 'बजट से अधिक', seedPriceLbl: 'बीज दर', totalCultLbl: 'कुल खर्च', expProdShort: 'अनुमानित उपज', estProfitColon: 'अनुमानित लाभ:',
    waterTag: 'पानी:', resTag: 'रोग प्रतिरोधकता:', selectedNurseryFarm: 'नर्सरी और खेत के लिए चयनित', selectVariety: 'यह किस्म चुनें',
    cultivateInDfPrefix: 'डिजिटल खेत में उगाएं:', cultivateInDfSuffix: '', profitChartTitle: 'किस्मों के अनुसार लाभ तुलना', profitBarName: 'अनुमानित लाभ (₹)',
    advTitle: 'उन्नत सेटिंग्स — अनुमान बदलें',
    advOpenDesc: 'बीज दर, खाद, मजदूरी, सिंचाई और बिक्री भाव स्वयं संशोधित करें',
    advClosedDesc: 'खर्च और कीमतें स्वयं बदलने के लिए यहाँ क्लिक करें',
    collapse: 'समेटें', expand: 'विस्तार करें', advNote: 'नीचे कोई भी मान बदलने पर लाभ और ब्रेक-ईवन तुरंत अपडेट हो जाते हैं।',
    cropNameLbl: 'फसल का नाम', varNameLbl: 'बीज किस्म', seedRateLbl: 'बीज दर (kg/एकड़)', fertExpLbl: 'खाद खर्च (₹)',
    labExpLbl: 'मजदूरी खर्च (₹)', irrigExpLbl: 'सिंचाई खर्च (₹)', otherExpLbl: 'अन्य खर्च (₹)', expYieldAcLbl: 'अनुमानित उपज (kg/एकड़)', expSellPriceLbl: 'बिक्री भाव (₹/kg)',
    editTableTitle: 'संपादन योग्य किस्म विवरण', colVarName: 'किस्म का नाम', colSeedRate: 'बीज दर (kg/एकड़)', colPriceKg: 'दाम (₹/kg)', colYieldAc: 'उपज (kg/एकड़)', colWaterRes: 'पानी आवश्यकता',
    riskParamTitle: 'जोखिम परिदृश्य विश्लेषण', unfavYield: 'कम उपज (kg/एकड़)', unfavPrice: 'कम भाव (₹/kg)', favYield: 'अधिक उपज (kg/एकड़)', favPrice: 'अधिक भाव (₹/kg)', projProfit: 'संभावित लाभ (₹)',
    helpTitle: 'सही फसल चुनने में मदद', helpDescSoil: 'मिट्टी:', helpDescWater: 'पानी:', helpDescBudget: 'बजट:', matchSuffix: '% उपयुक्त', selectCropBtn: 'फसल चुनें',
    disclaimerLeft: 'दर्ज क्षेत्रफल व बजट के आधार पर अनुमानित गणना। वास्तविक लाभ मंडी भाव पर निर्भर करता है।',
    disclaimerRight: 'रैत मित्र फसल योजना प्रणाली',
    waterLevels: { Abundant: 'भरपूर पानी (नहर/नदी)', Moderate: 'मध्यम पानी (बोरवेल/ड्रिप)', Limited: 'सीमित पानी', Rainfed: 'वर्षा आधारित' },
  },
  te: {
    badgeSub: 'సులభమైన విత్తన & పంట పెట్టుబడి ప్లానర్', autoSynced: 'ఆటో-సింక్', soilLbl: 'నేల:',
    step1Title: 'సాగు ప్రాథమిక వివరాలు', step1Hint: '(కేవలం 4 సులభ ప్రశ్నలు)', helpChooseBtn: 'పంట ఎంపికలో సహాయం చేయండి',
    acresLbl: 'ఎకరాలు', acShort: 'ఎ.', budgetQ: 'మీ వద్ద ఉన్న బడ్జెట్ ఎంత?', waterQ: 'నీటి లభ్యత ఎంత ఉంది?', cropNeedLbl: 'పంట నీటి అవసరం:',
    autoPopNote: 'ప్రాంతీయ వ్యవసాయ ప్రమాణాల ఆధారంగా వివరాలు ఆటోమేటిక్‌గా నింపబడ్డాయి.', formulating: 'ప్రణాళిక తయారవుతోంది...',
    recPlanBadge: 'సిఫార్సు చేసిన సాగు ప్రణాళిక', updatedLbl: 'నవీకరణ:', seedReqLbl: 'అవసరమైన విత్తనం', seedOutlayLbl: 'విత్తన ఖర్చు',
    ofTotalCost: '% మొత్తం ఖర్చులో', expHarvestLbl: 'అంచనా దిగుబడి', quintalsLbl: 'క్వింటాళ్లు', targetPriceLbl: 'అంచనా అమ్మకం ధర', breakEvenPrefix: 'కనీస ధర:',
    totalInvLbl: 'మొత్తం పెట్టుబడి', seedPlusInputs: 'విత్తనం + ఇతర ఖర్చులు', budgetStatusLbl: 'బడ్జెట్ స్థితి', withinBudget: 'బడ్జెట్ లోపల', budgetDeficit: 'బడ్జెట్ లోటు',
    expProdLbl: 'అంచనా ఉత్పత్తి', revPrefix: 'ఆదాయం:', netProfitRoi: 'అంచనా నికర లాభం & ROI', breakEvenTitle: 'బ్రేక్-ఈవెన్ ధర', breakEvenHint: 'నష్టం రాకుండా కనీస ధర',
    adviceTitle: 'సాగు మరియు ఆర్థిక సలహా', risksTitle: 'ప్రధాన పంట & మార్కెట్ ప్రమాదాలు',
    varCompTitle: 'విత్తన రకాల పోలిక — 3 ఎంపికలు', varCompSub: 'మీ బడ్జెట్ ఆధారంగా హైబ్రిడ్ మరియు వ్యాధి-నిరోధక విత్తనాలను పోల్చండి.',
    benchNote: 'సూచనాత్మక అంచనాలు', recRibbon: 'మీ బడ్జెట్‌కు ఉత్తమం',
    exceedsBudget: 'బడ్జెట్ మించింది', seedPriceLbl: 'విత్తన ధర', totalCultLbl: 'మొత్తం ఖర్చు', expProdShort: 'అంచనా దిగుబడి', estProfitColon: 'అంచనా లాభం:',
    waterTag: 'నీరు:', resTag: 'వ్యాధి నిరోధకత:', selectedNurseryFarm: 'నర్సరీ & పొలానికి ఎంచుకోబడింది', selectVariety: 'ఈ రకాన్ని ఎంచుకోండి',
    cultivateInDfPrefix: 'డిజిటల్ పొలంలో పండించండి:', cultivateInDfSuffix: '', profitChartTitle: 'విత్తన రకాల వారీగా అంచనా లాభం', profitBarName: 'అంచనా లాభం (₹)',
    advTitle: 'అదనపు సెట్టింగ్స్ — అంచనాలు మార్చండి',
    advOpenDesc: 'విత్తన మోతాదు, ఎరువులు, కూలీ, నీరు మరియు ధరలను మీరే మార్చుకోండి',
    advClosedDesc: 'ఖర్చులు మరియు ధరలను మార్చడానికి ఇక్కడ నొక్కండి',
    collapse: 'మూసివేయండి', expand: 'తెరవండి', advNote: 'క్రింది విలువలను మార్చిన వెంటనే లాభం మళ్ళీ లెక్కించబడుతుంది.',
    cropNameLbl: 'పంట పేరు', varNameLbl: 'విత్తన రకం', seedRateLbl: 'విత్తన మోతాదు (kg/ఎకరం)', fertExpLbl: 'ఎరువుల ఖర్చు (₹)',
    labExpLbl: 'కూలీ ఖర్చు (₹)', irrigExpLbl: 'నీటిపారుదల ఖర్చు (₹)', otherExpLbl: 'ఇతర ఖర్చులు (₹)', expYieldAcLbl: 'దిగుబడి (kg/ఎకరం)', expSellPriceLbl: 'అమ్మకం ధర (₹/kg)',
    editTableTitle: 'మార్చగల విత్తన రకాల వివరాలు', colVarName: 'రకం పేరు', colSeedRate: 'మోతాదు (kg/ఎ)', colPriceKg: 'ధర (₹/kg)', colYieldAc: 'దిగుబడి (kg/ఎ)', colWaterRes: 'నీటి అవసరం',
    riskParamTitle: 'ప్రమాద పరిస్థితి విశ్లేషణ', unfavYield: 'తక్కువ దిగుబడి (kg/ఎ)', unfavPrice: 'తక్కువ ధర (₹/kg)', favYield: 'ఎక్కువ దిగుబడి (kg/ఎ)', favPrice: 'ఎక్కువ ధర (₹/kg)', projProfit: 'అంచనా లాభం (₹)',
    helpTitle: 'సరైన పంటను ఎంచుకోవడానికి సహాయం', helpDescSoil: 'నేల:', helpDescWater: 'నీరు:', helpDescBudget: 'బడ్జెట్:', matchSuffix: '% సరిపోతుంది', selectCropBtn: 'పంటను ఎంచుకోండి',
    disclaimerLeft: 'మీరు ఇచ్చిన విస్తీర్ణం & బడ్జెట్ ఆధారంగా అంచనా లెక్కలు. అసలు లాభం మార్కెట్ ధరపై ఆధారపడి ఉంటుంది.',
    disclaimerRight: 'రైతు మిత్ర పంట ప్రణాళిక ఇంజిన్',
    waterLevels: { Abundant: 'సమృద్ధిగా నీరు (కాలువ/నది)', Moderate: 'మోస్తరు నీరు (బోరు/బిందు)', Limited: 'తక్కువ నీరు', Rainfed: 'వర్షాధారం' },
  },
};
import {
  SeedInvestmentInput,
  VarietyComparisonInput,
  calculateSeedInvestment,
  compareVarieties,
  calculateRiskScenarios,
  generateFarmerRecommendations,
  CROP_PRESETS,
  getCropPreset,
  suggestCropsForFarmer,
  WaterAvailabilityLevel,
} from '@/lib/seedInvestment';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Layers,
  Info,
  Sparkles,
  Droplets,
  LandPlot,
  IndianRupee,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight,
  Sprout,
  Compass,
  MapPin,
  Clock,
  Check,
} from 'lucide-react';

interface SeedInvestmentPlannerProps {
  selectedCrop?: string;
  onSelectCrop?: (crop: string) => void;
  onVarietySelectedForNursery?: (payload: {
    crop: string;
    varietyName: string;
    requiredSeedKg: number;
    budgetInr: number;
  }) => void;
}

export function SeedInvestmentPlanner({
  selectedCrop = 'Tomato',
  onSelectCrop,
  onVarietySelectedForNursery,
}: SeedInvestmentPlannerProps) {
  const { currentFarm, currentUser, language, t } = useFarm();
  const L = SEED_PLANNER_I18N[language] || SEED_PLANNER_I18N.en;
  const planSectionRef = useRef<HTMLDivElement | null>(null);

  // 1. Simplified Mandatory Inputs
  const [crop, setCrop] = useState<string>(selectedCrop || currentFarm?.primary_crop || 'Tomato');
  const [areaAcres, setAreaAcres] = useState<number>(
    currentFarm ? Number((currentFarm.land_area_ha * 2.471).toFixed(1)) : 2
  );
  const [budgetInr, setBudgetInr] = useState<number>(
    currentFarm?.cultivation_budget_inr || 50000
  );
  const [waterAvailability, setWaterAvailability] = useState<WaterAvailabilityLevel>(() => {
    const method = (currentFarm?.irrigation_method || '').toLowerCase();
    if (method.includes('canal') || method.includes('flood')) return 'Abundant';
    if (method.includes('drip') || method.includes('borewell')) return 'Moderate';
    return 'Moderate';
  });

  // UI state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [planGeneratedAt, setPlanGeneratedAt] = useState<string>('');

  // 2. Active Preset & Cultivation Parameters
  const activePreset = useMemo(() => getCropPreset(crop), [crop]);

  // Detailed inputs (populated from preset, editable via Advanced Settings)
  const [input, setInput] = useState<SeedInvestmentInput>(() => {
    const preset = getCropPreset(crop);
    return {
      crop: preset.name,
      variety: preset.defaultVariety,
      areaAcres,
      seedQtyPerAcreKg: preset.seedRatePerAcreKg,
      seedPricePerKg: preset.seedPricePerKg,
      fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * areaAcres),
      labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * areaAcres),
      irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * areaAcres),
      otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * areaAcres),
      availableBudgetInr: budgetInr,
      expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
      expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
    };
  });

  // Varieties state for side-by-side comparison
  const [varieties, setVarieties] = useState<VarietyComparisonInput[]>(() => activePreset.varieties);

  // Risk Scenario bounds
  const [unfavYield, setUnfavYield] = useState<number>(() => Math.round(activePreset.expectedYieldPerAcreKg * 0.7));
  const [unfavPrice, setUnfavPrice] = useState<number>(() => Math.round(activePreset.expectedSellingPricePerKg * 0.75));
  const [favYield, setFavYield] = useState<number>(() => Math.round(activePreset.expectedYieldPerAcreKg * 1.25));
  const [favPrice, setFavPrice] = useState<number>(() => Math.round(activePreset.expectedSellingPricePerKg * 1.35));

  // Sync when selectedCrop from parent changes
  useEffect(() => {
    if (selectedCrop && selectedCrop.toLowerCase() !== crop.toLowerCase()) {
      handleCropChange(selectedCrop);
    }
  }, [selectedCrop]);

  // Handle Crop Change & Auto-population
  const handleCropChange = (newCropName: string) => {
    const preset = getCropPreset(newCropName);
    setCrop(preset.name);
    onSelectCrop?.(preset.name);

    setInput({
      crop: preset.name,
      variety: preset.defaultVariety,
      areaAcres,
      seedQtyPerAcreKg: preset.seedRatePerAcreKg,
      seedPricePerKg: preset.seedPricePerKg,
      fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * areaAcres),
      labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * areaAcres),
      irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * areaAcres),
      otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * areaAcres),
      availableBudgetInr: budgetInr,
      expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
      expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
    });

    setVarieties(preset.varieties);
    setUnfavYield(Math.round(preset.expectedYieldPerAcreKg * 0.7));
    setUnfavPrice(Math.round(preset.expectedSellingPricePerKg * 0.75));
    setFavYield(Math.round(preset.expectedYieldPerAcreKg * 1.25));
    setFavPrice(Math.round(preset.expectedSellingPricePerKg * 1.35));
  };

  // Sync land area changes
  const handleAreaChange = (newArea: number) => {
    const safeArea = Math.max(0.1, newArea);
    setAreaAcres(safeArea);
    setInput((prev) => ({
      ...prev,
      areaAcres: safeArea,
      fertilizerExpensesInr: Math.round(activePreset.fertilizerExpensesPerAcreInr * safeArea),
      labourExpensesInr: Math.round(activePreset.labourExpensesPerAcreInr * safeArea),
      irrigationExpensesInr: Math.round(activePreset.irrigationExpensesPerAcreInr * safeArea),
      otherExpensesInr: Math.round(activePreset.otherExpensesPerAcreInr * safeArea),
    }));
  };

  // Sync budget changes
  const handleBudgetChange = (newBudget: number) => {
    const safeBudget = Math.max(0, newBudget);
    setBudgetInr(safeBudget);
    setInput((prev) => ({
      ...prev,
      availableBudgetInr: safeBudget,
    }));
  };

  // Calculations
  const calc = useMemo(() => calculateSeedInvestment(input), [input]);
  const comparison = useMemo(() => compareVarieties(varieties, input), [varieties, input]);
  const riskScenarios = useMemo(
    () =>
      calculateRiskScenarios(input, {
        unfavourableYield: unfavYield,
        unfavourablePrice: unfavPrice,
        expectedYield: input.expectedYieldPerAcreKg,
        expectedPrice: input.expectedSellingPricePerKg,
        favourableYield: favYield,
        favourablePrice: favPrice,
      }),
    [input, unfavYield, unfavPrice, favYield, favPrice]
  );
  const farmerRecs = useMemo(
    () => generateFarmerRecommendations(calc, input, comparison.items, language),
    [calc, input, comparison.items, language]
  );

  // Suggested crops for "Help Me Choose a Crop"
  const cropSuggestions = useMemo(
    () =>
      suggestCropsForFarmer(
        currentFarm?.soil_type || 'Red Sandy Loam',
        waterAvailability,
        budgetInr,
        areaAcres,
        language
      ),
    [currentFarm?.soil_type, waterAvailability, budgetInr, areaAcres, language]
  );

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPlanGeneratedAt(new Date().toLocaleTimeString(getIntlLocale(language), { hour: '2-digit', minute: '2-digit' }));
      planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  // Voice-driven BioIntel form fill + auto-plan generation (user-scoped)
  useEffect(() => {
    const applyVoiceDraft = (draft: {
      userId?: string;
      crop?: string;
      areaAcres?: number;
      budgetInr?: number;
      waterAvailability?: WaterAvailabilityLevel;
      autoGenerate?: boolean;
    }) => {
      if (!draft || (draft.userId && draft.userId !== currentUser.id)) return;
      const preset = getCropPreset(draft.crop || crop);
      const nextArea = Math.max(0.1, Number(draft.areaAcres || areaAcres));
      const nextBudget = Math.max(0, Number(draft.budgetInr ?? budgetInr));
      const nextWater = draft.waterAvailability || waterAvailability;

      setCrop(preset.name);
      setAreaAcres(nextArea);
      setBudgetInr(nextBudget);
      setWaterAvailability(nextWater);
      setVarieties(preset.varieties);
      setInput({
        crop: preset.name,
        variety: preset.defaultVariety,
        areaAcres: nextArea,
        seedQtyPerAcreKg: preset.seedRatePerAcreKg,
        seedPricePerKg: preset.seedPricePerKg,
        fertilizerExpensesInr: Math.round(preset.fertilizerExpensesPerAcreInr * nextArea),
        labourExpensesInr: Math.round(preset.labourExpensesPerAcreInr * nextArea),
        irrigationExpensesInr: Math.round(preset.irrigationExpensesPerAcreInr * nextArea),
        otherExpensesInr: Math.round(preset.otherExpensesPerAcreInr * nextArea),
        availableBudgetInr: nextBudget,
        expectedYieldPerAcreKg: preset.expectedYieldPerAcreKg,
        expectedSellingPricePerKg: preset.expectedSellingPricePerKg,
      });
      onSelectCrop?.(preset.name);
      onVarietySelectedForNursery?.({
        crop: preset.name,
        varietyName: preset.defaultVariety,
        requiredSeedKg: Number((nextArea * preset.seedRatePerAcreKg).toFixed(2)),
        budgetInr: nextBudget,
      });
      if (draft.autoGenerate) {
        handleGeneratePlan();
      }
      try {
        window.localStorage.removeItem('rm_voice_biointel_draft_v1');
      } catch {
        // ignore
      }
    };

    try {
      const raw = window.localStorage.getItem('rm_voice_biointel_draft_v1');
      if (raw) applyVoiceDraft(JSON.parse(raw));
    } catch {
      // ignore
    }

    const onVoiceFill = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) applyVoiceDraft(custom.detail);
    };
    window.addEventListener('rm-biointel-voice-fill', onVoiceFill);
    return () => window.removeEventListener('rm-biointel-voice-fill', onVoiceFill);
  }, [currentUser.id]);

  const handleSelectVariety = (v: VarietyComparisonInput) => {
    setInput((prev) => ({
      ...prev,
      variety: v.varietyName,
      seedQtyPerAcreKg: v.seedQtyPerAcreKg,
      seedPricePerKg: v.seedPricePerKg,
      expectedYieldPerAcreKg: v.expectedYieldPerAcreKg,
    }));
    onVarietySelectedForNursery?.({
      crop,
      varietyName: v.varietyName,
      requiredSeedKg: Number((areaAcres * v.seedQtyPerAcreKg).toFixed(2)),
      budgetInr,
    });
    saveSeedToDigitalFarmTransfer({
      crop,
      varietyName: v.varietyName,
      areaAcres,
      budgetInr,
      waterAvailability,
      seedRequiredKg: Number((areaAcres * v.seedQtyPerAcreKg).toFixed(2)),
      transferredAt: new Date().toISOString(),
    });
  };

  const updateVarietyField = (
    idx: number,
    field: keyof VarietyComparisonInput,
    val: string | number
  ) => {
    setVarieties((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const profitChartData = comparison.items.map((v) => ({
    name: v.varietyName.split('(')[0].trim(),
    profit: v.estimatedProfitInr,
    isRecommended: v.isRecommended,
  }));

  // Quick preset crops
  const featuredCrops = ['Tomato', 'Maize', 'Paddy', 'Chilli', 'Onion', 'Potato', 'Cotton'];

  return (
    <div className="p-4 sm:p-7 bg-[#fdfbf7] dark:bg-zinc-950 border border-emerald-900/15 dark:border-zinc-800 rounded-3xl shadow-sm space-y-6 text-zinc-800 dark:text-zinc-200">
      {/* 1. Header & Location Sync */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-900/10 dark:border-zinc-800 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-800 text-white shadow-md shadow-emerald-900/20">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                BioIntel • Seed Planner
              </span>
              <span className="text-[11px] text-zinc-500">
                {L.badgeSub}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 dark:text-white mt-1">
              {t('seedPlannerTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              {t('seedPlannerSubtitle')}
            </p>
          </div>
        </div>

        {/* Farm Profile Auto-Sync Pill */}
        <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-2xl bg-amber-50/80 dark:bg-zinc-900 border border-amber-200/60 dark:border-zinc-800 self-start md:self-auto text-xs">
          <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{currentFarm?.village ? `${currentFarm.village}, ${currentFarm.district || 'Karnataka'}` : 'Mandya Rural, Karnataka'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-medium">{L.autoSynced}</span>
            </div>
            <div className="text-[11px] text-zinc-500">
              {L.soilLbl} <span className="font-medium text-zinc-700 dark:text-zinc-300">{localizeCondition(currentFarm?.soil_type || 'Red Sandy Loam', language)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Step 1: Four Simple Mandatory Inputs */}
      <div className="bg-white dark:bg-zinc-900/90 rounded-2xl p-5 sm:p-6 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">1</span>
            <h3 className="text-base font-bold text-emerald-950 dark:text-white">
              {L.step1Title} <span className="text-xs font-normal text-zinc-500">{L.step1Hint}</span>
            </h3>
          </div>
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-100/70 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 transition-colors border border-amber-300/40"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{L.helpChooseBtn}</span>
          </button>
        </div>

        {/* Q1: Which crop do you want to grow? */}
        <div className="space-y-2.5">
          <label className="block text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {t('qWhichCrop')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {featuredCrops.map((cName) => {
              const p = getCropPreset(cName);
              const isSelected = crop.toLowerCase() === p.name.toLowerCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCropChange(p.name)}
                  className={`group relative flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-600/30 shadow-sm'
                      : 'bg-zinc-50/70 dark:bg-zinc-850 hover:bg-zinc-100/80 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden mb-1.5 shadow-inner bg-zinc-200">
                    <img
                      src={p.imageUrl}
                      alt={localizeCropName(p.name, language)}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-zinc-800 dark:text-zinc-200'}`}>
                    {localizeCropName(p.name, language)}
                  </span>
                  {language === 'en' && <span className="text-[10px] text-zinc-500">{p.kannadaName}</span>}
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Q2, Q3, Q4 in 3 responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          {/* Q2: How much agricultural land do you have? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <LandPlot className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{t('qLandAreaAcres')}</span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.25"
                min="0.1"
                max="100"
                value={areaAcres}
                onChange={(e) => handleAreaChange(parseFloat(e.target.value) || 0.1)}
                className="w-full p-2.5 pr-16 text-base font-bold rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="absolute right-3 top-3 text-xs font-semibold text-zinc-500">
                {L.acresLbl}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[0.5, 1, 2, 3, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAreaChange(val)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                    areaAcres === val
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {val} {L.acShort}
                </button>
              ))}
            </div>
          </div>

          {/* Q3: What is your available budget? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <IndianRupee className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{L.budgetQ}</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-base font-bold text-zinc-400">₹</span>
              <input
                type="number"
                step="5000"
                min="5000"
                value={budgetInr}
                onChange={(e) => handleBudgetChange(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 pl-8 text-base font-bold rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[25000, 50000, 100000, 200000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleBudgetChange(val)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition-colors ${
                    budgetInr === val
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  ₹{(val / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          {/* Q4: How much water is available? */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <Droplets className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>{L.waterQ}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { level: 'Abundant' as WaterAvailabilityLevel, icon: '💧💧' },
                { level: 'Moderate' as WaterAvailabilityLevel, icon: '💧' },
                { level: 'Limited' as WaterAvailabilityLevel, icon: '⚠️' },
                { level: 'Rainfed' as WaterAvailabilityLevel, icon: '🌧️' },
              ].map((item) => (
                <button
                  key={item.level}
                  type="button"
                  onClick={() => setWaterAvailability(item.level)}
                  className={`p-2 text-left rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                    waterAvailability === item.level
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{L.waterLevels[item.level]}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 pt-0.5">
              {L.cropNeedLbl} <span className="font-semibold text-zinc-700 dark:text-zinc-300">{activePreset.waterNeed} ({activePreset.waterRequirementMm} mm)</span>
            </div>
          </div>
        </div>

        {/* 3. The One Big Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{L.autoPopNote}</span>
          </div>

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGenerating}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-900 active:scale-95 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{L.formulating}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>{t('generateMyCropPlan')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Generated Cultivation Plan Output */}
      <div ref={planSectionRef} className="space-y-6">
        {/* Recommendation Spotlight Banner */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-md relative overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-800 text-amber-300">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                  {L.recPlanBadge}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {localizeCropName(input.crop, language)} — {input.variety}
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-emerald-200">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                {activePreset.durationLabel}
              </span>
              <span className="flex items-center gap-1">
                <LandPlot className="w-3.5 h-3.5 text-emerald-400" />
                {input.areaAcres} {L.acresLbl}
              </span>
              {planGeneratedAt && (
                <span className="text-[11px] text-emerald-300/80">{L.updatedLbl} {planGeneratedAt}</span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            {comparison.recommendationReason || activePreset.recommendationReason}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">{L.seedReqLbl}</div>
              <div className="text-base font-bold text-white mt-0.5">{calc.totalSeedRequirementKg} kg</div>
              <div className="text-[10px] text-emerald-300/80">@ ₹{input.seedPricePerKg.toLocaleString('en-IN')}/kg</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">{L.seedOutlayLbl}</div>
              <div className="text-base font-bold text-white mt-0.5">{formatLocalizedCurrency(calc.totalSeedCostInr, language)}</div>
              <div className="text-[10px] text-emerald-300/80">{((calc.totalSeedCostInr / Math.max(1, calc.totalCultivationInvestmentInr)) * 100).toFixed(0)}{L.ofTotalCost}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">{L.expHarvestLbl}</div>
              <div className="text-base font-bold text-white mt-0.5">{calc.expectedProductionKg.toLocaleString('en-IN')} kg</div>
              <div className="text-[10px] text-emerald-300/80">~{(calc.expectedProductionKg / 100).toFixed(0)} {L.quintalsLbl}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <div className="text-[11px] text-emerald-300">{L.targetPriceLbl}</div>
              <div className="text-base font-bold text-amber-300 mt-0.5">₹{input.expectedSellingPricePerKg} / kg</div>
              <div className="text-[10px] text-emerald-300/80">{L.breakEvenPrefix} ₹{calc.breakEvenSellingPricePerKg}/kg</div>
            </div>
          </div>
        </div>

        {/* 5 Big Financial Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Investment */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {L.totalInvLbl}
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              {formatLocalizedCurrency(calc.totalCultivationInvestmentInr, language)}
            </div>
            <div className="text-[11px] text-zinc-500">
              {L.seedPlusInputs}: {formatLocalizedCurrency(calc.totalSeedCostInr, language)}
            </div>
          </div>

          {/* Card 2: Remaining Budget */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {L.budgetStatusLbl}
            </span>
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                calc.isWithinBudget ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {calc.isWithinBudget ? `+${formatLocalizedCurrency(calc.remainingBudgetInr, language)}` : `-${formatLocalizedCurrency(Math.abs(calc.remainingBudgetInr), language)}`}
            </div>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                calc.isWithinBudget
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {calc.isWithinBudget ? L.withinBudget : L.budgetDeficit}
            </span>
          </div>

          {/* Card 3: Expected Production */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {L.expProdLbl}
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              {calc.expectedProductionKg.toLocaleString('en-IN')} kg
            </div>
            <div className="text-[11px] text-zinc-500">
              {L.revPrefix} {formatLocalizedCurrency(calc.expectedRevenueInr, language)}
            </div>
          </div>

          {/* Card 4: Estimated Profit & ROI */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {L.netProfitRoi}
            </span>
            <div
              className={`text-lg sm:text-xl font-extrabold ${
                calc.estimatedProfitInr >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'
              }`}
            >
              {formatLocalizedCurrency(calc.estimatedProfitInr, language)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
              ROI: {calc.roiPct}%
            </div>
          </div>

          {/* Card 5: Break-Even Selling Price */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-900/10 dark:border-zinc-800 shadow-sm space-y-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {L.breakEvenTitle}
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white">
              ₹{calc.breakEvenSellingPricePerKg} / kg
            </div>
            <div className="text-[11px] text-zinc-500">
              {L.breakEvenHint}
            </div>
          </div>
        </div>

        {/* Farmer-Friendly Recommendations & Major Risks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800 space-y-2.5 text-xs">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{L.adviceTitle}</span>
            </div>
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {farmerRecs.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-700 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800 space-y-2.5 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{L.risksTitle}</span>
            </div>
            <ul className="space-y-1.5 text-zinc-700 dark:text-zinc-300">
              {activePreset.majorRisks.map((risk, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-700 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 5. Simplified Variety Comparison (Attractive Visual Cards) */}
        <div className="space-y-3.5 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-emerald-950 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-700" />
                <span>{L.varCompTitle}</span>
              </h3>
              <p className="text-xs text-zinc-500">
                {L.varCompSub}
              </p>
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950 px-2.5 py-1 rounded-full font-medium">
              {L.benchNote}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.items.map((v) => {
              const isSelected = input.variety.toLowerCase().includes(v.varietyName.toLowerCase().split('(')[0].trim());
              return (
                <div
                  key={v.id}
                  className={`relative p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                    v.isRecommended
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-600 shadow-md ring-1 ring-emerald-600/30'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Recommended Ribbon */}
                  {v.isRecommended && (
                    <div className="absolute -top-3 right-4 bg-emerald-700 text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>{L.recRibbon}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2 pt-1">
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                          {v.varietyName}
                        </h4>
                        {v.tag && (
                          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                            {v.tag}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          v.isBudgetSuitable
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {v.isBudgetSuitable ? L.withinBudget : L.exceedsBudget}
                      </span>
                    </div>

                    {/* Financial Specs */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">{L.seedPriceLbl}</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          ₹{v.seedPricePerKg.toLocaleString('en-IN')}/kg
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">{L.seedOutlayLbl}</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {formatLocalizedCurrency(v.seedInvestmentInr, language)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">{L.totalCultLbl}</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {formatLocalizedCurrency(v.totalCultivationExpensesInr, language)}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60">
                        <span className="text-[10px] text-zinc-500">{L.expProdShort}</span>
                        <div className="font-bold text-zinc-800 dark:text-zinc-200">
                          {v.expectedProductionKg.toLocaleString('en-IN')} kg
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-100/40 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/50 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                        {L.estProfitColon}
                      </span>
                      <span
                        className={`text-sm font-extrabold ${
                          v.estimatedProfitInr >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-600'
                        }`}
                      >
                        {formatLocalizedCurrency(v.estimatedProfitInr, language)}
                      </span>
                    </div>

                    {/* Agronomic Specs */}
                    <div className="text-[11px] text-zinc-500 space-y-1 pt-1">
                      <div>
                        💧 <strong>{L.waterTag}</strong> {v.waterRequirement}
                      </div>
                      <div>
                        🛡️ <strong>{L.resTag}</strong> {v.diseaseResistance}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectVariety(v)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-800 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-100 text-zinc-700 dark:text-zinc-300 hover:text-emerald-900'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{L.selectedNurseryFarm}</span>
                      </>
                    ) : (
                      <span>{L.selectVariety}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <Link
              href="/digital-farming"
              onClick={() =>
                saveSeedToDigitalFarmTransfer({
                  crop,
                  varietyName: input.variety,
                  areaAcres,
                  budgetInr,
                  waterAvailability,
                  seedRequiredKg: Number((areaAcres * input.seedQtyPerAcreKg).toFixed(2)),
                  transferredAt: new Date().toISOString(),
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
            >
              <span>{L.cultivateInDfPrefix} {localizeCropName(crop, language)} {L.cultivateInDfSuffix}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Variety Profit Chart */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <span>{L.profitChartTitle}</span>
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profitChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="profit" radius={[6, 6, 0, 0]} name={L.profitBarName}>
                    {profitChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isRecommended ? '#166534' : '#22c55e'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 6. Advanced Settings — Customize Estimates (Collapsed by Default) */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {L.advTitle}
                </h4>
                <p className="text-xs text-zinc-500">
                  {isAdvancedOpen ? L.advOpenDesc : L.advClosedDesc}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hidden sm:inline">
                {isAdvancedOpen ? L.collapse : L.expand}
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="w-5 h-5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-zinc-500" />
              )}
            </div>
          </button>

          {isAdvancedOpen && (
            <div className="p-5 sm:p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 space-y-6 text-xs">
              <div className="text-xs font-semibold text-zinc-500">
                {L.advNote}
              </div>

              {/* Granular Farm Inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.cropNameLbl}</label>
                  <input
                    type="text"
                    value={input.crop}
                    onChange={(e) => setInput({ ...input, crop: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.varNameLbl}</label>
                  <input
                    type="text"
                    value={input.variety}
                    onChange={(e) => setInput({ ...input, variety: e.target.value })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.seedRateLbl}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input.seedQtyPerAcreKg}
                    onChange={(e) => setInput({ ...input, seedQtyPerAcreKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.colPriceKg}</label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={input.seedPricePerKg}
                    onChange={(e) => setInput({ ...input, seedPricePerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.fertExpLbl}</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={input.fertilizerExpensesInr}
                    onChange={(e) => setInput({ ...input, fertilizerExpensesInr: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.labExpLbl}</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={input.labourExpensesInr}
                    onChange={(e) => setInput({ ...input, labourExpensesInr: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.irrigExpLbl}</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={input.irrigationExpensesInr}
                    onChange={(e) => setInput({ ...input, irrigationExpensesInr: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.otherExpLbl}</label>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={input.otherExpensesInr}
                    onChange={(e) => setInput({ ...input, otherExpensesInr: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.expYieldAcLbl}</label>
                  <input
                    type="number"
                    step="250"
                    min="0"
                    value={input.expectedYieldPerAcreKg}
                    onChange={(e) => setInput({ ...input, expectedYieldPerAcreKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.expSellPriceLbl}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={input.expectedSellingPricePerKg}
                    onChange={(e) => setInput({ ...input, expectedSellingPricePerKg: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                  />
                </div>
              </div>

              {/* Editable 3-Variety Table */}
              <div className="space-y-2 pt-2">
                <h5 className="font-bold text-zinc-900 dark:text-white">
                  {L.editTableTitle}
                </h5>
                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">{L.colVarName}</th>
                        <th className="p-2.5">{L.colSeedRate}</th>
                        <th className="p-2.5">{L.colPriceKg}</th>
                        <th className="p-2.5">{L.colYieldAc}</th>
                        <th className="p-2.5">{L.colWaterRes}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {varieties.map((v, idx) => (
                        <tr key={v.id}>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.varietyName}
                              onChange={(e) => updateVarietyField(idx, 'varietyName', e.target.value)}
                              className="w-48 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={v.seedQtyPerAcreKg}
                              onChange={(e) => updateVarietyField(idx, 'seedQtyPerAcreKg', parseFloat(e.target.value) || 0)}
                              className="w-20 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="100"
                              value={v.seedPricePerKg}
                              onChange={(e) => updateVarietyField(idx, 'seedPricePerKg', parseFloat(e.target.value) || 0)}
                              className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="250"
                              value={v.expectedYieldPerAcreKg}
                              onChange={(e) => updateVarietyField(idx, 'expectedYieldPerAcreKg', parseFloat(e.target.value) || 0)}
                              className="w-24 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={v.waterRequirement}
                              onChange={(e) => updateVarietyField(idx, 'waterRequirement', e.target.value)}
                              className="w-44 p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Scenario Adjustments */}
              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-zinc-900 dark:text-white">
                  {L.riskParamTitle}
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-zinc-500">{L.unfavYield}</label>
                    <input
                      type="number"
                      value={unfavYield}
                      onChange={(e) => setUnfavYield(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">{L.unfavPrice}</label>
                    <input
                      type="number"
                      value={unfavPrice}
                      onChange={(e) => setUnfavPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">{L.favYield}</label>
                    <input
                      type="number"
                      value={favYield}
                      onChange={(e) => setFavYield(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500">{L.favPrice}</label>
                    <input
                      type="number"
                      value={favPrice}
                      onChange={(e) => setFavPrice(parseFloat(e.target.value) || 0)}
                      className="w-full p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="h-36 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskScenarios}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="estimatedProfitInr" radius={[6, 6, 0, 0]} name={L.projProfit}>
                        {riskScenarios.map((s, idx) => (
                          <Cell
                            key={idx}
                            fill={s.estimatedProfitInr < 0 ? '#dc2626' : s.label === 'Favourable' ? '#166534' : '#0284c7'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. "Help Me Choose a Crop" Modal Advisor */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#fcfbf9] dark:bg-zinc-900 border border-emerald-900/20 dark:border-zinc-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-emerald-950 dark:text-white">
                  {L.helpTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                aria-label={t('close')}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {L.helpDescSoil} <strong>{localizeCondition(currentFarm?.soil_type || 'Red Sandy Loam', language)}</strong> · {L.helpDescWater} <strong>{L.waterLevels[waterAvailability]}</strong> · {L.helpDescBudget} <strong>{formatLocalizedCurrency(budgetInr, language)}</strong> ({areaAcres} {L.acresLbl})
            </p>

            <div className="space-y-3">
              {cropSuggestions.map((item) => (
                <div
                  key={item.crop.id}
                  className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 flex items-center justify-between gap-3 hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.crop.imageUrl}
                      alt={localizeCropName(item.crop.name, language)}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          {localizeCropName(item.crop.name, language)}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {item.suitabilityScore}{L.matchSuffix}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {item.matchReasons.join(' • ')}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleCropChange(item.crop.name);
                      setIsHelpModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 text-white font-bold text-xs hover:bg-emerald-900 shrink-0"
                  >
                    {L.selectCropBtn}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
          <span>{L.disclaimerLeft}</span>
        </div>
        <span className="text-[10px] text-zinc-500 hidden sm:inline">
          {L.disclaimerRight}
        </span>
      </div>
    </div>
  );
}
