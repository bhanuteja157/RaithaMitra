// frontend/src/components/biointel/BioIntelNurseryFinder.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { fetchNearbyNurseries, fetchNurseryProducts } from '@/lib/biointelApi';
import { localizeCropName, formatLocalizedCurrency, localizeAvailability } from '@/lib/translations';
import { Nursery, NurseryProduct, Language } from '@/types';
import {
  Store,
  MapPin,
  Phone,
  ExternalLink,
  CheckCircle2,
  RotateCw,
  MessageCircle,
  Navigation,
  AlertCircle,
} from 'lucide-react';

const NURSERY_FINDER_I18N: Record<Language, {
  title: string; subtitle: string; km10: string; km25: string; km50: string; km100: string;
  refresh: string; selCrop: string; selVar: string; recLabel: string; seedNeeded: string;
  farmLoc: string; budget: string; errMsg: string; noFound: string; openFull: string;
  matchingTitle: string; demoData: string; googlePlaces: string; directInv: string;
  priceOnInq: string; supplier: string; nearbyTitle: string; fullFilters: string;
  verified: string; livePlaces: string; demo: string; call: string; whatsapp: string; directions: string;
}> = {
  en: {
    title: '3. Find Nearby Nurseries & Seed Suppliers', subtitle: 'Automatically prefilled from your crop plan — no re-entry needed.',
    km10: 'Within 10 km', km25: 'Within 25 km', km50: 'Within 50 km', km100: 'Within 100 km',
    refresh: 'Refresh', selCrop: 'Selected Crop', selVar: 'Selected Variety', recLabel: 'Recommended',
    seedNeeded: 'Seed Needed', farmLoc: 'Farm Location', budget: 'Budget',
    errMsg: 'Unable to reach nursery supplier service right now.',
    noFound: 'No live nursery suppliers found nearby for', openFull: 'Open Full Nursery & Seed Directory',
    matchingTitle: 'Matching Seeds & Bio-Inputs', demoData: 'Demo Data', googlePlaces: 'Google Places', directInv: 'Direct Inventory',
    priceOnInq: 'Price on inquiry', supplier: 'Supplier:', nearbyTitle: 'Nearby Nurseries', fullFilters: 'Full Nursery Filters',
    verified: 'Verified', livePlaces: 'Live Places', demo: 'Demo', call: 'Call', whatsapp: 'WhatsApp', directions: 'Directions',
  },
  kn: {
    title: '3. ಹತ್ತಿರದ ನರ್ಸರಿ ಮತ್ತು ಬೀಜ ಮಾರಾಟಗಾರರನ್ನು ಹುಡುಕಿ', subtitle: 'ನಿಮ್ಮ ಬೆಳೆ ಯೋಜನೆಯಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ತುಂಬಲಾಗಿದೆ.',
    km10: '10 ಕಿ.ಮೀ ಒಳಗೆ', km25: '25 ಕಿ.ಮೀ ಒಳಗೆ', km50: '50 ಕಿ.ಮೀ ಒಳಗೆ', km100: '100 ಕಿ.ಮೀ ಒಳಗೆ',
    refresh: 'ನವೀಕರಿಸಿ', selCrop: 'ಆಯ್ಕೆಮಾಡಿದ ಬೆಳೆ', selVar: 'ಆಯ್ಕೆಮಾಡಿದ ತಳಿ', recLabel: 'ಶಿಫಾರಸು ತಳಿ',
    seedNeeded: 'ಬೇಕಾಗುವ ಬೀಜ', farmLoc: 'ಜಮೀನಿನ ಸ್ಥಳ', budget: 'ಬಜೆಟ್',
    errMsg: 'ನರ್ಸರಿ ಸೇವೆಯನ್ನು ಈಗ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ.',
    noFound: 'ಹತ್ತಿರದಲ್ಲಿ ಯಾವುದೇ ನರ್ಸರಿ ಮಾರಾಟಗಾರರು ಕಂಡುಬಂದಿಲ್ಲ:', openFull: 'ಸಂಪೂರ್ಣ ನರ್ಸರಿ ಪಟ್ಟಿಯನ್ನು ತೆರೆಯಿರಿ',
    matchingTitle: 'ಲಭ್ಯವಿರುವ ಬೀಜ ಮತ್ತು ಜೈವಿಕ ಉತ್ಪನ್ನಗಳು', demoData: 'ಡೆಮೊ ಮಾಹಿತಿ', googlePlaces: 'ಗೂಗಲ್ ಪ್ಲೇಸಸ್', directInv: 'ನೇರ ದಾಸ್ತಾನು',
    priceOnInq: 'ಬೆಲೆ ವಿಚಾರಿಸಿ', supplier: 'ಮಾರಾಟಗಾರರು:', nearbyTitle: 'ಹತ್ತಿರದ ನರ್ಸರಿಗಳು', fullFilters: 'ಎಲ್ಲಾ ಫಿಲ್ಟರ್‌ಗಳು',
    verified: 'ಪರಿಶೀಲಿತ', livePlaces: 'ನೇರ ಸ್ಥಳಗಳು', demo: 'ಡೆಮೊ', call: 'ಕರೆ ಮಾಡಿ', whatsapp: 'ವಾಟ್ಸಾಪ್', directions: 'ದಾರಿ ನೋಡಿ',
  },
  hi: {
    title: '3. नज़दीकी नर्सरी व बीज विक्रेता खोजें', subtitle: 'आपकी फसल योजना से स्वतः भरा गया — दोबारा भरने की आवश्यकता नहीं।',
    km10: '10 किमी के भीतर', km25: '25 किमी के भीतर', km50: '50 किमी के भीतर', km100: '100 किमी के भीतर',
    refresh: 'ताज़ा करें', selCrop: 'चुनी गई फसल', selVar: 'चुनी गई किस्म', recLabel: 'अनुशंसित',
    seedNeeded: 'आवश्यक बीज', farmLoc: 'खेत का स्थान', budget: 'बजट',
    errMsg: 'नर्सरी सेवा अभी उपलब्ध नहीं है।',
    noFound: 'आसपास कोई नर्सरी विक्रेता नहीं मिला:', openFull: 'पूरी नर्सरी निर्देशिका खोलें',
    matchingTitle: 'मिलान वाले बीज व जैव-उत्पाद', demoData: 'डेमो डेटा', googlePlaces: 'गूगल प्लेसेस', directInv: 'सीधा स्टॉक',
    priceOnInq: 'दाम पूछें', supplier: 'विक्रेता:', nearbyTitle: 'नज़दीकी नर्सरी', fullFilters: 'सभी फ़िल्टर',
    verified: 'सत्यापित', livePlaces: 'लाइव स्थान', demo: 'डेमो', call: 'कॉल करें', whatsapp: 'व्हाट्सऐप', directions: 'दिशा देखें',
  },
  te: {
    title: '3. సమీప నర్సరీలు & విత్తన డీలర్లను కనుగొనండి', subtitle: 'మీ పంట ప్రణాళిక నుండి ఆటోమేటిక్‌గా నింపబడింది.',
    km10: '10 కి.మీ లోపు', km25: '25 కి.మీ లోపు', km50: '50 కి.మీ లోపు', km100: '100 కి.మీ లోపు',
    refresh: 'రిఫ್ರెష్', selCrop: 'ఎంచుకున్న పంట', selVar: 'ఎంచుకున్న రకం', recLabel: 'సిఫార్సు రకం',
    seedNeeded: 'అవసరమైన విత్తనం', farmLoc: 'పొలం స్థానం', budget: 'బడ్జెట్',
    errMsg: 'నర్సరీ సేవ ప్రస్తుతం అందుబాటులో లేదు.',
    noFound: 'సమీపంలో నర్సరీ డీలర్లు కనుగొనబడలేదు:', openFull: 'పూర్తి నర్సరీ డైరెక్టరీ తెరవండి',
    matchingTitle: 'సరిపోయే విత్తనాలు & బయో-ఉత్పత్తులు', demoData: 'డెమో డేటా', googlePlaces: 'గూగుల్ ప్లేసెస్', directInv: 'నేరుగా స్టాక్',
    priceOnInq: 'ధర కనుక్కోండి', supplier: 'డీలర్:', nearbyTitle: 'సమీప నర్సరీలు', fullFilters: 'అన్ని ఫిల్టర్లు',
    verified: 'ధృవీకరించబడింది', livePlaces: 'లైవ్ స్థలాలు', demo: 'డెమో', call: 'కాల్ చేయండి', whatsapp: 'వాట్సాప్', directions: 'దారి చూడండి',
  },
};

interface BioIntelNurseryFinderProps {
  crop: string;
  varietyName: string;
  requiredSeedKg: number;
  budgetInr: number;
}

export function BioIntelNurseryFinder({
  crop,
  varietyName,
  requiredSeedKg,
  budgetInr,
}: BioIntelNurseryFinderProps) {
  const { currentFarm, language } = useFarm();
  const L = NURSERY_FINDER_I18N[language] || NURSERY_FINDER_I18N.en;
  const lat = currentFarm?.latitude ?? 13.3409;
  const lon = currentFarm?.longitude ?? 77.101;
  const locationLabel = currentFarm
    ? `${currentFarm.village || ''}${currentFarm.village && currentFarm.district ? ', ' : ''}${currentFarm.district || ''}`
    : 'Tumakuru, Karnataka';

  const [nurseries, setNurseries] = useState<Nursery[]>([]);
  const [products, setProducts] = useState<NurseryProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);

  const loadSuppliers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [nRes, pRes] = await Promise.all([
        fetchNearbyNurseries(lat, lon, radiusKm),
        fetchNurseryProducts({ crop, query: varietyName || crop }),
      ]);
      setNurseries(Array.isArray(nRes) ? nRes : []);
      setProducts(Array.isArray(pRes) ? pRes : []);
    } catch {
      setErrorMsg(L.errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [crop, varietyName, lat, lon, radiusKm]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 sm:p-6 space-y-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              {L.title}
            </h3>
            <p className="text-xs text-zinc-500">
              {L.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            aria-label={L.km50}
            className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold bg-zinc-50 dark:bg-zinc-900"
          >
            <option value={10}>{L.km10}</option>
            <option value={25}>{L.km25}</option>
            <option value={50}>{L.km50}</option>
            <option value={100}>{L.km100}</option>
          </select>
          <button
            type="button"
            onClick={loadSuppliers}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {L.refresh}
          </button>
        </div>
      </div>

      {/* Prefilled Plan Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs">
        <div>
          <span className="text-zinc-500 block">{L.selCrop}</span>
          <strong className="text-emerald-900 dark:text-emerald-200">{localizeCropName(crop, language)}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{L.selVar}</span>
          <strong className="text-emerald-900 dark:text-emerald-200">{varietyName || L.recLabel}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{L.seedNeeded}</span>
          <strong>{requiredSeedKg} kg</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{L.farmLoc}</span>
          <strong className="truncate block">{locationLabel}</strong>
        </div>
        <div>
          <span className="text-zinc-500 block">{L.budget}</span>
          <strong>{formatLocalizedCurrency(budgetInr, language)}</strong>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : nurseries.length === 0 && products.length === 0 ? (
        <div className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center space-y-2 text-xs text-zinc-500">
          <p>{L.noFound} {localizeCropName(crop, language)} ({radiusKm} km).</p>
          <Link
            href={`/nursery-marketplace?crop=${encodeURIComponent(crop)}&query=${encodeURIComponent(varietyName || '')}`}
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
          >
            {L.openFull} <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Matching Seed & Bio-Input Products */}
          {products.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                {L.matchingTitle} ({products.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.slice(0, 4).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="text-sm text-zinc-900 dark:text-white">
                          {prod.variety_name || localizeCropName(prod.crop_name, language)}
                        </strong>
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {prod.data_source === 'demo_data'
                            ? L.demoData
                            : prod.data_source === 'google_places_supplier'
                              ? L.googlePlaces
                              : L.directInv}
                        </span>
                      </div>
                      <span className="font-bold text-emerald-700">
                        {prod.price_per_unit ? `₹${prod.price_per_unit}/${prod.pricing_unit}` : L.priceOnInq}
                      </span>
                    </div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {L.supplier} {prod.nursery_name || L.verified} ·{' '}
                      <span className="text-emerald-700 font-medium">
                        {localizeAvailability(prod.availability_status, language)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Nurseries */}
          {nurseries.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {L.nearbyTitle} ({nurseries.length})
                </span>
                <Link
                  href={`/nursery-marketplace?crop=${encodeURIComponent(crop)}&query=${encodeURIComponent(varietyName || '')}`}
                  className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  {L.fullFilters} <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nurseries.slice(0, 4).map((n) => {
                  const cleanPhone = (n.phone || '').replace(/[^\d+]/g, '');
                  const mapsUrl =
                    n.google_maps_uri ||
                    (n.latitude && n.longitude
                      ? `https://www.google.com/maps/dir/?api=1&destination=${n.latitude},${n.longitude}`
                      : undefined);
                  return (
                    <div
                      key={n.id}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm text-zinc-900 dark:text-white">{n.name}</strong>
                          <div className="text-zinc-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{n.address || n.district}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                          {n.is_verified && <CheckCircle2 className="w-3 h-3" />}
                          {n.data_source === 'demo_data'
                            ? L.demo
                            : n.data_source === 'google_places_supplier'
                              ? L.livePlaces
                              : L.verified}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {cleanPhone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold"
                          >
                            <Phone className="w-3 h-3" /> {L.call}
                          </a>
                        )}
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.replace(/^\+/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold"
                          >
                            <MessageCircle className="w-3 h-3" /> {L.whatsapp}
                          </a>
                        )}
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold"
                          >
                            <Navigation className="w-3 h-3" /> {L.directions}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
