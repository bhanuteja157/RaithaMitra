// frontend/src/app/finance/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFarm } from '@/context/FarmContext';
import { loadFinanceSnapshot } from '@/lib/workflowBridge';
import { runFinancialSimulation } from '@/lib/scientificApi';
import { AssistantLanguage, speakWithDeviceVoice } from '@/lib/assistantVoice';
import {
  ConfirmedOrderSettlement,
  createFinanceTransaction,
  downloadFinanceCsv,
  fetchFinanceSummary,
  fetchFinanceTransactions,
  FinancialSummaryResponse,
  FinancialTransaction,
  recordOrderPayment,
  seedDemoFinancialScenario,
  syncFarmFinance,
  updateFinanceTransaction,
} from '@/lib/financeApi';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import {
  Coins,
  TrendingUp,
  Wallet,
  RefreshCw,
  Download,
  Printer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Sliders,
  ShieldAlert,
  Sparkles,
  Search,
  Edit3,
  IndianRupee,
} from 'lucide-react';

const FINANCE_LABELS: Record<
  AssistantLanguage,
  {
    title: string;
    subtitle: string;
    budget: string;
    recordedExp: string;
    committedExp: string;
    remainingBudget: string;
    confirmedSales: string;
    receivedPayments: string;
    outstanding: string;
    realizedProfit: string;
    roi: string;
    breakEven: string;
    readAloud: string;
  }
> = {
  en: {
    title: 'Farm Financial Intelligence',
    subtitle: 'Seed-to-sale transaction ledger, budget control, risk simulation & profit optimization',
    budget: 'Allocated Budget',
    recordedExp: 'Recorded Expenses',
    committedExp: 'Committed Expenses',
    remainingBudget: 'Remaining Budget',
    confirmedSales: 'Confirmed Sales Value',
    receivedPayments: 'Received Payments',
    outstanding: 'Outstanding Payments',
    realizedProfit: 'Realized Net Profit',
    roi: 'Return on Investment',
    breakEven: 'Break-Even Price',
    readAloud: 'Read Summary',
  },
  kn: {
    title: 'ಕೃಷಿ ಹಣಕಾಸು ಬುದ್ಧಿಮತ್ತೆ',
    subtitle: 'ಬೀಜದಿಂದ ಮಾರಾಟದವರೆಗಿನ ವಹಿವಾಟು ಲೆಡ್ಜರ್, ಬಜೆಟ್ ಮತ್ತು ಲಾಭ ವಿಶ್ಲೇಷಣೆ',
    budget: 'ನಿಗದಿತ ಬಜೆಟ್',
    recordedExp: 'ದಾಖಲಾದ ವೆಚ್ಚ',
    committedExp: 'ಬದ್ಧ ವೆಚ್ಚ',
    remainingBudget: 'ಉಳಿದ ಬಜೆಟ್',
    confirmedSales: 'ದೃಢೀಕೃತ ಮಾರಾಟ ಮೌಲ್ಯ',
    receivedPayments: 'ಸ್ವೀಕರಿಸಿದ ಪಾವತಿ',
    outstanding: 'ಬಾಕಿ ಪಾವತಿ',
    realizedProfit: 'ನೈಜ ನಿವ್ವಳ ಲಾಭ',
    roi: 'ಹೂಡಿಕೆ ಲಾಭಾಂಶ (ROI)',
    breakEven: 'ಸಮತೋಲನ ಬೆಲೆ',
    readAloud: 'ಸಾರಾಂಶ ಕೇಳಿ',
  },
  hi: {
    title: 'कृषि वित्तीय बुद्धिमत्ता',
    subtitle: 'बीज से बिक्री तक लेनदेन बहीखाता, बजट नियंत्रण और लाभ विश्लेषण',
    budget: 'आवंटित बजट',
    recordedExp: 'दर्ज खर्च',
    committedExp: 'प्रतिबद्ध खर्च',
    remainingBudget: 'शेष बजट',
    confirmedSales: 'पुष्ट बिक्री मूल्य',
    receivedPayments: 'प्राप्त भुगतान',
    outstanding: 'बकाया भुगतान',
    realizedProfit: 'वास्तविक शुद्ध लाभ',
    roi: 'निवेश पर प्रतिफल (ROI)',
    breakEven: 'ब्रेक-ईवन मूल्य',
    readAloud: 'सारांश सुनें',
  },
  te: {
    title: 'వ్యవసాయ ఆర్థిక విశ్లేషణ',
    subtitle: 'విత్తనం నుండి అమ్మకం వరకు లావాదేవీల ఖాతా, బడ్జెట్ మరియు లాభం',
    budget: 'కేటాయించిన బడ్జెట్',
    recordedExp: 'నమోదైన ఖర్చులు',
    committedExp: 'నిర్ణయించిన ఖర్చులు',
    remainingBudget: 'మిగిలిన బడ్జెట్',
    confirmedSales: 'నిర్ధారించిన అమ్మకం విలువ',
    receivedPayments: 'అందిన చెల్లింపులు',
    outstanding: 'బాకీ ఉన్న చెల్లింపులు',
    realizedProfit: 'నిజమైన నికర లాభం',
    roi: 'పెట్టుబడిపై రాబడి (ROI)',
    breakEven: 'బ్రేక్-ఈవెన్ ధర',
    readAloud: 'సారాంశం వినండి',
  },
};

const EXPENSE_CATEGORY_OPTIONS = [
  { value: 'seed_procurement', label: 'Seed Procurement' },
  { value: 'fertilizers', label: 'Fertilizers' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'soil_testing', label: 'Soil Testing' },
  { value: 'crop_protection', label: 'Crop Protection' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'land_preparation', label: 'Land Preparation' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'labour', label: 'Labour' },
  { value: 'transport', label: 'Transport' },
  { value: 'storage', label: 'Storage' },
  { value: 'miscellaneous', label: 'Miscellaneous' },
];

const INCOME_CATEGORY_OPTIONS = [
  { value: 'produce_sale', label: 'Produce Sale' },
  { value: 'govt_subsidy', label: 'Govt Benefit Received' },
  { value: 'byproduct_sale', label: 'Byproduct Sale' },
  { value: 'other_income', label: 'Other Income' },
];

type TabId = 'overview' | 'ledger' | 'simulator';

export default function FinancePage() {
  const { currentFarm, currentUser, token, language } = useFarm();
  const lang = (language || 'en') as AssistantLanguage;
  const labels = FINANCE_LABELS[lang] || FINANCE_LABELS.en;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [summary, setSummary] = useState<FinancialSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Add / Edit Transaction Modal State
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<FinancialTransaction | null>(null);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [txCategory, setTxCategory] = useState<string>('fertilizers');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [txDesc, setTxDesc] = useState<string>('');
  const [txStatus, setTxStatus] = useState<'recorded' | 'settled' | 'committed'>('recorded');
  const [txRef, setTxRef] = useState<string>('');

  // Order Payment Recording State
  const [payingOrder, setPayingOrder] = useState<ConfirmedOrderSettlement | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payRef, setPayRef] = useState<string>('');

  // Monte Carlo Risk State
  const [mcResult, setMcResult] = useState<any>(null);
  const [mcLoading, setMcLoading] = useState<boolean>(false);

  // What-If Economic Simulator State (strictly isolated from SQLite records)
  const [whatIfYieldKg, setWhatIfYieldKg] = useState<number>(5000);
  const [whatIfPricePerKg, setWhatIfPricePerKg] = useState<number>(20);
  const [whatIfCultivation, setWhatIfCultivation] = useState<number>(35000);
  const [whatIfLabour, setWhatIfLabour] = useState<number>(15000);
  const [whatIfTransport, setWhatIfTransport] = useState<number>(5000);
  const [whatIfStorage, setWhatIfStorage] = useState<number>(0);

  const farmId = currentFarm?.id || 'farm_001';

  const loadFinanceData = useCallback(async () => {
    if (!currentFarm) return;
    setLoading(true);
    setError(null);
    try {
      const bioSnap = loadFinanceSnapshot(currentUser.id);
      const estCult = bioSnap?.projectedCultivationCostInr || 0;
      const [sumData, txList] = await Promise.all([
        fetchFinanceSummary(farmId, token, estCult, true),
        fetchFinanceTransactions(farmId, token, {
          tx_type: filterType,
          category: filterCategory,
          status: filterStatus,
          start_date: startDate,
          end_date: endDate,
          search: searchText,
        }),
      ]);
      setSummary(sumData);
      setTransactions(txList);

      // Initialize What-If defaults from live data if > 0
      if (sumData.confirmed_quantity_kg > 0) {
        setWhatIfYieldKg(Math.round(sumData.confirmed_quantity_kg));
        setWhatIfPricePerKg(
          Math.round(sumData.confirmed_sales_value_inr / sumData.confirmed_quantity_kg)
        );
      }
      if (sumData.total_cost_inr > 0) {
        const lab = sumData.expense_breakdown.find((e) => e.category === 'labour')?.amount_inr || 0;
        const tr = sumData.expense_breakdown.find((e) => e.category === 'transport')?.amount_inr || 0;
        const st = sumData.expense_breakdown.find((e) => e.category === 'storage')?.amount_inr || 0;
        const other = Math.max(0, sumData.total_cost_inr - lab - tr - st);
        setWhatIfLabour(Math.round(lab));
        setWhatIfTransport(Math.round(tr));
        setWhatIfStorage(Math.round(st));
        setWhatIfCultivation(Math.round(other));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load financial intelligence.');
    } finally {
      setLoading(false);
    }
  }, [currentFarm, currentUser.id, farmId, token, filterType, filterCategory, filterStatus, startDate, endDate, searchText]);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const handleSyncModules = async () => {
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      const res = await syncFarmFinance(farmId, token);
      setStatusMsg(
        `Synchronized ${res.labour_synced} Labour Connect and ${res.transport_synced} Transport Connect records.`
      );
      await loadFinanceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoadJuryDemo = async () => {
    setBusy(true);
    setError(null);
    setStatusMsg(null);
    try {
      await seedDemoFinancialScenario(farmId, token);
      setStatusMsg(
        'Loaded demonstration financial lifecycle: ₹55,000 expenses, ₹1,00,000 confirmed sale (5,000 kg @ ₹20/kg), ₹45,000 net profit, 81.82% ROI, ₹11/kg break-even.'
      );
      await loadFinanceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(txAmount);
    if (!amt || amt <= 0) {
      setError('Enter a valid positive amount in INR.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editingTx) {
        await updateFinanceTransaction(
          editingTx.id,
          {
            category: txCategory,
            amount_inr: amt,
            tx_date: txDate,
            description: txDesc.trim(),
            status: txStatus,
            payment_reference: txRef.trim() || undefined,
          },
          token
        );
        setStatusMsg('Financial record updated.');
      } else {
        await createFinanceTransaction(
          {
            farm_id: farmId,
            tx_type: txType,
            category: txCategory,
            amount_inr: amt,
            tx_date: txDate,
            description: txDesc.trim(),
            source_module: txCategory === 'seed_procurement' ? 'BioIntel & Nursery' : 'Farm Management',
            status: txStatus,
            payment_reference: txRef.trim() || undefined,
          },
          token
        );
        setStatusMsg('Transaction recorded to persistent SQLite ledger.');
      }
      setShowAddForm(false);
      setEditingTx(null);
      setTxAmount('');
      setTxDesc('');
      setTxRef('');
      await loadFinanceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRecordOrderPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setError('Enter a valid positive payment amount.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recordOrderPayment(
        payingOrder.order_id,
        {
          farm_id: farmId,
          amount_inr: amt,
          payment_reference: payRef.trim() || undefined,
        },
        token
      );
      setStatusMsg(`Recorded ₹${amt.toLocaleString('en-IN')} payment received for ${payingOrder.crop_name}.`);
      setPayingOrder(null);
      setPayAmount('');
      setPayRef('');
      await loadFinanceData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRunMonteCarlo = async () => {
    if (!summary) return;
    setMcLoading(true);
    setError(null);
    try {
      const areaHa = Math.max(0.4, summary.land_area_ha || 1.0);
      const yieldTPerHa =
        summary.confirmed_quantity_kg > 0
          ? Number(((summary.confirmed_quantity_kg / 1000) / areaHa).toFixed(2))
          : 15.0;
      const pricePerT =
        summary.confirmed_quantity_kg > 0
          ? Math.round((summary.confirmed_sales_value_inr / summary.confirmed_quantity_kg) * 1000)
          : 20000;
      const trAmt = summary.expense_breakdown.find((e) => e.category === 'transport')?.amount_inr || 5000;
      const cultAmt = Math.max(5000, summary.total_cost_inr - trAmt);

      const res = await runFinancialSimulation({
        farm_id: farmId,
        crop_type: summary.primary_crop || 'Tomato',
        farm_area_ha: areaHa,
        expected_yield_t_per_ha: yieldTPerHa,
        market_price_inr_per_t: pricePerT,
        cultivation_expenses_inr: cultAmt,
        transportation_expenses_inr: trAmt,
        water_availability_pct: 90,
        crop_loss_pct: 5,
        yield_std_pct: 18,
        price_std_pct: 22,
        num_trials: 1000,
        random_seed: 42,
      });
      setMcResult(res);
    } catch (err: any) {
      setError(err.message || 'Monte Carlo simulation failed.');
    } finally {
      setMcLoading(false);
    }
  };

  const handleReadSummary = () => {
    if (!summary) return;
    const msg =
      `Financial summary for ${summary.farm_name || 'your farm'}: ` +
      `Allocated budget is ₹${summary.allocated_budget_inr.toLocaleString('en-IN')}. ` +
      `Actual recorded expenses are ₹${summary.actual_recorded_expenses_inr.toLocaleString('en-IN')}, ` +
      `committed expenses are ₹${summary.committed_expenses_inr.toLocaleString('en-IN')}, ` +
      `leaving ₹${summary.remaining_budget_inr.toLocaleString('en-IN')} remaining. ` +
      `Confirmed sales value is ₹${summary.confirmed_sales_value_inr.toLocaleString('en-IN')}, ` +
      `with ₹${summary.received_payments_inr.toLocaleString('en-IN')} received and ₹${summary.outstanding_payments_inr.toLocaleString('en-IN')} outstanding. ` +
      `Realized net profit is ₹${summary.realized_net_profit_inr.toLocaleString('en-IN')}.`;
    speakWithDeviceVoice(msg, lang, false);
  };

  const whatIfCalc = useMemo(() => {
    const grossRevenue = Math.max(0, whatIfYieldKg) * Math.max(0, whatIfPricePerKg);
    const totalCost =
      Math.max(0, whatIfCultivation) +
      Math.max(0, whatIfLabour) +
      Math.max(0, whatIfTransport) +
      Math.max(0, whatIfStorage);
    const netProfit = grossRevenue - totalCost;
    const roiPct = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
    const breakEven = whatIfYieldKg > 0 ? totalCost / whatIfYieldKg : null;
    return { grossRevenue, totalCost, netProfit, roiPct, breakEven };
  }, [whatIfYieldKg, whatIfPricePerKg, whatIfCultivation, whatIfLabour, whatIfTransport, whatIfStorage]);

  const budgetUtilizationPct = useMemo(() => {
    if (!summary || summary.allocated_budget_inr <= 0) return 0;
    return Math.min(150, Math.round((summary.total_cost_inr / summary.allocated_budget_inr) * 100));
  }, [summary]);

  if (currentUser.role !== 'farmer' && currentUser.role !== 'admin') {
    return (
      <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-200">
        Farm Financial Intelligence is restricted to Farmer accounts. Please sign in with a Farmer profile.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{labels.title}</h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                SQLite Verified Ledger
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{labels.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleReadSummary}
            disabled={!summary}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            {labels.readAloud}
          </button>
          <button
            type="button"
            onClick={handleSyncModules}
            disabled={busy}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            Sync Modules
          </button>
          <button
            type="button"
            onClick={() => downloadFinanceCsv(farmId, token)}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 inline-flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setTxType('expense');
              setTxCategory('fertilizers');
              setTxStatus('recorded');
              setShowAddForm(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Primary KPI Grid */}
      {summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>{labels.budget}</span>
                <Wallet className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
                ₹{summary.allocated_budget_inr.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    budgetUtilizationPct > 100 ? 'bg-red-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, budgetUtilizationPct)}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-500 mt-1.5">
                {labels.remainingBudget}:{' '}
                <strong className={summary.remaining_budget_inr < 0 ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}>
                  ₹{summary.remaining_budget_inr.toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>{labels.recordedExp}</span>
                <IndianRupee className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                ₹{summary.actual_recorded_expenses_inr.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1.5">
                {labels.committedExp}: <strong>₹{summary.committed_expenses_inr.toLocaleString('en-IN')}</strong>
              </div>
              {summary.estimated_cultivation_investment_inr > 0 && (
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Est. BioIntel Plan: ₹{summary.estimated_cultivation_investment_inr.toLocaleString('en-IN')}
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>{labels.confirmedSales}</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                ₹{summary.confirmed_sales_value_inr.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1.5">
                {labels.receivedPayments}: <strong>₹{summary.received_payments_inr.toLocaleString('en-IN')}</strong>
              </div>
              <div className="text-[11px] text-amber-600 mt-0.5">
                {labels.outstanding}: <strong>₹{summary.outstanding_payments_inr.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                <span>{labels.realizedProfit}</span>
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div
                className={`text-2xl font-bold mt-1 ${
                  summary.realized_net_profit_inr >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                ₹{summary.realized_net_profit_inr.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1.5">
                Est. Profit (Confirmed Sales): <strong>₹{summary.estimated_net_profit_inr.toLocaleString('en-IN')}</strong>
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                ROI: <strong>{summary.projected_roi_pct}%</strong> | {labels.breakEven}:{' '}
                <strong>{summary.break_even_price_per_kg !== null ? `₹${summary.break_even_price_per_kg}/kg` : 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'overview' as const, label: '1. Analytics & Recommendations' },
                { id: 'ledger' as const, label: '2. Transaction Ledger & Buyer Orders' },
                { id: 'simulator' as const, label: '3. Monte Carlo Risk & What-If Simulator' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    activeTab === t.id
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleLoadJuryDemo}
              disabled={busy}
              className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100"
            >
              Load Jury Demo Lifecycle (₹55k / ₹1L)
            </button>
          </div>

          {/* TAB 1: OVERVIEW & CHARTS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
                    Expense Category Distribution (INR)
                  </h2>
                  {summary.expense_breakdown.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.expense_breakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                          <Bar dataKey="amount_inr" name="Expense (INR)" fill="#059669" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
                      No expenses recorded yet for this farm. Add an entry or sync modules.
                    </div>
                  )}
                </div>

                <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
                    Cash Flow Timeline (Settled Income vs Expenditure)
                  </h2>
                  {summary.cashflow_series.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.cashflow_series}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} />
                          <Legend />
                          <Area type="monotone" dataKey="income" name="Received Income" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                          <Area type="monotone" dataKey="expense" name="Recorded Expense" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
                      Cash flow timeline will appear once transactions are recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Deterministic Financial Recommendations */}
              <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Intelligent Financial Recommendations (Data-Driven)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {summary.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-xs ${
                        rec.severity === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
                          : rec.severity === 'positive'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <div className="font-bold">{rec.title}</div>
                      <p className="mt-1 opacity-90">{rec.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTION LEDGER & CONFIRMED ORDERS */}
          {activeTab === 'ledger' && (
            <div className="space-y-6">
              {/* Confirmed Purchase Orders & Settlement Tracking */}
              <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Confirmed Purchase Orders &amp; Payment Settlements (Smart Bidding)
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      Confirmed sales remain outstanding until you record payments actually received from the buyer.
                    </p>
                  </div>
                </div>
                {summary.confirmed_orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        <tr>
                          <th className="py-2 pr-3">Crop &amp; Buyer</th>
                          <th className="py-2 pr-3">Qty × Price</th>
                          <th className="py-2 pr-3">Confirmed Value</th>
                          <th className="py-2 pr-3">Received</th>
                          <th className="py-2 pr-3">Outstanding</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 text-right print:hidden">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {summary.confirmed_orders.map((ord) => (
                          <tr key={ord.order_id}>
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold text-zinc-900 dark:text-white">{ord.crop_name}</div>
                              <div className="text-[11px] text-zinc-500">{ord.buyer_name} ({ord.order_id})</div>
                            </td>
                            <td className="py-2.5 pr-3">
                              {ord.quantity_kg.toLocaleString('en-IN')} kg × ₹{ord.price_per_kg}/kg
                            </td>
                            <td className="py-2.5 pr-3 font-semibold">
                              ₹{ord.confirmed_value_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 pr-3 text-emerald-700 dark:text-emerald-400 font-semibold">
                              ₹{ord.amount_received_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 pr-3 text-amber-600 font-semibold">
                              ₹{ord.outstanding_balance_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  ord.payment_status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ord.payment_status === 'partial'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {ord.payment_status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right print:hidden">
                              {ord.outstanding_balance_inr > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPayingOrder(ord);
                                    setPayAmount(String(ord.outstanding_balance_inr));
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-800 text-white text-[11px] font-semibold hover:bg-emerald-900"
                                >
                                  Record Payment
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No confirmed produce purchase orders found for this farm.</p>
                )}
              </div>

              {/* Filter & Ledger Table */}
              <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Persistent Financial Transaction Ledger ({transactions.length})
                  </h2>
                  <div className="flex flex-wrap gap-2 print:hidden">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search description..."
                        className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                    >
                      <option value="all">All Types</option>
                      <option value="expense">Expenses</option>
                      <option value="income">Income</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                    >
                      <option value="all">All Statuses</option>
                      <option value="settled">Settled</option>
                      <option value="recorded">Recorded</option>
                      <option value="committed">Committed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs"
                    />
                  </div>
                </div>

                {transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                        <tr>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Category &amp; Source</th>
                          <th className="py-2 pr-3">Description</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3 text-right">Amount</th>
                          <th className="py-2 text-right print:hidden">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="py-2.5 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                              {tx.tx_date}
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className="font-semibold text-zinc-900 dark:text-white capitalize">
                                {tx.category.replace(/_/g, ' ')}
                              </div>
                              <div className="text-[11px] text-zinc-500">{tx.source_module}</div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <div>{tx.description}</div>
                              {tx.payment_reference && (
                                <div className="text-[10px] text-zinc-400">Ref: {tx.payment_reference}</div>
                              )}
                            </td>
                            <td className="py-2.5 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                  tx.status === 'settled' || tx.status === 'recorded'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : tx.status === 'committed'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td
                              className={`py-2.5 pr-3 text-right font-bold whitespace-nowrap ${
                                tx.tx_type === 'income' ? 'text-emerald-600' : 'text-zinc-900 dark:text-white'
                              }`}
                            >
                              {tx.tx_type === 'income' ? '+' : '-'}₹{tx.amount_inr.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 text-right print:hidden">
                              {tx.is_manual === 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTx(tx);
                                    setTxType(tx.tx_type);
                                    setTxCategory(tx.category);
                                    setTxAmount(String(tx.amount_inr));
                                    setTxDate(tx.tx_date);
                                    setTxDesc(tx.description);
                                    setTxStatus(tx.status === 'cancelled' ? 'recorded' : (tx.status as any));
                                    setTxRef(tx.payment_reference || '');
                                    setShowAddForm(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                                  aria-label="Edit transaction"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No financial transactions match the selected filters.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MONTE CARLO RISK & WHAT-IF SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monte Carlo Risk Intelligence */}
              <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Monte Carlo Financial Risk Intelligence
                    </h2>
                    <p className="text-[11px] text-zinc-500">
                      1,000 stochastic trials seeded from your actual recorded costs (future outcomes are estimates).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRunMonteCarlo}
                    disabled={mcLoading}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                  >
                    {mcLoading ? 'Running...' : 'Run 1,000-Trial Risk'}
                  </button>
                </div>

                {mcResult ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
                        <div className="text-[11px] text-red-700 dark:text-red-300">Pessimistic (P10)</div>
                        <div className="text-sm font-bold text-red-800 dark:text-red-200">
                          ₹{Math.round(mcResult.results.monte_carlo.p10_downside_profit_inr).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                        <div className="text-[11px] text-blue-700 dark:text-blue-300">Expected (P50)</div>
                        <div className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          ₹{Math.round(mcResult.results.monte_carlo.median_p50_profit_inr).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Optimistic (P90)</div>
                        <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                          ₹{Math.round(mcResult.results.monte_carlo.p90_upside_profit_inr).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      Estimated Loss Probability:{' '}
                      <strong>{mcResult.results.monte_carlo.loss_probability_pct}%</strong> | Modeled Break-Even:{' '}
                      <strong>₹{mcResult.results.deterministic.break_even_price_inr_per_t}/tonne</strong>
                    </div>
                    <div className="text-[11px] text-zinc-400 italic">
                      Model-based stochastic estimate, not a guaranteed market outcome.
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-500 text-center">
                    Click &quot;Run 1,000-Trial Risk&quot; to simulate yield and market price volatility against your costs.
                  </div>
                )}
              </div>

              {/* What-If Economic Simulator */}
              <div className="p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600" />
                    What-If Economic Simulator (Sandbox Only)
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Adjust parameters below to compare scenarios without modifying your real financial ledger.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-zinc-500">Saleable Yield (kg)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfYieldKg}
                      onChange={(e) => setWhatIfYieldKg(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-500">Selling Price (₹/kg)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfPricePerKg}
                      onChange={(e) => setWhatIfPricePerKg(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-500">Cultivation + Seed (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfCultivation}
                      onChange={(e) => setWhatIfCultivation(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-500">Labour Cost (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfLabour}
                      onChange={(e) => setWhatIfLabour(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-500">Transport Cost (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfTransport}
                      onChange={(e) => setWhatIfTransport(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-500">Storage Cost (₹)</span>
                    <input
                      type="number"
                      min={0}
                      value={whatIfStorage}
                      onChange={(e) => setWhatIfStorage(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    />
                  </label>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-zinc-500">Simulated Cost</div>
                    <div className="font-bold">₹{whatIfCalc.totalCost.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Projected Revenue</div>
                    <div className="font-bold">₹{whatIfCalc.grossRevenue.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <div className="text-zinc-500">Projected Profit</div>
                    <div className={`font-bold ${whatIfCalc.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      ₹{whatIfCalc.netProfit.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500">ROI / Break-Even</div>
                    <div className="font-bold">
                      {whatIfCalc.roiPct.toFixed(1)}% /{' '}
                      {whatIfCalc.breakEven !== null ? `₹${whatIfCalc.breakEven.toFixed(2)}/kg` : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && !summary && (
        <div className="p-8 text-center text-xs text-zinc-500">Loading farm financial ledger...</div>
      )}

      {/* Add / Edit Transaction Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTransaction}
            className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {editingTx ? 'Edit Manual Transaction' : 'Record Financial Transaction'}
            </h3>

            {!editingTx && (
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTxType(t);
                      setTxCategory(t === 'expense' ? 'fertilizers' : 'produce_sale');
                    }}
                    className={`py-2 rounded-xl text-xs font-semibold border capitalize ${
                      txType === t
                        ? 'bg-emerald-800 text-white border-emerald-800'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="font-semibold">Category</span>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                >
                  {(txType === 'expense' ? EXPENSE_CATEGORY_OPTIONS : INCOME_CATEGORY_OPTIONS).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold">Amount (INR)</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1">
                <span className="font-semibold">Date</span>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </label>
              <label className="space-y-1">
                <span className="font-semibold">Status</span>
                <select
                  value={txStatus}
                  onChange={(e) => setTxStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                >
                  <option value="recorded">Recorded</option>
                  <option value="settled">Settled / Paid</option>
                  <option value="committed">Committed</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="font-semibold">Description</span>
              <input
                type="text"
                required
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                placeholder="e.g. Urea & DAP fertilizers for Tomato plot"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </label>

            <label className="block space-y-1 text-xs">
              <span className="font-semibold">Payment Reference (Optional)</span>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="Receipt # or UPI Ref"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingTx(null);
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
              >
                {busy ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Buyer Order Payment Modal */}
      {payingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordOrderPayment}
            className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Record Buyer Payment Received
            </h3>
            <p className="text-xs text-zinc-500">
              Order <strong>{payingOrder.order_id}</strong> ({payingOrder.crop_name} — {payingOrder.buyer_name}).
              Outstanding balance: <strong>₹{payingOrder.outstanding_balance_inr.toLocaleString('en-IN')}</strong>
            </p>
            <label className="block space-y-1 text-xs">
              <span className="font-semibold">Amount Received (INR)</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={payingOrder.outstanding_balance_inr}
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </label>
            <label className="block space-y-1 text-xs">
              <span className="font-semibold">Receipt / Reference</span>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="e.g. APMC Slip / Cash / Bank Ref"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayingOrder(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
              >
                {busy ? 'Recording...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
