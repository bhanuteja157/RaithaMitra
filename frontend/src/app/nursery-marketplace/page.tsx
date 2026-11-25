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
  ProcurementOption,
  ProcurementOptimizationResponse,
  SupplierComparisonResponse,
  BiotechCategoryType,
} from '@/types';
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
  const { currentFarm } = useFarm();

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
        alert('You can compare a maximum of 4 suppliers at a time.');
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
                  Intelligent Nursery & Bio-Input Marketplace
                </h1>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Feature 18
                </span>
              </div>
              <p className="text-xs sm:text-sm text-green-100/80">
                Verified regional nurseries, Google Places discovery, and deterministic procurement optimization
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
              Compare ({selectedProductIds.length})
            </button>
          )}

          {/* Seller Inventory Management Shortcut (Buyer Dashboard Integration) */}
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition border border-white/20"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            Seller Inventory Portal
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
                Deterministic Procurement Calculator & Budget Optimizer
              </h2>
              <p className="text-xs text-zinc-500">
                Mathematical optimization: Landed Cost = (Quantity × Unit Price) + [Base Freight + (Distance × Rate)]
              </p>
            </div>
          </div>
          <button
            onClick={() => setCalculatorOpen(!calculatorOpen)}
            className="text-xs font-semibold text-zinc-500 hover:underline"
          >
            {calculatorOpen ? 'Collapse Calculator' : 'Expand Calculator'}
          </button>
        </div>

        {calculatorOpen && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Target Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="Tomato">Tomato</option>
                  <option value="Chilli">Chilli</option>
                  <option value="Banana">Banana</option>
                  <option value="Mango">Mango</option>
                  <option value="Rice">Rice</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                  Required Planting Units (Seedlings / Saplings / kg)
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
                  Farmer Allocated Budget (₹)
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
                  Calculate Expenses
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
                      Recommended Optimal Option
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                      Suitability: {calcResult.optimal_option.suitability_score}/100
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        calcResult.optimal_option.is_budget_feasible
                          ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100'
                          : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                      }`}
                    >
                      {calcResult.optimal_option.is_budget_feasible
                        ? `Within Budget (Surplus ₹${calcResult.optimal_option.budget_surplus_or_deficit?.toLocaleString('en-IN')})`
                        : `Exceeds Budget (Deficit ₹${Math.abs(calcResult.optimal_option.budget_surplus_or_deficit || 0).toLocaleString('en-IN')})`}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    {calcResult.optimal_option.variety_name} from {calcResult.optimal_option.nursery_name}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {calcResult.optimal_option.recommendation_rationale}
                  </p>
                </div>

                <div className="text-right text-xs shrink-0 self-end md:self-auto space-y-1">
                  <div className="text-xs text-zinc-500">
                    Planting: ₹{calcResult.optimal_option.planting_material_cost?.toLocaleString('en-IN')} + Transport: ₹{calcResult.optimal_option.transportation_cost?.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    Total: ₹{calcResult.optimal_option.total_procurement_cost?.toLocaleString('en-IN')}
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <a
                      href={`tel:${calcResult.optimal_option.phone_number}`}
                      className="px-3 py-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold rounded-lg text-xs hover:opacity-90 transition flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" /> Call Nursery
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
              Searching near:{' '}
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
            {showLocationFilter ? 'Hide Location Selector' : 'Change Search Location'}
          </button>
        </div>

        {showLocationFilter && (
          <div className="pt-1 pb-2">
            <SmartLocationSelector
              role="farmer"
              compactMap={true}
              title="Nursery Discovery Search Location"
              subtitle="Select a search center to recalculate nursery distances and freight."
              confirmLabel="Apply Search Location"
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
              placeholder="Search variety, biofertilizer, seed..."
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
                  {cat.label}
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
                  Search Radius: {r} km
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Max Price (₹)"
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
              In Stock Only
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 1: NEARBY SUPPLIERS (Google Places New API + Demo Network) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Nearby Agricultural Nurseries & Suppliers
            </h2>
            <span className="text-xs text-zinc-500">
              (within {selectedRadius} km of current location)
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
            <span>*Google Places results do not confirm live stock</span>
            <a
              href="https://nhb.gov.in/nnp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-400 font-semibold hover:underline flex items-center gap-1"
            >
              Verify on National Nursery Portal (NHB) <ExternalLink className="w-3 h-3" />
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
                      <span title="Verified Nursery">
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
                  {n.distance_km !== undefined ? `${n.distance_km} km (straight-line est.)` : 'Regional'}
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {n.data_source === 'google_places_supplier' ? 'Google Places Discovery' : 'Demo Certified Nursery'}
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
                    Directions <ExternalLink className="w-3 h-3" />
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
              Certified Biological Products & Planting Materials ({products.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            Select items to compare landed costs and certification
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-zinc-500 flex flex-col items-center gap-2">
            <RotateCw className="w-6 h-6 animate-spin text-green-700" />
            <p className="text-xs">Loading verified nursery inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <p className="text-sm font-semibold">No products match current filter criteria.</p>
            <p className="text-xs mt-1">Try expanding search radius or choosing "All Categories".</p>
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
                            {p.crop_name}
                          </span>
                          {p.is_demo && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Demo Data
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-400">
                            {p.distance_km !== undefined ? `${p.distance_km} km` : ''}
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
                            <div className="text-[10px] text-zinc-400">{p.pricing_unit}</div>
                          </>
                        ) : (
                          <span className="text-xs text-zinc-500">Contact Nursery</span>
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
                          Stock: {p.available_quantity ? `${p.available_quantity.toLocaleString('en-IN')} units` : 'Confirmation req.'}
                        </span>
                        <span>Min Order: {p.minimum_order_quantity}</span>
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
                      Compare
                    </label>

                    <button
                      onClick={() => setActiveInquiryProduct(p)}
                      className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Inquire Availability
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
                  Supplier Side-by-Side Comparison Matrix
                </h3>
                <p className="text-xs text-zinc-500">
                  Landed cost calculated for {calcQuantity.toLocaleString('en-IN')} units against budget of ₹{calcBudget.toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
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
                      Suitability: {item.suitability_score}/100
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{item.variety_name}</h4>
                    <p className="text-zinc-500">{item.nursery_name} ({item.distance_km} km)</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Unit Price:</span>
                      <span className="font-semibold">{item.price_per_unit ? `₹${item.price_per_unit}` : 'Quote'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Planting Cost:</span>
                      <span className="font-semibold">₹{item.planting_material_cost?.toLocaleString('en-IN') || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Logistics Freight:</span>
                      <span className="font-semibold">₹{item.transportation_cost?.toLocaleString('en-IN') || '-'}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-700 pt-1 text-sm font-bold">
                      <span>Total Landed:</span>
                      <span className="text-emerald-700 dark:text-emerald-400">
                        ₹{item.total_procurement_cost?.toLocaleString('en-IN') || '-'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 pt-1">
                      Certification: {item.certification_info || 'Standard Verified'}
                    </div>
                  </div>

                  <a
                    href={`tel:${item.phone_number}`}
                    className="w-full py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-center block text-xs"
                  >
                    Call {item.phone_number}
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
                  Send Inquiry to {activeInquiryProduct.nursery_name}
                </h3>
                <p className="text-xs text-zinc-500">
                  Request confirmed availability and quote for {activeInquiryProduct.variety_name}
                </p>
              </div>
              <button
                onClick={() => setActiveInquiryProduct(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inquirySubmitted ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">Inquiry Submitted Successfully!</h4>
                <p className="text-xs text-zinc-500">
                  {activeInquiryProduct.nursery_name} has received your inquiry. They will contact you shortly via phone.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Farmer Name</label>
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
                    <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Phone Number</label>
                    <input
                      type="text"
                      required
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Required Quantity</label>
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
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Intended Sowing Date</label>
                  <input
                    type="date"
                    value={inquiryDate}
                    onChange={(e) => setInquiryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Special Requirements / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Need delivery to farm gate; check root hardening..."
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Inquiry
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
                  Add Product to Nursery Inventory
                </h3>
                <p className="text-xs text-zinc-500">
                  Buyer Dashboard / Authorized Seller Capability
                </p>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Target Crop</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.crop_name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, crop_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Variety Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arka Rakshak F1"
                    value={newProductForm.variety_name}
                    onChange={(e) => setNewProductForm({ ...newProductForm, variety_name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Biotechnology Category</label>
                <select
                  value={newProductForm.biotechnology_category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, biotechnology_category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  {BIOTECH_CATEGORIES.filter((c) => c.id).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Price per Unit (₹)</label>
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
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Pricing Unit</label>
                  <select
                    value={newProductForm.pricing_unit}
                    onChange={(e) => setNewProductForm({ ...newProductForm, pricing_unit: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="per_seedling">per seedling</option>
                    <option value="per_sapling">per sapling</option>
                    <option value="per_kg">per kg</option>
                    <option value="per_liter">per liter</option>
                    <option value="per_packet_500g">per 500g packet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Available Quantity</label>
                  <input
                    type="number"
                    value={newProductForm.available_quantity || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, available_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Certification Info</label>
                  <input
                    type="text"
                    value={newProductForm.certification_info || ''}
                    onChange={(e) => setNewProductForm({ ...newProductForm, certification_info: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Save Product Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NurseryMarketplacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-zinc-400">Loading Marketplace...</div>}>
      <NurseryMarketplaceContent />
    </Suspense>
  );
}

