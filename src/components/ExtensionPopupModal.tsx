import React from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  Database,
  CheckCircle2,
  Download,
  Code,
  Shield,
  X,
  ExternalLink,
  Sliders,
  Settings,
} from 'lucide-react';
import { WebsiteData, VoiceSettings, VoiceName } from '../types/extension';

interface ExtensionPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSite: WebsiteData;
  totalFieldsCount: number;
  completedFieldsCount: number;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: VoiceSettings) => void;
  onStartVoiceForm: () => void;
  onReadPageAloud: () => void;
  onOpenVault: () => void;
  onOpenDownload: () => void;
  userEmail?: string | null;
}

export const ExtensionPopupModal: React.FC<ExtensionPopupModalProps> = ({
  isOpen,
  onClose,
  currentSite,
  totalFieldsCount,
  completedFieldsCount,
  voiceSettings,
  onUpdateVoiceSettings,
  onStartVoiceForm,
  onReadPageAloud,
  onOpenVault,
  onOpenDownload,
  userEmail,
}) => {
  if (!isOpen) return null;

  const voices: { id: VoiceName; label: string; desc: string }[] = [
    { id: 'Kore', label: 'Kore', desc: 'Natural & Balanced' },
    { id: 'Puck', label: 'Puck', desc: 'Expressive & Bright' },
    { id: 'Charon', label: 'Charon', desc: 'Calm & Deep' },
    { id: 'Fenrir', label: 'Fenrir', desc: 'Authoritative' },
    { id: 'Zephyr', label: 'Zephyr', desc: 'Upbeat & Clear' },
  ];

  return (
    <div className="fixed top-14 right-10 z-50 animate-fadeIn">
      {/* Chrome Extension Popup Container (standard 340px) */}
      <div className="w-80 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Voice Form Assistant</h3>
              <p className="text-[11px] text-indigo-200">Chrome Extension Companion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-indigo-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Tab Details */}
        <div className="p-4 space-y-3.5">
          <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Active Tab:</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Connected
              </span>
            </div>
            <p className="font-semibold text-xs text-slate-100 truncate">
              {currentSite.title}
            </p>
            <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
              {currentSite.url}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-300">Form Fields:</span>
              <span className="font-bold text-indigo-400">
                {completedFieldsCount} / {totalFieldsCount} Filled
              </span>
            </div>
          </div>

          {/* Quick Voice Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onStartVoiceForm();
                onClose();
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 shadow transition-all"
            >
              <Mic className="w-4 h-4 text-emerald-300" />
              <span>Voice Form Fill</span>
            </button>

            <button
              onClick={() => {
                onReadPageAloud();
                onClose();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs p-2.5 rounded-xl border border-slate-700 flex flex-col items-center justify-center gap-1.5 transition-all"
            >
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Read Aloud</span>
            </button>
          </div>

          {/* English Voice & Accent Settings */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> English Accent:
              </span>
              <select
                value={voiceSettings.englishDialect}
                onChange={(e) =>
                  onUpdateVoiceSettings({
                    ...voiceSettings,
                    englishDialect: e.target.value as any,
                  })
                }
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              >
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="en-IN">🇮🇳 English (India)</option>
                <option value="en-GB">🇬🇧 English (UK)</option>
                <option value="en-AU">🇦🇺 English (Australia)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span>Google Persona:</span>
              <select
                value={voiceSettings.voiceName}
                onChange={(e) =>
                  onUpdateVoiceSettings({
                    ...voiceSettings,
                    voiceName: e.target.value as VoiceName,
                  })
                }
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
              >
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label} ({v.desc})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Confirmation Mode:</span>
              <button
                onClick={() =>
                  onUpdateVoiceSettings({
                    ...voiceSettings,
                    autoConfirm: !voiceSettings.autoConfirm,
                  })
                }
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  !voiceSettings.autoConfirm
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {!voiceSettings.autoConfirm ? 'Ask "Is that correct?"' : 'Auto Fill'}
              </button>
            </div>
          </div>

          {/* Firebase Persistence Status */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <div>
                <span className="text-slate-300 font-medium">Firebase Storage</span>
                <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {userEmail || 'Active & Synced'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onOpenVault();
                onClose();
              }}
              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold underline"
            >
              Vault
            </button>
          </div>

          {/* Download & Source Code Buttons */}
          <div className="pt-1 flex gap-2">
            <button
              onClick={() => {
                onOpenDownload();
                onClose();
              }}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs py-2 px-3 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Get Chrome Extension</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
