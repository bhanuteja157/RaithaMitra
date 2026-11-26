// frontend/src/components/digital-farming/CropDigitalTwin3D.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFarm } from '@/context/FarmContext';
import { localizeCropName, localizeCondition, getIntlLocale } from '@/lib/translations';
import { LatLonPoint } from '@/lib/digital-farming/geo';
import { CropCatalogItem } from '@/lib/digital-farming/crops';
import { SimulationState } from '@/lib/digital-farming/simulator';
import { Language } from '@/types';
import { Sparkles, Wind, Droplets, Satellite, Maximize2, Minimize2, Eye, Compass } from 'lucide-react';

const TWIN3D_I18N: Record<Language, {
  dayWord: string; plantsWord: string; webglFallback: string;
  webglErr: string; modeledMoisture: string; weatherScenario: string;
  satGroundTitle: string; angledView: string; overheadView: string;
  fullscreen: string; exitFullscreen: string;
  satReady: string; satLoading: string; satFallback: string;
  satAttribution: string; satSimLabel: string;
  healthLbl: string; stressLbl: string; pestLbl: string; yieldLbl: string; profitLbl: string;
}> = {
  en: {
    dayWord: 'Day', plantsWord: 'plants', webglFallback: 'WebGL Fallback',
    webglErr: 'WebGL 3D hardware context is unavailable in this browser. Switch to Observed Satellite Data or update graphics drivers.',
    modeledMoisture: 'Soil Moisture:', weatherScenario: 'Weather:',
    satGroundTitle: '3D Satellite Digital Twin',
    angledView: 'Angled 3D', overheadView: 'Overhead Satellite',
    fullscreen: 'Fullscreen', exitFullscreen: 'Exit Fullscreen',
    satReady: 'Esri Satellite Ground Aligned',
    satLoading: 'Loading satellite tiles...',
    satFallback: 'Satellite imagery unavailable; fallback 3D terrain active',
    satAttribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    satSimLabel: 'Real Geographical Satellite Imagery • Predictive 3D Crop Simulation (Not Observed Live Growth)',
    healthLbl: 'Health', stressLbl: 'Stress', pestLbl: 'Pest Risk', yieldLbl: 'Est. Yield', profitLbl: 'Proj. Profit',
  },
  kn: {
    dayWord: 'ದಿನ', plantsWord: 'ಸಸಿಗಳು', webglFallback: 'WebGL ಲಭ್ಯವಿಲ್ಲ',
    webglErr: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ 3D WebGL ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನೇರ ಉಪಗ್ರಹ ಚಿತ್ರಣವನ್ನು ಬಳಸಿ.',
    modeledMoisture: 'ಮಣ್ಣಿನ ತೇವಾಂಶ:', weatherScenario: 'ಹವಾಮಾನ:',
    satGroundTitle: '3D ಉಪಗ್ರಹ ಡಿಜಿಟಲ್ ಟ್ವಿನ್',
    angledView: '3D ಕೋನ ನೋಟ', overheadView: 'ಮೇಲಿನ ಉಪಗ್ರಹ ನೋಟ',
    fullscreen: 'ಪೂರ್ಣ ಪರದೆ', exitFullscreen: 'ಪೂರ್ಣ ಪರದೆ ಮುಚ್ಚಿ',
    satReady: 'Esri ಉಪಗ್ರಹ ಭೂಮಿ ಜೋಡಣೆಯಾಗಿದೆ',
    satLoading: 'ಉಪಗ್ರಹ ಚಿತ್ರಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...',
    satFallback: 'ಉಪಗ್ರಹ ಚಿತ್ರ ಲಭ್ಯವಿಲ್ಲ; ಪರ್ಯಾಯ 3D ಭೂಮಿ ಸಕ್ರಿಯವಾಗಿದೆ',
    satAttribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    satSimLabel: 'ನೈಜ ಭೌಗೋಳಿಕ ಉಪಗ್ರಹ ಚಿತ್ರಣ • ಭವಿಷ್ಯದ 3D ಬೆಳೆ ಸಿಮ್ಯುಲೇಶನ್ (ನೇರ ಬೆಳವಣಿಗೆ ಅಲ್ಲ)',
    healthLbl: 'ಆರೋಗ್ಯ', stressLbl: 'ಒತ್ತಡ', pestLbl: 'ಕೀಟ ಅಪಾಯ', yieldLbl: 'ಅಂದಾಜು ಇಳುವರಿ', profitLbl: 'ಅಂದಾಜು ಲಾಭ',
  },
  hi: {
    dayWord: 'दिन', plantsWord: 'पौधे', webglFallback: 'WebGL अनुपलब्ध',
    webglErr: 'इस ब्राउज़र में 3D WebGL उपलब्ध नहीं है। कृपया लाइव उपग्रह दृश्य देखें।',
    modeledMoisture: 'मिट्टी नमी:', weatherScenario: 'मौसम:',
    satGroundTitle: '3D उपग्रह डिजिटल ट्विन',
    angledView: 'कोणीय 3D दृश्य', overheadView: 'शीर्ष उपग्रह दृश्य',
    fullscreen: 'पूर्ण स्क्रीन', exitFullscreen: 'पूर्ण स्क्रीन बंद करें',
    satReady: 'Esri उपग्रह भूमि संरेखित',
    satLoading: 'उपग्रह टाइल्स लोड हो रही हैं...',
    satFallback: 'उपग्रह छवि अनुपलब्ध; फ़ॉलबैक 3D भू-तल सक्रिय',
    satAttribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    satSimLabel: 'वास्तविक भौगोलिक उपग्रह छवि • पूर्वानुमानित 3D फसल सिमुलेशन (लाइव देखी गई वृद्धि नहीं)',
    healthLbl: 'स्वास्थ्य', stressLbl: 'तनाव', pestLbl: 'कीट जोखिम', yieldLbl: 'अनुमानित उपज', profitLbl: 'अनुमानित लाभ',
  },
  te: {
    dayWord: 'రోజు', plantsWord: 'మొక్కలు', webglFallback: 'WebGL అందుబాటులో లేదు',
    webglErr: 'ఈ బ్రౌజర్‌లో 3D WebGL అందుబాటులో లేదు. దయచేసి ఉపగ్రహ చిత్రాన్ని చూడండి.',
    modeledMoisture: 'నేల తేమ:', weatherScenario: 'వాతావరణం:',
    satGroundTitle: '3D ఉపగ్రహ డిజిటల్ ట్విన్',
    angledView: 'కోణీయ 3D వీక్షణం', overheadView: 'పైనుండి ఉపగ్రహ వీక్షణం',
    fullscreen: 'పూర్తి స్క్రీన్', exitFullscreen: 'పూర్తి స్క్రీన్ మూసివేయండి',
    satReady: 'Esri ఉపగ్రహ భూమి సమలేఖనం',
    satLoading: 'ఉపగ్రహ టైల్స్ లోడ్ అవుతున్నాయి...',
    satFallback: 'ఉపగ్రహ చిత్రం అందుబాటులో లేదు; ఫాల్‌బ్యాక్ 3D భూమి సక్రియం',
    satAttribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    satSimLabel: 'నిజమైన భౌగోళిక ఉపగ్రహ చిత్రం • అంచనా 3D పంట సిమ్యులేషన్ (ప్రత్యక్ష పెరుగుదల కాదు)',
    healthLbl: 'ఆరోగ్యం', stressLbl: 'ఒత్తిడి', pestLbl: 'తెగులు ప్రమాదం', yieldLbl: 'అంచనా దిగుబడి', profitLbl: 'అంచనా లాభం',
  },
};

interface CropDigitalTwin3DProps {
  mode: 'field' | 'closeup';
  points: LatLonPoint[];
  crop: CropCatalogItem;
  sim: SimulationState;
  areaAcres: number;
  estimatedPopulation?: number;
  qualityTier?: 'high' | 'balanced';
  projectedYieldKg?: number;
  projectedProfitInr?: number;
  estimatedHarvestDate?: string;
}

function latLonToTileFloat(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function createProceduralSoilTexture(moisturePct: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const wetness = Math.max(0, Math.min(1, moisturePct / 100));
  const baseR = Math.round(138 - wetness * 62);
  const baseG = Math.round(104 - wetness * 48);
  const baseB = Math.round(72 - wetness * 34);
  ctx.fillStyle = `rgb(${baseR},${baseG},${baseB})`;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4200; i++) {
    const x = ((i * 73) % 256);
    const y = ((i * 137 + Math.floor(i / 256) * 29) % 256);
    const delta = ((i % 7) - 3) * 8;
    ctx.fillStyle = `rgb(${Math.max(15, baseR + delta)},${Math.max(12, baseG + delta)},${Math.max(10, baseB + delta)})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Furrow shading stripes
  ctx.fillStyle = 'rgba(20, 12, 6, 0.14)';
  for (let y = 0; y < 256; y += 24) {
    ctx.fillRect(0, y, 256, 5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createLeafVeinTexture(stressPct: number, maturityFrac: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const senescent = Math.max(0, (maturityFrac - 0.86) / 0.14);
  const stress = Math.max(0, Math.min(1, stressPct / 100));
  const r = Math.round(44 + stress * 72 + senescent * 120);
  const g = Math.round(118 - stress * 16 + senescent * 45);
  const b = Math.round(38 - stress * 12 + senescent * 10);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 128, 256);

  // Midrib vein
  ctx.fillStyle = 'rgba(225, 240, 185, 0.55)';
  ctx.fillRect(61, 0, 6, 256);

  // Lateral veins
  ctx.strokeStyle = 'rgba(200, 230, 170, 0.25)';
  ctx.lineWidth = 1.4;
  for (let y = 12; y < 250; y += 16) {
    ctx.beginPath();
    ctx.moveTo(64, y);
    ctx.lineTo(10, y - 14);
    ctx.moveTo(64, y);
    ctx.lineTo(118, y - 14);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function buildCurvedLeafGeometry(length: number, width: number, droop: number): THREE.BufferGeometry {
  const geom = new THREE.PlaneGeometry(width, length, 4, 8);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + length / 2; // pivot at base (0..length)
    const t = Math.max(0, Math.min(1, y / Math.max(0.01, length)));
    const taper = Math.sin(t * Math.PI * 0.88 + 0.15);
    pos.setX(i, x * taper);
    pos.setY(i, y * (1 - droop * 0.25 * t * t));
    pos.setZ(i, droop * t * t * length * 0.55);
  }
  geom.computeVertexNormals();
  return geom;
}

export function CropDigitalTwin3D({
  mode,
  points,
  crop,
  sim,
  areaAcres,
  estimatedPopulation = 60000,
  qualityTier = 'balanced',
  projectedYieldKg,
  projectedProfitInr,
  estimatedHarvestDate,
}: CropDigitalTwin3DProps) {
  const { t, language } = useFarm();
  const L = TWIN3D_I18N[language] || TWIN3D_I18N.en;
  const numLocale = getIntlLocale(language);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnsupported, setWebglUnsupported] = useState(false);
  const [fps, setFps] = useState<number>(0);
  const [renderedCount, setRenderedCount] = useState<number>(0);
  const [cameraView, setCameraView] = useState<'angled' | 'overhead'>('angled');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [satStatus, setSatStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const satTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const satStatusRef = useRef<'loading' | 'ready' | 'fallback'>('loading');

  // Dynamic camera orbit state controlled by drag, zoom wheel & perspective presets
  const orbitRef = useRef({ theta: 0.72, phi: 0.85, radius: mode === 'field' ? 12.5 : 4.2 });
  const simRef = useRef(sim);
  const cropRef = useRef(crop);
  const modeRef = useRef(mode);

  useEffect(() => {
    simRef.current = sim;
  }, [sim]);
  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);
  useEffect(() => {
    modeRef.current = mode;
    orbitRef.current.radius = mode === 'field' ? 12.5 : 4.2;
    orbitRef.current.phi = mode === 'field' ? 0.85 : 1.08;
    if (mode === 'field') setCameraView('angled');
  }, [mode]);

  useEffect(() => {
    satStatusRef.current = satStatus;
  }, [satStatus]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const handleToggleFullscreen = async () => {
    if (!cardRef.current) return;
    if (!document.fullscreenElement) {
      await cardRef.current.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  const handleSwitchPerspective = (view: 'angled' | 'overhead') => {
    setCameraView(view);
    if (view === 'overhead') {
      orbitRef.current = { theta: 0.0, phi: 0.06, radius: 13.5 };
    } else {
      orbitRef.current = { theta: 0.72, phi: 0.85, radius: 12.5 };
    }
  };

  const progress = Math.max(0, Math.min(1, sim.currentDay / Math.max(1, sim.totalDays)));

  // Project GeoJSON vertices using Web Mercator tile coordinates so 3D plants and Esri satellite tiles align pixel-for-pixel
  const geoProjection = useMemo(() => {
    const pts =
      points.length >= 3
        ? points
        : [
            { lat: 13.3412, lon: 77.1135 },
            { lat: 13.3412, lon: 77.1144 },
            { lat: 13.3403, lon: 77.1145 },
            { lat: 13.3402, lon: 77.1134 },
          ];
    const cLat = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
    const cLon = pts.reduce((a, p) => a + p.lon, 0) / pts.length;

    let zoom = 17;
    for (let z = 18; z >= 15; z--) {
      const tPts = pts.map((p) => latLonToTileFloat(p.lat, p.lon, z));
      const minX = Math.min(...tPts.map((p) => p.x));
      const maxX = Math.max(...tPts.map((p) => p.x));
      const minY = Math.min(...tPts.map((p) => p.y));
      const maxY = Math.max(...tPts.map((p) => p.y));
      const span = Math.max(maxX - minX, maxY - minY);
      zoom = z;
      if (span <= 1.65 && span >= 0.32) break;
      if (span > 1.65) continue;
      if (z === 18 && span < 0.32) break;
    }

    const centerTile = latLonToTileFloat(cLat, cLon, zoom);
    const tilePts = pts.map((p) => latLonToTileFloat(p.lat, p.lon, zoom));
    const spanX = Math.max(...tilePts.map((p) => Math.abs(p.x - centerTile.x)));
    const spanY = Math.max(...tilePts.map((p) => Math.abs(p.y - centerTile.y)));
    const maxSpan = Math.max(1e-4, spanX, spanY);
    const sceneUnitsPerTile = 4.8 / maxSpan;

    const poly = tilePts.map((tp) => ({
      x: (tp.x - centerTile.x) * sceneUnitsPerTile,
      z: (tp.y - centerTile.y) * sceneUnitsPerTile,
    }));

    const tileX0 = Math.floor(centerTile.x) - 1;
    const tileY0 = Math.floor(centerTile.y) - 1;
    const gridCount = 3;
    const planeSize = gridCount * sceneUnitsPerTile;
    const planeCenterX = (tileX0 + gridCount / 2 - centerTile.x) * sceneUnitsPerTile;
    const planeCenterZ = (tileY0 + gridCount / 2 - centerTile.y) * sceneUnitsPerTile;

    const minX = Math.min(...poly.map((p) => p.x));
    const maxX = Math.max(...poly.map((p) => p.x));
    const minZ = Math.min(...poly.map((p) => p.z));
    const maxZ = Math.max(...poly.map((p) => p.z));

    return {
      zoom,
      tileX0,
      tileY0,
      gridCount,
      planeSize,
      planeCenterX,
      planeCenterZ,
      poly,
      bounds: { minX, maxX, minZ, maxZ },
      sig: `${zoom}:${tileX0}:${tileY0}:${poly.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';')}`,
    };
  }, [points]);

  // Load 3x3 Esri World Imagery satellite tiles onto a 768x768 CanvasTexture
  useEffect(() => {
    if (mode !== 'field') return;
    let cancelled = false;
    setSatStatus('loading');

    const tileSize = 256;
    const { zoom, tileX0, tileY0, gridCount } = geoProjection;
    const canvas = document.createElement('canvas');
    canvas.width = tileSize * gridCount;
    canvas.height = tileSize * gridCount;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setSatStatus('fallback');
      return;
    }
    ctx.fillStyle = '#2d3a2a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxTileIndex = Math.pow(2, zoom);
    const promises: Promise<boolean>[] = [];

    for (let dy = 0; dy < gridCount; dy++) {
      for (let dx = 0; dx < gridCount; dx++) {
        const tx = ((tileX0 + dx) % maxTileIndex + maxTileIndex) % maxTileIndex;
        const ty = tileY0 + dy;
        if (ty < 0 || ty >= maxTileIndex) continue;
        const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`;
        promises.push(
          new Promise<boolean>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (!cancelled) {
                ctx.drawImage(img, dx * tileSize, dy * tileSize, tileSize, tileSize);
              }
              resolve(true);
            };
            img.onerror = () => resolve(false);
            img.src = url;
          })
        );
      }
    }

    Promise.all(promises).then((results) => {
      if (cancelled) return;
      const loadedAny = results.some(Boolean);
      if (!loadedAny) {
        satTextureRef.current?.dispose();
        satTextureRef.current = null;
        setSatStatus('fallback');
        return;
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      satTextureRef.current?.dispose();
      satTextureRef.current = tex;
      setSatStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [geoProjection, mode]);

  // Populate WebGL Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: qualityTier === 'high', powerPreference: 'default' });
    } catch {
      setWebglUnsupported(true);
      return;
    }

    const width = container.clientWidth || 680;
    const height = 400;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualityTier === 'high' ? 2 : 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dbeafe');
    scene.fog = new THREE.Fog('#dbeafe', 18, 46);

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);

    // Natural sunlight + sky/ground ambient lighting
    const hemi = new THREE.HemisphereLight('#eff6ff', '#4b3828', 0.95);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fffbeb', 1.65);
    sun.position.set(8, 14, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 38;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);

    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    // Rain particle system
    const rainCount = 260;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 14;
      rainPos[i * 3 + 1] = Math.random() * 7;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: '#7dd3fc', size: 0.08, transparent: true, opacity: 0.75 });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    scene.add(rainPoints);

    // Pointer orbit interaction
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const dom = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitRef.current.theta -= dx * 0.008;
      orbitRef.current.phi = Math.max(0.05, Math.min(1.42, orbitRef.current.phi - dy * 0.008));
    };
    const onUp = () => {
      dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      orbitRef.current.radius = Math.max(
        modeRef.current === 'closeup' ? 2.2 : 4.0,
        Math.min(22, orbitRef.current.radius + e.deltaY * 0.006)
      );
    };
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 680;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Rebuild 3D geometry when structural biological progress, mode, polygon, or satellite texture changes
    let lastSig = '';
    const rebuildGeometry = () => {
      const s = simRef.current;
      const c = cropRef.current;
      const m = modeRef.current;
      const satState = satStatusRef.current;
      const prog = Math.max(0, Math.min(1, s.currentDay / Math.max(1, s.totalDays)));
      const bucket = Math.floor(prog * 30);
      const moistBucket = Math.round(s.soilMoisturePct / 15);
      const sig = `${m}|${c.id}|${bucket}|${moistBucket}|${s.soilPrepared}|${s.sown}|${s.weatherStressPct > 45}|${satState}|${geoProjection.sig}`;
      if (sig === lastSig) return;
      lastSig = sig;

      // Clear old dynamic children
      while (dynamicGroup.children.length > 0) {
        const ch = dynamicGroup.children[0];
        dynamicGroup.remove(ch);
      }

      const soilTex = createProceduralSoilTexture(s.soilMoisturePct);
      const leafTex = createLeafVeinTexture(s.weatherStressPct, prog);
      const soilMat = new THREE.MeshStandardMaterial({
        map: soilTex,
        roughness: 0.92,
        metalness: 0.02,
        transparent: satState === 'ready',
        opacity: satState === 'ready' ? 0.28 : 0.95,
      });
      const leafMat = new THREE.MeshStandardMaterial({
        map: leafTex,
        roughness: 0.58,
        side: THREE.DoubleSide,
      });

      if (m === 'field') {
        const polyPts = geoProjection.poly;

        // Geographically aligned Esri World Imagery satellite ground plane (with fallback terrain)
        const satMat =
          satState === 'ready' && satTextureRef.current
            ? new THREE.MeshStandardMaterial({
                map: satTextureRef.current,
                roughness: 0.96,
                metalness: 0.0,
              })
            : new THREE.MeshStandardMaterial({ color: '#9ca88f', roughness: 1.0 });

        const satGround = new THREE.Mesh(
          new THREE.PlaneGeometry(geoProjection.planeSize, geoProjection.planeSize),
          satMat
        );
        satGround.rotation.x = -Math.PI / 2;
        satGround.position.set(geoProjection.planeCenterX, 0, geoProjection.planeCenterZ);
        satGround.receiveShadow = true;
        dynamicGroup.add(satGround);

        // Actual GeoJSON field polygon surface tint (keeps satellite imagery visible underneath)
        const shape = new THREE.Shape();
        polyPts.forEach((pt, idx) => {
          if (idx === 0) shape.moveTo(pt.x, -pt.z);
          else shape.lineTo(pt.x, -pt.z);
        });
        shape.closePath();
        const parcelGeo = new THREE.ShapeGeometry(shape);
        parcelGeo.rotateX(-Math.PI / 2);
        const parcelMesh = new THREE.Mesh(parcelGeo, soilMat);
        parcelMesh.position.y = 0.015;
        parcelMesh.receiveShadow = true;
        dynamicGroup.add(parcelMesh);

        // Crisp glowing boundary outline aligned with the mapped field vertices
        const borderPts = [...polyPts, polyPts[0]].map((p) => new THREE.Vector3(p.x, 0.04, p.z));
        const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
        const borderLine = new THREE.Line(
          borderGeo,
          new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 2 })
        );
        dynamicGroup.add(borderLine);

        // Paddy standing water sheen if Paddy & moist
        if (c.visualType === 'paddy' && s.soilMoisturePct > 55) {
          const waterMat = new THREE.MeshStandardMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.34,
            roughness: 0.12,
          });
          const waterGeo = new THREE.ShapeGeometry(shape);
          waterGeo.rotateX(-Math.PI / 2);
          const waterMesh = new THREE.Mesh(waterGeo, waterMat);
          waterMesh.position.y = 0.028;
          dynamicGroup.add(waterMesh);
        }

        // Compute instanced crop plants strictly inside mapped polygon
        const insidePoly = (px: number, pz: number) => {
          let inside = false;
          for (let i = 0, j = polyPts.length - 1; i < polyPts.length; j = i++) {
            const xi = polyPts[i].x, zi = polyPts[i].z;
            const xj = polyPts[j].x, zj = polyPts[j].z;
            if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi + 1e-9) + xi) {
              inside = !inside;
            }
          }
          return inside;
        };

        const positions: Array<[number, number, number]> = [];
        const stepZ = qualityTier === 'high' ? 0.50 : 0.62;
        const stepX = qualityTier === 'high' ? 0.46 : 0.58;
        const { minX, maxX, minZ, maxZ } = geoProjection.bounds;
        for (let z = minZ; z <= maxZ; z += stepZ) {
          for (let x = minX; x <= maxX; x += stepX) {
            const jitterX = Math.sin(x * 13.7 + z * 7.3) * 0.05;
            const jitterZ = Math.cos(x * 5.1 + z * 19.1) * 0.05;
            const px = x + jitterX;
            const pz = z + jitterZ;
            if (insidePoly(px, pz)) {
              const varScale = 0.86 + (Math.sin(x * 31 + z * 17) * 0.5 + 0.5) * 0.28;
              positions.push([px, pz, varScale]);
            }
          }
        }
        setRenderedCount(positions.length);

        if (s.sown && prog >= 0.04 && positions.length > 0) {
          const droughtScale = s.weatherStressPct > 55 ? 0.78 : 1.0;
          const heightFactor = Math.min(1.0, Math.pow(prog, 0.75)) * droughtScale;
          const stalkH =
            c.visualType === 'tall_cereal' || c.visualType === 'cane'
              ? 0.25 + heightFactor * 1.35
              : 0.16 + heightFactor * 0.65;

          const stalkGeo = new THREE.CylinderGeometry(0.018, 0.032, stalkH, 6);
          const stalkMat = new THREE.MeshStandardMaterial({
            color: prog > 0.9 ? '#c8a951' : '#3f7d3a',
            roughness: 0.7,
          });
          const stalkInst = new THREE.InstancedMesh(stalkGeo, stalkMat, positions.length);
          stalkInst.castShadow = true;

          const leafGeo = buildCurvedLeafGeometry(0.15 + heightFactor * 0.42, 0.08 + heightFactor * 0.05, 0.55);
          const leavesPerPlant = prog < 0.2 ? 2 : prog < 0.5 ? 4 : 6;
          const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, positions.length * leavesPerPlant);
          leafInst.castShadow = true;

          const dummy = new THREE.Object3D();
          let lIdx = 0;
          positions.forEach(([px, pz, vs], idx) => {
            dummy.position.set(px, 0.14 + (stalkH * vs) / 2, pz);
            dummy.scale.set(vs, vs, vs);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            stalkInst.setMatrixAt(idx, dummy.matrix);

            for (let b = 0; b < leavesPerPlant; b++) {
              const fracY = 0.28 + (b / Math.max(1, leavesPerPlant)) * 0.65;
              dummy.position.set(px, 0.14 + stalkH * vs * fracY, pz);
              dummy.rotation.set(0.75 + (b % 2) * 0.25, (b / leavesPerPlant) * Math.PI * 2 + px, 0);
              dummy.scale.set(vs, vs, vs);
              dummy.updateMatrix();
              leafInst.setMatrixAt(lIdx++, dummy.matrix);
            }
          });
          dynamicGroup.add(stalkInst);
          dynamicGroup.add(leafInst);

          // Tassels / grain heads / fruits on instanced canopy when reproductive stage reached
          if (prog >= 0.56) {
            const headGeo =
              c.visualType === 'tall_cereal'
                ? new THREE.ConeGeometry(0.06, 0.24, 5)
                : c.visualType === 'paddy'
                  ? new THREE.SphereGeometry(0.075, 6, 5)
                  : new THREE.SphereGeometry(0.055, 6, 5);
            const headColor =
              c.visualType === 'paddy' || c.id === 'wheat'
                ? '#eab308'
                : c.id === 'maize'
                  ? '#facc15'
                  : c.id === 'tomato'
                    ? '#ef4444'
                    : '#f59e0b';
            const headMat = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.45 });
            const headInst = new THREE.InstancedMesh(headGeo, headMat, positions.length);
            positions.forEach(([px, pz, vs], idx) => {
              dummy.position.set(px, 0.14 + stalkH * vs + 0.05, pz);
              dummy.rotation.set(0, idx, 0);
              dummy.scale.set(vs, vs, vs);
              dummy.updateMatrix();
              headInst.setMatrixAt(idx, dummy.matrix);
            });
            dynamicGroup.add(headInst);
          }
        }
      } else {
        // MODE C — SEED-TO-HARVEST CLOSE-UP WITH TRANSLUCENT SOIL CUTAWAY & ROOTS
        setRenderedCount(1);
        const soilBlock = new THREE.Mesh(
          new THREE.BoxGeometry(2.6, 1.1, 2.6),
          new THREE.MeshStandardMaterial({
            map: soilTex,
            roughness: 0.94,
            transparent: true,
            opacity: prog < 0.25 ? 0.58 : 0.85,
          })
        );
        soilBlock.position.y = -0.55;
        soilBlock.receiveShadow = true;
        dynamicGroup.add(soilBlock);

        // Underground seed & root system (progressive emergence)
        const seedMat = new THREE.MeshStandardMaterial({
          color: c.id === 'maize' ? '#f59e0b' : '#b45309',
          roughness: 0.5,
        });
        const seedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), seedMat);
        seedMesh.scale.set(1.1, 0.85, 0.7);
        seedMesh.position.set(0, -0.22, 0);
        dynamicGroup.add(seedMesh);

        if (prog >= 0.03) {
          // Primary radicle + progressive lateral root branches
          const rootMat = new THREE.MeshStandardMaterial({ color: '#e7d5b8', roughness: 0.75 });
          const rootDepth = Math.min(0.75, 0.12 + prog * 1.4);
          const primaryRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.006, rootDepth, 8), rootMat);
          primaryRoot.position.set(0, -0.22 - rootDepth / 2, 0);
          dynamicGroup.add(primaryRoot);

          const lateralCount = Math.min(12, Math.floor(prog * 22));
          for (let r = 0; r < lateralCount; r++) {
            const angle = (r / Math.max(1, lateralCount)) * Math.PI * 2 + r * 0.6;
            const lRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.003, 0.22 + (r % 3) * 0.1, 6), rootMat);
            lRoot.position.set(Math.cos(angle) * 0.14, -0.28 - (r % 5) * 0.11, Math.sin(angle) * 0.14);
            lRoot.rotation.z = Math.cos(angle) * 0.9;
            lRoot.rotation.x = Math.sin(angle) * 0.9;
            dynamicGroup.add(lRoot);
          }

          // Underground tubers / groundnut pods when potato or groundnut reaches R4+
          if ((c.visualType === 'root' || c.id === 'potato' || c.id === 'groundnut') && prog >= 0.52) {
            const podCount = prog >= 0.8 ? 5 : 3;
            const podMat = new THREE.MeshStandardMaterial({
              color: c.id === 'potato' ? '#c28b4e' : '#d6b47c',
              roughness: 0.8,
            });
            for (let p = 0; p < podCount; p++) {
              const a = (p / podCount) * Math.PI * 2;
              const pod = new THREE.Mesh(new THREE.SphereGeometry(0.09 + prog * 0.04, 10, 8), podMat);
              pod.scale.set(1.3, 0.85, 0.9);
              pod.position.set(Math.cos(a) * 0.28, -0.34 - (p % 2) * 0.08, Math.sin(a) * 0.28);
              dynamicGroup.add(pod);
            }
          }
        }

        // Above-ground Coleoptile -> Progressive Nodes -> Leaves -> Reproductive Organs
        if (prog >= 0.055) {
          const dFactor = s.weatherStressPct > 55 ? 0.8 : 1.0;
          const aboveProg = (prog - 0.055) / 0.945;

          if (c.id === 'maize' || c.visualType === 'tall_cereal') {
            const stalkH = (0.14 + Math.min(1.0, aboveProg * 1.15) * 1.85) * dFactor;
            const stalkGeo = new THREE.CylinderGeometry(0.032, 0.056, stalkH, 10);
            const stalkMat = new THREE.MeshStandardMaterial({
              color: prog > 0.9 ? '#c8a951' : '#3a7d34',
              roughness: 0.65,
            });
            const stalk = new THREE.Mesh(stalkGeo, stalkMat);
            stalk.position.y = stalkH / 2 - 0.05;
            stalk.castShadow = true;
            dynamicGroup.add(stalk);

            // Alternating progressive Maize leaves (V1 -> V14)
            const totalLeaves = Math.min(12, Math.max(1, Math.floor(1 + aboveProg * 13)));
            for (let l = 0; l < totalLeaves; l++) {
              const nodeY = 0.06 + (l / 12) * (stalkH * 0.88);
              const side = l % 2 === 0 ? 1 : -1;
              const lLen = (0.35 + (1 - Math.abs(l - 6) / 8) * 0.45) * Math.min(1.0, aboveProg * 1.8);
              const lGeom = buildCurvedLeafGeometry(lLen, 0.14, 0.65);
              const lMesh = new THREE.Mesh(lGeom, leafMat);
              lMesh.position.set(0, nodeY, 0);
              lMesh.rotation.y = side > 0 ? 0.2 : Math.PI - 0.2;
              lMesh.rotation.x = 0.85 + (s.weatherStressPct > 55 ? 0.25 : 0);
              lMesh.castShadow = true;
              dynamicGroup.add(lMesh);
            }

            // VT Tassel emergence (~56%+)
            if (prog >= 0.56) {
              const tasselMat = new THREE.MeshStandardMaterial({ color: '#e2c96b', roughness: 0.7 });
              for (let b = 0; b < 5; b++) {
                const br = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.32, 6), tasselMat);
                br.position.set(Math.cos(b * 1.2) * 0.06, stalkH + 0.08, Math.sin(b * 1.2) * 0.06);
                br.rotation.z = Math.cos(b * 1.2) * 0.45;
                br.rotation.x = Math.sin(b * 1.2) * 0.45;
                dynamicGroup.add(br);
              }
            }

            // R1-R6 Ear + Silk + Kernels (~62%+)
            if (prog >= 0.62) {
              const earScale = Math.min(1.0, (prog - 0.62) / 0.25);
              const huskMat = new THREE.MeshStandardMaterial({
                color: prog > 0.91 ? '#d4b46a' : '#4d8b3c',
                roughness: 0.72,
              });
              const ear = new THREE.Mesh(
                new THREE.CylinderGeometry(0.045 * earScale, 0.068 * earScale, 0.36 * earScale, 10),
                huskMat
              );
              ear.position.set(0.11, stalkH * 0.52, 0.04);
              ear.rotation.z = -0.38;
              dynamicGroup.add(ear);

              // Visible golden kernel window on ear (R3-R6)
              if (prog >= 0.74) {
                const kMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.4 });
                const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * earScale, 0.055 * earScale, 0.26 * earScale, 10), kMat);
                cob.position.set(0.125, stalkH * 0.54, 0.048);
                cob.rotation.z = -0.38;
                dynamicGroup.add(cob);
              }

              // Silks at R1-R2
              if (prog >= 0.62 && prog <= 0.85) {
                const silkMat = new THREE.MeshStandardMaterial({
                  color: prog > 0.74 ? '#92400e' : '#fef08a',
                  roughness: 0.8,
                });
                const silk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), silkMat);
                silk.position.set(0.18, stalkH * 0.66, 0.06);
                silk.rotation.z = -0.5;
                dynamicGroup.add(silk);
              }
            }
          } else {
            // Non-maize crops: Paddy tillering + panicles, Wheat, or branching dicot (Tomato/Potato/Chilli/etc.)
            const tillerCount = c.visualType === 'paddy' ? Math.min(5, Math.max(1, Math.floor(1 + aboveProg * 5))) : 1;
            const stemH = 0.2 + Math.min(1.0, aboveProg * 1.1) * 1.15 * dFactor;
            for (let t = 0; t < tillerCount; t++) {
              const offsetAngle = (t / tillerCount) * Math.PI * 2;
              const ox = tillerCount > 1 ? Math.cos(offsetAngle) * 0.09 : 0;
              const oz = tillerCount > 1 ? Math.sin(offsetAngle) * 0.09 : 0;
              const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(0.018, 0.035, stemH, 8),
                new THREE.MeshStandardMaterial({ color: prog > 0.9 ? '#c8a951' : '#3a7d34' })
              );
              stem.position.set(ox, stemH / 2 - 0.04, oz);
              if (tillerCount > 1) stem.rotation.z = (ox > 0 ? -1 : 1) * 0.15;
              dynamicGroup.add(stem);
            }
            const leafCount = Math.min(10, Math.max(2, Math.floor(2 + aboveProg * 9)));
            for (let l = 0; l < leafCount; l++) {
              const lm = new THREE.Mesh(buildCurvedLeafGeometry(0.28 + aboveProg * 0.25, 0.16, 0.6), leafMat);
              lm.position.set(0, 0.08 + (l / 10) * (stemH * 0.82), 0);
              lm.rotation.y = (l * 2.399) % (Math.PI * 2);
              lm.rotation.x = 0.72;
              dynamicGroup.add(lm);
            }
            if (prog >= 0.56) {
              const isFlowering = prog < 0.75;
              const col = isFlowering
                ? '#fde047'
                : c.id === 'tomato'
                  ? '#ef4444'
                  : c.id === 'paddy' || c.id === 'wheat'
                    ? '#eab308'
                    : '#f97316';
              const organCount = 4;
              const om = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 });
              for (let o = 0; o < organCount; o++) {
                const a = (o / organCount) * Math.PI * 2;
                const organ = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), om);
                organ.position.set(Math.cos(a) * 0.18, stemH * 0.75 + (o % 2) * 0.12, Math.sin(a) * 0.18);
                dynamicGroup.add(organ);
              }
            }
          }
        }
      }
    };

    let rafId = 0;
    let frames = 0;
    let lastFpsTick = performance.now();
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      rebuildGeometry();

      const t = clock.getElapsedTime();
      const s = simRef.current;

      // Natural wind-responsive sway
      const windAmp = s.scenario === 'strong_winds' ? 0.05 : 0.014;
      dynamicGroup.rotation.z = Math.sin(t * 1.9) * windAmp;

      // Rain animation when weather scenario involves rain
      const isRaining = s.scenario === 'excessive_rain' || s.scenario === 'unseasonal_rain';
      rainPoints.visible = isRaining;
      if (isRaining) {
        const attr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          let ry = attr.getY(i) - 0.16;
          if (ry < 0) ry = 7.0;
          attr.setY(i, ry);
        }
        attr.needsUpdate = true;
      }

      // Camera orbit positioning
      const { theta, phi, radius } = orbitRef.current;
      const targetY = modeRef.current === 'closeup' ? 0.45 : 0.15;
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi) + targetY,
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, targetY, 0);

      renderer.render(scene, camera);

      frames++;
      const nowMs = performance.now();
      if (nowMs - lastFpsTick >= 1000) {
        setFps(Math.round((frames * 1000) / (nowMs - lastFpsTick)));
        frames = 0;
        lastFpsTick = nowMs;
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [geoProjection, qualityTier]);

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border border-[#DCD8CA] dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm ${
        isFullscreen ? 'flex flex-col h-screen' : ''
      }`}
    >
      <div className="p-4 border-b border-[#E9E5D8] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {mode === 'field' ? (
            <Satellite className="w-4 h-4 text-[#36784D]" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#36784D]" />
          )}
          <div>
            <div className="font-bold text-sm text-[#20372A] dark:text-white">
              {mode === 'field' ? L.satGroundTitle : t('twinModeCloseupTitle')}
            </div>
            <div className="text-[11px] text-zinc-500">
              {localizeCropName(crop.name, language)} · {L.dayWord} {sim.currentDay}/{sim.totalDays} ({Math.round(progress * 100)}%) · {t('twinOrbitHint')}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {mode === 'field' && (
            <>
              <button
                type="button"
                onClick={() => handleSwitchPerspective('angled')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
                  cameraView === 'angled'
                    ? 'bg-[#173C2B] text-white border-[#173C2B]'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Compass className="w-3 h-3" />
                {L.angledView}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPerspective('overhead')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
                  cameraView === 'overhead'
                    ? 'bg-[#173C2B] text-white border-[#173C2B]'
                    : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Eye className="w-3 h-3" />
                {L.overheadView}
              </button>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 font-semibold">
                {t('twinEstFieldStand')}: {estimatedPopulation.toLocaleString(numLocale)} {L.plantsWord} · {t('twinRenderedSample')}: {renderedCount}
              </span>
            </>
          )}
          <span className="px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
            {webglUnsupported ? L.webglFallback : `${fps} FPS`}
          </span>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? L.exitFullscreen : L.fullscreen}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {webglUnsupported ? (
        <div className="p-8 text-center text-xs text-zinc-500">
          {L.webglErr}
        </div>
      ) : (
        <div className={`relative w-full ${isFullscreen ? 'flex-1 min-h-[420px]' : 'h-[420px]'}`}>
          <div ref={mountRef} className="w-full h-full bg-sky-100 cursor-grab active:cursor-grabbing" />

          {/* Satellite Ground Status & Attribution Overlay */}
          {mode === 'field' && (
            <>
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-zinc-950/75 text-white text-[11px] font-medium flex items-center gap-1.5 pointer-events-none">
                <span
                  className={`w-2 h-2 rounded-full ${
                    satStatus === 'ready'
                      ? 'bg-emerald-400'
                      : satStatus === 'loading'
                        ? 'bg-amber-400 animate-pulse'
                        : 'bg-rose-400'
                  }`}
                />
                <span>
                  {satStatus === 'ready'
                    ? L.satReady
                    : satStatus === 'loading'
                      ? L.satLoading
                      : L.satFallback}
                </span>
              </div>

              <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 rounded bg-zinc-950/70 text-[10px] text-zinc-200 pointer-events-none">
                {L.satAttribution}
              </div>
            </>
          )}
        </div>
      )}

      {/* Unified Synchronized Telemetry HUD */}
      {mode === 'field' && (
        <div className="px-4 py-2.5 bg-white dark:bg-zinc-950 border-t border-[#E9E5D8] dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.healthLbl}</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">{Math.round(sim.cropHealthPct)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.modeledMoisture}</div>
            <div className="font-bold text-sky-700 dark:text-sky-400">{Math.round(sim.soilMoisturePct)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.stressLbl}</div>
            <div className="font-bold text-amber-700 dark:text-amber-400">{Math.round(sim.weatherStressPct)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.pestLbl}</div>
            <div className="font-bold text-rose-700 dark:text-rose-400">{Math.round(sim.pestPressurePct)}%</div>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.yieldLbl}</div>
            <div className="font-bold text-zinc-900 dark:text-white">
              {projectedYieldKg !== undefined ? `${Math.round(projectedYieldKg).toLocaleString(numLocale)} kg` : '—'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#F7F5ED] dark:bg-zinc-900">
            <div className="text-zinc-500">{L.profitLbl}</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-400">
              {projectedProfitInr !== undefined ? `₹${Math.round(projectedProfitInr).toLocaleString(numLocale)}` : '—'}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-2.5 bg-[#F7F5ED] dark:bg-zinc-900 border-t border-[#E9E5D8] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-sky-600" />
          {L.modeledMoisture} <strong>{Math.round(sim.soilMoisturePct)}%</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-emerald-700" />
          {L.weatherScenario} <strong>{localizeCondition(sim.scenario.replace(/_/g, ' '), language)}</strong>
          {estimatedHarvestDate ? ` · ${estimatedHarvestDate}` : ''}
        </span>
        <span className="italic">
          {mode === 'field' ? L.satSimLabel : t('twinSimulatedNote')}
        </span>
      </div>
    </div>
  );
}
