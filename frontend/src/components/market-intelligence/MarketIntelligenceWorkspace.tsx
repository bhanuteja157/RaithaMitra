// frontend/src/components/market-intelligence/MarketIntelligenceWorkspace.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { loadHarvestTransferPayload, HarvestToMarketPayload } from '@/lib/digital-farming/geo';
import { useFarm } from '@/context/FarmContext';
import { Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import {
  DEMO_MARKET_PRICES,
  MarketPriceRecord,
  MarketComparisonInput,
  PriceHistoryPoint,
  SellStrategyInputs,
  BuyerOfferInput,
  TransportOptionInput,
  evaluateMarkets,
  analyzePriceTrends,
  parseCsvPriceHistory,
  simulateSellStrategy,
  evaluateBuyerOffers,
  evaluateTransportOption,
} from '@/lib/market-intelligence/market';
import {
  Store,
  TrendingUp,
  Clock,
  Users,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Sprout,
} from 'lucide-react';

type MarketTab = 'prices' | 'compare' | 'trends' | 'sell_timing' | 'offers' | 'transport';

const MKT_INTEL_I18N: Record<
  Language,
  {
    headerBadge: string;
    title: string;
    subtitle: string;
    printStrategy: string;
    importedFromHarvest: string;
    acUnit: string;
    cropColon: string;
    harvestColon: string;
    kg: string;
    perKg: string;
    cultCostColon: string;
    cropLabel: string;
    availQtyLabel: string;
    totalCultExpLabel: string;
    tabPrices: string;
    tabCompare: string;
    tabTrends: string;
    tabSellTiming: string;
    tabOffers: string;
    tabTransport: string;
    dataTransparency: string;
    dataTransparencyMsg: string;
    filterCropPh: string;
    filterLocPh: string;
    manualMktPh: string;
    addPriceBtn: string;
    colCrop: string;
    colMktDistrict: string;
    colMinMaxQtl: string;
    colModalQtl: string;
    colNormKg: string;
    colDate: string;
    colSource: string;
    compareTitle: string;
    keyInsight: string;
    offersHighestPrice: string;
    butPrefix: string;
    yieldsHigherNet: string;
    dueToLowerLoss: string;
    priceKgInput: string;
    transportInput: string;
    commissionInput: string;
    spoilageInput: string;
    colRankMkt: string;
    colPriceKg: string;
    colGrossRev: string;
    colSpoilageLoss: string;
    colSellTransport: string;
    colNetSaleRev: string;
    colNetProfitAfterCult: string;
    barGrossSale: string;
    barNetProfit: string;
    trendsTitle: string;
    usingCsvPrices: string;
    usingDemoSeries: string;
    demoSuffix: string;
    avgPrice: string;
    minimum: string;
    maximum: string;
    volatility: string;
    direction: string;
    linePrice: string;
    lineMovingAvg: string;
    csvLabel: string;
    analyzeCsvBtn: string;
    sellTitle: string;
    sellFields: Record<keyof SellStrategyInputs, string>;
    availProducePrefix: string;
    exceedsCapMiddle: string;
    excessWarnSuffix: string;
    stratImmediateTitle: string;
    stratImmediateDesc: string;
    stratLaterTitle: string;
    storageLabel: string;
    spoilageLabel: string;
    breakEvenFuture: string;
    stratSplitTitle: string;
    nowSuffix: string;
    stratSplitDesc: string;
    offersTitle: string;
    addOfferBtn: string;
    buyerPrefix: string;
    offeredPriceLabel: string;
    transportRespLabel: string;
    buyerPickup: string;
    farmerDelivery: string;
    paymentDelayLabel: string;
    colBuyer: string;
    colOfferedPrice: string;
    colGrossOffer: string;
    colFarmerTransport: string;
    colPaymentDelay: string;
    daysUnit: string;
    colEstProfit: string;
    transportTitle: string;
    modeIndividual: string;
    modeShared: string;
    modeBuyerPickup: string;
    modeFarmerDelivery: string;
    loadSuffix: string;
    capacityExceeded: string;
    vehicleCapLabel: string;
    quotedCostLabel: string;
    myWeightLabel: string;
    coFarmerWeightLabel: string;
    totalCombinedLoad: string;
    yourShareLabel: string;
    dirUp: string;
    dirDown: string;
    dirStable: string;
  }
> = {
  en: {
    headerBadge: 'RaithaMitra · Independent Agricultural Market Intelligence',
    title: 'Market Profit, Price Trends & Transport Optimizer',
    subtitle: 'Compare mandis, analyze sell timing, evaluate buyer offers, and optimize shared transport costs.',
    printStrategy: 'Print Strategy',
    importedFromHarvest: 'Imported from Digital Harvest:',
    acUnit: 'ac',
    cropColon: 'Crop:',
    harvestColon: 'Harvest:',
    kg: 'kg',
    perKg: '/kg',
    cultCostColon: 'Cultivation Cost:',
    cropLabel: 'Crop',
    availQtyLabel: 'Available Produce Quantity (kg)',
    totalCultExpLabel: 'Total Cultivation Expenses (₹)',
    tabPrices: 'Mandi Prices',
    tabCompare: 'Market Profit',
    tabTrends: 'Price Trends',
    tabSellTiming: 'Sell Now vs Later',
    tabOffers: 'Buyer Offers',
    tabTransport: 'Transport Cost',
    dataTransparency: 'Data Transparency:',
    dataTransparencyMsg:
      'Live AGMARKNET / Data.gov.in API keys are not configured in this client environment. Sample records below are clearly labelled Fictional Demonstration Datasets; you can add real local mandi prices manually below.',
    filterCropPh: 'Filter by crop (e.g., Tomato)',
    filterLocPh: 'Filter by state, district, or market',
    manualMktPh: 'Manual market name',
    addPriceBtn: 'Add Price',
    colCrop: 'Crop',
    colMktDistrict: 'Market & District',
    colMinMaxQtl: 'Min / Max (₹/qtl)',
    colModalQtl: 'Modal (₹/qtl)',
    colNormKg: 'Normalized (₹/kg)',
    colDate: 'Date',
    colSource: 'Source',
    compareTitle: 'Market Profit Optimization (Net Return After Transport, Commission & Spoilage)',
    keyInsight: 'Key Insight:',
    offersHighestPrice: 'offers the highest selling price',
    butPrefix: ', but',
    yieldsHigherNet: 'yields higher net profit',
    dueToLowerLoss: 'due to lower transport, commission, and spoilage losses.',
    priceKgInput: 'Price (₹/kg)',
    transportInput: 'Transport (₹)',
    commissionInput: 'Commission (%)',
    spoilageInput: 'Spoilage (%)',
    colRankMkt: 'Rank & Market',
    colPriceKg: 'Price/kg',
    colGrossRev: 'Gross Revenue',
    colSpoilageLoss: 'Spoilage Loss',
    colSellTransport: 'Selling + Transport',
    colNetSaleRev: 'Net Sale Revenue',
    colNetProfitAfterCult: 'Net Profit After Cultivation',
    barGrossSale: 'Gross Sale (₹)',
    barNetProfit: 'Net Profit (₹)',
    trendsTitle: 'Price Trend Intelligence & Moving Average',
    usingCsvPrices: 'Using imported CSV historical prices',
    usingDemoSeries: 'Using clearly labelled illustrative demonstration series (paste CSV below to analyze real prices)',
    demoSuffix: 'Demo',
    avgPrice: 'Average Price',
    minimum: 'Minimum',
    maximum: 'Maximum',
    volatility: 'Volatility',
    direction: 'Direction',
    linePrice: 'Price (₹/kg)',
    lineMovingAvg: '3-Period Moving Avg',
    csvLabel: 'Import Observed Price History CSV (format: date,pricePerKg per line):',
    analyzeCsvBtn: 'Analyze CSV History',
    sellTitle: 'Sell Now vs Sell Later Strategy Simulator',
    sellFields: {
      currentPricePerKg: 'Current Price (₹/kg)',
      expectedFuturePricePerKg: 'Expected Future Price (₹/kg)',
      quantityKg: 'Quantity (kg)',
      storageDays: 'Storage Duration (days)',
      dailyStorageCostPerKg: 'Daily Storage Cost (₹/kg/day)',
      spoilagePct: 'Est. Spoilage (%)',
      storageCapacityKg: 'Storage Capacity (kg)',
      splitImmediatePct: 'Split: Sell Immediately (%)',
      transportExpenseInr: 'Transport Cost (₹)',
    },
    availProducePrefix: 'Available produce',
    exceedsCapMiddle: 'exceeds storage capacity',
    excessWarnSuffix:
      '. Excess produce is modeled as sold immediately; never store perishable produce without proper cold/dry ventilation.',
    stratImmediateTitle: '1. Sell Immediately',
    stratImmediateDesc: 'Zero storage cost and zero post-harvest spoilage risk.',
    stratLaterTitle: '2. Store & Sell Later',
    storageLabel: 'Storage:',
    spoilageLabel: 'Spoilage loss:',
    breakEvenFuture: 'Break-even future price:',
    stratSplitTitle: '3. Split Strategy',
    nowSuffix: '% Now',
    stratSplitDesc: 'Balances immediate cash flow with upside if prices rise.',
    offersTitle: 'Buyer Offer Intelligence (Independent Calculator — No Real Orders Created)',
    addOfferBtn: '+ Add Offer',
    buyerPrefix: 'Buyer',
    offeredPriceLabel: 'Offered Price (₹/kg)',
    transportRespLabel: 'Transport Responsibility',
    buyerPickup: 'Buyer Pickup',
    farmerDelivery: 'Farmer Delivery',
    paymentDelayLabel: 'Payment Delay (days)',
    colBuyer: 'Buyer',
    colOfferedPrice: 'Offered Price',
    colGrossOffer: 'Gross Offer',
    colFarmerTransport: 'Farmer Transport',
    colPaymentDelay: 'Payment Delay',
    daysUnit: 'days',
    colEstProfit: 'Est. Profit',
    transportTitle: 'Transportation Cost Optimization (Independent Calculator — No Fake Driver Availability)',
    modeIndividual: 'Individual Vehicle',
    modeShared: 'Shared Vehicle',
    modeBuyerPickup: 'Buyer-Arranged Pickup',
    modeFarmerDelivery: 'Farmer-Arranged Delivery',
    loadSuffix: '% load',
    capacityExceeded: 'Capacity Exceeded',
    vehicleCapLabel: 'Vehicle Capacity (kg)',
    quotedCostLabel: 'Quoted Vehicle Cost (₹)',
    myWeightLabel: 'My Produce Weight (kg)',
    coFarmerWeightLabel: 'Co-Farmers Weight (kg)',
    totalCombinedLoad: 'Total Combined Load:',
    yourShareLabel: 'Your Weight-Proportional Share:',
    dirUp: 'Upward',
    dirDown: 'Downward',
    dirStable: 'Stable',
  },
  kn: {
    headerBadge: 'ರೈತ ಮಿತ್ರ · ಸ್ವತಂತ್ರ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ಬುದ್ಧಿಮತ್ತೆ',
    title: 'ಮಾರುಕಟ್ಟೆ ಲಾಭ, ಬೆಲೆ ಪ್ರವೃತ್ತಿ ಮತ್ತು ಸಾರಿಗೆ ಅತ್ಯುತ್ತಮೀಕರಣ',
    subtitle: 'ಮಂಡಿಗಳನ್ನು ಹೋಲಿಸಿ, ಮಾರಾಟದ ಸಮಯ ವಿಶ್ಲೇಷಿಸಿ, ಖರೀದಿದಾರರ ಆಫರ್ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ ಕಡಿಮೆ ಮಾಡಿ.',
    printStrategy: 'ತಂತ್ರ ಮುದ್ರಿಸಿ',
    importedFromHarvest: 'ಡಿಜಿಟಲ್ ಕೊಯ್ಲಿನಿಂದ ತರಲಾಗಿದೆ:',
    acUnit: 'ಎಕರೆ',
    cropColon: 'ಬೆಳೆ:',
    harvestColon: 'ಕೊಯ್ಲು:',
    kg: 'ಕೆಜಿ',
    perKg: '/ಕೆಜಿ',
    cultCostColon: 'ಸಾಗುವಳಿ ವೆಚ್ಚ:',
    cropLabel: 'ಬೆಳೆ',
    availQtyLabel: 'ಲಭ್ಯವಿರುವ ಉತ್ಪನ್ನ ಪ್ರಮಾಣ (ಕೆಜಿ)',
    totalCultExpLabel: 'ಒಟ್ಟು ಸಾಗುವಳಿ ವೆಚ್ಚ (₹)',
    tabPrices: 'ಮಂಡಿ ಬೆಲೆಗಳು',
    tabCompare: 'ಮಾರುಕಟ್ಟೆ ಲಾಭ',
    tabTrends: 'ಬೆಲೆ ಪ್ರವೃತ್ತಿ',
    tabSellTiming: 'ಈಗಲೇ ಮಾರಾಟ vs ನಂತರ',
    tabOffers: 'ಖರೀದಿದಾರರ ಆಫರ್‌ಗಳು',
    tabTransport: 'ಸಾರಿಗೆ ವೆಚ್ಚ',
    dataTransparency: 'ದತ್ತಾಂಶ ಪಾರದರ್ಶಕತೆ:',
    dataTransparencyMsg:
      'ಈ ಪರಿಸರದಲ್ಲಿ ನೇರ AGMARKNET API ಕೀಗಳಿಲ್ಲ. ಕೆಳಗಿನ ಮಾದರಿ ದಾಖಲೆಗಳು ಕಾಲ್ಪನಿಕ ಪ್ರದರ್ಶನ ದತ್ತಾಂಶಗಳಾಗಿವೆ; ನೀವು ನೈಜ ಸ್ಥಳೀಯ ಮಂಡಿ ಬೆಲೆಗಳನ್ನು ಕೆಳಗೆ ಸೇರಿಸಬಹುದು.',
    filterCropPh: 'ಬೆಳೆಯ ಪ್ರಕಾರ ಫಿಲ್ಟರ್ ಮಾಡಿ (ಉದಾ. ಟೊಮೆಟೊ)',
    filterLocPh: 'ರಾಜ್ಯ, ಜಿಲ್ಲೆ ಅಥವಾ ಮಂಡಿ ಮೂಲಕ ಫಿಲ್ಟರ್ ಮಾಡಿ',
    manualMktPh: 'ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ ಹೆಸರು',
    addPriceBtn: 'ಬೆಲೆ ಸೇರಿಸಿ',
    colCrop: 'ಬೆಳೆ',
    colMktDistrict: 'ಮಂಡಿ ಮತ್ತು ಜಿಲ್ಲೆ',
    colMinMaxQtl: 'ಕನಿಷ್ಠ / ಗರಿಷ್ಠ (₹/ಕ್ವಿಂಟಾಲ್)',
    colModalQtl: 'ಮಾದರಿ (₹/ಕ್ವಿಂಟಾಲ್)',
    colNormKg: 'ಪ್ರತಿ ಕೆಜಿ (₹/ಕೆಜಿ)',
    colDate: 'ದಿನಾಂಕ',
    colSource: 'ಮೂಲ',
    compareTitle: 'ಮಾರುಕಟ್ಟೆ ಲಾಭ ವಿಶ್ಲೇಷಣೆ (ಸಾರಿಗೆ, ಕಮಿಷನ್ ಮತ್ತು ಹಾಳಾಗುವಿಕೆ ಕಳೆದು ನಿವ್ವಳ ಲಾಭ)',
    keyInsight: 'ಮುಖ್ಯ ಒಳನೋಟ:',
    offersHighestPrice: 'ಅತಿ ಹೆಚ್ಚು ಮಾರಾಟ ಬೆಲೆ ನೀಡುತ್ತದೆ',
    butPrefix: ', ಆದರೆ ಕಡಿಮೆ ಸಾರಿಗೆ, ಕಮಿಷನ್ ಮತ್ತು ಹಾಳಾಗುವಿಕೆ ನಷ್ಟದಿಂದಾಗಿ',
    yieldsHigherNet: 'ಹೆಚ್ಚಿನ ನಿವ್ವಳ ಲಾಭ ನೀಡುತ್ತದೆ',
    dueToLowerLoss: '.',
    priceKgInput: 'ಬೆಲೆ (₹/ಕೆಜಿ)',
    transportInput: 'ಸಾರಿಗೆ (₹)',
    commissionInput: 'ಕಮಿಷನ್ (%)',
    spoilageInput: 'ಹಾಳಾಗುವಿಕೆ (%)',
    colRankMkt: 'ಶ್ರೇಣಿ ಮತ್ತು ಮಾರುಕಟ್ಟೆ',
    colPriceKg: 'ಬೆಲೆ/ಕೆಜಿ',
    colGrossRev: 'ಒಟ್ಟು ಆದಾಯ',
    colSpoilageLoss: 'ಹಾಳಾಗುವಿಕೆ ನಷ್ಟ',
    colSellTransport: 'ಮಾರಾಟ + ಸಾರಿಗೆ',
    colNetSaleRev: 'ನಿವ್ವಳ ಮಾರಾಟ ಆದಾಯ',
    colNetProfitAfterCult: 'ಸಾಗುವಳಿ ನಂತರದ ನಿವ್ವಳ ಲಾಭ',
    barGrossSale: 'ಒಟ್ಟು ಮಾರಾಟ (₹)',
    barNetProfit: 'ನಿವ್ವಳ ಲಾಭ (₹)',
    trendsTitle: 'ಬೆಲೆ ಪ್ರವೃತ್ತಿ ಮತ್ತು ಚಲಿಸುವ ಸರಾಸರಿ',
    usingCsvPrices: 'ಆಮದು ಮಾಡಿದ CSV ಐತಿಹಾಸಿಕ ಬೆಲೆಗಳನ್ನು ಬಳಸಲಾಗುತ್ತಿದೆ',
    usingDemoSeries: 'ಪ್ರದರ್ಶನ ಮಾದರಿ ಸರಣಿ ಬಳಸಲಾಗುತ್ತಿದೆ (ನಿಜ ಬೆಲೆಗಳಿಗೆ ಕೆಳಗೆ CSV ಅಂಟಿಸಿ)',
    demoSuffix: 'ಮಾದರಿ',
    avgPrice: 'ಸರಾಸರಿ ಬೆಲೆ',
    minimum: 'ಕನಿಷ್ಠ',
    maximum: 'ಗರಿಷ್ಠ',
    volatility: 'ಏರಿಳಿತ',
    direction: 'ದಿಕ್ಕು',
    linePrice: 'ಬೆಲೆ (₹/ಕೆಜಿ)',
    lineMovingAvg: '3-ಅವಧಿ ಚಲಿಸುವ ಸರಾಸರಿ',
    csvLabel: 'ಗಮನಿಸಿದ ಬೆಲೆ ಇತಿಹಾಸ CSV ಆಮದು ಮಾಡಿ (ಪ್ರತಿ ಸಾಲಿನಲ್ಲಿ: date,pricePerKg):',
    analyzeCsvBtn: 'CSV ಇತಿಹಾಸ ವಿಶ್ಲೇಷಿಸಿ',
    sellTitle: 'ಈಗಲೇ ಮಾರಾಟ vs ನಂತರ ಮಾರಾಟ ತಂತ್ರ ಸಿಮ್ಯುಲೇಟರ್',
    sellFields: {
      currentPricePerKg: 'ಪ್ರಸ್ತುತ ಬೆಲೆ (₹/ಕೆಜಿ)',
      expectedFuturePricePerKg: 'ನಿರೀಕ್ಷಿತ ಭವಿಷ್ಯದ ಬೆಲೆ (₹/ಕೆಜಿ)',
      quantityKg: 'ಪ್ರಮಾಣ (ಕೆಜಿ)',
      storageDays: 'ಶೇಖರಣಾ ಅವಧಿ (ದಿನಗಳು)',
      dailyStorageCostPerKg: 'ದೈನಂದಿನ ಶೇಖರಣಾ ವೆಚ್ಚ (₹/ಕೆಜಿ/ದಿನ)',
      spoilagePct: 'ಅಂದಾಜು ಹಾಳಾಗುವಿಕೆ (%)',
      storageCapacityKg: 'ಶೇಖರಣಾ ಸಾಮರ್ಥ್ಯ (ಕೆಜಿ)',
      splitImmediatePct: 'ವಿಭಾಗ: ತಕ್ಷಣ ಮಾರಾಟ (%)',
      transportExpenseInr: 'ಸಾರಿಗೆ ವೆಚ್ಚ (₹)',
    },
    availProducePrefix: 'ಲಭ್ಯವಿರುವ ಬೆಳೆ',
    exceedsCapMiddle: 'ಶೇಖರಣಾ ಸಾಮರ್ಥ್ಯವನ್ನು ಮೀರಿದೆ',
    excessWarnSuffix: '. ಹೆಚ್ಚುವರಿ ಬೆಳೆಯನ್ನು ತಕ್ಷಣ ಮಾರಾಟ ಮಾಡಲಾಗುತ್ತದೆ ಎಂದು ಮಾದರಿ ಮಾಡಲಾಗಿದೆ; ಸೂಕ್ತ ಶೀತಲ ಗಾಳಿಯಿಲ್ಲದೆ ಸಂಗ್ರಹಿಸಬೇಡಿ.',
    stratImmediateTitle: '1. ತಕ್ಷಣ ಮಾರಾಟ ಮಾಡಿ',
    stratImmediateDesc: 'ಶೇಖರಣಾ ವೆಚ್ಚವಿಲ್ಲ ಮತ್ತು ಕೊಯ್ಲು ನಂತರ ಹಾಳಾಗುವ ಅಪಾಯವಿಲ್ಲ.',
    stratLaterTitle: '2. ಶೇಖರಿಸಿ ನಂತರ ಮಾರಾಟ ಮಾಡಿ',
    storageLabel: 'ಶೇಖರಣೆ:',
    spoilageLabel: 'ಹಾಳಾಗುವಿಕೆ ನಷ್ಟ:',
    breakEvenFuture: 'ಸಮತೋಲನ ಭವಿಷ್ಯದ ಬೆಲೆ:',
    stratSplitTitle: '3. ವಿಭಜಿತ ತಂತ್ರ',
    nowSuffix: '% ಈಗ',
    stratSplitDesc: 'ತಕ್ಷಣದ ಹಣದ ಹರಿವು ಮತ್ತು ಬೆಲೆ ಏರಿಕೆಯ ಲಾಭವನ್ನು ಸಮತೋಲನಗೊಳಿಸುತ್ತದೆ.',
    offersTitle: 'ಖರೀದಿದಾರರ ಆಫರ್ ವಿಶ್ಲೇಷಣೆ (ಸ್ವತಂತ್ರ ಕ್ಯಾಲ್ಕುಲೇಟರ್ — ನೈಜ ಆದೇಶವಿಲ್ಲ)',
    addOfferBtn: '+ ಆಫರ್ ಸೇರಿಸಿ',
    buyerPrefix: 'ಖರೀದಿದಾರ',
    offeredPriceLabel: 'ನೀಡಿದ ಬೆಲೆ (₹/ಕೆಜಿ)',
    transportRespLabel: 'ಸಾರಿಗೆ ಜವಾಬ್ದಾರಿ',
    buyerPickup: 'ಖರೀದಿದಾರರ ಪಿಕಪ್',
    farmerDelivery: 'ರೈತರ ವಿತರಣೆ',
    paymentDelayLabel: 'ಪಾವತಿ ವಿಳಂಬ (ದಿನಗಳು)',
    colBuyer: 'ಖರೀದಿದಾರ',
    colOfferedPrice: 'ನೀಡಿದ ಬೆಲೆ',
    colGrossOffer: 'ಒಟ್ಟು ಆಫರ್',
    colFarmerTransport: 'ರೈತರ ಸಾರಿಗೆ ವೆಚ್ಚ',
    colPaymentDelay: 'ಪಾವತಿ ವಿಳಂಬ',
    daysUnit: 'ದಿನಗಳು',
    colEstProfit: 'ಅಂದಾಜು ಲಾಭ',
    transportTitle: 'ಸಾರಿಗೆ ವೆಚ್ಚ ಅತ್ಯುತ್ತಮೀಕರಣ (ಸ್ವತಂತ್ರ ಕ್ಯಾಲ್ಕುಲೇಟರ್)',
    modeIndividual: 'ವೈಯಕ್ತಿಕ ವಾಹನ',
    modeShared: 'ಹಂಚಿದ ವಾಹನ',
    modeBuyerPickup: 'ಖರೀದಿದಾರರ ಪಿಕಪ್',
    modeFarmerDelivery: 'ರೈತರ ವಿತರಣೆ',
    loadSuffix: '% ಲೋಡ್',
    capacityExceeded: 'ಸಾಮರ್ಥ್ಯ ಮೀರಿದೆ',
    vehicleCapLabel: 'ವಾಹನ ಸಾಮರ್ಥ್ಯ (ಕೆಜಿ)',
    quotedCostLabel: 'ವಾಹನ ಬಾಡಿಗೆ ದರ (₹)',
    myWeightLabel: 'ನನ್ನ ಬೆಳೆ ತೂಕ (ಕೆಜಿ)',
    coFarmerWeightLabel: 'ಸಹ-ರೈತರ ತೂಕ (ಕೆಜಿ)',
    totalCombinedLoad: 'ಒಟ್ಟು ಸಂಯೋಜಿತ ಲೋಡ್:',
    yourShareLabel: 'ನಿಮ್ಮ ತೂಕಕ್ಕೆ ಅನುಗುಣವಾದ ಪಾಲು:',
    dirUp: 'ಏರಿಕೆ',
    dirDown: 'ಇಳಿಕೆ',
    dirStable: 'ಸ್ಥಿರ',
  },
  hi: {
    headerBadge: 'रैतामित्र · स्वतंत्र कृषि बाज़ार बुद्धिमत्ता',
    title: 'बाज़ार लाभ, भाव रुझान और परिवहन अनुकूलक',
    subtitle: 'मंडियों की तुलना करें, बिक्री समय जांचें, खरीदार ऑफ़र का मूल्यांकन करें और साझा परिवहन लागत घटाएं।',
    printStrategy: 'रणनीति प्रिंट करें',
    importedFromHarvest: 'डिजिटल कटाई से आयातित:',
    acUnit: 'एकड़',
    cropColon: 'फसल:',
    harvestColon: 'कटाई:',
    kg: 'किलो',
    perKg: '/किलो',
    cultCostColon: 'खेती लागत:',
    cropLabel: 'फसल',
    availQtyLabel: 'उपलब्ध उपज मात्रा (किलो)',
    totalCultExpLabel: 'कुल खेती खर्च (₹)',
    tabPrices: 'मंडी भाव',
    tabCompare: 'बाज़ार लाभ',
    tabTrends: 'भाव रुझान',
    tabSellTiming: 'अभी बेचें या बाद में',
    tabOffers: 'खरीदार ऑफ़र',
    tabTransport: 'परिवहन खर्च',
    dataTransparency: 'डेटा पारदर्शिता:',
    dataTransparencyMsg:
      'इस क्लाइंट वातावरण में लाइव AGMARKNET कुंजी कॉन्फ़िगर नहीं हैं। नीचे दिए गए नमूना रिकॉर्ड काल्पनिक डेमो डेटा हैं; आप नीचे वास्तविक स्थानीय मंडी भाव जोड़ सकते हैं।',
    filterCropPh: 'फसल से छांटें (जैसे टमाटर)',
    filterLocPh: 'राज्य, जिला या मंडी से छांटें',
    manualMktPh: 'मंडी का नाम',
    addPriceBtn: 'भाव जोड़ें',
    colCrop: 'फसल',
    colMktDistrict: 'मंडी व जिला',
    colMinMaxQtl: 'न्यूनतम / अधिकतम (₹/क्विंटल)',
    colModalQtl: 'मॉडल (₹/क्विंटल)',
    colNormKg: 'प्रति किलो (₹/किलो)',
    colDate: 'दिनांक',
    colSource: 'स्रोत',
    compareTitle: 'बाज़ार लाभ अनुकूलन (परिवहन, कमीशन व नुकसान के बाद शुद्ध आय)',
    keyInsight: 'मुख्य निष्कर्ष:',
    offersHighestPrice: 'सबसे अधिक बिक्री मूल्य देता है',
    butPrefix: ', लेकिन कम परिवहन, कमीशन व खराबी हानि के कारण',
    yieldsHigherNet: 'अधिक शुद्ध लाभ देता है',
    dueToLowerLoss: '।',
    priceKgInput: 'भाव (₹/किलो)',
    transportInput: 'परिवहन (₹)',
    commissionInput: 'कमीशन (%)',
    spoilageInput: 'खराबी (%)',
    colRankMkt: 'रैंक व मंडी',
    colPriceKg: 'भाव/किलो',
    colGrossRev: 'सकल आय',
    colSpoilageLoss: 'खराबी नुकसान',
    colSellTransport: 'बिक्री + परिवहन',
    colNetSaleRev: 'शुद्ध बिक्री आय',
    colNetProfitAfterCult: 'खेती खर्च के बाद शुद्ध लाभ',
    barGrossSale: 'सकल बिक्री (₹)',
    barNetProfit: 'शुद्ध लाभ (₹)',
    trendsTitle: 'भाव रुझान विश्लेषण व मूविंग औसत',
    usingCsvPrices: 'आयातित CSV ऐतिहासिक भाव उपयोग हो रहे हैं',
    usingDemoSeries: 'स्पष्ट रूप से चिह्नित डेमो श्रृंखला उपयोग हो रही है (असली भाव के लिए नीचे CSV पेस्ट करें)',
    demoSuffix: 'डेमो',
    avgPrice: 'औसत भाव',
    minimum: 'न्यूनतम',
    maximum: 'अधिकतम',
    volatility: 'उतार-चढ़ाव',
    direction: 'दिशा',
    linePrice: 'भाव (₹/किलो)',
    lineMovingAvg: '3-अवधि मूविंग औसत',
    csvLabel: 'देखे गए भाव इतिहास CSV आयात करें (प्रत्येक पंक्ति: date,pricePerKg):',
    analyzeCsvBtn: 'CSV इतिहास विश्लेषित करें',
    sellTitle: 'अभी बेचें या बाद में बेचें रणनीति सिम्युलेटर',
    sellFields: {
      currentPricePerKg: 'वर्तमान भाव (₹/किलो)',
      expectedFuturePricePerKg: 'अपेक्षित भविष्य भाव (₹/किलो)',
      quantityKg: 'मात्रा (किलो)',
      storageDays: 'भंडारण अवधि (दिन)',
      dailyStorageCostPerKg: 'दैनिक भंडारण लागत (₹/किलो/दिन)',
      spoilagePct: 'अनुमानित खराबी (%)',
      storageCapacityKg: 'भंडारण क्षमता (किलो)',
      splitImmediatePct: 'विभाजन: तुरंत बिक्री (%)',
      transportExpenseInr: 'परिवहन लागत (₹)',
    },
    availProducePrefix: 'उपलब्ध उपज',
    exceedsCapMiddle: 'भंडारण क्षमता से अधिक है',
    excessWarnSuffix: '। अतिरिक्त उपज तुरंत बेची गई मानी गई है; बिना शीत/हवादार व्यवस्था के नष्ट होने वाली फसल न रखें।',
    stratImmediateTitle: '1. तुरंत बेचें',
    stratImmediateDesc: 'शून्य भंडारण लागत और कटाई के बाद खराबी का कोई जोखिम नहीं।',
    stratLaterTitle: '2. भंडारण कर बाद में बेचें',
    storageLabel: 'भंडारण:',
    spoilageLabel: 'खराबी नुकसान:',
    breakEvenFuture: 'ब्रेक-ईवन भविष्य भाव:',
    stratSplitTitle: '3. विभाजित रणनीति',
    nowSuffix: '% अभी',
    stratSplitDesc: 'भाव बढ़ने पर लाभ के साथ तत्काल नकदी प्रवाह को संतुलित करता है।',
    offersTitle: 'खरीदार ऑफ़र विश्लेषण (स्वतंत्र कैलकुलेटर — कोई ऑर्डर नहीं)',
    addOfferBtn: '+ ऑफ़र जोड़ें',
    buyerPrefix: 'खरीदार',
    offeredPriceLabel: 'प्रस्तावित भाव (₹/किलो)',
    transportRespLabel: 'परिवहन जिम्मेदारी',
    buyerPickup: 'खरीदार पिकअप',
    farmerDelivery: 'किसान डिलीवरी',
    paymentDelayLabel: 'भुगतान विलंब (दिन)',
    colBuyer: 'खरीदार',
    colOfferedPrice: 'प्रस्तावित भाव',
    colGrossOffer: 'सकल प्रस्ताव',
    colFarmerTransport: 'किसान परिवहन',
    colPaymentDelay: 'भुगतान विलंब',
    daysUnit: 'दिन',
    colEstProfit: 'अनुमानित लाभ',
    transportTitle: 'परिवहन लागत अनुकूलक (स्वतंत्र कैलकुलेटर)',
    modeIndividual: 'व्यक्तिगत वाहन',
    modeShared: 'साझा वाहन',
    modeBuyerPickup: 'खरीदार पिकअप',
    modeFarmerDelivery: 'किसान डिलीवरी',
    loadSuffix: '% भार',
    capacityExceeded: 'क्षमता से अधिक',
    vehicleCapLabel: 'वाहन क्षमता (किलो)',
    quotedCostLabel: 'वाहन भाड़ा दर (₹)',
    myWeightLabel: 'मेरी उपज का वजन (किलो)',
    coFarmerWeightLabel: 'सह-किसानों का वजन (किलो)',
    totalCombinedLoad: 'कुल संयुक्त भार:',
    yourShareLabel: 'वजन के अनुसार आपका हिस्सा:',
    dirUp: 'बढ़त',
    dirDown: 'गिरावट',
    dirStable: 'स्थिर',
  },
  te: {
    headerBadge: 'రైతమిత్ర · స్వతంత్ర వ్యవసాయ మార్కెట్ మేధస్సు',
    title: 'మార్కెట్ లాభం, ధరల సరళి & రవాణా ఆప్టిమైజర్',
    subtitle: 'మండీలను పోల్చండి, అమ్మకపు సమయాన్ని విశ్లేషించండి, కొనుగోలుదారుల ఆఫర్లను పరిశీలించండి మరియు రవాణా ఖర్చు తగ్గించండి.',
    printStrategy: 'వ్యూహాన్ని ప్రింట్ చేయండి',
    importedFromHarvest: 'డిజిటల్ కోత నుండి తెచ్చిన వివరాలు:',
    acUnit: 'ఎకరాలు',
    cropColon: 'పంట:',
    harvestColon: 'కోత:',
    kg: 'కిలోలు',
    perKg: '/కిలో',
    cultCostColon: 'సాగు ఖర్చు:',
    cropLabel: 'పంట',
    availQtyLabel: 'అందుబాటులో ఉన్న పంట పరిమాణం (కిలోలు)',
    totalCultExpLabel: 'మొత్తం సాగు ఖర్చులు (₹)',
    tabPrices: 'మండి ధరలు',
    tabCompare: 'మార్కెట్ లాభం',
    tabTrends: 'ధరల సరళి',
    tabSellTiming: 'ఇప్పుడే అమ్మడం vs తర్వాత',
    tabOffers: 'కొనుగోలుదారు ఆఫర్లు',
    tabTransport: 'రవాణా ఖర్చు',
    dataTransparency: 'డేటా పారదర్శకత:',
    dataTransparencyMsg:
      'ఈ వాతావరణంలో లైవ్ AGMARKNET API కీలు కాన్ఫిగర్ చేయబడలేదు. దిగువ ఉన్న నమూనా రికార్డులు ఊహాజనిత డెమో డేటా; మీరు నిజమైన స్థానిక మండి ధరలను క్రింద మాన్యువల్‌గా జోడించవచ్చు.',
    filterCropPh: 'పంట ద్వారా వడపోత (ఉదా. టొమాటో)',
    filterLocPh: 'రాష్ట్రం, జిల్లా లేదా మండి ద్వారా వడపోత',
    manualMktPh: 'మార్కెట్ పేరు నమోదు చేయండి',
    addPriceBtn: 'ధర జోడించు',
    colCrop: 'పంట',
    colMktDistrict: 'మండి & జిల్లా',
    colMinMaxQtl: 'కనిష్ట / గరిష్ట (₹/క్వింటాల్)',
    colModalQtl: 'మోడల్ (₹/క్వింటాల్)',
    colNormKg: 'కిలోకు ధర (₹/కిలో)',
    colDate: 'తేదీ',
    colSource: 'మూలం',
    compareTitle: 'మార్కెట్ లాభ విశ్లేషణ (రవాణా, కమీషన్ & నష్టం తర్వాత నికర ఆదాయం)',
    keyInsight: 'ముఖ్య విశ్లేషణ:',
    offersHighestPrice: 'అత్యధిక అమ్మకపు ధర ఇస్తుంది',
    butPrefix: ', కానీ తక్కువ రవాణా, కమీషన్ మరియు పంట నష్టం కారణంగా',
    yieldsHigherNet: 'ఎక్కువ నికర లాభాన్ని అందిస్తుంది',
    dueToLowerLoss: '.',
    priceKgInput: 'ధర (₹/కిలో)',
    transportInput: 'రవాణా (₹)',
    commissionInput: 'కమీషన్ (%)',
    spoilageInput: 'నష్టం / చెడిపోవడం (%)',
    colRankMkt: 'ర్యాంక్ & మార్కెట్',
    colPriceKg: 'ధర/కిలో',
    colGrossRev: 'మొత్తం ఆదాయం',
    colSpoilageLoss: 'పంట నష్టం',
    colSellTransport: 'అమ్మకం + రవాణా',
    colNetSaleRev: 'నికర అమ్మకపు ఆదాయం',
    colNetProfitAfterCult: 'సాగు ఖర్చు తర్వాత నికర లాభం',
    barGrossSale: 'మొత్తం అమ్మకం (₹)',
    barNetProfit: 'నికర లాభం (₹)',
    trendsTitle: 'ధరల సరళి & చలన సగటు',
    usingCsvPrices: 'దిగుమతి చేసిన CSV చారిత్రక ధరలు ఉపయోగించబడుతున్నాయి',
    usingDemoSeries: 'స్పష్టంగా గుర్తించిన నమూనా ధరల శ్రేణి (నిజ ధరలకు క్రింద CSV అతికించండి)',
    demoSuffix: 'డెమో',
    avgPrice: 'సగటు ధర',
    minimum: 'కనిష్టం',
    maximum: 'గరిష్టం',
    volatility: 'హెచ్చుతగ్గులు',
    direction: 'దిశ',
    linePrice: 'ధర (₹/కిలో)',
    lineMovingAvg: '3-రోజుల చలన సగటు',
    csvLabel: 'ధరల చరిత్ర CSV దిగుమతి (ఫార్మాట్: ప్రతి వరుసలో date,pricePerKg):',
    analyzeCsvBtn: 'CSV చరిత్రను విశ్లేషించు',
    sellTitle: 'ఇప్పుడే అమ్మడం vs తర్వాత అమ్మడం వ్యూహ సిమ్యులేటర్',
    sellFields: {
      currentPricePerKg: 'ప్రస్తుత ధర (₹/కిలో)',
      expectedFuturePricePerKg: 'అంచనా భవిష్యత్ ధర (₹/కిలో)',
      quantityKg: 'పరిమాణం (కిలోలు)',
      storageDays: 'నిల్వ రోజులు',
      dailyStorageCostPerKg: 'రోజువారీ నిల్వ ఖర్చు (₹/కిలో/రోజు)',
      spoilagePct: 'అంచనా నష్టం (%)',
      storageCapacityKg: 'నిల్వ సామర్థ్యం (కిలోలు)',
      splitImmediatePct: 'విభజన: వెంటనే అమ్మకం (%)',
      transportExpenseInr: 'రవాణా ఖర్చు (₹)',
    },
    availProducePrefix: 'అందుబాటులో ఉన్న పంట',
    exceedsCapMiddle: 'నిల్వ సామర్థ్యాన్ని మించి ఉంది',
    excessWarnSuffix: '. మిగిలిన పంట వెంటనే అమ్మబడినట్లు మోడల్ చేయబడింది; సరైన వెంటిలేషన్ లేకుండా నిల్వ చేయవద్దు.',
    stratImmediateTitle: '1. వెంటనే అమ్మండి',
    stratImmediateDesc: 'నిల్వ ఖర్చు సున్నా మరియు పంట చెడిపోయే ప్రమాదం ఉండదు.',
    stratLaterTitle: '2. నిల్వ చేసి తర్వాత అమ్మండి',
    storageLabel: 'నిల్వ ఖర్చు:',
    spoilageLabel: 'నష్టం:',
    breakEvenFuture: 'బ్రేక్-ఈవెన్ భవిష్యత్ ధర:',
    stratSplitTitle: '3. విభజన వ్యూహం',
    nowSuffix: '% ఇప్పుడు',
    stratSplitDesc: 'వెంటనే నగదు లభ్యత మరియు ధర పెరుగుదల లాభాన్ని సమతుల్యం చేస్తుంది.',
    offersTitle: 'కొనుగోలుదారుల ఆఫర్ల విశ్లేషణ (స్వతంత్ర కాలిక్యులేటర్)',
    addOfferBtn: '+ ఆఫర్ జోడించు',
    buyerPrefix: 'కొనుగోలుదారు',
    offeredPriceLabel: 'ఆఫర్ చేసిన ధర (₹/కిలో)',
    transportRespLabel: 'రవాణా బాధ్యత',
    buyerPickup: 'కొనుగోలుదారు పికప్',
    farmerDelivery: 'రైతు డెలివరీ',
    paymentDelayLabel: 'చెల్లింపు ఆలస్యం (రోజులు)',
    colBuyer: 'కొనుగోలుదారు',
    colOfferedPrice: 'ఆఫర్ ధర',
    colGrossOffer: 'మొత్తం ఆఫర్',
    colFarmerTransport: 'రైతు రవాణా ఖర్చు',
    colPaymentDelay: 'చెల్లింపు ఆలస్యం',
    daysUnit: 'రోజులు',
    colEstProfit: 'అంచనా లాభం',
    transportTitle: 'రవాణా ఖర్చు ఆప్టిమైజర్ (స్వతంత్ర కాలిక్యులేటర్)',
    modeIndividual: 'వ్యక్తిగత వాహనం',
    modeShared: 'భాగస్వామ్య వాహనం',
    modeBuyerPickup: 'కొనుగోలుదారు పికప్',
    modeFarmerDelivery: 'రైతు డెలివరీ',
    loadSuffix: '% లోడ్',
    capacityExceeded: 'సామర్థ్యం మించిపోయింది',
    vehicleCapLabel: 'వాహన సామర్థ్యం (కిలోలు)',
    quotedCostLabel: 'వాహన బాడుగ (₹)',
    myWeightLabel: 'నా పంట బరువు (కిలోలు)',
    coFarmerWeightLabel: 'తోటి రైతుల బరువు (కిలోలు)',
    totalCombinedLoad: 'మొత్తం ఉమ్మడి లోడ్:',
    yourShareLabel: 'మీ బరువు ప్రకారం వాటా:',
    dirUp: 'పెరుగుతోంది',
    dirDown: 'తగ్గుతోంది',
    dirStable: 'స్థిరంగా ఉంది',
  },
};

export function MarketIntelligenceWorkspace() {
  const { language } = useFarm();
  const t = MKT_INTEL_I18N[language];
  const numLocale = getIntlLocale(language);
  const [activeTab, setActiveTab] = useState<MarketTab>('prices');
  const [harvestPayload, setHarvestPayload] = useState<HarvestToMarketPayload | null>(null);

  // Common produce state
  const [cropName, setCropName] = useState<string>('Tomato');
  const [quantityKg, setQuantityKg] = useState<number>(18000);
  const [cultivationExpensesInr, setCultivationExpensesInr] = useState<number>(65000);

  // Phase 12: Prices + Manual Entry
  const [cropFilter, setCropFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [customPrices, setCustomPrices] = useState<MarketPriceRecord[]>([]);
  const [manualMarketName, setManualMarketName] = useState<string>('');
  const [manualPricePerKg, setManualPricePerKg] = useState<number>(20);

  // Phase 13: Multi-market comparison
  const [markets, setMarkets] = useState<MarketComparisonInput[]>([
    {
      id: 'mk1',
      marketName: 'Local Tumakuru APMC (Demo)',
      sellingPricePerKg: 17.5,
      quantityKg: 18000,
      transportExpenseInr: 4500,
      loadingExpenseInr: 1200,
      unloadingExpenseInr: 1000,
      packagingExpenseInr: 2500,
      commissionPct: 2,
      otherSellingExpenseInr: 500,
      spoilagePct: 2,
    },
    {
      id: 'mk2',
      marketName: 'Bengaluru Yeshwanthpur (Demo)',
      sellingPricePerKg: 21.5,
      quantityKg: 18000,
      transportExpenseInr: 14000,
      loadingExpenseInr: 1500,
      unloadingExpenseInr: 1500,
      packagingExpenseInr: 3500,
      commissionPct: 4,
      otherSellingExpenseInr: 1200,
      spoilagePct: 6,
    },
    {
      id: 'mk3',
      marketName: 'Kolar APMC (Demo)',
      sellingPricePerKg: 18.5,
      quantityKg: 18000,
      transportExpenseInr: 12500,
      loadingExpenseInr: 1400,
      unloadingExpenseInr: 1200,
      packagingExpenseInr: 3000,
      commissionPct: 3,
      otherSellingExpenseInr: 800,
      spoilagePct: 4,
    },
  ]);

  // Phase 14: Price Trends (clearly labelled illustrative demo + CSV import)
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [csvInput, setCsvInput] = useState<string>('');
  const [customTrend, setCustomTrend] = useState<PriceHistoryPoint[] | null>(null);

  // Phase 15: Sell Now vs Later
  const [sellInputs, setSellInputs] = useState<SellStrategyInputs>({
    currentPricePerKg: 17.5,
    expectedFuturePricePerKg: 22.0,
    quantityKg: 18000,
    storageDays: 7,
    dailyStorageCostPerKg: 0.25,
    spoilagePct: 8,
    transportExpenseInr: 4500,
    storageCapacityKg: 12000,
    splitImmediatePct: 50,
  });

  // Phase 16: Buyer Offers (independent of Smart Bidding)
  const [offers, setOffers] = useState<BuyerOfferInput[]>([
    {
      id: 'b1',
      buyerName: 'Trader A (Farmgate Pickup)',
      offeredPricePerKg: 16.5,
      requiredQuantityKg: 18000,
      transportResponsibility: 'Buyer Pickup',
      transportExpenseInr: 0,
      paymentDelayDays: 0,
      additionalSellingExpenseInr: 500,
    },
    {
      id: 'b2',
      buyerName: 'Wholesaler B (Mandi Delivery)',
      offeredPricePerKg: 18.5,
      requiredQuantityKg: 18000,
      transportResponsibility: 'Farmer Delivery',
      transportExpenseInr: 12000,
      paymentDelayDays: 14,
      additionalSellingExpenseInr: 2500,
    },
  ]);

  // Phase 17: Transport Cost Optimizer (independent of Transport Connect)
  const [transportOptions, setTransportOptions] = useState<TransportOptionInput[]>([
    {
      mode: 'Individual Vehicle',
      distanceKm: 75,
      vehicleCapacityKg: 10000,
      quotedCostInr: 9500,
      participatingFarmers: 1,
      myProduceWeightKg: 6000,
      otherFarmersWeightKg: 0,
    },
    {
      mode: 'Shared Vehicle',
      distanceKm: 75,
      vehicleCapacityKg: 10000,
      quotedCostInr: 9500,
      participatingFarmers: 2,
      myProduceWeightKg: 6000,
      otherFarmersWeightKg: 3500,
    },
  ]);

  // Load transferred harvest data from Digital Farming if present
  useEffect(() => {
    const payload = loadHarvestTransferPayload();
    if (payload) {
      setHarvestPayload(payload);
      setCropName(payload.cropName);
      setCropFilter(payload.cropName);
      setQuantityKg(payload.harvestQuantityKg);
      setCultivationExpensesInr(payload.cultivationExpensesInr);
      setMarkets((prev) =>
        prev.map((m) => ({
          ...m,
          quantityKg: payload.harvestQuantityKg,
          sellingPricePerKg: m.id === 'mk1' ? payload.expectedSellingPricePerKg : m.sellingPricePerKg,
        }))
      );
      setSellInputs((prev) => ({
        ...prev,
        quantityKg: payload.harvestQuantityKg,
        currentPricePerKg: payload.expectedSellingPricePerKg,
      }));
    }
  }, []);

  const allPrices = useMemo(() => [...customPrices, ...DEMO_MARKET_PRICES], [customPrices]);
  const filteredPrices = useMemo(
    () =>
      allPrices.filter(
        (p) =>
          (!cropFilter || p.crop.toLowerCase().includes(cropFilter.toLowerCase())) &&
          (!locationFilter ||
            p.district.toLowerCase().includes(locationFilter.toLowerCase()) ||
            p.market.toLowerCase().includes(locationFilter.toLowerCase()) ||
            p.state.toLowerCase().includes(locationFilter.toLowerCase()))
      ),
    [allPrices, cropFilter, locationFilter]
  );

  const marketResults = useMemo(
    () => evaluateMarkets(markets, cultivationExpensesInr),
    [markets, cultivationExpensesInr]
  );

  const highestGrossMarket = useMemo(() => {
    if (marketResults.length === 0) return null;
    return [...marketResults].sort((a, b) => b.sellingPricePerKg - a.sellingPricePerKg)[0];
  }, [marketResults]);

  const demoTrendSeries = useMemo<PriceHistoryPoint[]>(() => {
    const base = cropName.toLowerCase() === 'chilli' ? 56 : cropName.toLowerCase() === 'maize' ? 21 : 17;
    const count = trendRange === '7d' ? 7 : trendRange === '30d' ? 12 : 16;
    return Array.from({ length: count }).map((_, i) => ({
      date: `Day ${i + 1}`,
      pricePerKg: Number((base + Math.sin(i * 0.7) * 2.2 + i * 0.25).toFixed(2)),
    }));
  }, [cropName, trendRange]);

  const trendStats = useMemo(
    () => analyzePriceTrends(customTrend && customTrend.length > 0 ? customTrend : demoTrendSeries),
    [customTrend, demoTrendSeries]
  );

  const sellSim = useMemo(() => simulateSellStrategy(sellInputs), [sellInputs]);
  const evaluatedOffers = useMemo(
    () => evaluateBuyerOffers(offers, cultivationExpensesInr),
    [offers, cultivationExpensesInr]
  );
  const transportEvaluations = useMemo(
    () => transportOptions.map((item) => ({ input: item, eval: evaluateTransportOption(item, language) })),
    [transportOptions, language]
  );

  const handleAddManualPrice = () => {
    if (!manualMarketName.trim() || manualPricePerKg <= 0) return;
    setCustomPrices((prev) => [
      {
        id: `custom_${Date.now()}`,
        crop: cropName,
        variety: 'Farmer Entered',
        state: 'User Entry',
        district: 'Local',
        market: manualMarketName.trim(),
        minPricePerQuintal: Math.round(manualPricePerKg * 95),
        maxPricePerQuintal: Math.round(manualPricePerKg * 105),
        modalPricePerQuintal: Math.round(manualPricePerKg * 100),
        pricePerKg: manualPricePerKg,
        priceDate: new Date().toISOString().slice(0, 10),
        source: 'Manual Farmer Entry',
        isDemo: false,
      },
      ...prev,
    ]);
    setManualMarketName('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full mb-2">
              <Store className="w-3.5 h-3.5" />
              RaithaMitra · {t.headerBadge.replace(/^RaithaMitra · /, '')}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">{t.title}</h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1">
              {t.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-semibold print:hidden"
          >
            <Printer className="w-3.5 h-3.5" /> {t.printStrategy}
          </button>
        </div>

        {harvestPayload && (
          <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-3 text-xs text-emerald-50">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Sprout className="w-3.5 h-3.5" /> {t.importedFromHarvest}
            </span>
            <span>{harvestPayload.farmName} ({harvestPayload.areaAcres} {t.acUnit})</span>
            <span>{t.cropColon} <strong>{localizeCropName(harvestPayload.cropName, language)}</strong></span>
            <span>{t.harvestColon} <strong>{harvestPayload.harvestQuantityKg.toLocaleString(numLocale)} {t.kg}</strong></span>
            <span>{t.cultCostColon} <strong>₹{harvestPayload.cultivationExpensesInr.toLocaleString(numLocale)}</strong></span>
          </div>
        )}
      </div>

      {/* Shared Produce Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">{t.cropLabel}</label>
          <input
            type="text"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">{t.availQtyLabel}</label>
          <input
            type="number"
            min="0"
            value={quantityKg}
            onChange={(e) => {
              const q = Math.max(0, Number(e.target.value) || 0);
              setQuantityKg(q);
              setMarkets((prev) => prev.map((m) => ({ ...m, quantityKg: q })));
              setSellInputs((prev) => ({ ...prev, quantityKg: q }));
            }}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label className="block text-zinc-500 mb-1 font-semibold">{t.totalCultExpLabel}</label>
          <input
            type="number"
            min="0"
            value={cultivationExpensesInr}
            onChange={(e) => setCultivationExpensesInr(Math.max(0, Number(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 print:hidden">
        {(
          [
            { id: 'prices', label: t.tabPrices, icon: Store },
            { id: 'compare', label: t.tabCompare, icon: TrendingUp },
            { id: 'trends', label: t.tabTrends, icon: TrendingUp },
            { id: 'sell_timing', label: t.tabSellTiming, icon: Clock },
            { id: 'offers', label: t.tabOffers, icon: Users },
            { id: 'transport', label: t.tabTransport, icon: Truck },
          ] as { id: MarketTab; label: string; icon: any }[]
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border ${
                activeTab === tab.id
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MANDI PRICES */}
      {activeTab === 'prices' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
            <strong>{t.dataTransparency}</strong> {t.dataTransparencyMsg}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <input
              type="text"
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              placeholder={t.filterCropPh}
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder={t.filterLocPh}
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <input
              type="text"
              value={manualMarketName}
              onChange={(e) => setManualMarketName(e.target.value)}
              placeholder={t.manualMktPh}
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.5"
                value={manualPricePerKg}
                onChange={(e) => setManualPricePerKg(Number(e.target.value) || 0)}
                placeholder={`₹${t.perKg}`}
                className="w-24 px-2.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
              />
              <button
                type="button"
                onClick={handleAddManualPrice}
                className="flex-1 px-3 py-2 rounded-xl bg-emerald-700 text-white font-semibold"
              >
                {t.addPriceBtn}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">{t.colCrop}</th>
                  <th className="py-2 pr-3">{t.colMktDistrict}</th>
                  <th className="py-2 pr-3">{t.colMinMaxQtl}</th>
                  <th className="py-2 pr-3">{t.colModalQtl}</th>
                  <th className="py-2 pr-3">{t.colNormKg}</th>
                  <th className="py-2 pr-3">{t.colDate}</th>
                  <th className="py-2">{t.colSource}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-3 font-semibold">{localizeCropName(p.crop, language)} ({p.variety})</td>
                    <td className="py-2 pr-3">{p.market}, {p.district}</td>
                    <td className="py-2 pr-3">₹{p.minPricePerQuintal} – ₹{p.maxPricePerQuintal}</td>
                    <td className="py-2 pr-3 font-semibold">₹{p.modalPricePerQuintal}</td>
                    <td className="py-2 pr-3 text-emerald-700 font-bold">₹{p.pricePerKg}{t.perKg}</td>
                    <td className="py-2 pr-3">{p.priceDate}</td>
                    <td className="py-2 text-[11px] text-zinc-500">{p.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MARKET PROFIT OPTIMIZATION */}
      {activeTab === 'compare' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">{t.compareTitle}</h2>
          {marketResults.length > 0 && highestGrossMarket && marketResults[0].id !== highestGrossMarket.id && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <strong>{t.keyInsight}</strong> <strong>{highestGrossMarket.marketName}</strong> {t.offersHighestPrice} (₹{highestGrossMarket.sellingPricePerKg}{t.perKg}){t.butPrefix} <strong>{marketResults[0].marketName}</strong> {t.yieldsHigherNet} (₹{marketResults[0].netProfitAfterCultivationInr.toLocaleString(numLocale)}) {t.dueToLowerLoss}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {markets.map((m, idx) => (
              <div key={m.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <input
                  type="text"
                  value={m.marketName}
                  onChange={(e) => {
                    const next = [...markets];
                    next[idx] = { ...m, marketName: e.target.value };
                    setMarkets(next);
                  }}
                  className="w-full font-bold px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    {t.priceKgInput}
                    <input
                      type="number"
                      step="0.5"
                      value={m.sellingPricePerKg}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, sellingPricePerKg: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    {t.transportInput}
                    <input
                      type="number"
                      value={m.transportExpenseInr}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, transportExpenseInr: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    {t.commissionInput}
                    <input
                      type="number"
                      step="0.5"
                      value={m.commissionPct}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, commissionPct: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                  <label>
                    {t.spoilageInput}
                    <input
                      type="number"
                      step="0.5"
                      value={m.spoilagePct}
                      onChange={(e) => {
                        const next = [...markets];
                        next[idx] = { ...m, spoilagePct: Number(e.target.value) || 0 };
                        setMarkets(next);
                      }}
                      className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">{t.colRankMkt}</th>
                  <th className="py-2 pr-3">{t.colPriceKg}</th>
                  <th className="py-2 pr-3">{t.colGrossRev}</th>
                  <th className="py-2 pr-3">{t.colSpoilageLoss}</th>
                  <th className="py-2 pr-3">{t.colSellTransport}</th>
                  <th className="py-2 pr-3">{t.colNetSaleRev}</th>
                  <th className="py-2">{t.colNetProfitAfterCult}</th>
                </tr>
              </thead>
              <tbody>
                {marketResults.map((r, i) => (
                  <tr key={r.id} className={`border-b border-zinc-100 dark:border-zinc-800 ${i === 0 ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                    <td className="py-2 pr-3">#{i + 1} {r.marketName}</td>
                    <td className="py-2 pr-3">₹{r.sellingPricePerKg}{t.perKg}</td>
                    <td className="py-2 pr-3">₹{r.grossSaleRevenueInr.toLocaleString(numLocale)}</td>
                    <td className="py-2 pr-3 text-amber-700">₹{r.spoilageLossInr.toLocaleString(numLocale)}</td>
                    <td className="py-2 pr-3">₹{r.totalSellingExpensesInr.toLocaleString(numLocale)}</td>
                    <td className="py-2 pr-3">₹{r.netSaleRevenueInr.toLocaleString(numLocale)}</td>
                    <td className={`py-2 font-bold ${r.netProfitAfterCultivationInr >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      ₹{r.netProfitAfterCultivationInr.toLocaleString(numLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketResults}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="marketName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="grossSaleRevenueInr" name={t.barGrossSale} fill="#94a3b8" />
                <Bar dataKey="netProfitAfterCultivationInr" name={t.barNetProfit} fill="#15803d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: PRICE TRENDS */}
      {activeTab === 'trends' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">{t.trendsTitle} ({localizeCropName(cropName, language)})</h2>
              <p className="text-xs text-zinc-500">
                {customTrend ? t.usingCsvPrices : t.usingDemoSeries}
              </p>
            </div>
            <div className="flex gap-1.5 text-xs">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setCustomTrend(null);
                    setTrendRange(r);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    trendRange === r && !customTrend ? 'bg-emerald-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                >
                  {r.toUpperCase()} {t.demoSuffix}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">{t.avgPrice}</span>
              <strong>₹{trendStats.avgPrice}{t.perKg}</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">{t.minimum}</span>
              <strong>₹{trendStats.minPrice}{t.perKg}</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">{t.maximum}</span>
              <strong>₹{trendStats.maxPrice}{t.perKg}</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">{t.volatility}</span>
              <strong>{trendStats.volatilityPct}%</strong>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
              <span className="text-zinc-500 block">{t.direction}</span>
              <strong>
                {trendStats.direction.toLowerCase().includes('up')
                  ? t.dirUp
                  : trendStats.direction.toLowerCase().includes('down')
                    ? t.dirDown
                    : t.dirStable}{' '}
                ({trendStats.changePct}%)
              </strong>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendStats.series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="pricePerKg" name={t.linePrice} stroke="#15803d" strokeWidth={2} />
                <Line type="monotone" dataKey="movingAvg" name={t.lineMovingAvg} stroke="#f59e0b" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-xs space-y-2">
            <label className="font-semibold block">{t.csvLabel}</label>
            <textarea
              rows={3}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder={'2026-11-18,16.5\n2026-11-19,17.0\n2026-11-20,18.2'}
              className="w-full p-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const parsed = parseCsvPriceHistory(csvInput);
                if (parsed.length > 0) setCustomTrend(parsed);
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
            >
              {t.analyzeCsvBtn}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SELL NOW VS SELL LATER */}
      {activeTab === 'sell_timing' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">{t.sellTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {(
              [
                'currentPricePerKg',
                'expectedFuturePricePerKg',
                'storageDays',
                'dailyStorageCostPerKg',
                'spoilagePct',
                'storageCapacityKg',
                'splitImmediatePct',
                'transportExpenseInr',
              ] as (keyof SellStrategyInputs)[]
            ).map((k) => (
              <label key={k}>
                <span className="text-zinc-500 block mb-1">{t.sellFields[k]}</span>
                <input
                  type="number"
                  step="any"
                  value={sellInputs[k]}
                  onChange={(e) => setSellInputs({ ...sellInputs, [k]: Number(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                />
              </label>
            ))}
          </div>

          {sellSim.capacityExceeded && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {t.availProducePrefix} ({sellInputs.quantityKg} {t.kg}) {t.exceedsCapMiddle} ({sellInputs.storageCapacityKg} {t.kg}){t.excessWarnSuffix}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">{t.stratImmediateTitle}</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.immediateRevenue.toLocaleString(numLocale)}
              </div>
              <p className="text-zinc-500 mt-1">{t.stratImmediateDesc}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">{t.stratLaterTitle}</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.laterRevenue.toLocaleString(numLocale)}
              </div>
              <p className="text-zinc-500 mt-1">
                {t.storageLabel} ₹{sellSim.storageCost.toLocaleString(numLocale)} · {t.spoilageLabel} ₹{sellSim.spoilageLossInr.toLocaleString(numLocale)} · {t.breakEvenFuture} ₹{sellSim.breakEvenFuturePrice}{t.perKg}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="font-bold text-sm">{t.stratSplitTitle} ({sellInputs.splitImmediatePct}{t.nowSuffix})</div>
              <div className="text-lg font-bold text-emerald-700 mt-1">
                ₹{sellSim.splitNetRevenue.toLocaleString(numLocale)}
              </div>
              <p className="text-zinc-500 mt-1">{t.stratSplitDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BUYER OFFER INTELLIGENCE */}
      {activeTab === 'offers' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t.offersTitle}</h2>
            <button
              type="button"
              onClick={() =>
                setOffers((p) => [
                  ...p,
                  {
                    id: `b_${Date.now()}`,
                    buyerName: `${t.buyerPrefix} ${p.length + 1}`,
                    offeredPricePerKg: 18,
                    requiredQuantityKg: quantityKg,
                    transportResponsibility: 'Farmer Delivery',
                    transportExpenseInr: 6000,
                    paymentDelayDays: 7,
                    additionalSellingExpenseInr: 1000,
                  },
                ])
              }
              className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold"
            >
              {t.addOfferBtn}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {offers.map((o, idx) => (
              <div key={o.id} className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={o.buyerName}
                  onChange={(e) => {
                    const next = [...offers];
                    next[idx] = { ...o, buyerName: e.target.value };
                    setOffers(next);
                  }}
                  className="col-span-2 font-bold px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                />
                <label>
                  {t.offeredPriceLabel}
                  <input
                    type="number"
                    step="0.5"
                    value={o.offeredPricePerKg}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, offeredPricePerKg: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
                <label>
                  {t.transportRespLabel}
                  <select
                    value={o.transportResponsibility}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, transportResponsibility: e.target.value as any };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  >
                    <option value="Buyer Pickup">{t.buyerPickup}</option>
                    <option value="Farmer Delivery">{t.farmerDelivery}</option>
                  </select>
                </label>
                <label>
                  {t.transportInput}
                  <input
                    type="number"
                    value={o.transportExpenseInr}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, transportExpenseInr: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
                <label>
                  {t.paymentDelayLabel}
                  <input
                    type="number"
                    value={o.paymentDelayDays}
                    onChange={(e) => {
                      const next = [...offers];
                      next[idx] = { ...o, paymentDelayDays: Number(e.target.value) || 0 };
                      setOffers(next);
                    }}
                    className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  <th className="py-2 pr-3">{t.colBuyer}</th>
                  <th className="py-2 pr-3">{t.colOfferedPrice}</th>
                  <th className="py-2 pr-3">{t.colGrossOffer}</th>
                  <th className="py-2 pr-3">{t.colFarmerTransport}</th>
                  <th className="py-2 pr-3">{t.colPaymentDelay}</th>
                  <th className="py-2 pr-3">{t.colNetSaleRev}</th>
                  <th className="py-2">{t.colEstProfit}</th>
                </tr>
              </thead>
              <tbody>
                {evaluatedOffers.map((ev, i) => (
                  <tr key={ev.id} className={`border-b border-zinc-100 dark:border-zinc-800 ${i === 0 ? 'bg-emerald-50/60 font-semibold' : ''}`}>
                    <td className="py-2 pr-3">{ev.buyerName}</td>
                    <td className="py-2 pr-3">₹{ev.offeredPricePerKg}{t.perKg}</td>
                    <td className="py-2 pr-3">₹{ev.grossValue.toLocaleString(numLocale)}</td>
                    <td className="py-2 pr-3">₹{ev.effectiveTransportInr.toLocaleString(numLocale)}</td>
                    <td className="py-2 pr-3">{ev.paymentDelayDays} {t.daysUnit}</td>
                    <td className="py-2 pr-3 text-emerald-700">₹{ev.netRevenue.toLocaleString(numLocale)}</td>
                    <td className="py-2">₹{ev.estimatedProfit.toLocaleString(numLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: TRANSPORTATION COST OPTIMIZER */}
      {activeTab === 'transport' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4">
          <h2 className="text-base font-bold">{t.transportTitle}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {transportOptions.map((opt, idx) => {
              const ev = transportEvaluations[idx].eval;
              return (
                <div key={idx} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <select
                      value={opt.mode}
                      onChange={(e) => {
                        const next = [...transportOptions];
                        next[idx] = { ...opt, mode: e.target.value as any };
                        setTransportOptions(next);
                      }}
                      className="font-bold px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    >
                      <option value="Individual Vehicle">{t.modeIndividual}</option>
                      <option value="Shared Vehicle">{t.modeShared}</option>
                      <option value="Buyer Pickup">{t.modeBuyerPickup}</option>
                      <option value="Farmer Delivery">{t.modeFarmerDelivery}</option>
                    </select>
                    {ev.valid ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {ev.utilizationPct}{t.loadSuffix}
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">{t.capacityExceeded}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      {t.vehicleCapLabel}
                      <input
                        type="number"
                        value={opt.vehicleCapacityKg}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, vehicleCapacityKg: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    <label>
                      {t.quotedCostLabel}
                      <input
                        type="number"
                        value={opt.quotedCostInr}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, quotedCostInr: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    <label>
                      {t.myWeightLabel}
                      <input
                        type="number"
                        value={opt.myProduceWeightKg}
                        onChange={(e) => {
                          const next = [...transportOptions];
                          next[idx] = { ...opt, myProduceWeightKg: Number(e.target.value) || 0 };
                          setTransportOptions(next);
                        }}
                        className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                      />
                    </label>
                    {opt.mode === 'Shared Vehicle' && (
                      <label>
                        {t.coFarmerWeightLabel}
                        <input
                          type="number"
                          value={opt.otherFarmersWeightKg}
                          onChange={(e) => {
                            const next = [...transportOptions];
                            next[idx] = { ...opt, otherFarmersWeightKg: Number(e.target.value) || 0 };
                            setTransportOptions(next);
                          }}
                          className="w-full px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                        />
                      </label>
                    )}
                  </div>

                  {!ev.valid ? (
                    <p className="text-red-600 bg-red-50 p-2 rounded-lg">{ev.error}</p>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 space-y-1">
                      <div>{t.totalCombinedLoad} <strong>{ev.totalWeightKg.toLocaleString(numLocale)} {t.kg}</strong></div>
                      <div>{t.yourShareLabel} <strong className="text-emerald-700">₹{ev.farmerShareInr.toLocaleString(numLocale)}</strong> (₹{ev.costPerKg}{t.perKg})</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
