// frontend/src/app/transport/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFarm } from '@/context/FarmContext';
import { TransportVehicle, TransportBooking, Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import { loadOrderToTransportTransfer } from '@/lib/workflowBridge';
import PostHarvestPage from '@/app/post-harvest/page';
import {
  Truck,
  PlusCircle,
  MapPin,
  Clock,
  Coins,
  CheckCircle2,
  Sparkles,
  Phone,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Compass,
  Warehouse
} from 'lucide-react';

const TRANSPORT_I18N: Record<
  Language,
  {
    reqSuccessPrefix: string;
    statusUpdatedPrefix: string;
    transitionFailed: string;
    flagshipBadge: string;
    subtitle: string;
    title: string;
    desc: string;
    evalSharedBtn: string;
    tabBookTransport: string;
    tabPostHarvest: string;
    orToolsTitle: string;
    costReductionSuffix: string;
    indCostLabel: string;
    pooledCostLabel: string;
    totalSavingsLabel: string;
    capFillLabel: string;
    cargoTitle: string;
    cargoWeightLabel: string;
    produceTypeLabel: string;
    pickupLocLabel: string;
    destMarketLabel: string;
    eligibleVehiclesTitle: string;
    capacityGePrefix: string;
    kg: string;
    directDispatchNote: string;
    kmAway: string;
    regColon: string;
    operatingColon: string;
    payloadCap: string;
    estFareLabel: string;
    perKm: string;
    whatsappBtn: string;
    requestBookingBtn: string;
    activeBookingsTitle: string;
    tripPrefix: string;
    driverColon: string;
    vehicleColon: string;
    totalAgreedFare: string;
    stepRequested: string;
    stepAccepted: string;
    stepPickedUp: string;
    stepInTransit: string;
    stepDelivered: string;
    actAcceptTrip: string;
    actConfirmSched: string;
    actConfirmPicked: string;
    actStartTransit: string;
    actMarkDelivered: string;
    loadingText: string;
  }
> = {
  en: {
    reqSuccessPrefix: 'Transport booking requested with',
    statusUpdatedPrefix: 'Status updated to:',
    transitionFailed: 'Transition failed',
    flagshipBadge: 'Flagship Innovation #4',
    subtitle: 'Direct Farm-to-Mandi Logistics & OR-Tools Pooling',
    title: 'Transport Connect — Agricultural Logistics & Shared Fleet',
    desc: 'Eliminates transport middlemen. Filter vehicles with verified capacity for your cargo weight, compare transparent per-km rates, track trip milestones, and pool shared vehicles using OR-Tools routing.',
    evalSharedBtn: 'Evaluate Shared Load',
    tabBookTransport: 'Book Transport',
    tabPostHarvest: 'Post-Harvest & Storage',
    orToolsTitle: 'Google OR-Tools Collective Routing Result',
    costReductionSuffix: '% Cost Reduction',
    indCostLabel: 'Independent Cost',
    pooledCostLabel: 'Pooled Cost per Farmer',
    totalSavingsLabel: 'Total Savings',
    capFillLabel: 'Vehicle Capacity Fill',
    cargoTitle: 'Cargo Specifications & Route Setup',
    cargoWeightLabel: 'Cargo Weight (kg)',
    produceTypeLabel: 'Produce Type',
    pickupLocLabel: 'Pickup Location',
    destMarketLabel: 'Destination Market',
    eligibleVehiclesTitle: 'Eligible Goods Vehicles',
    capacityGePrefix: 'Capacity ≥',
    kg: 'kg',
    directDispatchNote: 'Direct farmer-driver dispatch',
    kmAway: 'km away',
    regColon: 'Reg:',
    operatingColon: 'Operating:',
    payloadCap: 'Payload Capacity',
    estFareLabel: 'Estimated Trip Fare (~60km)',
    perKm: '/km',
    whatsappBtn: 'WhatsApp',
    requestBookingBtn: 'Request Booking',
    activeBookingsTitle: 'Active Trip Bookings & Delivery Milestone Tracking',
    tripPrefix: 'Trip #',
    driverColon: 'Driver:',
    vehicleColon: 'Vehicle:',
    totalAgreedFare: 'Total Agreed Fare',
    stepRequested: '1. Requested',
    stepAccepted: '2. Accepted',
    stepPickedUp: '3. Picked Up',
    stepInTransit: '4. In Transit',
    stepDelivered: '5. Delivered',
    actAcceptTrip: 'Accept Trip',
    actConfirmSched: 'Confirm Schedule',
    actConfirmPicked: 'Confirm Picked Up',
    actStartTransit: 'Start Transit',
    actMarkDelivered: 'Mark Delivered',
    loadingText: 'Loading Transport Connect...',
  },
  kn: {
    reqSuccessPrefix: 'ಸಾರಿಗೆ ಬುಕಿಂಗ್ ವಿನಂತಿಸಲಾಗಿದೆ:',
    statusUpdatedPrefix: 'ಸ್ಥಿತಿ ನವೀಕರಿಸಲಾಗಿದೆ:',
    transitionFailed: 'ಸ್ಥಿತಿ ಬದಲಾವಣೆ ವಿಫಲವಾಗಿದೆ',
    flagshipBadge: 'ಪ್ರಮುಖ ಆವಿಷ್ಕಾರ #4',
    subtitle: 'ಜಮೀನಿನಿಂದ ಮಂಡಿಗೆ ನೇರ ಸಾರಿಗೆ ಮತ್ತು OR-Tools ಹಂಚಿಕೆ',
    title: 'ಸಾರಿಗೆ ಸಂಪರ್ಕ — ಕೃಷಿ ಸಾಗಾಣಿಕೆ ಮತ್ತು ಹಂಚಿಕೆಯ ವಾಹನಗಳು',
    desc: 'ಸಾರಿಗೆ ಮಧ್ಯವರ್ತಿಗಳನ್ನು ದೂರವಿಡುತ್ತದೆ. ನಿಮ್ಮ ಸರಕು ತೂಕಕ್ಕೆ ತಕ್ಕ ವಾಹನಗಳನ್ನು ಹುಡುಕಿ, ಪ್ರತಿ ಕಿ.ಮೀ ದರಗಳನ್ನು ಹೋಲಿಸಿ, ಟ್ರಿಪ್ ಹಂತಗಳನ್ನು ಗಮನಿಸಿ ಮತ್ತು ವಾಹನ ವೆಚ್ಚ ಹಂಚಿಕೊಳ್ಳಿ.',
    evalSharedBtn: 'ಹಂಚಿಕೆಯ ಲೋಡ್ ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ',
    tabBookTransport: 'ವಾಹನ ಬುಕ್ ಮಾಡಿ',
    tabPostHarvest: 'ಕೊಯ್ಲು ನಂತರ ಮತ್ತು ಶೇಖರಣೆ',
    orToolsTitle: 'Google OR-Tools ಸಾಮೂಹಿಕ ಮಾರ್ಗ ವಿಶ್ಲೇಷಣೆ',
    costReductionSuffix: '% ವೆಚ್ಚ ಕಡಿತ',
    indCostLabel: 'ವೈಯಕ್ತಿಕ ವೆಚ್ಚ',
    pooledCostLabel: 'ಪ್ರತಿ ರೈತನ ಹಂಚಿಕೆ ವೆಚ್ಚ',
    totalSavingsLabel: 'ಒಟ್ಟು ಉಳಿತಾಯ',
    capFillLabel: 'ವಾಹನ ಸಾಮರ್ಥ್ಯ ಭರ್ತಿ',
    cargoTitle: 'ಸರಕು ವಿವರಗಳು ಮತ್ತು ಮಾರ್ಗ ಸೆಟಪ್',
    cargoWeightLabel: 'ಸರಕು ತೂಕ (ಕೆಜಿ)',
    produceTypeLabel: 'ಬೆಳೆ ಪ್ರಕಾರ',
    pickupLocLabel: 'ಪಿಕಪ್ ಸ್ಥಳ',
    destMarketLabel: 'ತಲುಪಬೇಕಾದ ಮಾರುಕಟ್ಟೆ',
    eligibleVehiclesTitle: 'ಅರ್ಹ ಸರಕು ವಾಹನಗಳು',
    capacityGePrefix: 'ಸಾಮರ್ಥ್ಯ ≥',
    kg: 'ಕೆಜಿ',
    directDispatchNote: 'ರೈತ-ಚಾಲಕ ನೇರ ಸಂಪರ್ಕ',
    kmAway: 'ಕಿ.ಮೀ ದೂರದಲ್ಲಿ',
    regColon: 'ನೋಂದಣಿ:',
    operatingColon: 'ಪ್ರದೇಶ:',
    payloadCap: 'ಸಾಗಾಣಿಕೆ ಸಾಮರ್ಥ್ಯ',
    estFareLabel: 'ಅಂದಾಜು ಬಾಡಿಗೆ (~60 ಕಿ.ಮೀ)',
    perKm: '/ಕಿ.ಮೀ',
    whatsappBtn: 'WhatsApp',
    requestBookingBtn: 'ಬುಕಿಂಗ್ ವಿನಂತಿಸಿ',
    activeBookingsTitle: 'ಸಕ್ರಿಯ ಟ್ರಿಪ್ ಬುಕಿಂಗ್‌ಗಳು ಮತ್ತು ತಲುಪುವ ಹಂತಗಳು',
    tripPrefix: 'ಟ್ರಿಪ್ #',
    driverColon: 'ಚಾಲಕ:',
    vehicleColon: 'ವಾಹನ:',
    totalAgreedFare: 'ಒಟ್ಟು ಒಪ್ಪಿದ ಬಾಡಿಗೆ',
    stepRequested: '1. ವಿನಂತಿಸಿದೆ',
    stepAccepted: '2. ಒಪ್ಪಲಾಗಿದೆ',
    stepPickedUp: '3. ಲೋಡ್ ಆಯಿತು',
    stepInTransit: '4. ದಾರಿಯಲ್ಲಿದೆ',
    stepDelivered: '5. ತಲುಪಿದೆ',
    actAcceptTrip: 'ಟ್ರಿಪ್ ಸ್ವೀಕರಿಸಿ',
    actConfirmSched: 'ವೇಳಾಪಟ್ಟಿ ದೃಢೀಕರಿಸಿ',
    actConfirmPicked: 'ಪಿಕಪ್ ದೃಢೀಕರಿಸಿ',
    actStartTransit: 'ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ',
    actMarkDelivered: 'ತಲುಪಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    loadingText: 'ಸಾರಿಗೆ ಸಂಪರ್ಕ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
  },
  hi: {
    reqSuccessPrefix: 'परिवहन बुकिंग अनुरोध भेजा गया:',
    statusUpdatedPrefix: 'स्थिति अपडेट हुई:',
    transitionFailed: 'स्थिति अपडेट विफल रहा',
    flagshipBadge: 'प्रमुख नवाचार #4',
    subtitle: 'खेत से मंडी तक सीधा परिवहन व OR-Tools साझा लोड',
    title: 'परिवहन कनेक्ट — कृषि लॉजिस्टिक्स व साझा बेड़ा',
    desc: 'परिवहन बिचौलियों को हटाता है। अपने माल के वजन के अनुसार वाहन चुनें, प्रति किमी दरों की तुलना करें, यात्रा स्थिति ट्रैक करें और किराया साझा करें।',
    evalSharedBtn: 'साझा लोड की गणना करें',
    tabBookTransport: 'वाहन बुक करें',
    tabPostHarvest: 'कटाई के बाद व भंडारण',
    orToolsTitle: 'Google OR-Tools सामूहिक मार्ग परिणाम',
    costReductionSuffix: '% खर्च बचत',
    indCostLabel: 'अकेले यात्रा लागत',
    pooledCostLabel: 'प्रति किसान साझा लागत',
    totalSavingsLabel: 'कुल बचत',
    capFillLabel: 'वाहन क्षमता उपयोग',
    cargoTitle: 'माल विवरण व मार्ग सेटअप',
    cargoWeightLabel: 'माल का वजन (किलो)',
    produceTypeLabel: 'फसल प्रकार',
    pickupLocLabel: 'पिकअप स्थान',
    destMarketLabel: 'गंतव्य मंडी',
    eligibleVehiclesTitle: 'उपयुक्त माल वाहन',
    capacityGePrefix: 'क्षमता ≥',
    kg: 'किलो',
    directDispatchNote: 'सीधा किसान-चालक संपर्क',
    kmAway: 'किमी दूर',
    regColon: 'नंबर:',
    operatingColon: 'क्षेत्र:',
    payloadCap: 'वजन क्षमता',
    estFareLabel: 'अनुमानित किराया (~60 किमी)',
    perKm: '/किमी',
    whatsappBtn: 'WhatsApp',
    requestBookingBtn: 'बुकिंग अनुरोध भेजें',
    activeBookingsTitle: 'सक्रिय बुकिंग व डिलीवरी चरण ट्रैकिंग',
    tripPrefix: 'ट्रिप #',
    driverColon: 'चालक:',
    vehicleColon: 'वाहन:',
    totalAgreedFare: 'कुल तय किराया',
    stepRequested: '1. अनुरोधित',
    stepAccepted: '2. स्वीकृत',
    stepPickedUp: '3. पिकअप',
    stepInTransit: '4. रास्ते में',
    stepDelivered: '5. डिलीवर',
    actAcceptTrip: 'ट्रिप स्वीकार करें',
    actConfirmSched: 'समय पक्का करें',
    actConfirmPicked: 'पिकअप पक्का करें',
    actStartTransit: 'यात्रा शुरू करें',
    actMarkDelivered: 'डिलीवर चिह्नित करें',
    loadingText: 'परिवहन कनेक्ट लोड हो रहा है...',
  },
  te: {
    reqSuccessPrefix: 'రవాణా బుకింగ్ అభ్యర్థన పంపబడింది:',
    statusUpdatedPrefix: 'స్థితి అప్‌డేట్ అయింది:',
    transitionFailed: 'స్థితి మార్పు విఫలమైంది',
    flagshipBadge: 'ప్రధాన ఆవిష్కరణ #4',
    subtitle: 'పొలం నుండి మండికి నేరుగా రవాణా & OR-Tools షేరింగ్',
    title: 'రవాణా కనెక్ట్ — వ్యవసాయ రవాణా & భాగస్వామ్య వాహనాలు',
    desc: 'రవాణా మధ్యవర్తులను తొలగిస్తుంది. మీ సరుకు బరువుకు తగిన వాహనాలను ఎంచుకోండి, కి.మీ ధరలను పోల్చండి, ట్రిప్ దశలను ట్రాక్ చేసి రవాణా ఖర్చు తగ్గించుకోండి.',
    evalSharedBtn: 'భాగస్వామ్య లోడ్ లెక్కించు',
    tabBookTransport: 'వాహనం బుక్ చేయండి',
    tabPostHarvest: 'కోత తర్వాత & నిల్వ',
    orToolsTitle: 'Google OR-Tools ఉమ్మడి రూటింగ్ ఫలితం',
    costReductionSuffix: '% ఖర్చు తగ్గింపు',
    indCostLabel: 'వ్యక్తిగత ఖర్చు',
    pooledCostLabel: 'రైతుకు భాగస్వామ్య ఖర్చు',
    totalSavingsLabel: 'మొత్తం ఆదా',
    capFillLabel: 'వాహన సామర్థ్యం వినియోగం',
    cargoTitle: 'సరుకు వివరాలు & మార్గం సెటప్',
    cargoWeightLabel: 'సరుకు బరువు (కిలోలు)',
    produceTypeLabel: 'పంట రకం',
    pickupLocLabel: 'పికప్ స్థలం',
    destMarketLabel: 'గమ్యస్థాన మార్కెట్',
    eligibleVehiclesTitle: 'అర్హమైన సరుకు వాహనాలు',
    capacityGePrefix: 'సామర్థ్యం ≥',
    kg: 'కిలోలు',
    directDispatchNote: 'నేరుగా రైతు-డ్రైవర్ సంప్రదింపు',
    kmAway: 'కి.మీ దూరంలో',
    regColon: 'నెంబర్:',
    operatingColon: 'ప్రాంతం:',
    payloadCap: 'లోడ్ సామర్థ్యం',
    estFareLabel: 'అంచనా బాడుగ (~60 కి.మీ)',
    perKm: '/కి.మీ',
    whatsappBtn: 'WhatsApp',
    requestBookingBtn: 'బుకింగ్ కోరండి',
    activeBookingsTitle: 'సక్రియ ట్రిప్ బుకింగ్స్ & డెలివరీ ట్రాకింగ్',
    tripPrefix: 'ట్రిప్ #',
    driverColon: 'డ్రైవర్:',
    vehicleColon: 'వాహనం:',
    totalAgreedFare: 'మొత్తం అంగీకరించిన బాడుగ',
    stepRequested: '1. అభ్యర్థించబడింది',
    stepAccepted: '2. అంగీకరించబడింది',
    stepPickedUp: '3. లోడ్ అయింది',
    stepInTransit: '4. దారిలో ఉంది',
    stepDelivered: '5. చేరింది',
    actAcceptTrip: 'ట్రిప్ అంగీకరించండి',
    actConfirmSched: 'సమయం నిర్ధారించండి',
    actConfirmPicked: 'పికప్ నిర్ధారించండి',
    actStartTransit: 'ప్రయాణం ప్రారంభించండి',
    actMarkDelivered: 'డెలివరీ అయిందని గుర్తించండి',
    loadingText: 'రవాణా కనెక్ట్ లోడ్ అవుతోంది...',
  },
};

function TransportConnectContent() {
  const searchParams = useSearchParams();
  const { currentFarm, currentUser, language } = useFarm();
  const t = TRANSPORT_I18N[language];
  const numLocale = getIntlLocale(language);
  const [section, setSection] = useState<'transport' | 'post_harvest'>('transport');

  const [drivers, setDrivers] = useState<TransportVehicle[]>([]);
  const [bookings, setBookings] = useState<TransportBooking[]>([]);
  const [cargoWeight, setCargoWeight] = useState<number>(
    parseFloat(searchParams.get('weight') || '1200')
  );
  const [produceCrop, setProduceCrop] = useState<string>(
    searchParams.get('crop') || currentFarm?.primary_crop || 'Tomato'
  );
  const [pickupAddr, setPickupAddr] = useState<string>(
    searchParams.get('pickup') || `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`
  );
  const [destAddr, setDestAddr] = useState<string>("Yeshwanthpur APMC Yard, Bengaluru");

  const [sharedOptResult, setSharedOptResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      // Load drivers matching capacity
      const driversRes = await fetch(`${backendUrl}/transport/drivers?min_capacity_kg=${cargoWeight}`);
      if (driversRes.ok) setDrivers(await driversRes.json());

      // Load bookings
      const bookRes = await fetch(`${backendUrl}/transport/bookings`);
      if (bookRes.ok) setBookings(await bookRes.json());
    } catch (e) {
      console.warn("Transport data fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cargoWeight]);

  useEffect(() => {
    const transfer = loadOrderToTransportTransfer(currentUser.id);
    if (transfer) {
      if (!searchParams.get('crop')) setProduceCrop(transfer.cropName);
      if (!searchParams.get('weight')) setCargoWeight(transfer.quantityKg);
      if (!searchParams.get('pickup')) setPickupAddr(transfer.pickupLocation);
      setDestAddr(transfer.deliveryLocation);
    }
  }, [currentUser.id, searchParams]);

  const handleBookDriver = async (driver: TransportVehicle) => {
    const estDistance = 60.0;
    const fare = estDistance * driver.base_fare_per_km;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          driver_id: driver.driver_id,
          driver_name: driver.driver_name,
          driver_phone: driver.driver_phone,
          purchase_order_id: searchParams.get('po_id') || undefined,
          produce_type: produceCrop,
          weight_kg: cargoWeight,
          pickup_location: pickupAddr,
          delivery_destination: destAddr,
          pickup_time: "Tomorrow 06:30 AM",
          vehicle_type: driver.vehicle_type,
          estimated_distance_km: estDistance,
          total_fare: fare
        })
      });
      if (res.ok) {
        setFeedback(`${t.reqSuccessPrefix} ${driver.driver_name} (${driver.vehicle_type})!`);
        loadData();
        setTimeout(() => setFeedback(null), 5000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleUpdateStatus = async (bookingId: string, status: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setFeedback(`${t.statusUpdatedPrefix} ${status.replace('_', ' ').toUpperCase()}`);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        alert(err.detail || t.transitionFailed);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRunSharedOptimization = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/transport/optimize-shared`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_produce_kg: cargoWeight,
          farmers_count: 2,
          distance_km: 65.0,
          vehicle_type: "Tata Ace"
        })
      });
      if (res.ok) {
        setSharedOptResult(await res.json());
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-purple-950 via-zinc-900 to-purple-900 border border-purple-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {t.flagshipBadge}
            </span>
            <span className="text-xs text-zinc-400">{t.subtitle}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm text-zinc-300">
            {t.desc}
          </p>
        </div>

        <button
          onClick={handleRunSharedOptimization}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm shadow-lg transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          <Boxes className="w-5 h-5" />
          <span>{t.evalSharedBtn}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 max-w-md">
        {[
          { id: 'transport' as const, label: t.tabBookTransport, icon: Truck },
          { id: 'post_harvest' as const, label: t.tabPostHarvest, icon: Warehouse },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                section === tab.id
                  ? 'bg-purple-700 text-white border-purple-700'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {section === 'post_harvest' ? (
        <PostHarvestPage />
      ) : (
        <>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Shared Logistics OR-Tools Optimization Card */}
      {sharedOptResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 via-zinc-900 to-zinc-900 border border-purple-500/40 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-purple-400" />
              {t.orToolsTitle}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
              {sharedOptResult.savings_percentage}{t.costReductionSuffix}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-400 block text-[10px]">{t.indCostLabel}</span>
              <strong className="text-sm">₹{sharedOptResult.independent_trip_cost_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">{t.pooledCostLabel}</span>
              <strong className="text-sm text-emerald-400">₹{sharedOptResult.shared_cost_per_farmer_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">{t.totalSavingsLabel}</span>
              <strong className="text-sm text-emerald-400">₹{sharedOptResult.savings_per_farmer_inr}</strong>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">{t.capFillLabel}</span>
              <strong className="text-sm">{sharedOptResult.capacity_utilization_pct}% ({sharedOptResult.vehicle_type})</strong>
            </div>
          </div>
        </div>
      )}

      {/* Cargo & Route Prefill Bar */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          {t.cargoTitle}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">{t.cargoWeightLabel}</label>
            <input
              type="number"
              value={cargoWeight}
              onChange={(e) => setCargoWeight(parseFloat(e.target.value) || 100)}
              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">{t.produceTypeLabel}</label>
            <input
              type="text"
              value={produceCrop}
              onChange={(e) => setProduceCrop(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">{t.pickupLocLabel}</label>
            <input
              type="text"
              value={pickupAddr}
              onChange={(e) => setPickupAddr(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 block mb-1">{t.destMarketLabel}</label>
            <input
              type="text"
              value={destAddr}
              onChange={(e) => setDestAddr(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Available Vehicles / Drivers Matching Capacity */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-rm-primary dark:text-rm-accent" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {t.eligibleVehiclesTitle} ({t.capacityGePrefix} {cargoWeight} {t.kg})
            </h2>
          </div>
          <span className="text-xs text-zinc-500">
            {t.directDispatchNote}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drivers.map((d) => {
            const estFare = Math.round(60 * d.base_fare_per_km);
            return (
              <div
                key={d.id}
                className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      {d.vehicle_type}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ~{d.approx_distance_km} {t.kmAway}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-2">
                    {d.driver_name}
                  </h3>
                  <div className="text-xs text-zinc-500">
                    {t.regColon} <strong>{d.vehicle_reg_number}</strong> • {t.operatingColon} {d.service_area}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">{t.payloadCap}</span>
                      <strong className="text-zinc-900 dark:text-white text-sm">{d.capacity_kg} {t.kg}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">{t.estFareLabel}</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{estFare} (₹{d.base_fare_per_km}{t.perKm})
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <a
                    href={`https://wa.me/91${d.driver_phone.replace(/[^0-9]/g, '')}?text=Hello%20${d.driver_name},%20we%20need%20transportation%20for%20${cargoWeight}kg%20${produceCrop}%20on%20RaithaMitra`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-300"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t.whatsappBtn}</span>
                  </a>

                  <button
                    onClick={() => handleBookDriver(d)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rm-primary hover:bg-rm-dark text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <span>{t.requestBookingBtn}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Trip Bookings & Tracking Timeline */}
      <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">
          {t.activeBookingsTitle} ({bookings.length})
        </h2>

        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {t.tripPrefix}{b.id.slice(3, 8)} • {localizeCropName(b.produce_type, language)} ({b.weight_kg} {t.kg})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 uppercase">
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {t.driverColon} <strong>{b.driver_name}</strong> • {t.vehicleColon} {b.vehicle_type}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-400">{t.totalAgreedFare}</div>
                  <div className="text-base font-extrabold text-emerald-600">
                    ₹{b.total_fare.toLocaleString(numLocale)}
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="grid grid-cols-5 gap-1 pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-center font-bold">
                <div className={`p-1.5 rounded ${b.status !== 'requested' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {t.stepRequested}
                </div>
                <div className={`p-1.5 rounded ${['accepted', 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  {t.stepAccepted}
                </div>
                <div className={`p-1.5 rounded ${['picked_up', 'in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  {t.stepPickedUp}
                </div>
                <div className={`p-1.5 rounded ${['in_transit', 'delivered'].includes(b.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-400'}`}>
                  {t.stepInTransit}
                </div>
                <div className={`p-1.5 rounded ${b.status === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                  {t.stepDelivered}
                </div>
              </div>

              {/* Status Update Control for Driver */}
              {currentUser.role === 'driver' && b.status !== 'delivered' && (
                <div className="pt-2 flex items-center justify-end gap-2">
                  {b.status === 'requested' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      {t.actAcceptTrip}
                    </button>
                  )}
                  {b.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'pickup_scheduled')}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
                    >
                      {t.actConfirmSched}
                    </button>
                  )}
                  {b.status === 'pickup_scheduled' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'picked_up')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs"
                    >
                      {t.actConfirmPicked}
                    </button>
                  )}
                  {b.status === 'picked_up' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'in_transit')}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs"
                    >
                      {t.actStartTransit}
                    </button>
                  )}
                  {b.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateStatus(b.id, 'delivered')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                    >
                      {t.actMarkDelivered}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function TransportSuspenseFallback() {
  const { language } = useFarm();
  const loadingText: Record<Language, string> = {
    en: 'Loading Transport Connect...',
    kn: 'ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಕನೆಕ್ಟ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    hi: 'ट्रांसपोर्ट कनेक्ट लोड हो रहा है...',
    te: 'ట్రాన్స్‌పోర్ట్ కనెక్ట్ లోడ్ అవుతోంది...',
  };
  return (
    <div className="p-8 text-center text-slate-400">
      {loadingText[language] || loadingText.en}
    </div>
  );
}

export default function TransportConnectPage() {
  return (
    <React.Suspense fallback={<TransportSuspenseFallback />}>
      <TransportConnectContent />
    </React.Suspense>
  );
}
