import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Star,
  Puzzle,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Volume2,
  Send,
  Eye,
} from 'lucide-react';
import { WebsiteData, FormField } from '../types/extension';
import confetti from 'canvas-confetti';

interface BrowserSimulatorProps {
  currentSite: WebsiteData;
  allSites: WebsiteData[];
  onSelectSite: (site: WebsiteData) => void;
  activeFieldId: string | null;
  activeReadingSectionId: string | null;
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
  onFocusField: (field: FormField) => void;
  onToggleExtensionPopup: () => void;
  onFormSubmitted: () => void;
  isExtensionOpen: boolean;
  onReadSection: (sectionId: string) => void;
  highContrast?: boolean;
  isSubmittedExternal?: boolean;
  pendingValue?: string | null;
  isAwaitingConfirmation?: boolean;
  userTranscript?: string;
}

export const BrowserSimulator: React.FC<BrowserSimulatorProps> = ({
  currentSite,
  allSites,
  onSelectSite,
  activeFieldId,
  activeReadingSectionId,
  fieldValues,
  onFieldChange,
  onFocusField,
  onToggleExtensionPopup,
  onFormSubmitted,
  isExtensionOpen,
  onReadSection,
  highContrast = false,
  isSubmittedExternal = false,
  pendingValue = null,
  isAwaitingConfirmation = false,
  userTranscript = '',
}) => {
  const [customUrlInput, setCustomUrlInput] = useState(currentSite.url);
  const [isSubmittedInternal, setIsSubmittedInternal] = useState(false);

  const isSubmitted = isSubmittedExternal || isSubmittedInternal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedInternal(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
    onFormSubmitted();
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full rounded-xl overflow-hidden shadow-2xl border-2 transition-colors duration-200 ${
        highContrast ? 'bg-black text-white border-amber-400' : 'bg-slate-900 border-slate-700 text-slate-100'
      }`}
    >
      {/* Browser Tab Bar */}
      <div
        className={`px-3 pt-2.5 pb-1 flex items-center justify-between border-b ${
          highContrast ? 'bg-black border-amber-400/40' : 'bg-slate-950 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[80%]">
          {allSites.map((site) => {
            const isActive = site.id === currentSite.id;
            return (
              <button
                key={site.id}
                onClick={() => {
                  onSelectSite(site);
                  setCustomUrlInput(site.url);
                  setIsSubmittedInternal(false);
                }}
                aria-label={`Switch to simulated site: ${site.title}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-bold max-w-[200px] truncate transition-all ${
                  isActive
                    ? highContrast
                      ? 'bg-amber-400 text-black border-t-2 border-x-2 border-amber-400 shadow'
                      : 'bg-slate-800 text-white border-t border-x border-slate-700 shadow'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <span>{site.favicon}</span>
                <span className="truncate">{site.title.split('-')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1.5 px-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
        </div>
      </div>

      {/* Chrome Omnibox Toolbar */}
      <div
        className={`px-3 py-2 flex items-center gap-2 border-b text-slate-300 ${
          highContrast ? 'bg-black border-amber-400/40' : 'bg-slate-800 border-slate-700/80'
        }`}
      >
        <div className="flex items-center gap-1 text-slate-400">
          <button
            aria-label="Back"
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            aria-label="Forward"
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSubmittedInternal(false)}
            aria-label="Reload Page"
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* URL Address Bar */}
        <div className="flex-1 bg-slate-950 border border-slate-700/70 rounded-full px-3 py-1 flex items-center gap-2 text-xs focus-within:border-indigo-500 transition-colors">
          <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <span className="text-slate-400 font-mono text-[11px] select-none">https://</span>
          <input
            type="text"
            aria-label="Website address"
            value={customUrlInput.replace(/^https?:\/\//, '')}
            onChange={(e) => setCustomUrlInput(`https://${e.target.value}`)}
            className="w-full bg-transparent text-slate-200 outline-none font-mono text-xs"
          />
          <Star className="w-3.5 h-3.5 text-slate-500 hover:text-amber-400 cursor-pointer flex-shrink-0 transition-colors" />
        </div>

        {/* Extension Icons in Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleExtensionPopup}
            aria-label="Open VoxForm Screen Reader Extension menu"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 transition-all font-bold ${
              isExtensionOpen
                ? 'bg-amber-400 text-slate-950 border-white shadow-md'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-xs">Voice Form Assistant</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </button>

          <button
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
            title="Extensions Menu"
            aria-label="Browser extensions list"
          >
            <Puzzle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simulated Webpage Viewport */}
      <div
        tabIndex={0}
        role="main"
        aria-label={`Webpage content for ${currentSite.title}`}
        className={`flex-1 overflow-y-auto p-6 md:p-8 ${
          highContrast ? 'bg-black text-amber-300' : 'bg-slate-950 text-slate-100'
        }`}
      >
        <div
          className={`max-w-3xl mx-auto space-y-8 rounded-2xl p-6 md:p-10 shadow-xl relative border ${
            highContrast
              ? 'bg-black border-amber-400 text-amber-300 ring-1 ring-amber-400'
              : 'bg-slate-900/90 border-slate-800 text-slate-100'
          }`}
        >
          {/* Web Site Header Branding */}
          <div className="border-b border-slate-800 pb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 bg-slate-800 rounded-xl shadow-inner border border-slate-700">
                {currentSite.favicon}
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  {currentSite.category}
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight">
                  {currentSite.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {currentSite.fields.length} Interactive Voice Inputs
              </span>
            </div>
          </div>

          {/* Web Content Sections with Reading Highlights */}
          {currentSite.sections.map((section) => {
            const isReadingThis = activeReadingSectionId === section.id;
            return (
              <section
                key={section.id}
                role="region"
                aria-label={section.title || 'Page Section'}
                className={`space-y-3 transition-all duration-300 rounded-xl p-4 ${
                  isReadingThis
                    ? 'bg-amber-950/40 border-l-4 border-amber-400 shadow-lg ring-2 ring-amber-400'
                    : 'bg-transparent border-l-4 border-transparent'
                }`}
              >
                {section.title && (
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-extrabold flex items-center gap-2">
                      {section.title}
                      {isReadingThis && (
                        <span className="text-xs text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                          <Volume2 className="w-4 h-4" /> Reading aloud...
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => onReadSection(section.id)}
                      aria-label={`Read ${section.title} aloud`}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-bold transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" /> Read section
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-sm leading-relaxed">
                  {section.paragraphs.map((p, pIdx) => (
                    <p
                      key={pIdx}
                      className={
                        isReadingThis
                          ? 'text-amber-200 font-semibold transition-colors duration-200'
                          : 'text-slate-300'
                      }
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Interactive Form Fields */}
          {currentSite.fields.length > 0 && (
            <form
              onSubmit={handleSubmit}
              aria-label="Website Form"
              className="space-y-6 pt-4 border-t border-slate-800"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {currentSite.fields.map((field, fIdx) => {
                  const isActive = activeFieldId === field.id;
                  const value = fieldValues[field.id] || '';
                  const isVerified = Boolean(value && value.trim().length > 0);

                  return (
                    <div
                      key={field.id}
                      id={`container-${field.id}`}
                      className={`space-y-1.5 transition-all duration-300 rounded-xl p-3.5 border-2 ${
                        isActive
                          ? 'bg-indigo-950/60 ring-4 ring-amber-400 border-amber-400 shadow-2xl transform scale-[1.02]'
                          : isVerified
                          ? 'bg-slate-900/60 border-emerald-500/60'
                          : 'bg-slate-900/40 border-slate-800'
                      }`}
                      onClick={() => onFocusField(field)}
                    >
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`input-${field.id}`}
                          className="text-xs font-bold text-slate-200 flex items-center gap-1.5"
                        >
                          <span className="text-[11px] text-indigo-400 font-mono">
                            [{fIdx + 1}/{currentSite.fields.length}]
                          </span>
                          {field.label}
                          {field.required && <span className="text-rose-400 font-bold">*</span>}
                        </label>

                        {isActive && (
                          <span className="text-[11px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" /> Voice Active
                          </span>
                        )}

                        {!isActive && isVerified && (
                          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                      </div>

                      {/* Screen reader helper hint */}
                      <span id={`desc-${field.id}`} className="sr-only">
                        {field.blindGuidance || field.promptQuestion}
                      </span>

                      {/* Pending confirmation visual cue */}
                      {isActive && isAwaitingConfirmation && pendingValue && (
                        <div className="flex items-center justify-between text-xs bg-amber-500/20 border border-amber-400 text-amber-200 px-3 py-1.5 rounded-lg">
                          <span className="font-mono font-bold truncate mr-2">
                            Heard: "{pendingValue}"
                          </span>
                          <button
                            type="button"
                            onClick={() => onFieldChange(field.id, pendingValue)}
                            className="text-[10px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase cursor-pointer transition-transform active:scale-95 shrink-0"
                          >
                            Say "Yes" or Click
                          </button>
                        </div>
                      )}

                      {/* Render appropriate Input Control */}
                      {field.type === 'textarea' ? (
                        <textarea
                          id={`input-${field.id}`}
                          aria-describedby={`desc-${field.id}`}
                          aria-required={field.required}
                          rows={3}
                          value={value || (isActive && pendingValue ? pendingValue : '')}
                          onChange={(e) => onFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full bg-slate-950 text-slate-100 rounded-lg px-3 py-2 text-sm border-2 focus:outline-none transition-all ${
                            isActive
                              ? 'border-amber-400 ring-2 ring-amber-400/30'
                              : isVerified
                              ? 'border-emerald-500/70'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={`input-${field.id}`}
                          aria-describedby={`desc-${field.id}`}
                          aria-required={field.required}
                          value={value || (isActive && pendingValue ? pendingValue : '')}
                          onChange={(e) => onFieldChange(field.id, e.target.value)}
                          className={`w-full bg-slate-950 text-slate-100 rounded-lg px-3 py-2 text-sm border-2 focus:outline-none transition-all ${
                            isActive
                              ? 'border-amber-400 ring-2 ring-amber-400/30'
                              : isVerified
                              ? 'border-emerald-500/70'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                        >
                          <option value="">-- Choose an option --</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={`input-${field.id}`}
                          aria-describedby={`desc-${field.id}`}
                          aria-required={field.required}
                          type={field.type}
                          value={value || (isActive && pendingValue ? pendingValue : '')}
                          onChange={(e) => onFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full bg-slate-950 text-slate-100 rounded-lg px-3 py-2 text-sm border-2 focus:outline-none transition-all ${
                            isActive
                              ? 'border-amber-400 ring-2 ring-amber-400/30'
                              : isVerified
                              ? 'border-emerald-500/70'
                              : 'border-slate-700 focus:border-indigo-500'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit Button & Confirmation Alert */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-amber-300">Accessibility Tip:</span> You can say{' '}
                  <strong className="text-white font-bold">"Submit form"</strong> aloud anytime once all fields are verified.
                </div>

                <button
                  type="submit"
                  aria-label="Submit the completed form"
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black py-3 px-8 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-95 text-sm"
                >
                  <Send className="w-4 h-4" /> Submit Application
                </button>
              </div>

              {isSubmitted && (
                <div
                  role="alert"
                  className="p-4 bg-emerald-950 border-2 border-emerald-400 rounded-xl flex items-center gap-3 animate-fadeIn text-emerald-200"
                >
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-sm">
                      Form Completed and Submitted!
                    </h4>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      All verified fields have been processed and archived into your Firebase Firestore database.
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
