import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ScannedFile, MediaInfo } from '@/lib/ai/schema';
import type { OutputMode } from '@/lib/renamer';

export interface Preset {
  id: string;
  name: string;
  outputMode: OutputMode;
  minSize: number;
  apiKey: string;
  baseUrl: string;
  model: string;
  tmdbApiKey?: string;
}

export interface AppConfig {
  scanPath: string;
  outputDir: string;
  // Current active preset settings (mixed into config for easier usage)
  outputMode: OutputMode;
  minSize: number;
  apiKey: string;
  baseUrl: string;
  model: string;
  tmdbApiKey?: string;
}

interface AppState {
  // Configuration
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;

  // Presets Management
  presets: Preset[];
  addPreset: (preset: Omit<Preset, 'id'>) => void;
  updatePreset: (id: string, updates: Partial<Preset>) => void;
  removePreset: (id: string) => void;
  applyPreset: (id: string) => void;

  // Task Management
  files: ScannedFile[];
  setFiles: (files: ScannedFile[]) => void;
  updateFile: (id: string, updates: Partial<ScannedFile>) => void;
  removeFile: (id: string) => void;
  
  // UI State
  isScanning: boolean;
  isProcessing: boolean;
  setScanning: (status: boolean) => void;
  setProcessing: (status: boolean) => void;
}

const DEFAULT_PRESET: Omit<Preset, 'id'> = {
  name: 'Default',
  outputMode: 'link',
  minSize: 50,
  apiKey: '',
  baseUrl: '',
  model: 'gpt-3.5-turbo',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: {
        scanPath: '',
        outputDir: '',
        ...DEFAULT_PRESET,
      },
      updateConfig: (updates) => 
        set((state) => ({ config: { ...state.config, ...updates } })),

      presets: [],
      addPreset: (preset) =>
        set((state) => ({
          presets: [
            ...state.presets,
            { ...preset, id: crypto.randomUUID() },
          ],
        })),
      updatePreset: (id, updates) =>
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removePreset: (id) =>
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        })),
      applyPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set((state) => ({
            config: {
              ...state.config,
              outputMode: preset.outputMode,
              minSize: preset.minSize,
              apiKey: preset.apiKey,
              baseUrl: preset.baseUrl,
              model: preset.model,
              tmdbApiKey: preset.tmdbApiKey,
            },
          }));
        }
      },

      files: [],
      setFiles: (files) => set({ files }),
      updateFile: (id, updates) =>
        set((state) => ({
          files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
      removeFile: (id) =>
        set((state) => ({
          files: state.files.filter((f) => f.id !== id),
        })),

      isScanning: false,
      isProcessing: false,
      setScanning: (status) => set({ isScanning: status }),
      setProcessing: (status) => set({ isProcessing: status }),
    }),
    {
      name: 're-aniname-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      partialize: (state) => ({
        config: state.config,
        presets: state.presets,
      }), // Only persist config and presets
    }
  )
);
