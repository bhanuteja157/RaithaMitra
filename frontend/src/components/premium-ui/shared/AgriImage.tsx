// frontend/src/components/premium-ui/shared/AgriImage.tsx
'use client';

import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

export const AGRI_IMAGE_ASSETS = {
  heroSunrise: '/images/agriculture/indian-farmland-sunrise.jpg',
  satelliteFarmland: '/images/agriculture/satellite-farmland.jpg',
  roleFarmer: '/images/roles/role-farmer.jpg',
  roleBuyer: '/images/features/nursery.jpg',
  roleLabour: '/images/roles/role-labour.jpg',
  roleDriver: '/images/agriculture/satellite-farmland.jpg',
  featureBiointel: '/images/features/biointel.jpg',
  featureNursery: '/images/features/nursery.jpg',
  featureLabour: '/images/roles/role-labour.jpg',
  featureBidding: '/images/crops/wheat.jpg',
  featureTransport: '/images/agriculture/indian-farmland-sunrise.jpg',
  crops: {
    tomato: '/images/features/nursery.jpg',
    maize: '/images/crops/maize.jpg',
    paddy: '/images/crops/paddy.jpg',
    wheat: '/images/crops/wheat.jpg',
    chilli: '/images/features/biointel.jpg',
    onion: '/images/crops/paddy.jpg',
    potato: '/images/crops/maize.jpg',
    banana: '/images/agriculture/indian-farmland-sunrise.jpg',
    mango: '/images/agriculture/indian-farmland-sunrise.jpg',
    grapes: '/images/features/nursery.jpg',
    cotton: '/images/crops/wheat.jpg',
    sugarcane: '/images/crops/maize.jpg',
  } as Record<string, string>,
};

interface AgriImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  aspectClass?: string;
  priority?: boolean;
}

export function AgriImage({
  src,
  alt,
  fallbackSrc = AGRI_IMAGE_ASSETS.heroSunrise,
  className = '',
  aspectClass = 'aspect-video',
  priority = false,
}: AgriImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  return (
    <div
      className={`relative overflow-hidden bg-emerald-950/10 dark:bg-zinc-800 ${aspectClass} ${className}`}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-emerald-900/10 dark:bg-zinc-800" />
      )}
      {failed ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900 to-emerald-800 text-emerald-100 p-4 text-center">
          <Sprout className="w-7 h-7 mb-1 opacity-80" />
          <span className="text-[11px] font-medium opacity-90">{alt}</span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (imgSrc !== fallbackSrc) {
              setImgSrc(fallbackSrc);
            } else {
              setFailed(true);
            }
          }}
          className={`w-full h-full object-cover rm-img-zoom transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
