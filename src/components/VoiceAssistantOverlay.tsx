import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  UserCheck,
  Radio,
  Settings,
  Eye,
  Bell,
  Keyboard,
  ArrowLeft,
  Volume1,
  Languages,
} from 'lucide-react';
import { FormField, VoiceSettings, VoiceName, EnglishDialect } from '../types/extension';
import { AudioWaveform } from './AudioWaveform';

interface VoiceAssistantOverlayProps {
  currentField: FormField | null;
  currentFieldIndex: number | null;
  totalFields: number;
  completedFieldsCount: number;
  isSpeaking: boolean;
  isListening: boolean;
  assistantPrompt: string;
  userTranscript: string;
  pendingValue: string | null;
  isAwaitingConfirmation: boolean;
  isAwaitingSubmitConfirmation?: boolean;
  onConfirmSubmit?: () => void;
  onCancelSubmit?: () => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: VoiceSettings) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onConfirmValue: (value: string) => void;
  onRetryField: () => void;
  onSkipField: () => void;
  onPreviousField: () => void;
  onReadPageAloud: () => void;
  onReadCurrentField: () => void;
  onStopAllAudio: () => void;
  onAutofillFromProfile: () => void;
  hasProfileData: boolean;
  onSimulateSpeech: (text: string) => void;
  onAskHelp: () => void;
  onWhereAmI: () => void;
  onPreviewVoice: (voice: VoiceName, dialect: EnglishDialect) => void;
}

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  currentField,
  currentFieldIndex,
  totalFields,
  completedFieldsCount,
  isSpeaking,
  isListening,
  assistantPrompt,
  userTranscript,
  pendingValue,
  isAwaitingConfirmation,
  isAwaitingSubmitConfirmation = false,
  onConfirmSubmit,
  onCancelSubmit,
  voiceSettings,
  onUpdateVoiceSettings,
  onStartListening,
  onStopListening,
  onConfirmValue,
  onRetryField,
  onSkipField,
  onPreviousField,
  onReadPageAloud,
  onReadCurrentField,
  onStopAllAudio,
  onAutofillFromProfile,
  hasProfileData,
  onSimulateSpeech,
  onAskHelp,
  onWhereAmI,
  onPreviewVoice,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  const dialectOptions: { id: EnglishDialect; label: string; desc: string; flag: string }[] = [
    { id: 'en-US', label: 'English (US)', desc: 'American Accent', flag: '🇺🇸' },
    { id: 'en-IN', label: 'English (India)', desc: 'Indian Accent', flag: '🇮🇳' },
    { id: 'en-GB', label: 'English (UK)', desc: 'British Accent', flag: '🇬🇧' },
    { id: 'en-AU', label: 'English (Australia)', desc: 'Australian Accent', flag: '🇦🇺' },
  ];

  const voiceOptions: { name: VoiceName; label: string; gender: string; style: string }[] = [
    { name: 'Kore', label: 'Kore', gender: 'Female', style: 'Warm & Natural' },
    { name: 'Puck', label: 'Puck', gender: 'Male', style: 'Expressive & Clear' },
    { name: 'Charon', label: 'Charon', gender: 'Male', style: 'Calm & Deep' },
    { name: 'Fenrir', label: 'Fenrir', gender: 'Male', style: 'Authoritative' },
    { name: 'Zephyr', label: 'Zephyr', gender: 'Female', style: 'Bright & Friendly' },
  ];

  const progressPercent = totalFields > 0 ? Math.round((completedFieldsCount / totalFields) * 100) : 0;
  const fieldNumberDisplay = currentFieldIndex !== null ? currentFieldIndex + 1 : 0;
  const currentDialectObj = dialectOptions.find((d) => d.id === voiceSettings.englishDialect) || dialectOptions[0];

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-bounce-once">
        <button
          onClick={() => setIsMinimized(false)}
          aria-label={`Open VoxForm Accessibility Assistant. ${completedFieldsCount} of ${totalFields} fields filled.`}
          className="flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-3.5 rounded-full shadow-2xl font-bold border-2 border-white/60 transition-all transform hover:scale-105"
        >
          <div className="relative">
            <span className="flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSpeaking ? 'bg-amber-900' : isListening ? 'bg-emerald-600' : 'bg-slate-900'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isSpeaking ? 'bg-amber-950' : isListening ? 'bg-emerald-700' : 'bg-slate-900'}`}></span>
            </span>
          </div>
          <span className="font-extrabold text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-slate-950" />
            VoxForm ({currentDialectObj.label})
          </span>
          <span className="bg-slate-950 text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
            {completedFieldsCount}/{totalFields}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="VoxForm Blind-First Voice Assistant"
      className={`fixed bottom-6 right-6 z-50 w-[430px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 border-2 ${
        voiceSettings.highContrast
          ? 'bg-black text-amber-300 border-amber-400 ring-2 ring-amber-400'
          : 'bg-slate-900/98 backdrop-blur-md text-slate-100 border-indigo-500/50'
      }`}
    >
      {/* Hidden ARIA Live region for external screen readers */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assistantPrompt}
      </div>

      {/* Header bar */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b ${
          voiceSettings.highContrast
            ? 'bg-amber-400 text-black border-black font-extrabold'
            : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white border-indigo-400/30'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              voiceSettings.highContrast ? 'bg-black text-amber-400' : 'bg-white/20 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm tracking-wide">
                Voice Form Assistant
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  voiceSettings.highContrast
                    ? 'bg-black text-amber-300'
                    : 'bg-amber-400 text-slate-950'
                }`}
              >
                <span>{currentDialectObj.flag}</span>
                <span>{currentDialectObj.label}</span>
              </span>
            </div>
            <p className="text-[11px] opacity-90 leading-none mt-0.5">
              Google English TTS & Hands-Free Audio Cues
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVoiceMenu(!showVoiceMenu)}
            title="Change English Voice & Accent"
            aria-label="Change English Voice"
            className="p-1.5 rounded-lg hover:bg-black/20 transition-colors flex items-center gap-1 font-bold text-xs"
          >
            <Languages className="w-4 h-4" />
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button
            onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
            title="Keyboard Shortcuts for Blind Users"
            aria-label="Keyboard Shortcuts"
            className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize Assistant"
            aria-label="Minimize"
            className="p-1.5 rounded-lg hover:bg-black/20 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Overlay Banner */}
      {showKeyboardShortcuts && (
        <div
          className={`p-3 text-xs space-y-2 border-b ${
            voiceSettings.highContrast
              ? 'bg-black text-amber-300 border-amber-400'
              : 'bg-slate-950 text-slate-200 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between font-bold pb-1 border-b border-slate-700">
            <span>Blind & Hands-Free Shortcuts:</span>
            <button
              onClick={() => setShowKeyboardShortcuts(false)}
              className="text-[11px] underline"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 text-white font-bold">Space</kbd> : Toggle Mic / Speak</div>
            <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 text-white font-bold">Escape</kbd> : Stop Audio / Pause</div>
            <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 text-white font-bold">Alt + F</kbd> : Start Voice Form</div>
            <div><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-600 text-white font-bold">Alt + R</kbd> : Read Web Page</div>
          </div>
        </div>
      )}

      {/* Settings Dropdown: English Voice & Accent Selector */}
      {showVoiceMenu && (
        <div
          className={`p-3.5 border-b text-xs space-y-3.5 animate-fadeIn ${
            voiceSettings.highContrast
              ? 'bg-black text-amber-300 border-amber-400'
              : 'bg-slate-800 text-slate-200 border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
            <span className="font-extrabold text-xs text-amber-400 flex items-center gap-1.5">
              <Languages className="w-4 h-4" /> English Voice & Accent Settings
            </span>
            <button
              onClick={() => onPreviewVoice(voiceSettings.voiceName, voiceSettings.englishDialect)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" /> Test Voice Audio
            </button>
          </div>

          {/* English Dialect Selector */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">
              1. Choose English Dialect / Accent:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {dialectOptions.map((d) => {
                const isSelected = voiceSettings.englishDialect === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        englishDialect: d.id,
                      })
                    }
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-base">{d.flag}</span>
                    <div className="truncate">
                      <div className="text-xs leading-none">{d.label}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">{d.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Google TTS Voice Persona */}
          <div className="space-y-1">
            <label className="font-bold text-slate-300 block">
              2. Google TTS Voice Persona:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {voiceOptions.map((v) => {
                const isSelected = voiceSettings.voiceName === v.name;
                return (
                  <button
                    key={v.name}
                    onClick={() =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        voiceName: v.name,
                      })
                    }
                    className={`p-1.5 rounded-lg border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500 border-amber-300 text-slate-950 font-black shadow'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-xs font-bold">{v.label}</div>
                    <div className="text-[10px] opacity-75">{v.gender}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
            <span>Speech Speed:</span>
            <div className="flex gap-1">
              {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() =>
                    onUpdateVoiceSettings({ ...voiceSettings, speed: rate })
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    voiceSettings.speed === rate
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Hands-Free Auto-Listen:</span>
            <button
              onClick={() =>
                onUpdateVoiceSettings({
                  ...voiceSettings,
                  handsFreeMode: !voiceSettings.handsFreeMode,
                })
              }
              title="Automatically activates mic right after assistant speaks"
              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                voiceSettings.handsFreeMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {voiceSettings.handsFreeMode ? 'Continuous Dialogue' : 'Manual Mic'}
            </button>
          </div>
        </div>
      )}

      {/* Progress & Auditory Location Status */}
      <div
        className={`px-4 pt-3 pb-2 border-b ${
          voiceSettings.highContrast
            ? 'bg-black border-amber-400/40 text-amber-300'
            : 'bg-slate-950/80 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            {currentField
              ? `Field ${fieldNumberDisplay} of ${totalFields}: ${currentField.label}`
              : 'Website Ready for Voice Navigation'}
          </span>
          <span className="font-mono text-indigo-400">
            {completedFieldsCount}/{totalFields} Completed
          </span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              voiceSettings.highContrast ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Assistant Dialogue Area */}
      <div className="p-4 space-y-3.5">
        {/* Assistant Spoken Output Card */}
        <div
          className={`rounded-xl p-3.5 relative border ${
            voiceSettings.highContrast
              ? 'bg-black border-amber-400'
              : 'bg-slate-800/90 border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Spoken Prompt (English • {voiceSettings.voiceName})
              </span>
            </div>
            {isSpeaking ? (
              <span className="text-xs text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                <Volume2 className="w-4 h-4" /> Speaking Aloud...
              </span>
            ) : (
              <button
                onClick={onReadCurrentField}
                title="Repeat prompt aloud"
                className="text-xs text-indigo-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Repeat Question
              </button>
            )}
          </div>

          <p className="text-sm font-semibold leading-relaxed">
            {assistantPrompt ||
              (currentField
                ? currentField.blindGuidance || currentField.promptQuestion || `What is your ${currentField.label}?`
                : 'Welcome! Say "Start form" or click the button to begin voice filling.')}
          </p>

          {/* Sound waves when speaking */}
          {isSpeaking && (
            <div className="mt-2.5 pt-2 border-t border-slate-700/50">
              <AudioWaveform isActive={true} color="amber" height={20} barCount={24} />
            </div>
          )}
        </div>

        {/* Verification & Confirmation Dialogue Card */}
        {isAwaitingConfirmation && pendingValue && (
          <div
            className={`rounded-xl p-3.5 border-2 animate-fadeIn ${
              voiceSettings.highContrast
                ? 'bg-black border-emerald-400 text-emerald-300'
                : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-emerald-500/30 text-emerald-300 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Auditory Verification Required:
                </p>
                <div className="my-1.5 px-3 py-2 bg-slate-950 rounded-lg border border-emerald-500/40">
                  <span className="font-mono text-sm font-bold text-emerald-300 break-all">
                    "{pendingValue}"
                  </span>
                </div>
                <p className="text-xs font-semibold mb-2.5 text-slate-200">
                  👉 Just speak aloud: <strong className="text-emerald-400">"Yes"</strong> to confirm, or <strong className="text-rose-400">"No"</strong> to retry.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onConfirmValue(pendingValue)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm (Yes)
                  </button>
                  <button
                    onClick={onRetryField}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-600"
                  >
                    <RotateCcw className="w-4 h-4" /> Change / Re-speak
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Submission Confirmation Dialogue Card */}
        {isAwaitingSubmitConfirmation && (
          <div
            className={`rounded-xl p-3.5 border-2 animate-fadeIn shadow-2xl ${
              voiceSettings.highContrast
                ? 'bg-black border-amber-400 text-amber-300'
                : 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900/90 border-indigo-400 text-indigo-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-400 text-slate-950 mt-0.5 shadow-md">
                <Sparkles className="w-5 h-5 text-slate-950" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                    All Fields Verified!
                  </span>
                  <span className="text-[10px] bg-emerald-500/90 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    Ready to Submit
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-white mt-1">
                  Can I submit the form for you?
                </h4>
                <p className="text-xs font-semibold my-2 text-slate-200">
                  👉 Just speak: <strong className="text-emerald-400">"Yes"</strong> to submit, or <strong className="text-rose-400">"No"</strong> to review.
                </p>

                <div className="flex gap-2 mt-2.5">
                  <button
                    onClick={onConfirmSubmit}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Yes, Submit Form
                  </button>
                  <button
                    onClick={onCancelSubmit}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-colors border border-slate-600 font-bold"
                  >
                    <X className="w-4 h-4" /> No, Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Microphone State & Speech Recognition */}
        <div
          className={`rounded-xl p-3 border ${
            voiceSettings.highContrast
              ? 'bg-black border-amber-400/60'
              : 'bg-slate-800/60 border-slate-700/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isListening
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-bold">
                {isListening ? `Listening (${currentDialectObj.label})...` : 'Microphone Ready'}
              </span>
            </div>

            <button
              onClick={isListening ? onStopListening : onStartListening}
              aria-label={isListening ? 'Stop microphone' : 'Activate microphone'}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" /> Stop Mic
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Speak (Space)
                </>
              )}
            </button>
          </div>

          <div className="min-h-[30px] flex items-center">
            {userTranscript ? (
              <p className="text-xs font-mono font-bold text-amber-300">
                "{userTranscript}"
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                {isListening
                  ? `Listening in English... Say your answer, "Yes", or "Help".`
                  : 'Press Spacebar or click "Speak" to talk.'}
              </p>
            )}
          </div>
        </div>

        {/* Spoken Voice Commands Helper for Blind Users */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span className="flex items-center gap-1 text-indigo-400">
              <Radio className="w-3 h-3" /> Spoken Commands (English):
            </span>
            <button
              onClick={onAskHelp}
              className="text-amber-400 hover:underline flex items-center gap-0.5"
            >
              <HelpCircle className="w-3 h-3" /> Voice Help
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {isAwaitingSubmitConfirmation ? (
              <>
                <button
                  onClick={() => onSimulateSpeech('Yes, please submit')}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold border border-emerald-500 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> "Yes, submit"
                </button>
                <button
                  onClick={() => onSimulateSpeech('No, wait')}
                  className="bg-rose-900/70 hover:bg-rose-800 text-rose-200 px-2.5 py-1 rounded font-bold border border-rose-600 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> "No, review"
                </button>
              </>
            ) : isAwaitingConfirmation ? (
              <>
                <button
                  onClick={() => onSimulateSpeech('Yes')}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold border border-emerald-500 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3" /> "Yes" (Confirm)
                </button>
                <button
                  onClick={() => onSimulateSpeech('No, change it')}
                  className="bg-rose-900/70 hover:bg-rose-800 text-rose-200 px-2.5 py-1 rounded font-bold border border-rose-600 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> "No" (Retry)
                </button>
              </>
            ) : null}

            <button
              onClick={() => onSimulateSpeech('alex at gmail dot com')}
              className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700"
              title="Test spoken email with 'at' and 'dot'"
            >
              "alex at gmail"
            </button>
            <button
              onClick={() => onSimulateSpeech('Where am I?')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Where am I?"
            </button>
            <button
              onClick={() => onSimulateSpeech('Repeat question')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Repeat"
            </button>
            <button
              onClick={() => onSimulateSpeech('Help')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Help"
            </button>
            <button
              onClick={() => onSimulateSpeech('Autofill from vault')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Autofill"
            </button>
            <button
              onClick={() => onSimulateSpeech('Skip field')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Skip"
            </button>
            <button
              onClick={() => onSimulateSpeech('Previous field')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded border border-slate-700"
            >
              "Go back"
            </button>
          </div>
        </div>

        {/* Global Navigation Controls */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          {currentFieldIndex !== null && currentFieldIndex > 0 && (
            <button
              onClick={onPreviousField}
              title="Go back to previous field"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-2.5 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}

          <button
            onClick={onReadPageAloud}
            className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white text-xs py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-300" /> Read Page (English)
          </button>

          {currentField && (
            <button
              onClick={onSkipField}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 px-3 rounded-lg flex items-center gap-1 font-semibold transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          )}

          {isSpeaking && (
            <button
              onClick={onStopAllAudio}
              className="bg-rose-900/40 text-rose-300 border border-rose-600/50 text-xs py-2 px-2.5 rounded-lg flex items-center gap-1 hover:bg-rose-900/60 font-bold"
            >
              <Pause className="w-3.5 h-3.5" /> Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
