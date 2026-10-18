// Browser SpeechRecognition wrapper with robust fallback, instant affirmative/rejection dispatch, and clean lifecycle management
import { isAffirmativeSpeech, isRejectionSpeech } from './inputNormalizer';

type SpeechCallback = (transcript: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;

class SpeechRecognitionService {
  private recognition: any = null;
  private isListening = false;
  private onResultCallback: SpeechCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  private onEndCallback: (() => void) | null = null;
  private currentTranscript = '';
  private hasDispatchedFinal = false;
  private targetLang = 'en-US';

  constructor() {
    this.createRecognition();
  }

  private createRecognition(): any {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API is not natively supported in this browser.');
      return null;
    }

    try {
      if (this.recognition) {
        try {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch (e) {
          // ignore
        }
      }

      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.lang = this.targetLang || 'en-US';

      rec.onstart = () => {
        this.isListening = true;
        this.currentTranscript = '';
        this.hasDispatchedFinal = false;
      };

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item) {
            if (item.isFinal) {
              finalTranscript += item[0]?.transcript || '';
            } else {
              interimTranscript += item[0]?.transcript || '';
            }

            // Check all alternatives for fast affirmative / rejection
            for (let j = 0; j < item.length; ++j) {
              const altText = item[j]?.transcript?.trim();
              if (!altText) continue;
              const cleanAlt = altText.toLowerCase().replace(/[.,!?;:]/g, '').trim();

              const isAff =
                isAffirmativeSpeech(altText) ||
                /^(yes|yeah|yep|yup|sure|correct|confirm|ok|okay|right)\b/i.test(cleanAlt) ||
                cleanAlt === 'yes' ||
                cleanAlt === 'yeah' ||
                cleanAlt === 'yep';

              const isRej =
                isRejectionSpeech(altText) ||
                /^(no|nope|nah|wrong|change|retry|cancel)\b/i.test(cleanAlt) ||
                cleanAlt === 'no' ||
                cleanAlt === 'nope';

              if (!this.hasDispatchedFinal && (isAff || isRej)) {
                this.hasDispatchedFinal = true;
                this.currentTranscript = altText;
                if (this.onResultCallback) {
                  this.onResultCallback(altText, true);
                }
                this.stopListening();
                return;
              }
            }
          }
        }

        const transcript = (finalTranscript || interimTranscript).trim();
        if (!transcript) return;

        this.currentTranscript = transcript;

        const clean = transcript.toLowerCase().replace(/[.,!?;:]/g, '').trim();
        const isAff =
          isAffirmativeSpeech(transcript) ||
          /^(yes|yeah|yep|yup|sure|correct|confirm|ok|okay|right)\b/i.test(clean) ||
          clean === 'yes' ||
          clean === 'yeah' ||
          clean === 'yep';

        const isRej =
          isRejectionSpeech(transcript) ||
          /^(no|nope|nah|wrong|change|retry|cancel)\b/i.test(clean) ||
          clean === 'no' ||
          clean === 'nope';

        // Instant fast-path detection: If user speaks "Yes", "No", "Skip", "Confirm", etc.
        if (!this.hasDispatchedFinal && (isAff || isRej)) {
          this.hasDispatchedFinal = true;
          if (this.onResultCallback) {
            this.onResultCallback(transcript, true);
          }
          this.stopListening();
          return;
        }

        // If SpeechRecognition explicitly marked it as final:
        if (finalTranscript && !this.hasDispatchedFinal) {
          this.hasDispatchedFinal = true;
          if (this.onResultCallback) {
            this.onResultCallback(transcript, true);
          }
          return;
        }

        // Otherwise report interim transcript for live feedback
        if (this.onResultCallback && !this.hasDispatchedFinal) {
          this.onResultCallback(transcript, false);
        }
      };

      rec.onerror = (event: any) => {
        this.isListening = false;
        const errType = event?.error;
        if (errType !== 'no-speech' && errType !== 'aborted' && this.onErrorCallback) {
          this.onErrorCallback(errType || 'Speech recognition error');
        }
      };

      rec.onend = () => {
        this.isListening = false;

        // If the speech ended (e.g. after a short utterance) and final wasn't dispatched yet,
        // dispatch whatever we captured so the user's speech is never lost!
        if (!this.hasDispatchedFinal && this.currentTranscript && this.currentTranscript.trim()) {
          this.hasDispatchedFinal = true;
          if (this.onResultCallback) {
            this.onResultCallback(this.currentTranscript.trim(), true);
          }
        }

        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };

      this.recognition = rec;
      return rec;
    } catch (e) {
      console.warn('Failed to instantiate SpeechRecognition:', e);
      return null;
    }
  }

  public isSupported(): boolean {
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public startListening(
    onResult: SpeechCallback,
    onError?: ErrorCallback,
    onEnd?: () => void,
    lang: string = 'en-US'
  ): boolean {
    this.onResultCallback = onResult;
    this.onErrorCallback = onError || null;
    this.onEndCallback = onEnd || null;
    this.currentTranscript = '';
    this.hasDispatchedFinal = false;
    this.targetLang = lang || 'en-US';

    // Ensure we have a fresh or ready recognition instance
    if (!this.recognition) {
      this.createRecognition();
    }

    if (!this.recognition) {
      if (onError) onError('SpeechRecognition not supported in this browser.');
      return false;
    }

    try {
      this.recognition.lang = this.targetLang;
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Recognition was busy or in transitional state; recreate cleanly and start
        try {
          const freshRec = this.createRecognition();
          if (freshRec) {
            freshRec.start();
            this.isListening = true;
            return true;
          }
        } catch (retryErr) {
          console.warn('Speech recognition retry failed:', retryErr);
        }
      }
      console.warn('Recognition start error:', err);
      this.isListening = false;
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }

  public abortListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }
}

export const speechService = new SpeechRecognitionService();
