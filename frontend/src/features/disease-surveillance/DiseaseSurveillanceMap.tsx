// frontend/src/features/disease-surveillance/DiseaseSurveillanceMap.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SurveillanceMapResponse } from '@/lib/diseaseSurveillanceApi';

interface DiseaseSurveillanceMapProps {
  mapData: SurveillanceMapResponse | null;
  showHeatmap: boolean;
  showRiskZones: boolean;
}

export default function DiseaseSurveillanceMap({
  mapData,
  showHeatmap,
  showRiskZones,
}: DiseaseSurveillanceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialLat = mapData?.center?.latitude ?? 12.5234;
    const initialLon = mapData?.center?.longitude ?? 76.8976;

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLon],
      zoom: 10,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group || !mapData) return;

    group.clearLayers();

    const centerLat = mapData.center?.latitude ?? 12.5234;
    const centerLon = mapData.center?.longitude ?? 76.8976;

    // 1. Monitoring radius circle around user's active farm
    L.circle([centerLat, centerLon], {
      radius: (mapData.monitoring_radius_km || 25) * 1000,
      color: '#047857',
      weight: 1.5,
      dashArray: '6 5',
      fillColor: '#10b981',
      fillOpacity: 0.04,
    })
      .bindPopup(
        `<strong>Monitoring Center:</strong> ${mapData.center.label}<br/>Radius: ${mapData.monitoring_radius_km} km`
      )
      .addTo(group);

    // Center Farm marker
    L.circleMarker([centerLat, centerLon], {
      radius: 7,
      color: '#ffffff',
      weight: 2,
      fillColor: '#047857',
      fillOpacity: 1,
    })
      .bindPopup(`<strong>Active Farm Center:</strong> ${mapData.center.label}`)
      .addTo(group);

    // 2. Spatial Heatmap density layers
    if (showHeatmap) {
      mapData.heatmap_cells.forEach((cell) => {
        const radiusM = 1800 + cell.intensity * 3200;
        const fillCol = cell.confirmed_count > 0 ? '#dc2626' : '#f59e0b';
        L.circle([cell.latitude, cell.longitude], {
          radius: radiusM,
          stroke: false,
          fillColor: fillCol,
          fillOpacity: Math.min(0.45, 0.14 + cell.intensity * 0.28),
        })
          .bindPopup(
            `<strong>Hotspot Density (${cell.district})</strong><br/>Reports: ${cell.report_count} (${cell.confirmed_count} expert confirmed)<br/>Crops: ${cell.crops.join(', ')}`
          )
          .addTo(group);
      });
    }

    // 3. DBSCAN Risk Zones / Outbreak Cluster Rings
    if (showRiskZones) {
      mapData.risk_zones.forEach((zone) => {
        const isCritical = zone.severity === 'critical';
        L.circle([zone.latitude, zone.longitude], {
          radius: zone.radius_m,
          color: isCritical ? '#b91c1c' : '#d97706',
          weight: 2,
          dashArray: isCritical ? undefined : '5 4',
          fillColor: isCritical ? '#ef4444' : '#f59e0b',
          fillOpacity: 0.12,
        })
          .bindPopup(
            `<strong>${isCritical ? 'Confirmed Outbreak Zone' : 'Suspected Cluster'}</strong><br/>${zone.label}${
              zone.is_demonstration ? '<br/><em>[Demonstration Data]</em>' : ''
            }`
          )
          .addTo(group);
      });
    }

    // 4. Anonymized Community Observation Markers
    mapData.markers.forEach((m) => {
      const color =
        m.verification_status === 'expert_confirmed'
          ? '#dc2626'
          : m.verification_status === 'ai_suspected'
            ? '#d97706'
            : '#2563eb';
      const statusLabel =
        m.verification_status === 'expert_confirmed'
          ? 'Expert Confirmed'
          : m.verification_status === 'ai_suspected'
            ? 'AI-Suspected'
            : 'Farmer Reported';

      L.circleMarker([m.latitude, m.longitude], {
        radius: 6.5,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.92,
      })
        .bindPopup(
          `<div style="font-size:12px;min-width:190px;">
            <strong>${m.crop} — ${m.disease_name}</strong><br/>
            <span>Status: <b>${statusLabel}</b></span><br/>
            <span>Date: ${m.observation_date}</span><br/>
            <span>Region: ${m.approximate_region}</span><br/>
            ${m.distance_km != null ? `<span>Distance: ~${m.distance_km} km</span><br/>` : ''}
            <span>Source: ${m.data_source}</span>
            ${m.is_coordinate_anonymized ? '<br/><em>Coordinates coarsened for privacy</em>' : ''}
            ${m.is_demonstration ? '<br/><b style="color:#b45309">DEMONSTRATION DATA</b>' : ''}
          </div>`
        )
        .addTo(group);
    });

    map.setView([centerLat, centerLon], mapData.monitoring_radius_km > 60 ? 9 : 11, {
      animate: true,
    });
  }, [mapData, showHeatmap, showRiskZones]);

  return (
    <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
      <div ref={containerRef} className="w-full h-full z-10" />
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-[10px] flex flex-wrap items-center gap-3 shadow-sm">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Expert Confirmed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> AI-Suspected
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Farmer Reported
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 inline-block" /> Your Farm
        </span>
      </div>
    </div>
  );
}
