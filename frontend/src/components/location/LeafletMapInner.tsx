// frontend/src/components/location/LeafletMapInner.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useFarm } from '@/context/FarmContext';

interface LeafletMapInnerProps {
  latitude: number;
  longitude: number;
  onSelectCoordinates: (lat: number, lon: number) => void;
  heightClass?: string;
}

export default function LeafletMapInner({
  latitude,
  longitude,
  onSelectCoordinates,
  heightClass = 'h-64 sm:h-72',
}: LeafletMapInnerProps) {
  const { language } = useFarm();
  const mapAria =
    language === 'kn'
      ? 'ಸಂವಾದಾತ್ಮಕ OpenStreetMap ಸ್ಥಳ ಆಯ್ಕೆದಾರ'
      : language === 'hi'
        ? 'इंटरैक्टिव OpenStreetMap स्थान चयनकर्ता'
        : language === 'te'
          ? 'ఇంటరాక్టివ్ OpenStreetMap స్థాన ఎంపిక'
          : 'Interactive OpenStreetMap Location Selector';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const callbackRef = useRef(onSelectCoordinates);

  useEffect(() => {
    callbackRef.current = onSelectCoordinates;
  }, [onSelectCoordinates]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude, longitude],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom divIcon avoids missing default png assets in Next.js bundling
    const pinIcon = L.divIcon({
      className: 'raithamitra-map-pin',
      html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#166534;border:3px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,0.35);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:50%;background:#22C55E;"></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });

    const marker = L.marker([latitude, longitude], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      callbackRef.current(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lon = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([lat, lon]);
      callbackRef.current(lat, lon);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Center map & update marker when coordinates change externally
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    const currentPos = markerRef.current.getLatLng();
    const moved =
      Math.abs(currentPos.lat - latitude) > 0.00001 ||
      Math.abs(currentPos.lng - longitude) > 0.00001;
    if (moved) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 12), {
        animate: true,
      });
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 z-10`}
      aria-label={mapAria}
    />
  );
}
