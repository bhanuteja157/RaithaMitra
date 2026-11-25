// frontend/src/app/bidding/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useFarm } from '@/context/FarmContext';
import { saveOrderToTransportTransfer } from '@/lib/workflowBridge';
import { BiddingListing, PurchaseOrder, Language } from '@/types';
import { getIntlLocale, localizeCropName } from '@/lib/translations';
import {
  Gavel,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  MapPin,
  Scale,
  Sparkles,
  Truck,
  ArrowRight,
  ShieldCheck,
  Coins
} from 'lucide-react';

const BIDDING_I18N: Record<
  Language,
  {
    auctionPublished: string;
    bidSubmittedPrefix: string;
    bidSubmittedSuffix: string;
    bidError: string;
    saleConfirmed: string;
    saleConfirmError: string;
    flagshipBadge: string;
    subtitle: string;
    title: string;
    desc: string;
    listHarvestLot: string;
    produceLotsTitle: string;
    lotsCountSuffix: string;
    saleConfirmedBadge: string;
    liveBiddingBadge: string;
    defaultGrade: string;
    quantity: string;
    kg: string;
    topOffer: string;
    perKg: string;
    reserve: string;
    farmerLabel: string;
    lotVolume: string;
    highestEligibleOffer: string;
    totalSaleGross: string;
    farmerPremiumGain: string;
    competingBuyers: string;
    licensed: string;
    liveBidsTitle: string;
    realTimeRanking: string;
    timestamp: string;
    totalLabel: string;
    noBidsYet: string;
    poConfirmedTitle: string;
    winningBuyer: string;
    atRate: string;
    arrangeTransport: string;
    yourBidLabel: string;
    submitBid: string;
    confirmHighestSale: string;
    selectLotPrompt: string;
    confirmedOrdersTitle: string;
    poPrefix: string;
    buyerLabel: string;
    pickupLabel: string;
    bookLogistics: string;
    modalTitle: string;
    cropNameLabel: string;
    varietyLabel: string;
    totalQtyLabel: string;
    reserveFloorLabel: string;
    pickupAddressLabel: string;
    cancel: string;
    publishAuction: string;
    poStatusConfirmed: string;
  }
> = {
  en: {
    auctionPublished: 'Produce auction published to APMC buyers!',
    bidSubmittedPrefix: 'Bid of ₹',
    bidSubmittedSuffix: '/kg submitted!',
    bidError: 'Could not place bid',
    saleConfirmed: "Sale confirmed! Purchase order created. Click 'Arrange Transportation' below.",
    saleConfirmError: 'Could not confirm sale',
    flagshipBadge: 'Flagship Innovation #3',
    subtitle: 'Competitive Produce Auction & Atomic PO Generation',
    title: 'Smart Bidding — Competitive Agricultural Marketplace',
    desc: 'Enabling farmers to discover true market clearing prices. Buyers compete transparently; farmers retain sole authority to accept the winning offer and trigger automated logistics.',
    listHarvestLot: 'List Harvest Lot',
    produceLotsTitle: 'Produce Lots for Auction',
    lotsCountSuffix: 'Lots',
    saleConfirmedBadge: 'Sale Confirmed',
    liveBiddingBadge: 'Live Bidding',
    defaultGrade: 'A-Grade',
    quantity: 'Quantity',
    kg: 'kg',
    topOffer: 'Top Offer',
    perKg: 'kg',
    reserve: 'Reserve:',
    farmerLabel: 'Farmer:',
    lotVolume: 'Lot Volume',
    highestEligibleOffer: 'Highest Eligible Offer',
    totalSaleGross: 'Total Sale Gross Value',
    farmerPremiumGain: 'Farmer Premium Gain',
    competingBuyers: 'Competing Buyers',
    licensed: 'Licensed',
    liveBidsTitle: 'Live Competitive Bids',
    realTimeRanking: 'Real-time ranking',
    timestamp: 'Timestamp:',
    totalLabel: 'Total:',
    noBidsYet: 'No bids received yet. Be the first licensed APMC buyer to place an offer!',
    poConfirmedTitle: 'Purchase Order Confirmed!',
    winningBuyer: 'Winning Buyer:',
    atRate: 'at',
    arrangeTransport: 'Arrange Transportation',
    yourBidLabel: 'Your Bid (₹/kg):',
    submitBid: 'Submit Bid',
    confirmHighestSale: 'Confirm Highest Sale',
    selectLotPrompt: 'Select an active produce auction on the left to view competitive bids',
    confirmedOrdersTitle: 'Confirmed Purchase Orders',
    poPrefix: 'PO #',
    buyerLabel: 'Buyer:',
    pickupLabel: 'Pickup:',
    bookLogistics: 'Book Logistics',
    modalTitle: 'List Produce Lot for Competitive Bidding',
    cropNameLabel: 'Crop Name *',
    varietyLabel: 'Variety / Grade',
    totalQtyLabel: 'Total Quantity (kg) *',
    reserveFloorLabel: 'Reserve Floor (₹/kg) *',
    pickupAddressLabel: 'Pickup Farm Address *',
    cancel: 'Cancel',
    publishAuction: 'Publish Auction',
    poStatusConfirmed: 'CONFIRMED',
  },
  kn: {
    auctionPublished: 'APMC ಖರೀದಿದಾರರಿಗೆ ಬೆಳೆ ಹರಾಜು ಪ್ರಕಟಿಸಲಾಗಿದೆ!',
    bidSubmittedPrefix: '₹',
    bidSubmittedSuffix: '/ಕೆಜಿ ಬಿಡ್ ಸಲ್ಲಿಸಲಾಗಿದೆ!',
    bidError: 'ಬಿಡ್ ಸಲ್ಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    saleConfirmed: "ಮಾರಾಟ ದೃಢೀಕರಿಸಲಾಗಿದೆ! ಖರೀದಿ ಆದೇಶ ಸಿದ್ಧವಾಗಿದೆ. ಕೆಳಗೆ 'ಸಾರಿಗೆ ವ್ಯವಸ್ಥೆ ಮಾಡಿ' ಕ್ಲಿಕ್ ಮಾಡಿ.",
    saleConfirmError: 'ಮಾರಾಟ ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ',
    flagshipBadge: 'ಪ್ರಮುಖ ಆವಿಷ್ಕಾರ #3',
    subtitle: 'ಸ್ಪರ್ಧಾತ್ಮಕ ಬೆಳೆ ಹರಾಜು ಮತ್ತು ತತ್‌ಕ್ಷಣ ಖರೀದಿ ಆದೇಶ',
    title: 'ಸ್ಮಾರ್ಟ್ ಹರಾಜು — ಸ್ಪರ್ಧಾತ್ಮಕ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ',
    desc: 'ರೈತರಿಗೆ ನಿಜವಾದ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಪಡೆಯಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಖರೀದಿದಾರರು ಪಾರದರ್ಶಕವಾಗಿ ಸ್ಪರ್ಧಿಸುತ್ತಾರೆ; ರೈತರು ಅಂತಿಮ ಬಿಡ್ ಒಪ್ಪಿ ಸಾರಿಗೆ ಬುಕ್ ಮಾಡಬಹುದು.',
    listHarvestLot: 'ಬೆಳೆ ಲಾಟ್ ಪಟ್ಟಿ ಮಾಡಿ',
    produceLotsTitle: 'ಹರಾಜಿಗೆ ಲಭ್ಯವಿರುವ ಬೆಳೆ ಲಾಟ್‌ಗಳು',
    lotsCountSuffix: 'ಲಾಟ್‌ಗಳು',
    saleConfirmedBadge: 'ಮಾರಾಟ ದೃಢವಾಗಿದೆ',
    liveBiddingBadge: 'ನೇರ ಹರಾಜು',
    defaultGrade: 'ಎ-ದರ್ಜೆ',
    quantity: 'ಪ್ರಮಾಣ',
    kg: 'ಕೆಜಿ',
    topOffer: 'ಗರಿಷ್ಠ ಬಿಡ್',
    perKg: 'ಕೆಜಿ',
    reserve: 'ಕನಿಷ್ಠ ಬೆಲೆ:',
    farmerLabel: 'ರೈತ:',
    lotVolume: 'ಲಾಟ್ ಪ್ರಮಾಣ',
    highestEligibleOffer: 'ಗರಿಷ್ಠ ಅರ್ಹ ಬಿಡ್',
    totalSaleGross: 'ಒಟ್ಟು ಮಾರಾಟ ಮೌಲ್ಯ',
    farmerPremiumGain: 'ರೈತರಿಗೆ ಹೆಚ್ಚುವರಿ ಲಾಭ',
    competingBuyers: 'ಸ್ಪರ್ಧಿ ಖರೀದಿದಾರರು',
    licensed: 'ಪರವಾನಗಿ ಪಡೆದವರು',
    liveBidsTitle: 'ನೇರ ಸ್ಪರ್ಧಾತ್ಮಕ ಬಿಡ್‌ಗಳು',
    realTimeRanking: 'ನೈಜ-ಸಮಯ ಶ್ರೇಯಾಂಕ',
    timestamp: 'ಸಮಯ:',
    totalLabel: 'ಒಟ್ಟು:',
    noBidsYet: 'ಇನ್ನೂ ಯಾವುದೇ ಬಿಡ್ ಬಂದಿಲ್ಲ. ಮೊದಲ ಪರವಾನಗಿ ಪಡೆದ APMC ಖರೀದಿದಾರರಾಗಿ ಬಿಡ್ ಸಲ್ಲಿಸಿ!',
    poConfirmedTitle: 'ಖರೀದಿ ಆದೇಶ ದೃಢೀಕರಿಸಲಾಗಿದೆ!',
    winningBuyer: 'ಗೆದ್ದ ಖರೀದಿದಾರ:',
    atRate: 'ದರ',
    arrangeTransport: 'ಸಾರಿಗೆ ವ್ಯವಸ್ಥೆ ಮಾಡಿ',
    yourBidLabel: 'ನಿಮ್ಮ ಬಿಡ್ (₹/ಕೆಜಿ):',
    submitBid: 'ಬಿಡ್ ಸಲ್ಲಿಸಿ',
    confirmHighestSale: 'ಗರಿಷ್ಠ ಮಾರಾಟ ದೃಢೀಕರಿಸಿ',
    selectLotPrompt: 'ಸ್ಪರ್ಧಾತ್ಮಕ ಬಿಡ್‌ಗಳನ್ನು ನೋಡಲು ಎಡಭಾಗದಲ್ಲಿರುವ ಸಕ್ರಿಯ ಹರಾಜನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    confirmedOrdersTitle: 'ದೃಢೀಕೃತ ಖರೀದಿ ಆದೇಶಗಳು',
    poPrefix: 'ಆದೇಶ #',
    buyerLabel: 'ಖರೀದಿದಾರ:',
    pickupLabel: 'ಪಿಕಪ್ ಸ್ಥಳ:',
    bookLogistics: 'ಸಾರಿಗೆ ಬುಕ್ ಮಾಡಿ',
    modalTitle: 'ಸ್ಪರ್ಧಾತ್ಮಕ ಹರಾಜಿಗೆ ಬೆಳೆ ಲಾಟ್ ಪಟ್ಟಿ ಮಾಡಿ',
    cropNameLabel: 'ಬೆಳೆ ಹೆಸರು *',
    varietyLabel: 'ತಳಿ / ದರ್ಜೆ',
    totalQtyLabel: 'ಒಟ್ಟು ಪ್ರಮಾಣ (ಕೆಜಿ) *',
    reserveFloorLabel: 'ಕನಿಷ್ಠ ಬೆಲೆ (₹/ಕೆಜಿ) *',
    pickupAddressLabel: 'ಜಮೀನು ಪಿಕಪ್ ವಿಳಾಸ *',
    cancel: 'ರದ್ದುಮಾಡಿ',
    publishAuction: 'ಹರಾಜು ಪ್ರಕಟಿಸಿ',
    poStatusConfirmed: 'ದೃಢೀಕೃತ',
  },
  hi: {
    auctionPublished: 'APMC खरीदारों के लिए फसल नीलामी प्रकाशित हो गई!',
    bidSubmittedPrefix: '₹',
    bidSubmittedSuffix: '/किलो की बोली जमा की गई!',
    bidError: 'बोली जमा नहीं की जा सकी',
    saleConfirmed: "बिक्री पक्की हो गई! खरीद आदेश बन गया है। नीचे 'परिवहन व्यवस्थित करें' पर क्लिक करें।",
    saleConfirmError: 'बिक्री पक्की नहीं की जा सकी',
    flagshipBadge: 'प्रमुख नवाचार #3',
    subtitle: 'प्रतिस्पर्धी उपज नीलामी और त्वरित खरीद आदेश',
    title: 'स्मार्ट बोली — प्रतिस्पर्धी कृषि बाज़ार',
    desc: 'किसानों को सही बाज़ार मूल्य दिलाने में मदद करता है। खरीदार पारदर्शी ढंग से प्रतिस्पर्धा करते हैं; किसान सर्वोत्तम प्रस्ताव स्वीकार कर वाहन बुक कर सकते हैं।',
    listHarvestLot: 'फसल लॉट सूचीबद्ध करें',
    produceLotsTitle: 'नीलामी के लिए उपज लॉट',
    lotsCountSuffix: 'लॉट',
    saleConfirmedBadge: 'बिक्री पक्की',
    liveBiddingBadge: 'लाइव बोली',
    defaultGrade: 'ए-ग्रेड',
    quantity: 'मात्रा',
    kg: 'किलो',
    topOffer: 'सर्वोच्च बोली',
    perKg: 'किलो',
    reserve: 'न्यूनतम भाव:',
    farmerLabel: 'किसान:',
    lotVolume: 'लॉट मात्रा',
    highestEligibleOffer: 'सर्वोच्च योग्य बोली',
    totalSaleGross: 'कुल सकल बिक्री मूल्य',
    farmerPremiumGain: 'किसान अतिरिक्त लाभ',
    competingBuyers: 'प्रतिस्पर्धी खरीदार',
    licensed: 'लाइसेंस प्राप्त',
    liveBidsTitle: 'लाइव प्रतिस्पर्धी बोलियां',
    realTimeRanking: 'रीयल-टाइम रैंकिंग',
    timestamp: 'समय:',
    totalLabel: 'कुल:',
    noBidsYet: 'अभी कोई बोली नहीं आई है। बोली लगाने वाले पहले लाइसेंसधारी APMC खरीदार बनें!',
    poConfirmedTitle: 'खरीद आदेश पक्का हो गया!',
    winningBuyer: 'विजेता खरीदार:',
    atRate: 'दर',
    arrangeTransport: 'परिवहन व्यवस्थित करें',
    yourBidLabel: 'आपकी बोली (₹/किलो):',
    submitBid: 'बोली जमा करें',
    confirmHighestSale: 'सर्वोच्च बिक्री पक्की करें',
    selectLotPrompt: 'बोलियां देखने के लिए बाईं ओर से एक सक्रिय उपज नीलामी चुनें',
    confirmedOrdersTitle: 'पुष्ट खरीद आदेश (PO)',
    poPrefix: 'PO #',
    buyerLabel: 'खरीदार:',
    pickupLabel: 'पिकअप स्थान:',
    bookLogistics: 'वाहन बुक करें',
    modalTitle: 'प्रतिस्पर्धी बोली के लिए उपज लॉट सूचीबद्ध करें',
    cropNameLabel: 'फसल का नाम *',
    varietyLabel: 'किस्म / ग्रेड',
    totalQtyLabel: 'कुल मात्रा (किलो) *',
    reserveFloorLabel: 'न्यूनतम मूल्य (₹/किलो) *',
    pickupAddressLabel: 'खेत पिकअप पता *',
    cancel: 'रद्द करें',
    publishAuction: 'नीलामी प्रकाशित करें',
    poStatusConfirmed: 'पुष्ट',
  },
  te: {
    auctionPublished: 'APMC కొనుగోలుదారుల కోసం పంట వేలం ప్రచురించబడింది!',
    bidSubmittedPrefix: '₹',
    bidSubmittedSuffix: '/కిలో బిడ్ సమర్పించబడింది!',
    bidError: 'బిడ్ వేయడం సాధ్యం కాలేదు',
    saleConfirmed: "అమ్మకం నిర్ధారించబడింది! కొనుగోలు ఆర్డర్ సిద్ధమైంది. దిగువ 'రవాణా ఏర్పాటు చేయండి' పై క్లిక్ చేయండి.",
    saleConfirmError: 'అమ్మకం నిర్ధారించడం సాధ్యం కాలేదు',
    flagshipBadge: 'ప్రధాన ఆవిష్కరణ #3',
    subtitle: 'పోటీ పంట వేలం & తక్షణ కొనుగోలు ఆర్డర్',
    title: 'స్మార్ట్ బిడ్డింగ్ — పోటీ వ్యవసాయ మార్కెట్',
    desc: 'రైతులకు అసలైన మార్కెట్ ధర లభించేలా చేస్తుంది. కొనుగోలుదారులు పారదర్శకంగా పోటీ పడతారు; రైతులు ఉత్తమ ఆఫర్‌ను అంగీకరించి రవాణాను బుక్ చేయవచ్చు.',
    listHarvestLot: 'పంట లాట్ జాబితా చేయండి',
    produceLotsTitle: 'వేలానికి ఉన్న పంట లాట్లు',
    lotsCountSuffix: 'లాట్లు',
    saleConfirmedBadge: 'అమ్మకం ఖరారైంది',
    liveBiddingBadge: 'లైవ్ బిడ్డింగ్',
    defaultGrade: 'ఎ-గ్రేడ్',
    quantity: 'పరిమాణం',
    kg: 'కిలోలు',
    topOffer: 'అత్యధిక బిడ్',
    perKg: 'కిలో',
    reserve: 'కనీస ధర:',
    farmerLabel: 'రైతు:',
    lotVolume: 'లాట్ పరిమాణం',
    highestEligibleOffer: 'అత్యధిక అర్హత బిడ్',
    totalSaleGross: 'మొత్తం అమ్మకపు విలువ',
    farmerPremiumGain: 'రైతుకు అదనపు లాభం',
    competingBuyers: 'పోటీ కొనుగోలుదారులు',
    licensed: 'లైసెన్స్ పొందినవారు',
    liveBidsTitle: 'లైవ్ పోటీ బిడ్లు',
    realTimeRanking: 'రియల్-టైమ్ ర్యాంకింగ్',
    timestamp: 'సమయం:',
    totalLabel: 'మొత్తం:',
    noBidsYet: 'ఇంకా బిడ్లు రాలేదు. బిడ్ వేసిన మొదటి APMC కొనుగోలుదారు కండి!',
    poConfirmedTitle: 'కొనుగోలు ఆర్డర్ నిర్ధారించబడింది!',
    winningBuyer: 'గెలిచిన కొనుగోలుదారు:',
    atRate: 'ధర',
    arrangeTransport: 'రవాణా ఏర్పాటు చేయండి',
    yourBidLabel: 'మీ బిడ్ (₹/కిలో):',
    submitBid: 'బిడ్ వేయండి',
    confirmHighestSale: 'అత్యధిక అమ్మకం నిర్ధారించండి',
    selectLotPrompt: 'పోటీ బిడ్లను చూడటానికి ఎడమవైపు ఉన్న సక్రియ పంట వేలాన్ని ఎంచుకోండి',
    confirmedOrdersTitle: 'నిర్ధారించిన కొనుగోలు ఆర్డర్లు',
    poPrefix: 'ఆర్డర్ #',
    buyerLabel: 'కొనుగోలుదారు:',
    pickupLabel: 'పికప్ స్థలం:',
    bookLogistics: 'రవాణా బుక్ చేయండి',
    modalTitle: 'పోటీ వేలం కోసం పంట లాట్ జాబితా చేయండి',
    cropNameLabel: 'పంట పేరు *',
    varietyLabel: 'రకం / గ్రేడ్',
    totalQtyLabel: 'మొత్తం పరిమాణం (కిలోలు) *',
    reserveFloorLabel: 'కనీస ధర (₹/కిలో) *',
    pickupAddressLabel: 'పొలం పికప్ చిరునామా *',
    cancel: 'రద్దు చేయండి',
    publishAuction: 'వేలం ప్రచురించండి',
    poStatusConfirmed: 'నిర్ధారించబడింది',
  },
};

export default function SmartBiddingPage() {
  const { currentFarm, currentUser, language } = useFarm();
  const t = BIDDING_I18N[language];
  const numLocale = getIntlLocale(language);
  const [listings, setListings] = useState<BiddingListing[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedListing, setSelectedListing] = useState<BiddingListing | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(24);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newListing, setNewListing] = useState({
    crop_name: currentFarm?.primary_crop || "Tomato",
    variety: currentFarm?.crop_variety || "Arka Rakshak (A-Grade)",
    quantity_kg: 3000,
    min_price_per_kg: 22,
    harvest_date: "2026-11-30",
    location: `${currentFarm?.village || 'Mandya Rural'}, ${currentFarm?.district || 'Mandya'}`,
    bidding_deadline: "2026-11-28T18:00:00Z"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const listRes = await fetch(`${backendUrl}/bidding/listings`);
      if (listRes.ok) {
        const lData = await listRes.json();
        setListings(lData);
        if (lData.length > 0 && !selectedListing) {
          fetchListingDetails(lData[0].id);
        }
      }
      const ordersRes = await fetch(`${backendUrl}/bidding/orders`);
      if (ordersRes.ok) setOrders(await ordersRes.json());
    } catch (e) {
      console.warn("Bidding fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchListingDetails = async (id: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedListing(data);
        setBidAmount(Math.max(data.min_price_per_kg, (data.intelligence?.highest_eligible_offer || data.min_price_per_kg) + 1));
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: currentUser.id,
          farmer_name: currentUser.name,
          farm_id: currentFarm?.id,
          ...newListing
        })
      });
      if (res.ok) {
        setIsListingModalOpen(false);
        setFeedback(t.auctionPublished);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedListing) return;
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${selectedListing.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: currentUser.id,
          buyer_name: currentUser.name,
          buyer_phone: currentUser.phone,
          bid_per_kg: bidAmount
        })
      });
      if (res.ok) {
        setFeedback(`${t.bidSubmittedPrefix}${bidAmount}${t.bidSubmittedSuffix}`);
        fetchListingDetails(selectedListing.id);
        loadData();
        setTimeout(() => setFeedback(null), 4000);
      } else {
        const err = await res.json();
        alert(err.detail || t.bidError);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleConfirmSale = async (listingId: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
      const res = await fetch(`${backendUrl}/bidding/listings/${listingId}/confirm?farmer_id=${currentUser.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        const confirmed = await res.json().catch(() => null);
        const matchedListing = listings.find((l) => l.id === listingId);
        if (matchedListing) {
          saveOrderToTransportTransfer(
            {
              orderId: confirmed?.order_id || confirmed?.id || listingId,
              cropName: matchedListing.crop_name,
              quantityKg: matchedListing.quantity_kg,
              pickupLocation: matchedListing.location,
              deliveryLocation: 'Yeshwanthpur APMC Yard, Bengaluru',
              farmerName: currentUser.name,
              transferredAt: new Date().toISOString(),
            },
            currentUser.id
          );
        }
        setFeedback(t.saleConfirmed);
        fetchListingDetails(listingId);
        loadData();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        const err = await res.json();
        alert(err.detail || t.saleConfirmError);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-900 border border-amber-800/60 rounded-3xl shadow-xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
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
          onClick={() => setIsListingModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rm-accent hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-lg transition-transform hover:scale-105 self-start md:self-auto shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t.listHarvestLot}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Main Grid: Listings vs Bidding Intelligence Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Produce Listings */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center justify-between">
            <span>{t.produceLotsTitle}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
              {listings.length} {t.lotsCountSuffix}
            </span>
          </h2>

          <div className="space-y-3">
            {listings.map((l) => {
              const isSelected = selectedListing?.id === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => fetchListingDetails(l.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rm-primary bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md ring-1 ring-rm-primary'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {localizeCropName(l.crop_name, language)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      l.status === 'confirmed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {l.status === 'confirmed' ? t.saleConfirmedBadge : t.liveBiddingBadge}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{l.variety || t.defaultGrade}</div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">{t.quantity}</span>
                      <strong className="text-zinc-800 dark:text-zinc-200">{l.quantity_kg.toLocaleString(numLocale)} {t.kg}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">{t.topOffer}</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        ₹{l.highest_bid_amount || l.min_price_per_kg} / {t.perKg}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Bidding Intelligence & Action Desk */}
        <div className="lg:col-span-2 space-y-4">
          {selectedListing ? (
            <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                      {localizeCropName(selectedListing.crop_name, language)} — {selectedListing.variety}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {t.reserve} ₹{selectedListing.min_price_per_kg}/{t.perKg}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {t.farmerLabel} <strong>{selectedListing.farmer_name}</strong> • 📍 {selectedListing.location}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-400">{t.lotVolume}</div>
                  <div className="text-2xl font-black text-zinc-900 dark:text-white">
                    {selectedListing.quantity_kg.toLocaleString(numLocale)} {t.kg}
                  </div>
                </div>
              </div>

              {/* Bidding Intelligence Analytics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">{t.highestEligibleOffer}</span>
                  <span className="text-xl font-black text-emerald-600">
                    ₹{selectedListing.intelligence?.highest_eligible_offer || selectedListing.min_price_per_kg} / {t.perKg}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">{t.totalSaleGross}</span>
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    ₹{(selectedListing.intelligence?.total_sale_value_inr || 0).toLocaleString(numLocale)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">{t.farmerPremiumGain}</span>
                  <span className="text-xl font-black text-emerald-600">
                    +₹{(selectedListing.intelligence?.premium_gain_inr || 0).toLocaleString(numLocale)} ({selectedListing.intelligence?.premium_gain_pct || 0}%)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block">{t.competingBuyers}</span>
                  <span className="text-xl font-black text-purple-600">
                    {selectedListing.intelligence?.competing_buyers_count || 0} {t.licensed}
                  </span>
                </div>
              </div>

              {/* Live Bids Board */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                  <span>{t.liveBidsTitle}</span>
                  <span className="text-xs text-zinc-400">{t.realTimeRanking}</span>
                </h3>

                {selectedListing.bids && selectedListing.bids.length > 0 ? (
                  <div className="space-y-2">
                    {selectedListing.bids.map((b, idx) => (
                      <div
                        key={b.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          idx === 0
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-bold'
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                            idx === 0 ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-zinc-900 dark:text-white">{b.buyer_name}</div>
                            <div className="text-[10px] text-zinc-400">{t.timestamp} {b.created_at.slice(11, 19)} UTC</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-extrabold text-sm text-emerald-600">
                            ₹{b.bid_per_kg} / {t.perKg}
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {t.totalLabel} ₹{b.total_amount.toLocaleString(numLocale)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center">
                    {t.noBidsYet}
                  </p>
                )}
              </div>

              {/* Action Area: Buyer Submit Bid OR Farmer Confirm Sale */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                {selectedListing.status === 'confirmed' ? (
                  <div className="w-full p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-purple-900 dark:text-purple-300">
                        {t.poConfirmedTitle}
                      </div>
                      <div className="text-xs text-purple-700 dark:text-purple-400">
                        {t.winningBuyer} {selectedListing.intelligence?.highest_bidder} {t.atRate} ₹{selectedListing.intelligence?.highest_eligible_offer}/{t.perKg}
                      </div>
                    </div>
                    <Link
                      href="/transport"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{t.arrangeTransport}</span>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Buyer Bid Input */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-semibold text-zinc-500 whitespace-nowrap">{t.yourBidLabel}</span>
                      <input
                        type="number"
                        step="0.5"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 text-sm font-bold rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      />
                      <button
                        onClick={handleSubmitBid}
                        className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow-sm hover:opacity-90"
                      >
                        {t.submitBid}
                      </button>
                    </div>

                    {/* Farmer Confirm Button */}
                    <button
                      onClick={() => handleConfirmSale(selectedListing.id)}
                      disabled={!selectedListing.intelligence?.has_bids}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rm-primary hover:bg-rm-dark text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.confirmHighestSale}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              {t.selectLotPrompt}
            </div>
          )}
        </div>
      </div>

      {/* Confirmed Purchase Orders Section */}
      {orders.length > 0 && (
        <div className="p-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>{t.confirmedOrdersTitle} ({orders.length})</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((po) => (
              <div
                key={po.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">
                      {t.poPrefix}{po.id.slice(3, 8)} • {localizeCropName(po.crop_name, language)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      {po.status === 'confirmed' ? t.poStatusConfirmed : po.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {t.buyerLabel} <strong>{po.buyer_name}</strong> | {t.farmerLabel} <strong>{po.farmer_name}</strong>
                  </div>
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 mt-1">
                    {po.quantity_kg.toLocaleString(numLocale)} {t.kg} @ ₹{po.price_per_kg}/{t.perKg} = <strong>₹{po.total_amount.toLocaleString(numLocale)}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    {t.pickupLabel} {po.pickup_location}
                  </span>
                  <Link
                    href={`/transport?po_id=${po.id}&weight=${po.quantity_kg}&crop=${po.crop_name}&pickup=${encodeURIComponent(po.pickup_location)}`}
                    className="flex items-center gap-1 text-xs font-bold text-rm-primary dark:text-rm-accent hover:underline"
                  >
                    <span>{t.bookLogistics}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produce Listing Creation Modal */}
      {isListingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {t.modalTitle}
            </h2>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.cropNameLabel}</label>
                  <input
                    type="text"
                    required
                    value={newListing.crop_name}
                    onChange={(e) => setNewListing({ ...newListing, crop_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.varietyLabel}</label>
                  <input
                    type="text"
                    value={newListing.variety}
                    onChange={(e) => setNewListing({ ...newListing, variety: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.totalQtyLabel}</label>
                  <input
                    type="number"
                    required
                    value={newListing.quantity_kg}
                    onChange={(e) => setNewListing({ ...newListing, quantity_kg: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.reserveFloorLabel}</label>
                  <input
                    type="number"
                    required
                    value={newListing.min_price_per_kg}
                    onChange={(e) => setNewListing({ ...newListing, min_price_per_kg: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">{t.pickupAddressLabel}</label>
                <input
                  type="text"
                  required
                  value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsListingModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-lg bg-rm-primary text-white shadow"
                >
                  {t.publishAuction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
