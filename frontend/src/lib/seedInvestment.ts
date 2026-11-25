// frontend/src/lib/seedInvestment.ts
/**
 * Deterministic Seed Investment Planner Calculations (AD-07).
 * All calculations use INR and acres. Never invents seed prices or yields.
 */

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
      `Your selected cultivation plan exceeds your budget by ₹${Math.abs(calc.remainingBudgetInr).toLocaleString('en-IN')}.`
    );
  } else {
    recs.push(
      `Your selected cultivation plan fits within budget with ₹${calc.remainingBudgetInr.toLocaleString('en-IN')} remaining.`
    );
  }

  if (
    calc.breakEvenSellingPricePerKg > 0 &&
    input.expectedSellingPricePerKg < calc.breakEvenSellingPricePerKg
  ) {
    recs.push(
      `Your expected selling price (₹${input.expectedSellingPricePerKg}/kg) is below the break-even price (₹${calc.breakEvenSellingPricePerKg}/kg).`
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
      `${lowestCost.varietyName} requires a lower initial seed investment (₹${lowestCost.seedInvestmentInr.toLocaleString('en-IN')}).`
    );
    recs.push(
      `${highestProfit.varietyName} provides higher estimated profit (₹${highestProfit.estimatedProfitInr.toLocaleString('en-IN')}) under your assumptions.`
    );
  }

  return recs;
}
