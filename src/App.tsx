/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Volume2,
  Mic,
  Database,
  Download,
  Shield,
  Layers,
  Play,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  User,
  Radio,
  BookOpen,
  ArrowRight,
  Eye,
  Keyboard,
  Languages,
} from 'lucide-react';
import { SAMPLE_WEBSITES } from './data/mockWebsites';
import {
  WebsiteData,
  FormField,
  VoiceSettings,
  VoiceName,
  EnglishDialect,
  UserAutofillProfile,
  SessionHistoryItem,
} from './types/extension';
import { ttsService } from './lib/ttsService';
import { speechService } from './lib/speechRecognition';
import { firebaseService } from './lib/firebaseService';
import { audioCues } from './lib/audioCues';
import { BrowserSimulator } from './components/BrowserSimulator';
import { VoiceAssistantOverlay } from './components/VoiceAssistantOverlay';
import { ExtensionPopupModal } from './components/ExtensionPopupModal';
import { ProfileVaultModal } from './components/ProfileVaultModal';
import { ExtensionDownloadModal } from './components/ExtensionDownloadModal';
import {
  normalizeSpokenInput,
  isAffirmativeSpeech,
  isRejectionSpeech,
  isGmailIntent,
} from './lib/inputNormalizer';
import { type User as FirebaseUser } from 'firebase/auth';

const DEFAULT_PROFILE: UserAutofillProfile = {
  fullName: 'Alexandra Morgan',
  email: 'meandmelia1234@gmail.com',
  phone: '(555) 234-8901',
  address: '450 Mission Street, Floor 12',
  city: 'San Francisco, CA',
  zip: '94105',
  birthDate: '1994-08-22',
  company: 'Apex Systems',
  emergencyContact: 'Mark Morgan (555-234-8902)',
  dietaryPreference: 'Vegetarian / Plant-Based',
};

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceName: 'Kore',
  englishDialect: 'en-US',
  speed: 1.0,
  pitch: 1.0,
  autoConfirm: false, // Prompt "Is that correct?"
  highlightWords: true,
  useGoogleTTS: true,
  soundEffects: true, // Audio chimes for blind users
  handsFreeMode: true, // Continuous hands-free auto-listening loop
  highContrast: false,
  largeText: 'normal',
};

export default function App() {
  // Websites & active selection
  const [currentSite, setCurrentSite] = useState<WebsiteData>(SAMPLE_WEBSITES[0]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  // Voice Form state machine
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | null>(null);
  const [activeReadingSectionId, setActiveReadingSectionId] = useState<string | null>(null);
  const [isFormFlowActive, setIsFormFlowActive] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [isAwaitingSubmitConfirmation, setIsAwaitingSubmitConfirmation] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  // Audio & Speech status
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState<string>('');

  // Voice Settings & User
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState<UserAutofillProfile>(DEFAULT_PROFILE);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);

  // Modals
  const [isExtensionPopupOpen, setIsExtensionPopupOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  // Synchronous refs to prevent stale closure bugs in continuous voice loops & SpeechRecognition callbacks
  const pendingValueRef = useRef<string | null>(null);
  const isAwaitingConfirmationRef = useRef(false);
  const isAwaitingSubmitConfirmationRef = useRef(false);
  const activeFieldIndexRef = useRef<number | null>(null);
  const isFormFlowActiveRef = useRef(false);
  const currentSiteRef = useRef<WebsiteData>(SAMPLE_WEBSITES[0]);
  const fieldValuesRef = useRef<Record<string, string>>({});
  const voiceSettingsRef = useRef<VoiceSettings>(DEFAULT_SETTINGS);
  const userProfileRef = useRef<UserAutofillProfile>(DEFAULT_PROFILE);
  const handleProcessUserSpeechRef = useRef<(text: string) => Promise<void>>(async () => {});

  const updatePendingValue = (val: string | null) => {
    pendingValueRef.current = val;
    setPendingValue(val);
  };

  const updateAwaitingConfirmation = (val: boolean) => {
    isAwaitingConfirmationRef.current = val;
    setIsAwaitingConfirmation(val);
  };

  const updateAwaitingSubmitConfirmation = (val: boolean) => {
    isAwaitingSubmitConfirmationRef.current = val;
    setIsAwaitingSubmitConfirmation(val);
  };

  const updateActiveFieldIndex = (val: number | null) => {
    activeFieldIndexRef.current = val;
    setActiveFieldIndex(val);
  };

  const updateIsFormFlowActive = (val: boolean) => {
    isFormFlowActiveRef.current = val;
    setIsFormFlowActive(val);
  };

  useEffect(() => {
    currentSiteRef.current = currentSite;
  }, [currentSite]);

  useEffect(() => {
    fieldValuesRef.current = fieldValues;
  }, [fieldValues]);

  useEffect(() => {
    voiceSettingsRef.current = voiceSettings;
  }, [voiceSettings]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // Sync sound effects setting with audioCues service
  useEffect(() => {
    audioCues.setEnabled(voiceSettings.soundEffects);
  }, [voiceSettings.soundEffects]);

  // Subscribe to TTS state changes
  useEffect(() => {
    const unsubscribeTTS = ttsService.subscribe((speaking, text) => {
      setIsSpeaking(speaking);
      if (speaking && text) {
        setAssistantPrompt(text);
      }
    });

    // Listen to Firebase Auth
    const unsubscribeAuth = firebaseService.onAuth(async (user) => {
      setAuthUser(user);
      if (user) {
        try {
          const profile = await firebaseService.getUserProfile(user.uid);
          if (profile?.autoFillProfile) {
            setUserProfile((prev) => ({
              ...prev,
              ...(profile.autoFillProfile as UserAutofillProfile),
            }));
          }
          if (profile?.voiceName) {
            setVoiceSettings((prev) => ({
              ...prev,
              voiceName: (profile.voiceName as any) || prev.voiceName,
              englishDialect: (profile.englishDialect as any) || prev.englishDialect,
            }));
          }
          const sessions = await firebaseService.getRecentSessions(user.uid);
          if (sessions) setRecentSessions(sessions);
        } catch (e) {
          console.warn('Error loading user profile:', e);
        }
      }
    });

    return () => {
      unsubscribeTTS();
      unsubscribeAuth();
    };
  }, []);

  // When switching sites, reset field values and active state
  useEffect(() => {
    setFieldValues({});
    fieldValuesRef.current = {};
    updateActiveFieldIndex(null);
    setActiveReadingSectionId(null);
    updateIsFormFlowActive(false);
    updatePendingValue(null);
    updateAwaitingConfirmation(false);
    updateAwaitingSubmitConfirmation(false);
    setIsFormSubmitted(false);
    setUserTranscript('');
    ttsService.stop();
    speechService.stopListening();
  }, [currentSite.id]);

  const currentField: FormField | null =
    activeFieldIndex !== null && currentSite.fields[activeFieldIndex]
      ? currentSite.fields[activeFieldIndex]
      : null;

  const currentFieldRef = useRef<FormField | null>(null);
  currentFieldRef.current = currentField;

  const completedFieldsCount = Object.values(fieldValues).filter((v) => v && v.trim().length > 0).length;

  /**
   * Speak a line in English using Google TTS (or fallback)
   */
  const speakText = async (text: string): Promise<void> => {
    setAssistantPrompt(text);
    await ttsService.speak(text, {
      voiceName: voiceSettings.voiceName,
      dialect: voiceSettings.englishDialect,
      speed: voiceSettings.speed,
      useGoogleTTS: voiceSettings.useGoogleTTS,
    });
  };

  /**
   * Preview English Voice
   */
  const handlePreviewVoice = async (voice: VoiceName, dialect: EnglishDialect) => {
    const dialectNames: Record<string, string> = {
      'en-IN': 'Indian English',
      'en-GB': 'British English',
      'en-AU': 'Australian English',
      'en-US': 'American English',
    };
    const dialectLabel = dialectNames[dialect] || 'English';
    const preview = `Hello! I am your ${dialectLabel} voice assistant for VoxForm. All website text and forms will be read aloud in this English voice.`;
    setAssistantPrompt(preview);
    await ttsService.speak(preview, {
      voiceName: voice,
      dialect,
      speed: voiceSettings.speed,
      useGoogleTTS: voiceSettings.useGoogleTTS,
    });
  };

  /**
   * Activate Microphone with Audio Cue
   */
  const startMicListening = useCallback(() => {
    setUserTranscript('');
    setIsListening(true);
    audioCues.playMicStart();

    // Small delay (150ms) to allow rising audio cue chime to finish so mic does not capture speaker sound
    setTimeout(() => {
      const started = speechService.startListening(
        (transcript, isFinal) => {
          setUserTranscript(transcript);

          const cleanT = transcript.toLowerCase().replace(/[.,!?;:]/g, '').trim();
          const isAff =
            isAffirmativeSpeech(transcript) ||
            /^(yes|yeah|yep|yup|sure|correct|confirm|ok|okay|right)\b/i.test(cleanT) ||
            cleanT === 'yes' ||
            cleanT === 'yeah' ||
            cleanT === 'yep';

          const isRej =
            isRejectionSpeech(transcript) ||
            /^(no|nope|nah|wrong|change|retry|cancel)\b/i.test(cleanT) ||
            cleanT === 'no' ||
            cleanT === 'nope';

          // Immediate fast-path trigger: If user says Yes / No / Confirm / Retry, process immediately!
          if (isAff || isRej) {
            setIsListening(false);
            audioCues.playMicStop();
            speechService.stopListening();
            handleProcessUserSpeechRef.current(transcript);
            return;
          }

          if (isFinal) {
            setIsListening(false);
            audioCues.playMicStop();
            handleProcessUserSpeechRef.current(transcript);
          }
        },
        (error) => {
          console.warn('Speech recognition error:', error);
          setIsListening(false);
        },
        () => {
          setIsListening(false);
        },
        voiceSettingsRef.current.englishDialect // Use chosen English dialect for recognition
      );

      if (!started) {
        setIsListening(false);
      }
    }, 150);
  }, []);

  const stopMicListening = useCallback(() => {
    speechService.stopListening();
    setIsListening(false);
    audioCues.playMicStop();
  }, []);

  /**
   * Hands-Free helper: Speak prompt, then automatically activate mic with zero stutter
   */
  const speakAndAutoListen = async (text: string) => {
    speechService.stopListening();
    setIsListening(false);
    await speakText(text);
    if (voiceSettingsRef.current.handsFreeMode) {
      setTimeout(() => {
        startMicListening();
      }, 100);
    }
  };

  /**
   * Keyboard shortcuts for blind users
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (e.code === 'Space' && !isInput) {
        e.preventDefault();
        if (isListening) {
          stopMicListening();
        } else {
          startMicListening();
        }
      } else if (e.code === 'Escape') {
        ttsService.stop();
        stopMicListening();
      } else if (e.altKey && e.code === 'KeyF') {
        e.preventDefault();
        handleStartVoiceForm();
      } else if (e.altKey && e.code === 'KeyR') {
        e.preventDefault();
        handleReadPageAloud();
      } else if (e.altKey && e.code === 'KeyH') {
        e.preventDefault();
        handleVoiceHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, startMicListening, stopMicListening]);

  /**
   * Read entire website aloud with sentence/paragraph highlighting in English
   */
  const handleReadPageAloud = async () => {
    setIsFormFlowActive(false);
    setActiveFieldIndex(null);

    await speakText(`Reading page in English: ${currentSite.title}.`);

    for (const section of currentSite.sections) {
      setActiveReadingSectionId(section.id);
      if (section.title) {
        await speakText(section.title);
      }
      for (const p of section.paragraphs) {
        await speakText(p);
      }
    }

    setActiveReadingSectionId(null);
    if (currentSite.fields.length > 0) {
      await speakAndAutoListen(
        `Finished reading. This form has ${currentSite.fields.length} fields. Say 'Yes' or 'Start' to begin filling the form in English.`
      );
    }
  };

  /**
   * Read single section
   */
  const handleReadSection = async (sectionId: string) => {
    const section = currentSite.sections.find((s) => s.id === sectionId);
    if (!section) return;

    setActiveReadingSectionId(sectionId);
    if (section.title) {
      await speakText(section.title);
    }
    for (const p of section.paragraphs) {
      await speakText(p);
    }
    setActiveReadingSectionId(null);
  };

  /**
   * Start Voice Form Filling Workflow for Blind Users
   */
  const handleStartVoiceForm = async () => {
    const site = currentSiteRef.current;
    if (site.fields.length === 0) {
      await speakText('No interactive form fields found on this page.');
      return;
    }

    audioCues.playNextField();
    updateIsFormFlowActive(true);
    updateActiveFieldIndex(0);
    updateAwaitingConfirmation(false);
    updatePendingValue(null);

    const firstField = site.fields[0];
    const guidance = firstField.blindGuidance || firstField.promptQuestion || `What is your ${firstField.label}?`;
    const prompt = `Starting form in English. Field 1 of ${site.fields.length}: ${firstField.label}. ${firstField.required ? 'Required.' : 'Optional.'} ${guidance}`;
    await speakAndAutoListen(prompt);
  };

  /**
   * Move to Next Form Field
   */
  const handleAdvanceToNextField = async (fromIndex: number) => {
    const site = currentSiteRef.current;
    const nextIndex = fromIndex + 1;
    if (nextIndex < site.fields.length) {
      audioCues.playNextField();
      updateActiveFieldIndex(nextIndex);
      updateAwaitingConfirmation(false);
      updatePendingValue(null);
      setUserTranscript('');

      const nextField = site.fields[nextIndex];
      const guidance = nextField.blindGuidance || nextField.promptQuestion || `What is your ${nextField.label}?`;
      const prompt = `Field ${nextIndex + 1} of ${site.fields.length}: ${nextField.label}. ${nextField.required ? 'Required.' : 'Optional.'} ${guidance}`;
      await speakAndAutoListen(prompt);
    } else {
      // Completed all fields! Ask the user if they want to submit!
      audioCues.playSuccess();
      updateActiveFieldIndex(null);
      updateIsFormFlowActive(false);
      updateAwaitingConfirmation(false);
      updatePendingValue(null);
      updateAwaitingSubmitConfirmation(true);

      const submitQuestion =
        'All fields have been filled and verified. Can I submit the form for you? Say Yes to submit, or No to review.';
      await speakAndAutoListen(submitQuestion);
    }
  };

  /**
   * Verbally or explicitly confirmed submission of the form
   */
  const handleConfirmAndSubmitForm = async () => {
    updateAwaitingSubmitConfirmation(false);
    setIsFormSubmitted(true);
    audioCues.playSuccess();

    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    await speakText(
      'Form submitted successfully! All your verified information has been submitted and stored in your Firebase vault.'
    );

    // Record in Firebase Firestore if signed in
    if (authUser) {
      try {
        const verifiedItems = currentSiteRef.current.fields.map((f) => ({
          label: f.label,
          value: fieldValuesRef.current[f.id] || '',
        }));
        await firebaseService.recordSession(authUser.uid, {
          pageUrl: currentSiteRef.current.url,
          pageTitle: currentSiteRef.current.title,
          totalFields: currentSiteRef.current.fields.length,
          filledFields: currentSiteRef.current.fields.length,
          verifiedItems,
        });
        const sessions = await firebaseService.getRecentSessions(authUser.uid);
        setRecentSessions(sessions);
      } catch (e) {
        console.warn('Failed recording session to Firestore:', e);
      }
    }
  };

  /**
   * Cancel submission to allow user to review or change fields
   */
  const handleCancelSubmit = async () => {
    updateAwaitingSubmitConfirmation(false);
    await speakAndAutoListen(
      'Understood. The form was not submitted. You can say "Where am I" or select any field to review or edit.'
    );
  };

  /**
   * Move to Previous Form Field
   */
  const handlePreviousField = async () => {
    const currentIndex = activeFieldIndexRef.current;
    const site = currentSiteRef.current;
    if (currentIndex !== null && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      audioCues.playNextField();
      updateActiveFieldIndex(prevIndex);
      updateAwaitingConfirmation(false);
      updatePendingValue(null);
      setUserTranscript('');

      const prevField = site.fields[prevIndex];
      const existingVal = fieldValuesRef.current[prevField.id];
      const valNotice = existingVal ? `Currently set to ${existingVal}.` : 'Currently empty.';
      const prompt = `Returned to Field ${prevIndex + 1} of ${site.fields.length}: ${prevField.label}. ${valNotice} What should I put?`;
      await speakAndAutoListen(prompt);
    } else {
      await speakText('You are already at the first field.');
    }
  };

  /**
   * Voice Command: Where am I?
   */
  const handleWhereAmI = async () => {
    const field = currentFieldRef.current;
    const idx = activeFieldIndexRef.current;
    const site = currentSiteRef.current;
    if (field && idx !== null) {
      const currentVal = fieldValuesRef.current[field.id];
      const valState = currentVal ? `Currently filled with "${currentVal}".` : 'Currently empty.';
      await speakAndAutoListen(
        `You are on field ${idx + 1} of ${site.fields.length}: ${field.label}. ${field.required ? 'This field is required.' : 'This field is optional.'} ${valState} Say your answer in English or say 'Help'.`
      );
    } else {
      await speakAndAutoListen(
        `You are on ${site.title}. There are ${site.fields.length} form fields. Say "Start form" or "Read page".`
      );
    }
  };

  /**
   * Voice Command: Help
   */
  const handleVoiceHelp = async () => {
    await speakAndAutoListen(
      'Voice Assistant Help: You can speak your answer in English at any time. When asked to confirm, say "Yes" to confirm or "No" to retry. You can also say "Repeat", "Where am I", "Skip", "Go back", or "Autofill". What would you like to do?'
    );
  };

  /**
   * Process spoken input using Gemini reasoning & verification backend
   */
  const handleProcessUserSpeech = async (speechText: string) => {
    if (!speechText || !speechText.trim()) return;
    const cleanSpeech = speechText.trim();
    const activeField = currentFieldRef.current || currentField;

    // 1. Check if awaiting final form submission confirmation
    if (isAwaitingSubmitConfirmationRef.current) {
      if (isAffirmativeSpeech(cleanSpeech)) {
        await handleConfirmAndSubmitForm();
        return;
      }
      if (isRejectionSpeech(cleanSpeech)) {
        await handleCancelSubmit();
        return;
      }
    }

    // 2. Check top-level general commands if form is not active or no active field
    if (!isFormFlowActiveRef.current || !activeField) {
      const lower = cleanSpeech.toLowerCase();
      if (lower.includes('start') || lower.includes('fill') || lower.includes('begin') || isAffirmativeSpeech(cleanSpeech)) {
        handleStartVoiceForm();
        return;
      }
      if (lower.includes('read') || lower.includes('page')) {
        handleReadPageAloud();
        return;
      }
      if (lower.includes('help')) {
        handleVoiceHelp();
        return;
      }
      if (lower.includes('submit')) {
        await handleConfirmAndSubmitForm();
        return;
      }
    }

    if (!activeField) return;

    // 3. Direct confirmation / rejection check if awaiting confirmation for current field
    if (isAwaitingConfirmationRef.current) {
      if (isAffirmativeSpeech(cleanSpeech)) {
        audioCues.playSuccess();
        const valueToSave =
          pendingValueRef.current || fieldValuesRef.current[activeField.id] || '';
        if (valueToSave) {
          await handleConfirmValue(valueToSave);
          return;
        }
      }

      if (isRejectionSpeech(cleanSpeech)) {
        audioCues.playError();
        updateAwaitingConfirmation(false);
        updatePendingValue(null);
        await speakAndAutoListen(
          `Okay, let's change it. What is your ${activeField.label}?`
        );
        return;
      }
    }

    // 3b. General Affirmative ("Yes", "Confirm", "Looks good") check at any time
    if (isAffirmativeSpeech(cleanSpeech)) {
      const existingVal =
        pendingValueRef.current || fieldValuesRef.current[activeField.id] || '';
      if (existingVal) {
        audioCues.playSuccess();
        await handleConfirmValue(existingVal);
        return;
      } else {
        audioCues.playError();
        await speakAndAutoListen(
          `What should I put for ${activeField.label}? Please say your answer.`
        );
        return;
      }
    }

    // 3c. General Rejection ("No", "Wrong", "Change") check at any time
    if (isRejectionSpeech(cleanSpeech)) {
      audioCues.playError();
      updateAwaitingConfirmation(false);
      updatePendingValue(null);
      await speakAndAutoListen(
        `Okay, let's start fresh. What is your ${activeField.label}?`
      );
      return;
    }

    const isEmailField =
      activeField.type === 'email' ||
      /email/i.test(activeField.label) ||
      /email/i.test(activeField.id);
    const lowerClean = cleanSpeech.toLowerCase().replace(/[.,!?;:]/g, '').trim();

    // 4. If user says "gmail", "my gmail", "use gmail", pull their email from auth or vault
    if (isEmailField && (isGmailIntent(cleanSpeech) || lowerClean === 'gmail')) {
      const candidateEmail =
        authUser?.email ||
        userProfileRef.current.email ||
        'meandmelia1234@gmail.com';

      if (candidateEmail && candidateEmail.includes('@') && candidateEmail.includes('.')) {
        updatePendingValue(candidateEmail);
        updateAwaitingConfirmation(true);
        audioCues.playSuccess();
        await speakAndAutoListen(
          `Found your Gmail: ${candidateEmail}. Say Yes to confirm, or say No to speak a different address.`
        );
        return;
      } else {
        await speakAndAutoListen(
          `Please speak your full Gmail address, for example: alex at gmail dot com.`
        );
        return;
      }
    }

    // 5. Normalize spoken input (special handling for email: 'at', 'dot', typos, spaces)
    const preNormalized = normalizeSpokenInput(
      cleanSpeech,
      activeField.type,
      activeField.name,
      activeField.label
    );

    // Call server to parse input and handle smart extraction & intent
    try {
      const response = await fetch('/api/verify-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: {
            id: activeField.id,
            label: activeField.label,
            type: activeField.type,
            placeholder: activeField.placeholder,
            options: activeField.options,
            required: activeField.required,
            fieldIndex: activeFieldIndexRef.current,
            totalFields: currentSiteRef.current.fields.length,
            blindGuidance: activeField.blindGuidance,
          },
          userSpeech: preNormalized || cleanSpeech,
          currentPendingValue: pendingValueRef.current || undefined,
          awaitingConfirmation: isAwaitingConfirmationRef.current,
          userProfile: userProfileRef.current as unknown as Record<string, string>,
        }),
      });

      if (!response.ok) {
        throw new Error(`Verification endpoint failed with ${response.status}`);
      }

      const result = await response.json();

      // Handle server-detected confirmation
      if (result.intent === 'confirm') {
        const valToConfirm =
          pendingValueRef.current ||
          fieldValuesRef.current[activeField.id] ||
          result.extractedValue ||
          preNormalized;
        if (valToConfirm) {
          audioCues.playSuccess();
          await handleConfirmValue(valToConfirm);
          return;
        }
      }

      // Handle server-detected rejection
      if (result.intent === 'reject') {
        audioCues.playError();
        updateAwaitingConfirmation(false);
        updatePendingValue(null);
        await speakAndAutoListen(
          result.questionToAsk || `Okay, let's try again. What is your ${activeField.label}?`
        );
        return;
      }

      if (result.intent === 'where_am_i') {
        await handleWhereAmI();
        return;
      }

      if (result.intent === 'help') {
        await handleVoiceHelp();
        return;
      }

      if (result.intent === 'repeat') {
        const guidance =
          activeField.blindGuidance ||
          activeField.promptQuestion ||
          `What is your ${activeField.label}?`;
        await speakAndAutoListen(`Repeating question in English: ${guidance}`);
        return;
      }

      if (result.intent === 'skip') {
        audioCues.playNextField();
        await speakText(`Skipping ${activeField.label}.`);
        if (activeFieldIndexRef.current !== null) {
          handleAdvanceToNextField(activeFieldIndexRef.current);
        }
        return;
      }

      if (result.intent === 'back') {
        await handlePreviousField();
        return;
      }

      if (result.intent === 'autofill') {
        await handleAutofillFromProfile();
        return;
      }

      if (result.intent === 'submit') {
        await handleConfirmAndSubmitForm();
        return;
      }

      const rawValue = (result.extractedValue || preNormalized || cleanSpeech || '')
        .trim()
        .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');
      const extracted = normalizeSpokenInput(
        rawValue,
        activeField.type,
        activeField.name,
        activeField.label
      )
        .trim()
        .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

      // Guard: Email field must contain '@' and '.'
      const isEmailValid = isEmailField
        ? extracted.includes('@') && extracted.includes('.')
        : true;

      // Guard against empty, punctuation-only, or invalid input: never prompt to confirm an empty value
      if (!extracted || extracted.length === 0 || extracted === '.' || extracted === '..' || !isEmailValid) {
        audioCues.playError();
        const repromptMsg = isEmailField
          ? `I didn't quite catch your full email address. Please say it clearly, for example: your name at gmail dot com.`
          : `I didn't quite catch your ${activeField.label}. Could you please say it again?`;
        await speakAndAutoListen(repromptMsg);
        return;
      }

      // If user selected instant autoConfirm
      if (voiceSettingsRef.current.autoConfirm) {
        audioCues.playSuccess();
        await handleConfirmValue(extracted);
      } else {
        updatePendingValue(extracted);
        updateAwaitingConfirmation(true);
        // Explicitly format confirmQuestion with clean value so it matches the text box!
        const confirmQuestion = `I heard ${extracted}. Say Yes to confirm, or say No to retry.`;
        await speakAndAutoListen(confirmQuestion);
      }
    } catch (err) {
      console.warn('API field verification fallback:', err);

      // Local fallback for confirmation check during network issues
      if (isAffirmativeSpeech(cleanSpeech)) {
        const localVal =
          pendingValueRef.current || fieldValuesRef.current[activeField.id];
        if (localVal) {
          audioCues.playSuccess();
          await handleConfirmValue(localVal);
          return;
        }
      }

      if (isRejectionSpeech(cleanSpeech)) {
        audioCues.playError();
        updateAwaitingConfirmation(false);
        updatePendingValue(null);
        await speakAndAutoListen(
          `Okay, let's try again. What is your ${activeField.label}?`
        );
        return;
      }

      const fallbackVal = normalizeSpokenInput(
        cleanSpeech,
        activeField.type,
        activeField.name,
        activeField.label
      )
        .trim()
        .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

      const isEmailValid = isEmailField
        ? fallbackVal.includes('@') && fallbackVal.includes('.')
        : true;

      if (!fallbackVal || fallbackVal === '.' || fallbackVal === '..' || !isEmailValid) {
        audioCues.playError();
        const repromptMsg = isEmailField
          ? `I didn't quite catch your full email address. Please say it clearly, for example: your name at gmail dot com.`
          : `I didn't quite catch your ${activeField.label}. Could you please say it again?`;
        await speakAndAutoListen(repromptMsg);
        return;
      }

      updatePendingValue(fallbackVal);
      updateAwaitingConfirmation(true);
      await speakAndAutoListen(
        `I heard ${fallbackVal}. Say Yes to confirm, or say No to retry.`
      );
    }
  };

  // Keep handleProcessUserSpeechRef updated on each render
  handleProcessUserSpeechRef.current = handleProcessUserSpeech;

  /**
   * Confirm and put value into the DOM field
   */
  const handleConfirmValue = async (value: string) => {
    const activeField = currentFieldRef.current || currentField;
    const currentIndex = activeFieldIndexRef.current ?? activeFieldIndex;
    if (!activeField || currentIndex === null) return;

    const finalVal = value || pendingValueRef.current || '';
    if (!finalVal || !finalVal.trim()) {
      audioCues.playError();
      await speakAndAutoListen(`Please provide your ${activeField.label}.`);
      return;
    }

    setFieldValues((prev) => {
      const next = { ...prev, [activeField.id]: finalVal };
      fieldValuesRef.current = next;
      return next;
    });

    updateAwaitingConfirmation(false);
    updatePendingValue(null);

    await speakText(`Confirmed. Set ${activeField.label} to ${finalVal}.`);
    handleAdvanceToNextField(currentIndex);
  };

  /**
   * Skip field
   */
  const handleSkipField = async () => {
    const activeField = currentFieldRef.current || currentField;
    const currentIndex = activeFieldIndexRef.current ?? activeFieldIndex;
    if (!activeField || currentIndex === null) return;
    updateAwaitingConfirmation(false);
    updatePendingValue(null);
    await speakText(`Skipping ${activeField.label}.`);
    handleAdvanceToNextField(currentIndex);
  };

  /**
   * Retry current field
   */
  const handleRetryField = async () => {
    const activeField = currentFieldRef.current || currentField;
    if (!activeField) return;
    audioCues.playError();
    updateAwaitingConfirmation(false);
    updatePendingValue(null);
    setUserTranscript('');
    await speakAndAutoListen(`Please repeat your ${activeField.label}.`);
  };

  /**
   * Autofill current field from stored Firebase vault profile
   */
  const handleAutofillFromProfile = async () => {
    const activeField = currentFieldRef.current || currentField;
    if (!activeField) return;

    let matchValue = '';
    const nameLower = activeField.name.toLowerCase();
    const labelLower = activeField.label.toLowerCase();
    const profile = userProfileRef.current;

    if (nameLower.includes('name') || labelLower.includes('name')) {
      matchValue = profile.fullName;
    } else if (nameLower.includes('email') || labelLower.includes('email')) {
      matchValue = profile.email;
    } else if (nameLower.includes('phone') || labelLower.includes('phone')) {
      matchValue = profile.phone;
    } else if (nameLower.includes('address') || labelLower.includes('address')) {
      matchValue = profile.address;
    } else if (nameLower.includes('city') || labelLower.includes('city')) {
      matchValue = profile.city;
    } else if (nameLower.includes('date') || nameLower.includes('dob') || labelLower.includes('birth')) {
      matchValue = profile.birthDate;
    } else if (nameLower.includes('company') || labelLower.includes('company')) {
      matchValue = profile.company;
    } else if (labelLower.includes('emergency')) {
      matchValue = profile.emergencyContact;
    } else if (labelLower.includes('meal')) {
      matchValue = profile.dietaryPreference;
    }

    if (matchValue) {
      updatePendingValue(matchValue);
      updateAwaitingConfirmation(true);
      await speakAndAutoListen(
        `Found in your vault: ${matchValue}. Say Yes to confirm, or say No to change.`
      );
    } else {
      await speakAndAutoListen(
        `No saved record found in your identity vault for ${activeField.label}. Please speak your answer.`
      );
    }
  };

  /**
   * Focus field when user clicks it manually on the page
   */
  const handleFocusFieldManually = async (field: FormField) => {
    const idx = currentSiteRef.current.fields.findIndex((f) => f.id === field.id);
    if (idx !== -1) {
      audioCues.playNextField();
      updateActiveFieldIndex(idx);
      updateIsFormFlowActive(true);
      updateAwaitingConfirmation(false);
      updatePendingValue(null);
      setUserTranscript('');

      const guidance = field.blindGuidance || field.promptQuestion || `What is your ${field.label}?`;
      const prompt = `Field ${idx + 1} of ${currentSiteRef.current.fields.length}: ${field.label}. ${field.required ? 'Required.' : 'Optional.'} ${guidance}`;
      await speakAndAutoListen(prompt);
    }
  };

  const dialectFlags: Record<EnglishDialect, string> = {
    'en-US': '🇺🇸 English (US)',
    'en-IN': '🇮🇳 English (India)',
    'en-GB': '🇬🇧 English (UK)',
    'en-AU': '🇦🇺 English (Australia)',
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        voiceSettings.highContrast ? 'bg-black text-amber-300' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Application Bar with English Accent & Accessibility Badge */}
      <header
        className={`border-b px-4 py-3 flex items-center justify-between shadow-md z-40 ${
          voiceSettings.highContrast ? 'bg-black border-amber-400' : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-indigo-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base tracking-tight">
                Voice Form Assistant
              </h1>
              <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                English Voice Assistant
              </span>
              <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded-full font-bold">
                Google TTS & Audio Cues
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Zero-vision web reader & hands-free conversational form completion in English
            </p>
          </div>
        </div>

        {/* Right utility buttons: Quick English Dialect Selector & Vault */}
        <div className="flex items-center gap-2.5">
          {/* Quick English Accent Switcher */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs">
            <Languages className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <select
              value={voiceSettings.englishDialect}
              onChange={(e) => {
                const newDialect = e.target.value as EnglishDialect;
                setVoiceSettings((prev) => ({
                  ...prev,
                  englishDialect: newDialect,
                }));
                handlePreviewVoice(voiceSettings.voiceName, newDialect);
              }}
              aria-label="Select English Accent / Dialect"
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              <option value="en-US" className="bg-slate-900">🇺🇸 English (US)</option>
              <option value="en-IN" className="bg-slate-900">🇮🇳 English (India)</option>
              <option value="en-GB" className="bg-slate-900">🇬🇧 English (UK)</option>
              <option value="en-AU" className="bg-slate-900">🇦🇺 English (Australia)</option>
            </select>
          </div>

          <button
            onClick={() =>
              setVoiceSettings((prev) => ({
                ...prev,
                highContrast: !prev.highContrast,
              }))
            }
            aria-label="Toggle High Contrast for low-vision users"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              voiceSettings.highContrast
                ? 'bg-amber-400 text-slate-950 border-white'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {voiceSettings.highContrast ? 'High Contrast ON' : 'High Contrast'}
            </span>
          </button>

          <button
            onClick={() => setIsVaultOpen(true)}
            aria-label="Open Firebase Identity Vault"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Firebase Vault</span>
          </button>

          <button
            onClick={() => setIsDownloadOpen(true)}
            aria-label="Download Chrome Extension package"
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all transform hover:scale-[1.02]"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Extension (.ZIP)</span>
          </button>
        </div>
      </header>

      {/* Main View: Browser Chrome Simulator & Webpage */}
      <main className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden relative">
        <BrowserSimulator
          currentSite={currentSite}
          allSites={SAMPLE_WEBSITES}
          onSelectSite={setCurrentSite}
          activeFieldId={currentField ? currentField.id : null}
          activeReadingSectionId={activeReadingSectionId}
          fieldValues={fieldValues}
          onFieldChange={(fieldId, val) =>
            setFieldValues((prev) => ({ ...prev, [fieldId]: val }))
          }
          onFocusField={handleFocusFieldManually}
          onToggleExtensionPopup={() => setIsExtensionPopupOpen(!isExtensionPopupOpen)}
          onFormSubmitted={handleConfirmAndSubmitForm}
          isSubmittedExternal={isFormSubmitted}
          isExtensionOpen={isExtensionPopupOpen}
          onReadSection={handleReadSection}
          highContrast={voiceSettings.highContrast}
          pendingValue={pendingValue}
          isAwaitingConfirmation={isAwaitingConfirmation}
        />

        {/* Floating Voice Assistant Overlay (Blind Accessibility Copilot) */}
        <VoiceAssistantOverlay
          currentField={currentField}
          currentFieldIndex={activeFieldIndex}
          totalFields={currentSite.fields.length}
          completedFieldsCount={completedFieldsCount}
          isSpeaking={isSpeaking}
          isListening={isListening}
          assistantPrompt={assistantPrompt}
          userTranscript={userTranscript}
          pendingValue={pendingValue}
          isAwaitingConfirmation={isAwaitingConfirmation}
          isAwaitingSubmitConfirmation={isAwaitingSubmitConfirmation}
          onConfirmSubmit={handleConfirmAndSubmitForm}
          onCancelSubmit={handleCancelSubmit}
          voiceSettings={voiceSettings}
          onUpdateVoiceSettings={(newSettings) => {
            setVoiceSettings(newSettings);
            if (authUser) {
              firebaseService.saveUserProfile(authUser.uid, {
                voiceSettings: newSettings,
                autoFillProfile: userProfile,
              });
            }
          }}
          onStartListening={startMicListening}
          onStopListening={stopMicListening}
          onConfirmValue={handleConfirmValue}
          onRetryField={handleRetryField}
          onSkipField={handleSkipField}
          onPreviousField={handlePreviousField}
          onReadPageAloud={handleReadPageAloud}
          onReadCurrentField={() => {
            if (currentField && activeFieldIndex !== null) {
              const guidance = currentField.blindGuidance || currentField.promptQuestion || `What is your ${currentField.label}?`;
              speakAndAutoListen(`Field ${activeFieldIndex + 1} of ${currentSite.fields.length}: ${currentField.label}. ${guidance}`);
            }
          }}
          onStopAllAudio={() => {
            ttsService.stop();
            stopMicListening();
          }}
          onAutofillFromProfile={handleAutofillFromProfile}
          hasProfileData={Boolean(userProfile.fullName || userProfile.email)}
          onSimulateSpeech={(text) => {
            setUserTranscript(text);
            handleProcessUserSpeech(text);
          }}
          onAskHelp={handleVoiceHelp}
          onWhereAmI={handleWhereAmI}
          onPreviewVoice={handlePreviewVoice}
        />
      </main>

      {/* Chrome Extension Toolbar Popup Simulator */}
      <ExtensionPopupModal
        isOpen={isExtensionPopupOpen}
        onClose={() => setIsExtensionPopupOpen(false)}
        currentSite={currentSite}
        totalFieldsCount={currentSite.fields.length}
        completedFieldsCount={completedFieldsCount}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={(newSettings) => {
          setVoiceSettings(newSettings);
          if (authUser) {
            firebaseService.saveUserProfile(authUser.uid, {
              voiceSettings: newSettings,
              autoFillProfile: userProfile,
            });
          }
        }}
        onStartVoiceForm={handleStartVoiceForm}
        onReadPageAloud={handleReadPageAloud}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenDownload={() => setIsDownloadOpen(true)}
        userEmail={authUser?.email || authUser?.displayName || 'Guest User'}
      />

      {/* Firebase Autofill Vault Modal */}
      <ProfileVaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        profile={userProfile}
        onSaveProfile={async (newProfile) => {
          setUserProfile(newProfile);
          if (authUser) {
            await firebaseService.saveUserProfile(authUser.uid, {
              voiceSettings,
              autoFillProfile: newProfile,
              displayName: authUser.displayName || undefined,
              email: authUser.email || undefined,
            });
          }
        }}
        user={authUser}
        onLoginGoogle={async () => {
          try {
            await firebaseService.loginWithGoogle();
          } catch (e) {
            console.warn('Google sign-in error:', e);
          }
        }}
        onLoginGuest={async () => {
          try {
            await firebaseService.loginAsGuest();
          } catch (e) {
            console.warn('Guest sign-in error:', e);
          }
        }}
        onLogout={async () => {
          await firebaseService.logout();
        }}
        recentSessions={recentSessions}
      />

      {/* Download Extension & Source Code Modal */}
      <ExtensionDownloadModal
        isOpen={isDownloadOpen}
        onClose={() => setIsDownloadOpen(false)}
      />
    </div>
  );
}
