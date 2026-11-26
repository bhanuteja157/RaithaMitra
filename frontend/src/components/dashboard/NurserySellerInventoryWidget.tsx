// frontend/src/components/dashboard/NurserySellerInventoryWidget.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFarm } from '@/context/FarmContext';
import { SmartLocationSelector } from '@/components/location/SmartLocationSelector';
import {
  fetchNurseryProducts,
  createNurseryProduct,
} from '@/lib/biointelApi';
import {
  NurseryProduct,
  NurseryProductCreate,
  SelectedLocation,
  Language,
} from '@/types';
import { localizeCropName, formatLocalizedCurrency } from '@/lib/translations';
import {
  Store,
  PlusCircle,
  MapPin,
  X,
} from 'lucide-react';

const NURSERY_WIDGET_I18N: Record<Language, {
  title: string; badge: string; sub: string; addNew: string; loading: string;
  colVar: string; colCrop: string; colCat: string; colPrice: string; colStock: string; colStatus: string;
  quote: string; inquire: string; units: string; buyerLocTitle: string; buyerLocSub: string;
  modalTitle: string; cropLbl: string; varLbl: string; priceLbl: string; stockLbl: string; descLbl: string; saveBtn: string;
}> = {
  en: {
    title: 'Nursery Seller Inventory', badge: 'Buyer & Nursery Module',
    sub: 'Manage certified seedlings stock, resistant seeds, and wholesale supplies',
    addNew: 'Add New Inventory', loading: 'Loading nursery stock items...',
    colVar: 'Variety / Product', colCrop: 'Crop', colCat: 'Category', colPrice: 'Price / Unit', colStock: 'Available Stock', colStatus: 'Status',
    quote: 'Quote', inquire: 'Inquire', units: 'units',
    buyerLocTitle: 'Buyer Procurement & Delivery Location',
    buyerLocSub: 'Set your warehouse or delivery point for nursery dispatch and freight estimation.',
    modalTitle: 'Add Inventory Listing', cropLbl: 'Crop Name', varLbl: 'Variety Name', priceLbl: 'Price (₹)', stockLbl: 'Available Stock', descLbl: 'Description', saveBtn: 'Save Product',
  },
  kn: {
    title: 'ನರ್ಸರಿ ಮಾರಾಟಗಾರರ ದಾಸ್ತಾನು', badge: 'ಖರೀದಿದಾರ / ನರ್ಸರಿ ವಿಭಾಗ',
    sub: 'ಪ್ರಮಾಣೀಕೃತ ಸಸಿಗಳು, ರೋಗ-ನಿರೋಧಕ ಬೀಜಗಳು ಮತ್ತು ಸಗಟು ದಾಸ್ತಾನು ನಿರ್ವಹಿಸಿ',
    addNew: 'ಹೊಸ ದಾಸ್ತಾನು ಸೇರಿಸಿ', loading: 'ನರ್ಸರಿ ದಾಸ್ತಾನು ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    colVar: 'ತಳಿ / ಉತ್ಪನ್ನ', colCrop: 'ಬೆಳೆ', colCat: 'ವಿಭಾಗ', colPrice: 'ಬೆಲೆ / ಘಟಕ', colStock: 'ಲಭ್ಯ ದಾಸ್ತಾನು', colStatus: 'ಸ್ಥಿತಿ',
    quote: 'ದರ ಕೇಳಿ', inquire: 'ವಿಚಾರಿಸಿ', units: 'ಘಟಕಗಳು',
    buyerLocTitle: 'ಖರೀದಿ ಮತ್ತು ವಿತರಣಾ ಸ್ಥಳ',
    buyerLocSub: 'ನರ್ಸರಿ ರವಾನೆ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚಕ್ಕಾಗಿ ನಿಮ್ಮ ಗೋದಾಮು ಅಥವಾ ವಿತರಣಾ ಸ್ಥಳವನ್ನು ನಿಗದಿಪಡಿಸಿ.',
    modalTitle: 'ಹೊಸ ಉತ್ಪನ್ನ ಸೇರಿಸಿ', cropLbl: 'ಬೆಳೆಯ ಹೆಸರು', varLbl: 'ತಳಿಯ ಹೆಸರು', priceLbl: 'ಬೆಲೆ (₹)', stockLbl: 'ಲಭ್ಯ ಪ್ರಮಾಣ', descLbl: 'ವಿವರಣೆ', saveBtn: 'ಉತ್ಪನ್ನ ಉಳಿಸಿ',
  },
  hi: {
    title: 'नर्सरी विक्रेता स्टॉक प्रबंधन', badge: 'खरीदार व नर्सरी मॉड्यूल',
    sub: 'प्रमाणित पौध, रोग-प्रतिरोधी बीज और थोक नर्सरी स्टॉक प्रबंधित करें',
    addNew: 'नया स्टॉक जोड़ें', loading: 'नर्सरी स्टॉक लोड हो रहा है...',
    colVar: 'किस्म / उत्पाद', colCrop: 'फसल', colCat: 'श्रेणी', colPrice: 'मूल्य / इकाई', colStock: 'उपलब्ध स्टॉक', colStatus: 'स्थिति',
    quote: 'कोटेशन', inquire: 'पूछताछ करें', units: 'इकाइयाँ',
    buyerLocTitle: 'खरीद और डिलीवरी स्थान',
    buyerLocSub: 'नर्सरी प्रेषण और माल भाड़े के लिए अपना गोदाम या डिलीवरी बिंदु चुनें।',
    modalTitle: 'नया स्टॉक जोड़ें', cropLbl: 'फसल का नाम', varLbl: 'किस्म का नाम', priceLbl: 'कीमत (₹)', stockLbl: 'उपलब्ध मात्रा', descLbl: 'विवरण', saveBtn: 'उत्पाद सहेजें',
  },
  te: {
    title: 'నర్సరీ విక్రేత స్టాక్ వివరాలు', badge: 'కొనుగోలుదారు & నర్సరీ విభాగం',
    sub: 'ధృవీకరించబడిన నారు, వ్యాధి-నిరోధక విత్తనాలు మరియు హోల్‌సేల్ స్టాక్ నిర్వహించండి',
    addNew: 'కొత్త స్టాక్ చేర్చండి', loading: 'నర్సరీ స్టాక్ లోడ్ అవుతోంది...',
    colVar: 'రకం / ఉత్పత్తి', colCrop: 'పంట', colCat: 'వర్గం', colPrice: 'ధర / యూనిట్', colStock: 'అందుబాటు స్టాక్', colStatus: 'స్థితి',
    quote: 'కోట్', inquire: 'అడగండి', units: 'యూనిట్లు',
    buyerLocTitle: 'కొనుగోలు & డెలివరీ స్థానం',
    buyerLocSub: 'నర్సరీ రవాణా మరియు కిరాయి అంచనా కోసం మీ గోదాము స్థానాన్ని ఎంచుకోండి.',
    modalTitle: 'కొత్త ఉత్పత్తిని చేర్చండి', cropLbl: 'పంట పేరు', varLbl: 'రకం పేరు', priceLbl: 'ధర (₹)', stockLbl: 'అందుబాటు పరిమాణం', descLbl: 'వివరణ', saveBtn: 'ఉత్పత్తిని సేవ్ చేయండి',
  },
};

export function NurserySellerInventoryWidget() {
  const { language, t, currentUser } = useFarm();
  const L = NURSERY_WIDGET_I18N[language] || NURSERY_WIDGET_I18N.en;
  const buyerLocKey = `rm_buyer_location_${currentUser?.id || 'default'}`;
  const [buyerLocation, setBuyerLocation] = useState<SelectedLocation | null>(null);
  const [products, setProducts] = useState<NurseryProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState<NurseryProductCreate>({
    nursery_id: 'nursery_demo_01',
    crop_name: 'Tomato',
    variety_name: '',
    biotechnology_category: 'disease_resistant_varieties',
    description: '',
    price_per_unit: 1.25,
    pricing_unit: 'per_seedling',
    available_quantity: 15000,
    minimum_order_quantity: 500,
    certification_info: 'ICAR-IIHR Certified True-to-Type',
    availability_status: 'in_stock',
  });

  const loadSellerProducts = async () => {
    setIsLoading(true);
    try {
      const prods = await fetchNurseryProducts({});
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load seller products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerProducts();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(buyerLocKey);
      if (raw) {
        setBuyerLocation(JSON.parse(raw));
      }
    } catch {
      // ignore malformed local storage
    }
  }, [buyerLocKey]);

  const handleConfirmBuyerLocation = (loc: SelectedLocation) => {
    setBuyerLocation(loc);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(buyerLocKey, JSON.stringify(loc));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createNurseryProduct(newProduct);
      setShowAddModal(false);
      loadSellerProducts();
    } catch (err) {
      console.error('Add product error:', err);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {L.title}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                {L.badge}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              {L.sub}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-white font-semibold text-xs rounded-xl transition shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> {L.addNew}
        </button>
      </div>

      {isLoading ? (
        <div className="p-6 text-center text-xs text-zinc-400">{L.loading}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">{L.colVar}</th>
                <th className="p-3">{L.colCrop}</th>
                <th className="p-3">{L.colCat}</th>
                <th className="p-3">{L.colPrice}</th>
                <th className="p-3">{L.colStock}</th>
                <th className="p-3">{L.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {products.slice(0, 5).map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="p-3 font-semibold text-zinc-900 dark:text-white">
                    {p.variety_name}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">{localizeCropName(p.crop_name, language)}</td>
                  <td className="p-3 text-zinc-500">{p.biotechnology_category}</td>
                  <td className="p-3 font-bold text-emerald-600">
                    {p.price_per_unit ? `${formatLocalizedCurrency(p.price_per_unit, language)} / ${p.pricing_unit}` : L.quote}
                  </td>
                  <td className="p-3 text-zinc-600 dark:text-zinc-300">
                    {p.available_quantity ? `${p.available_quantity.toLocaleString('en-IN')} ${L.units}` : L.inquire}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {p.availability_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buyer Delivery / Procurement Location Selector */}
      <div className="pt-2 space-y-2">
        {buyerLocation && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              {buyerLocation.village}, {buyerLocation.district}, {buyerLocation.state}
            </span>
            <span className="font-mono text-[11px]">
              {buyerLocation.latitude.toFixed(5)}, {buyerLocation.longitude.toFixed(5)}
              {buyerLocation.location_accuracy_m ? ` (±${buyerLocation.location_accuracy_m}m)` : ''}
            </span>
          </div>
        )}
        <SmartLocationSelector
          role="buyer"
          compactMap={true}
          initialLocation={buyerLocation || undefined}
          title={L.buyerLocTitle}
          subtitle={L.buyerLocSub}
          onConfirmLocation={handleConfirmBuyerLocation}
        />
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {L.modalTitle}
              </h3>
              <button onClick={() => setShowAddModal(false)} aria-label={t('close')} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">{L.cropLbl}</label>
                <input
                  type="text"
                  required
                  value={newProduct.crop_name}
                  onChange={(e) => setNewProduct({ ...newProduct, crop_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">{L.varLbl}</label>
                <input
                  type="text"
                  required
                  placeholder="Arka Rakshak F1"
                  value={newProduct.variety_name}
                  onChange={(e) => setNewProduct({ ...newProduct, variety_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">{L.priceLbl}</label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={newProduct.price_per_unit || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, price_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">{L.stockLbl}</label>
                  <input
                    type="number"
                    required
                    value={newProduct.available_quantity || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, available_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-zinc-600 dark:text-zinc-400">{L.descLbl}</label>
                <textarea
                  rows={2}
                  required
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-800 text-white font-semibold rounded-xl"
                >
                  {L.saveBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
