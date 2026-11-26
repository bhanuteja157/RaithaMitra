// frontend/src/components/location/SmartLocationSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarm } from '@/context/FarmContext';
import {
  LocationSource,
  SelectedLocation,
  GeocodeSearchResult,
  Language,
} from '@/types';

const LOC_I18N: Record<Language, {
  labourSub: string; mainSub: string; searchMin: string; noMatch: string;
  geoUnsupported: string; gpsDenied: string; gpsUnavail: string; gpsTimeout: string; gpsFailed: string;
  gpsInsecure: string; retryGps: string; defaultMapCenter: string;
  locConfirmed: string; searchBtn: string; searchingBtn: string;
  gpsDetected: string; villageLabel: string; districtLabel: string; stateLabel: string; pinLabel: string;
  resolvedTitle: string; lookingUp: string; addressLabel: string; sourceLabel: string; selectedLabel: string;
}> = {
  en: {
    labourSub: 'Find nearby agricultural work by GPS or entering your village.',
    mainSub: 'Search a place, click or drag the map pin, detect GPS, or enter coordinates.',
    searchMin: 'Enter at least 2 characters (village, city, district, state, or PIN code).',
    noMatch: 'No matching locations found. Try a nearby town, district, or PIN code.',
    geoUnsupported: 'Geolocation is not supported by this browser.',
    gpsDenied: 'Location permission denied. Please enable location access or select on the map.',
    gpsUnavail: 'Device location unavailable. Please search or click on the map.',
    gpsTimeout: 'Location request timed out. Please try again or enter coordinates manually.',
    gpsFailed: 'Unable to detect device location.',
    gpsInsecure: 'GPS requires HTTPS or localhost. Please select your location on the map or enter coordinates.',
    retryGps: 'Retry GPS',
    defaultMapCenter: 'Map Center (Not GPS)',
    locConfirmed: 'Location confirmed and saved.',
    searchBtn: 'Search',
    searchingBtn: 'Searching...',
    gpsDetected: 'Device GPS detected. Review and confirm before saving.',
    villageLabel: 'Village / Locality',
    districtLabel: 'District',
    stateLabel: 'State',
    pinLabel: 'PIN Code',
    resolvedTitle: 'Resolved Address Details (Editable)',
    lookingUp: 'Looking up address...',
    addressLabel: 'Address',
    sourceLabel: 'Source',
    selectedLabel: 'Selected',
  },
  kn: {
    labourSub: 'GPS ಮೂಲಕ ಅಥವಾ ನಿಮ್ಮ ಗ್ರಾಮವನ್ನು ನಮೂದಿಸಿ ಹತ್ತಿರದ ಕೃಷಿ ಕೆಲಸ ಹುಡುಕಿ.',
    mainSub: 'ಸ್ಥಳ ಹುಡುಕಿ, ನಕ್ಷೆಯ ಮೇಲೆ ಒತ್ತಿ, GPS ಬಳಸಿ ಅಥವಾ ನಿರ್ದೇಶಾಂಕ ನಮೂದಿಸಿ.',
    searchMin: 'ಕನಿಷ್ಠ 2 ಅಕ್ಷರಗಳನ್ನು ನಮೂದಿಸಿ (ಗ್ರಾಮ, ಪಟ್ಟಣ, ಜಿಲ್ಲೆ ಅಥವಾ ಪಿನ್ ಕೋಡ್).',
    noMatch: 'ಯಾವುದೇ ಸ್ಥಳ ಪತ್ತೆಯಾಗಲಿಲ್ಲ. ಹತ್ತಿರದ ಪಟ್ಟಣ ಅಥವಾ ಪಿನ್ ಕೋಡ್ ಪ್ರಯತ್ನಿಸಿ.',
    geoUnsupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ GPS ಸೌಲಭ್ಯ ಲಭ್ಯವಿಲ್ಲ.',
    gpsDenied: 'ಸ್ಥಳದ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ನಕ್ಷೆಯಲ್ಲಿ ಆಯ್ಕೆಮಾಡಿ.',
    gpsUnavail: 'ಸಾಧನದ ಸ್ಥಳ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಹುಡುಕಿ ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಒತ್ತಿ.',
    gpsTimeout: 'ಸ್ಥಳ ಹುಡುಕಾಟ ಸಮಯ ಮೀರಿದೆ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    gpsFailed: 'ಸ್ಥಳ ಪತ್ತೆಹಚ್ಚಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
    gpsInsecure: 'GPS ಗಾಗಿ HTTPS ಅಥವಾ localhost ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ನಕ್ಷೆಯಲ್ಲಿ ಆಯ್ಕೆಮಾಡಿ.',
    retryGps: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    defaultMapCenter: 'ನಕ್ಷೆ ಕೇಂದ್ರ (GPS ಅಲ್ಲ)',
    locConfirmed: 'ಸ್ಥಳವನ್ನು ದೃಢೀಕರಿಸಿ ಉಳಿಸಲಾಗಿದೆ.',
    searchBtn: 'ಹುಡುಕಿ',
    searchingBtn: 'ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    gpsDetected: 'GPS ಸ್ಥಳ ಪತ್ತೆಯಾಗಿದೆ. ಉಳಿಸುವ ಮುನ್ನ ಪರಿಶೀಲಿಸಿ.',
    villageLabel: 'ಗ್ರಾಮ / ಪ್ರದೇಶ',
    districtLabel: 'ಜಿಲ್ಲೆ',
    stateLabel: 'ರಾಜ್ಯ',
    pinLabel: 'ಪಿನ್ ಕೋಡ್',
    resolvedTitle: 'ಪತ್ತೆಯಾದ ವಿಳಾಸ ವಿವರಗಳು (ತಿದ್ದುಪಡಿ ಮಾಡಬಹುದು)',
    lookingUp: 'ವಿಳಾಸ ಹುಡುಕಲಾಗುತ್ತಿದೆ...',
    addressLabel: 'ವಿಳಾಸ',
    sourceLabel: 'ಮೂಲ',
    selectedLabel: 'ಆಯ್ಕೆಯಾದ ಸ್ಥಳ',
  },
  hi: {
    labourSub: 'GPS या अपने गाँव के नाम से नज़दीकी कृषि कार्य खोजें।',
    mainSub: 'स्थान खोजें, मानचित्र पिन चुनें, GPS का उपयोग करें या निर्देशांक दर्ज करें।',
    searchMin: 'कम से कम 2 अक्षर दर्ज करें (गाँव, शहर, जिला या पिन कोड)।',
    noMatch: 'कोई मिलान स्थान नहीं मिला। नज़दीकी कस्बा या पिन कोड आज़माएं।',
    geoUnsupported: 'यह ब्राउज़र GPS स्थान का समर्थन नहीं करता है।',
    gpsDenied: 'स्थान अनुमति अस्वीकार की गई। कृपया मानचित्र पर चुनें।',
    gpsUnavail: 'डिवाइस स्थान उपलब्ध नहीं है। कृपया खोजें या मानचित्र पर क्लिक करें।',
    gpsTimeout: 'स्थान अनुरोध का समय समाप्त। कृपया पुनः प्रयास करें।',
    gpsFailed: 'डिवाइस स्थान पता लगाने में असमर्थ।',
    gpsInsecure: 'GPS के लिए HTTPS या localhost आवश्यक है। कृपया मानचित्र पर चुनें।',
    retryGps: 'GPS पुनः प्रयास करें',
    defaultMapCenter: 'मानचित्र केंद्र (GPS नहीं)',
    locConfirmed: 'स्थान की पुष्टि हो गई और सहेजा गया।',
    searchBtn: 'खोजें',
    searchingBtn: 'खोज रहे हैं...',
    gpsDetected: 'GPS स्थान मिला। सहेजने से पहले जांचें और पुष्टि करें।',
    villageLabel: 'गाँव / क्षेत्र',
    districtLabel: 'जिला',
    stateLabel: 'राज्य',
    pinLabel: 'पिन कोड',
    resolvedTitle: 'प्राप्त पता विवरण (संपादन योग्य)',
    lookingUp: 'पता खोज रहे हैं...',
    addressLabel: 'पता',
    sourceLabel: 'स्रोत',
    selectedLabel: 'चयनित',
  },
  te: {
    labourSub: 'GPS ద్వారా లేదా మీ గ్రామం పేరుతో సమీప వ్యవసాయ పనిని కనుగొనండి.',
    mainSub: 'స్థలాన్ని వెతకండి, మ్యాప్‌లో ఎంచుకోండి, GPS వాడండి లేదా అక్షాంశాలు ఇవ్వండి.',
    searchMin: 'కనీసం 2 అక్షరాలు నమోదు చేయండి (గ్రామం, పట్టణం, జిల్లా లేదా పిన్ కోడ్).',
    noMatch: 'సరిపోయే స్థలాలు కనుగొనబడలేదు. సమీప పట్టణం లేదా పిన్ ప్రయత్నించండి.',
    geoUnsupported: 'ఈ బ్రౌజర్‌లో GPS సదుపాయం లేదు.',
    gpsDenied: 'స్థాన అనుమతి నిరాకరించబడింది. దయచేసి మ్యాప్‌లో ఎంచుకోండి.',
    gpsUnavail: 'పరికర స్థానం అందుబాటులో లేదు. మ్యాప్‌లో ఎంచుకోండి.',
    gpsTimeout: 'స్థానం అభ్యర్థన సమయం ముగిసింది. మళ్ళీ ప్రయత్నించండి.',
    gpsFailed: 'స్థానాన్ని గుర్తించడం సాధ్యం కాలేదు.',
    gpsInsecure: 'GPS కోసం HTTPS లేదా localhost అవసరం. దయచేసి మ్యాప్‌లో ఎంచుకోండి.',
    retryGps: 'GPS మళ్ళీ ప్రయత్నించండి',
    defaultMapCenter: 'మ్యాప్ కేంద్రం (GPS కాదు)',
    locConfirmed: 'స్థానం నిర్ధారించబడి సేవ్ చేయబడింది.',
    searchBtn: 'వెతకండి',
    searchingBtn: 'వెతుకుతోంది...',
    gpsDetected: 'GPS స్థానం గుర్తించబడింది. సేవ్ చేసే ముందు తనిఖీ చేయండి.',
    villageLabel: 'గ్రామం / ప్రాంతం',
    districtLabel: 'జిల్లా',
    stateLabel: 'రాష్ట్రం',
    pinLabel: 'పిన్ కోడ్',
    resolvedTitle: 'గుర్తించిన చిరునామా వివరాలు (మార్చుకోవచ్చు)',
    lookingUp: 'చిరునామా వెతుకుతోంది...',
    addressLabel: 'చిరునామా',
    sourceLabel: 'మూలం',
    selectedLabel: 'ఎంచుకున్నది',
  },
};
import {
  searchLocations,
  reverseGeocode,
  validateCoordinates,
} from '@/lib/locationApi';
import {
  MapPin,
  Search,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
  Edit3,
} from 'lucide-react';

const LeafletMapInner = dynamic(
  () => import('@/components/location/LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 sm:h-72 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs text-zinc-500">
        Loading interactive map...
      </div>
    ),
  }
);

export interface SmartLocationSelectorProps {
  initialLocation?: Partial<SelectedLocation>;
  role?: 'farmer' | 'buyer' | 'labour';
  title?: string;
  subtitle?: string;
  compactMap?: boolean;
  onConfirmLocation: (location: SelectedLocation) => void | Promise<void>;
  confirmLabel?: string;
}

export function SmartLocationSelector({
  initialLocation,
  role = 'farmer',
  title,
  subtitle,
  compactMap = false,
  onConfirmLocation,
  confirmLabel,
}: SmartLocationSelectorProps) {
  const { t, language } = useFarm();
  const L = LOC_I18N[language] || LOC_I18N.en;

  // Coordinates state (kept separate from saved farm until confirmed)
  const [lat, setLat] = useState<number>(initialLocation?.latitude ?? 12.5234);
  const [lon, setLon] = useState<number>(initialLocation?.longitude ?? 76.8976);
  const [latInput, setLatInput] = useState<string>(String(initialLocation?.latitude ?? 12.5234));
  const [lonInput, setLonInput] = useState<string>(String(initialLocation?.longitude ?? 76.8976));
  const [coordError, setCoordError] = useState<string | null>(null);

  // Address fields
  const [village, setVillage] = useState<string>(initialLocation?.village ?? '');
  const [district, setDistrict] = useState<string>(initialLocation?.district ?? '');
  const [stateName, setStateName] = useState<string>(initialLocation?.state ?? '');
  const [pinCode, setPinCode] = useState<string>(initialLocation?.pin_code ?? '');
  const [formattedAddress, setFormattedAddress] = useState<string>(initialLocation?.formatted_address ?? '');

  // Source & accuracy metadata
  const [hasExplicitSelection, setHasExplicitSelection] = useState<boolean>(
    initialLocation?.latitude !== undefined && initialLocation?.longitude !== undefined
  );
  const [locationSource, setLocationSource] = useState<LocationSource>(
    initialLocation?.location_source ?? 'map'
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(
    initialLocation?.location_accuracy_m
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeocodeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // GPS & Reverse Geocode state
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isReversing, setIsReversing] = useState<boolean>(false);
  const [reverseNote, setReverseNote] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Sync if initialLocation changes externally
  useEffect(() => {
    if (initialLocation?.latitude !== undefined && initialLocation?.longitude !== undefined) {
      setLat(initialLocation.latitude);
      setLon(initialLocation.longitude);
      setLatInput(String(initialLocation.latitude));
      setLonInput(String(initialLocation.longitude));
      setHasExplicitSelection(true);
    }
    if (initialLocation?.location_source !== undefined) {
      setLocationSource(initialLocation.location_source);
    }
    if (initialLocation?.location_accuracy_m !== undefined) {
      setAccuracyMeters(initialLocation.location_accuracy_m);
    }
    if (initialLocation?.village !== undefined) setVillage(initialLocation.village);
    if (initialLocation?.district !== undefined) setDistrict(initialLocation.district);
    if (initialLocation?.state !== undefined) setStateName(initialLocation.state);
    if (initialLocation?.pin_code !== undefined) setPinCode(initialLocation.pin_code || '');
    if (initialLocation?.formatted_address !== undefined) {
      setFormattedAddress(initialLocation.formatted_address || '');
    }
  }, [
    initialLocation?.latitude,
    initialLocation?.longitude,
    initialLocation?.village,
    initialLocation?.district,
    initialLocation?.state,
  ]);

  const performReverseGeocode = async (targetLat: number, targetLon: number) => {
    setIsReversing(true);
    setReverseNote(null);
    const rev = await reverseGeocode(targetLat, targetLon);
    setIsReversing(false);

    if (rev.unavailable_reason) {
      setReverseNote(rev.unavailable_reason);
      return;
    }

    if (rev.village_or_locality) setVillage(rev.village_or_locality);
    if (rev.district) setDistrict(rev.district);
    if (rev.state) setStateName(rev.state);
    if (rev.pin_code) setPinCode(rev.pin_code);
    if (rev.formatted_address) setFormattedAddress(rev.formatted_address);
  };

  // Method 1: Explicit Location Search
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim().length < 2) {
      setSearchError(L.searchMin);
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSavedFeedback(null);
    const res = await searchLocations(searchQuery);
    setIsSearching(false);
    if (res.error_message) {
      setSearchError(res.error_message);
    }
    setSearchResults(res.results || []);
    if (!res.error_message && res.results.length === 0) {
      setSearchError(L.noMatch);
    }
  };

  const handleSelectSearchResult = (item: GeocodeSearchResult) => {
    setLat(item.latitude);
    setLon(item.longitude);
    setLatInput(String(item.latitude));
    setLonInput(String(item.longitude));
    setVillage(item.village_or_locality || '');
    setDistrict(item.district || '');
    setStateName(item.state || '');
    setPinCode(item.pin_code || '');
    setFormattedAddress(item.display_name);
    setLocationSource('search');
    setAccuracyMeters(undefined);
    setCoordError(null);
    setGpsError(null);
    setSearchResults([]);
    setSavedFeedback(null);
  };

  // Method 2: Interactive Map click or marker drag
  const handleMapSelect = (newLat: number, newLon: number) => {
    setLat(newLat);
    setLon(newLon);
    setLatInput(String(newLat));
    setLonInput(String(newLon));
    setHasExplicitSelection(true);
    setLocationSource('map');
    setAccuracyMeters(undefined);
    setCoordError(null);
    setSavedFeedback(null);
    performReverseGeocode(newLat, newLon);
  };

  // Method 3: Use My Current Location (permission-aware, two-stage GPS with network fallback)
  const handleUseCurrentLocation = async () => {
    setGpsError(null);
    setSavedFeedback(null);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsError(L.geoUnsupported);
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
      setGpsError(L.gpsInsecure);
      return;
    }

    if (navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          setGpsError(L.gpsDenied);
          return;
        }
      } catch {
        // Permissions API unsupported or threw; proceed to getCurrentPosition
      }
    }

    const onGpsSuccess = (position: GeolocationPosition) => {
      const detectedLat = Number(position.coords.latitude.toFixed(6));
      const detectedLon = Number(position.coords.longitude.toFixed(6));
      const acc = Number.isFinite(position.coords.accuracy)
        ? Math.round(position.coords.accuracy)
        : undefined;

      setLat(detectedLat);
      setLon(detectedLon);
      setLatInput(String(detectedLat));
      setLonInput(String(detectedLon));
      setAccuracyMeters(acc);
      setHasExplicitSelection(true);
      setLocationSource('gps');
      setCoordError(null);
      setIsLocatingGps(false);

      performReverseGeocode(detectedLat, detectedLon);
    };

    const onGpsFinalError = (err: GeolocationPositionError) => {
      setIsLocatingGps(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError(L.gpsDenied);
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGpsError(L.gpsUnavail);
      } else if (err.code === err.TIMEOUT) {
        setGpsError(L.gpsTimeout);
      } else {
        setGpsError(L.gpsFailed);
      }
    };

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      onGpsSuccess,
      (err) => {
        if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
          // Fallback to standard-accuracy (Wi-Fi/IP) geolocation for laptops/desktops
          navigator.geolocation.getCurrentPosition(onGpsSuccess, onGpsFinalError, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000,
          });
          return;
        }
        onGpsFinalError(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  // Method 4: Manual Coordinates + Locate on Map
  const handleLocateManual = () => {
    setCoordError(null);
    setSavedFeedback(null);
    const check = validateCoordinates(latInput, lonInput);
    if (!check.valid) {
      const fallbackCoordErr =
        language === 'kn' ? 'ಅಮಾನ್ಯ ನಿರ್ದೇಶಾಂಕಗಳು. ದಯವಿಟ್ಟು ಮಾನ್ಯ ಅಕ್ಷಾಂಶ ಮತ್ತು ರೇಖಾಂಶ ನಮೂದಿಸಿ.' :
        language === 'hi' ? 'अमान्य निर्देशांक। कृपया मान्य अक्षांश और देशांतर दर्ज करें।' :
        language === 'te' ? 'చెల్లని కోఆర్డినేట్‌లు. దయచేసి సరైన అక్షాంశం మరియు రేఖాంశం నమోదు చేయండి.' :
        check.error;
      setCoordError(language === 'en' ? check.error : fallbackCoordErr);
      return;
    }
    setLat(check.lat);
    setLon(check.lon);
    setLatInput(String(check.lat));
    setLonInput(String(check.lon));
    setLocationSource('manual');
    setAccuracyMeters(undefined);
    performReverseGeocode(check.lat, check.lon);
  };

  // Confirm and Save Location
  const handleConfirm = async () => {
    const check = validateCoordinates(latInput, lonInput);
    if (!check.valid) {
      const fallbackCoordErr =
        language === 'kn' ? 'ಅಮಾನ್ಯ ನಿರ್ದೇಶಾಂಕಗಳು. ದಯವಿಟ್ಟು ಮಾನ್ಯ ಅಕ್ಷಾಂಶ ಮತ್ತು ರೇಖಾಂಶ ನಮೂದಿಸಿ.' :
        language === 'hi' ? 'अमान्य निर्देशांक। कृपया मान्य अक्षांश और देशांतर दर्ज करें।' :
        language === 'te' ? 'చెల్లని కోఆర్డినేట్‌లు. దయచేసి సరైన అక్షాంశం మరియు రేఖాంశం నమోదు చేయండి.' :
        check.error;
      setCoordError(language === 'en' ? check.error : fallbackCoordErr);
      return;
    }
    setIsSaving(true);
    setCoordError(null);
    const payload: SelectedLocation = {
      latitude: check.lat,
      longitude: check.lon,
      village: village.trim() || 'Rural Locality',
      district: district.trim() || 'Mandya',
      state: stateName.trim() || 'Karnataka',
      pin_code: pinCode.trim() || undefined,
      formatted_address: formattedAddress.trim() || undefined,
      location_source: locationSource,
      location_accuracy_m: accuracyMeters,
      updated_at: new Date().toISOString(),
    };
    try {
      await onConfirmLocation(payload);
      setSavedFeedback(L.locConfirmed);
    } finally {
      setIsSaving(false);
    }
  };

  // Simplified Labour Dashboard View (Requirement 9)
  if (role === 'labour') {
    return (
      <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-700" />
              {title || t('labourLocationTitle')}
            </h3>
            <p className="text-xs text-zinc-500">
              {subtitle || L.labourSub}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGps}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white text-xs font-semibold transition disabled:opacity-60"
          >
            {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {t('useMyCurrentLocation')}
          </button>
        </div>

        {gpsError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.villageLabel}</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="Gubbi"
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">{L.districtLabel}</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Tumakuru"
              className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
            >
              {confirmLabel || t('confirmAndSaveLocation')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
      {/* Header + Use My Current Location */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-700 dark:text-green-400" />
            {title || (role === 'buyer' ? t('buyerDeliveryLocation') : t('smartLocationSelector'))}
          </h3>
          <p className="text-xs text-zinc-500">
            {subtitle || L.mainSub}
          </p>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocatingGps}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-green-800 hover:bg-green-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-60 shrink-0"
        >
          {isLocatingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4 text-emerald-300" />}
          {t('useMyCurrentLocation')}
        </button>
      </div>

      {/* Method 1: Search Bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder={t('searchLocationPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-green-700"
            />
          </div>
          <button
            type="button"
            onClick={() => handleSearchSubmit()}
            disabled={isSearching}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition disabled:opacity-60"
          >
            {isSearching ? L.searchingBtn : L.searchBtn}
          </button>
        </div>

        {searchError && (
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{searchError}</span>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 divide-y divide-zinc-200 dark:divide-zinc-700 max-h-44 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-green-50 dark:hover:bg-green-950/30 transition flex items-start justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-white line-clamp-1">
                    {item.village_or_locality || item.district || item.display_name.split(',')[0]}
                  </div>
                  <div className="text-[11px] text-zinc-500 line-clamp-1">{item.display_name}</div>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* GPS Status / Error with Retry */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGps}
            className="px-3 py-1 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-semibold text-[11px] transition shrink-0 disabled:opacity-60"
          >
            {L.retryGps}
          </button>
        </div>
      )}

      {locationSource === 'gps' && accuracyMeters !== undefined && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5" />
            {L.gpsDetected} (±{accuracyMeters} m)
          </span>
        </div>
      )}

      {/* Method 2: Interactive OpenStreetMap */}
      <LeafletMapInner
        latitude={lat}
        longitude={lon}
        onSelectCoordinates={handleMapSelect}
        heightClass={compactMap ? 'h-48' : 'h-64 sm:h-72'}
      />

      {/* Method 4: Manual Coordinates Input */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t('latitudeLabel')} (-90 to +90)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <div>
          <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            {t('longitudeLabel')} (-180 to +180)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={lonInput}
            onChange={(e) => setLonInput(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono"
          />
        </div>

        <button
          type="button"
          onClick={handleLocateManual}
          className="py-2.5 px-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold transition"
        >
          {t('locateOnMap')}
        </button>
      </div>

      {coordError && (
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{coordError}</span>
        </div>
      )}

      {/* Resolved Address & Manual Corrections */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-green-700" />
            {L.resolvedTitle}
          </span>
          {isReversing && (
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {L.lookingUp}
            </span>
          )}
        </div>

        {reverseNote && <p className="text-[11px] text-amber-600">{reverseNote}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">{L.villageLabel}</label>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder={L.villageLabel}
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">{L.districtLabel}</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder={L.districtLabel}
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">{L.stateLabel}</label>
            <input
              type="text"
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              placeholder={L.stateLabel}
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-0.5">{L.pinLabel}</label>
            <input
              type="text"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              placeholder="571401"
              className="w-full p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {formattedAddress && (
          <div className="text-[11px] text-zinc-500">
            <strong>{L.addressLabel}:</strong> {formattedAddress}
          </div>
        )}
      </div>

      {/* Footer: Source badge + Confirm & Save button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
          <span>
            {L.sourceLabel}: <strong className="uppercase">{hasExplicitSelection ? locationSource : L.defaultMapCenter}</strong>
          </span>
          <span>•</span>
          <span>{L.selectedLabel}: {lat.toFixed(5)}, {lon.toFixed(5)}</span>
          {savedFeedback && (
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {savedFeedback}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-green-800 hover:bg-green-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
          {confirmLabel || t('confirmAndSaveLocation')}
        </button>
      </div>
    </div>
  );
}
