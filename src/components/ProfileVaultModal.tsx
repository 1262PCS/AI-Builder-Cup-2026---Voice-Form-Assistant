import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  HeartPulse,
  Save,
  Check,
  Database,
  History,
  Sparkles,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserAutofillProfile, SessionHistoryItem } from '../types/extension';
import { type User as FirebaseUser } from 'firebase/auth';

interface ProfileVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserAutofillProfile;
  onSaveProfile: (profile: UserAutofillProfile) => Promise<void>;
  user: FirebaseUser | null;
  onLoginGoogle: () => void;
  onLoginGuest: () => void;
  onLogout: () => void;
  recentSessions: SessionHistoryItem[];
}

export const ProfileVaultModal: React.FC<ProfileVaultModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSaveProfile,
  user,
  onLoginGoogle,
  onLoginGuest,
  onLogout,
  recentSessions,
}) => {
  const [formData, setFormData] = useState<UserAutofillProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveProfile(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const loadSamplePersona = () => {
    setFormData({
      fullName: 'Samantha Morgan',
      email: 'samantha.morgan@techcorp.io',
      phone: '(555) 384-9201',
      address: '742 Evergreen Terrace, Suite 400',
      city: 'San Francisco, CA',
      zip: '94107',
      birthDate: '1992-06-18',
      company: 'TechCorp Innovations',
      emergencyContact: 'David Morgan (555-384-9202)',
      dietaryPreference: 'Vegetarian / Plant-Based',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-violet-800 p-4 sm:p-5 flex items-center justify-between border-b border-indigo-600/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Firebase Identity Vault
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-medium">
                  Firestore Synced
                </span>
              </h2>
              <p className="text-xs text-indigo-200">
                Secure personal memory for instant, hands-free voice form completion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-indigo-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Bar */}
        <div className="bg-slate-950 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Account:</span>
            {user ? (
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {user.email || user.displayName || 'Guest User (Synced)'}
              </span>
            ) : (
              <span className="text-amber-400">Guest session (local)</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={onLoginGoogle}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-2.5 py-1 rounded-md flex items-center gap-1 text-xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Google Sign In
                </button>
                <button
                  onClick={onLoginGuest}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md text-xs"
                >
                  Guest
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-5">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Autofill Profile
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Session History ({recentSessions.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'profile' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs text-slate-400">
                  When the voice assistant asks for any field, it can auto-populate these values.
                </span>
                <button
                  type="button"
                  onClick={loadSamplePersona}
                  className="text-xs bg-indigo-950/70 text-indigo-300 hover:text-white border border-indigo-800/80 hover:bg-indigo-900 px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" /> Fill Sample Persona
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" /> Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. Alexandra Morgan"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" /> Primary Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="alex@domain.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-400" /> Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="(555) 019-2834"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="123 Market St, Suite 400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">City, State</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Postal Code</label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                      placeholder="94103"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> Company / Role
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-indigo-400" /> Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) =>
                      setFormData({ ...formData, emergencyContact: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                    placeholder="Parent / Spouse phone"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                {savedSuccess ? (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Successfully saved to Firestore!
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Encrypted and stored in Firebase Firestore
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-5 rounded-xl shadow flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Vault Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {recentSessions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No completed form sessions logged yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Fill out any simulated website form using voice to record your first session.
                  </p>
                </div>
              ) : (
                recentSessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-slate-200">{s.pageTitle}</h4>
                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-sm mt-0.5">
                        {s.pageUrl}
                      </p>
                      <span className="text-[10px] text-slate-500">{s.timestamp}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400">
                        {s.filledFields} / {s.totalFields} Fields
                      </span>
                      <span className="block text-[10px] text-slate-400">Verified by Voice</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
