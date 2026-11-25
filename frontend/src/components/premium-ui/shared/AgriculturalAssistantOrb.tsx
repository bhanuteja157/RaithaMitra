// frontend/src/components/premium-ui/shared/AgriculturalAssistantOrb.tsx
'use client';

import React from 'react';
import { Sprout, MicOff } from 'lucide-react';

export type AssistantOrbState = 'idle' | 'listening' | 'processing' | 'speaking';

export interface AgriculturalAssistantOrbProps {
  state: AssistantOrbState;
  voiceAvailable?: boolean;
  statusLabel?: string;
}

export function AgriculturalAssistantOrb({
  state,
  voiceAvailable = false,
  statusLabel,
}: AgriculturalAssistantOrbProps) {
  const isAudioActive = voiceAvailable && (state === 'listening' || state === 'processing');
  const isAnimating = state !== 'idle';

  const defaultLabel =
    state === 'listening'
      ? voiceAvailable
        ? 'Listening to farmer query...'
        : 'Voice input unavailable'
      : state === 'processing'
        ? 'Analyzing farm context...'
        : state === 'speaking'
          ? 'Delivering guidance...'
          : 'Assistant ready';

  return (
    <div className="inline-flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-[#E9E5D8] dark:border-zinc-800 bg-[#F7F5ED] dark:bg-zinc-900">
      <div
        className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
          isAnimating ? 'rm-orb-active' : ''
        }`}
        style={{
          background:
            state === 'idle'
              ? 'linear-gradient(135deg, #173C2B 0%, #36784D 100%)'
              : 'linear-gradient(135deg, #36784D 0%, #65A76F 100%)',
        }}
        aria-label={`Agricultural Assistant (${state})`}
      >
        <Sprout className="w-5 h-5 text-white" />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-[#26332B] dark:text-zinc-100">
          RaithaMitra Assistant
        </div>
        <div className="text-[11px] text-[#8D7357] dark:text-zinc-400 flex items-center gap-1.5">
          <span>{statusLabel || defaultLabel}</span>
          {!voiceAvailable && state === 'listening' && <MicOff className="w-3 h-3 text-zinc-500" />}
        </div>
      </div>

      {/* Sound waves shown ONLY when genuinely listening or processing audio */}
      {isAudioActive && (
        <div className="flex items-center gap-0.5 h-5 ml-1" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="w-1 h-4 rounded-full bg-[#36784D] rm-wave-bar"
              style={{ animationDelay: `${i * 0.14}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
