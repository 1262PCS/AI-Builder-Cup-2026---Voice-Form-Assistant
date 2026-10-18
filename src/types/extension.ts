export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type EnglishDialect = 'en-US' | 'en-IN' | 'en-GB' | 'en-AU';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'number';
  placeholder?: string;
  options?: string[];
  currentValue: string;
  required?: boolean;
  status: 'pending' | 'active' | 'listening' | 'confirming' | 'verified' | 'skipped';
  verifiedValue?: string;
  promptQuestion?: string;
  blindGuidance?: string; // Descriptive auditory guidance for blind users
  elementSelector: string;
}

export interface WebSection {
  id: string;
  title?: string;
  paragraphs: string[];
  fieldIds?: string[];
}

export interface WebsiteData {
  id: string;
  title: string;
  url: string;
  category: string;
  favicon: string;
  sections: WebSection[];
  fields: FormField[];
}

export interface VoiceSettings {
  voiceName: VoiceName;
  englishDialect: EnglishDialect; // 'en-US' | 'en-IN' | 'en-GB' | 'en-AU'
  speed: number;
  pitch: number;
  autoConfirm: boolean; // if false, verbally asks "Is that correct?"
  highlightWords: boolean;
  useGoogleTTS: boolean; // if false, uses client SpeechSynthesis
  soundEffects: boolean; // Web Audio earcons for blind users
  handsFreeMode: boolean; // Automatically opens mic immediately after speaking
  highContrast: boolean; // Ultra-high contrast for low vision
  largeText: 'normal' | 'large' | 'xl';
}

export interface UserAutofillProfile {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  birthDate: string;
  company: string;
  emergencyContact: string;
  dietaryPreference: string;
}

export interface SessionHistoryItem {
  id: string;
  pageUrl: string;
  pageTitle: string;
  totalFields: number;
  filledFields: number;
  timestamp: string;
  verifiedFields: {
    label: string;
    value: string;
  }[];
}
