// frontend/src/lib/geminiLiveVoice.ts
// Official @google/genai Browser Live API + Real Microphone Capture + Native Audio Playback.
'use client';

import { GoogleGenAI, Modality } from '@google/genai';
import {
  AssistantChatResponse,
  executeLiveTool,
  fetchLiveEphemeralToken,
} from '@/lib/assistantApi';

export type LiveOrbState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'navigating';

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = window.atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function int16ToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return window.btoa(bin);
}

function downsampleTo16k(input: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < out.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return out;
}

let activeWavAudio: HTMLAudioElement | null = null;

export function stopWavAudio(): void {
  if (activeWavAudio) {
    try {
      activeWavAudio.pause();
      activeWavAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeWavAudio = null;
  }
}

export async function playWavBase64(
  base64Audio: string,
  mimeType = 'audio/wav',
  muted = false,
  callbacks?: { onStart?: () => void; onEnd?: () => void }
): Promise<void> {
  stopWavAudio();
  if (muted || !base64Audio || typeof window === 'undefined') {
    callbacks?.onEnd?.();
    return;
  }
  const bytes = base64ToUint8Array(base64Audio);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  activeWavAudio = audio;
  audio.onplay = () => callbacks?.onStart?.();
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (activeWavAudio === audio) activeWavAudio = null;
    callbacks?.onEnd?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (activeWavAudio === audio) activeWavAudio = null;
    callbacks?.onEnd?.();
  };
  await audio.play();
}

export class GeminiLiveVoiceSession {
  private session: any = null;
  private mediaStream: MediaStream | null = null;
  private captureCtx: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private playbackCtx: AudioContext | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlayTime = 0;
  private muted = false;
  private closed = false;

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.interruptPlayback();
  }

  interruptPlayback() {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.playbackCtx) {
      this.nextPlayTime = this.playbackCtx.currentTime;
    }
  }

  private playPcm24k(base64Pcm: string, onPlaybackState?: (speaking: boolean) => void) {
    if (this.muted || this.closed || !base64Pcm) return;
    if (!this.playbackCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackCtx = new AudioCtx({ sampleRate: 24000 });
      this.nextPlayTime = this.playbackCtx.currentTime;
    }
    const ctx = this.playbackCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const raw = base64ToUint8Array(base64Pcm);
    const int16 = new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 2));
    if (int16.length === 0) return;

    const audioBuffer = ctx.createBuffer(1, int16.length, 24000);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < int16.length; i++) {
      channel[i] = int16[i] / 32768;
    }

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime + 0.02, this.nextPlayTime);
    this.nextPlayTime = startAt + audioBuffer.duration;
    this.activeSources.push(src);
    onPlaybackState?.(true);

    src.onended = () => {
      this.activeSources = this.activeSources.filter((s) => s !== src);
      if (this.activeSources.length === 0 && !this.closed) {
        onPlaybackState?.(false);
      }
    };
    src.start(startAt);
  }

  async start(opts: {
    authToken: string;
    farmId?: string | null;
    conversationId?: string | null;
    language: 'en' | 'kn' | 'hi' | 'te';
    muted: boolean;
    onStateChange: (state: LiveOrbState) => void;
    onMicLevel: (level: number) => void;
    onInputTranscript: (text: string) => void;
    onOutputTranscript: (text: string) => void;
    onToolResult: (res: AssistantChatResponse) => void;
    onError: (message: string) => void;
  }): Promise<void> {
    this.closed = false;
    this.muted = opts.muted;
    opts.onStateChange('connecting');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone API is unavailable in this browser context.');
    }

    const tokenInfo = await fetchLiveEphemeralToken(
      { farm_id: opts.farmId, language: opts.language },
      opts.authToken
    );

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    this.mediaStream = stream;

    const ai = new GoogleGenAI({
      httpOptions: { apiVersion: 'v1beta' },
      apiKey: tokenInfo.token,
    });

    const session = await ai.live.connect({
      model: tokenInfo.model,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: tokenInfo.system_instruction,
        tools: tokenInfo.tools as any,
      },
      callbacks: {
        onopen: () => {
          if (!this.closed) opts.onStateChange('listening');
        },
        onmessage: async (msg: any) => {
          if (this.closed) return;
          const sc = msg?.serverContent;
          if (sc) {
            if (sc.interrupted) {
              this.interruptPlayback();
              opts.onStateChange('listening');
            }
            if (sc.inputTranscription?.text) {
              opts.onInputTranscript(sc.inputTranscription.text);
            }
            if (sc.outputTranscription?.text) {
              opts.onOutputTranscript(sc.outputTranscription.text);
            }
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part?.inlineData?.data) {
                  this.playPcm24k(part.inlineData.data, (speaking) => {
                    if (!this.closed) opts.onStateChange(speaking ? 'speaking' : 'listening');
                  });
                }
              }
            }
            if (sc.turnComplete && this.activeSources.length === 0) {
              opts.onStateChange('listening');
            }
          }

          if (msg?.toolCall?.functionCalls?.length) {
            opts.onStateChange('thinking');
            const functionResponses: any[] = [];
            for (const fc of msg.toolCall.functionCalls) {
              try {
                const res = await executeLiveTool(
                  {
                    tool_name: fc.name,
                    arguments: fc.args || {},
                    farm_id: opts.farmId,
                    conversation_id: opts.conversationId,
                    language: opts.language,
                  },
                  opts.authToken
                );
                opts.onToolResult(res);
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: {
                    reply: res.reply,
                    intent: res.intent,
                    language: res.language,
                    provenance: res.provenance,
                    cards: res.cards,
                    pending_action: res.pending_action,
                  },
                });
              } catch (err: any) {
                functionResponses.push({
                  id: fc.id,
                  name: fc.name,
                  response: { error: err?.message || 'Tool execution failed' },
                });
              }
            }
            try {
              this.session?.sendToolResponse({ functionResponses });
            } catch {
              // ignore if session closing
            }
          }
        },
        onerror: (err: any) => {
          opts.onError(err?.message || 'Gemini Live connection error');
        },
        onclose: () => {
          if (!this.closed) {
            this.stop();
            opts.onStateChange('idle');
          }
        },
      },
    });
    this.session = session;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const captureCtx = new AudioCtx();
    this.captureCtx = captureCtx;
    const source = captureCtx.createMediaStreamSource(stream);
    const processor = captureCtx.createScriptProcessor(4096, 1, 1);
    this.processorNode = processor;

    processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.closed || !this.session) return;
      const input = event.inputBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / Math.max(1, input.length));
      opts.onMicLevel(Math.min(1, rms * 6));

      const pcm16k = downsampleTo16k(input, captureCtx.sampleRate);
      const b64 = int16ToBase64(pcm16k);
      try {
        this.session.sendRealtimeInput({
          audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
        });
      } catch {
        // ignore closed socket race
      }
    };

    source.connect(processor);
    processor.connect(captureCtx.destination);
  }

  sendTextTurn(text: string) {
    if (!this.session || this.closed || !text.trim()) return;
    this.interruptPlayback();
    this.session.sendRealtimeInput({ text: text.trim() });
  }

  endSpeechBurst() {
    if (!this.session || this.closed) return;
    try {
      this.session.sendRealtimeInput({ audioStreamEnd: true });
    } catch {
      // ignore
    }
  }

  stop() {
    this.closed = true;
    this.interruptPlayback();
    try {
      this.processorNode?.disconnect();
    } catch {
      // ignore
    }
    this.processorNode = null;
    try {
      this.captureCtx?.close();
    } catch {
      // ignore
    }
    this.captureCtx = null;
    if (this.mediaStream) {
      for (const t of this.mediaStream.getTracks()) t.stop();
      this.mediaStream = null;
    }
    try {
      this.session?.close();
    } catch {
      // ignore
    }
    this.session = null;
  }
}

export class AudioClipRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: BlobPart[] = [];

  async start(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone recording is unavailable in this browser.');
    }
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : undefined;
    const rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder = rec;
    rec.start(250);
  }

  async stop(): Promise<Blob> {
    const rec = this.recorder;
    if (!rec) return new Blob();
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        const mime = rec.mimeType || 'audio/webm';
        resolve(new Blob(this.chunks, { type: mime }));
      };
      if (rec.state !== 'inactive') rec.stop();
      else resolve(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }));
    });
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.recorder = null;
    return blob;
  }

  cancel() {
    try {
      if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
    } catch {
      // ignore
    }
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.recorder = null;
    this.chunks = [];
  }
}
