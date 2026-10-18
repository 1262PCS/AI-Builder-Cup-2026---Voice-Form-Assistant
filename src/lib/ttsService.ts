import { VoiceName, EnglishDialect } from '../types/extension';

class TTSService {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private currentText = '';
  private onStateChangeListeners: ((speaking: boolean, text: string) => void)[] = [];

  public subscribe(listener: (speaking: boolean, text: string) => void) {
    this.onStateChangeListeners.push(listener);
    return () => {
      this.onStateChangeListeners = this.onStateChangeListeners.filter((l) => l !== listener);
    };
  }

  private notify(speaking: boolean, text: string = '') {
    this.isSpeaking = speaking;
    this.currentText = text;
    this.onStateChangeListeners.forEach((l) => l(speaking, text));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getCurrentText(): string {
    return this.currentText;
  }

  public stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.notify(false, '');
  }

  /**
   * Speak text in English using Google Gemini TTS via server API with fallback to Web Speech API
   */
  public async speak(
    text: string,
    options: {
      voiceName?: VoiceName;
      speed?: number;
      useGoogleTTS?: boolean;
      dialect?: EnglishDialect;
    } = {}
  ): Promise<void> {
    const { voiceName = 'Kore', speed = 1.0, useGoogleTTS = true, dialect = 'en-US' } = options;
    const cleanText = text.trim();
    if (!cleanText) return;

    this.stop();
    this.notify(true, cleanText);

    if (useGoogleTTS) {
      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleanText,
            voiceName,
            dialect,
            style: 'Clear, encouraging, natural and polite English voice assistant for accessibility',
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS server responded with ${response.status}`);
        }

        const data = await response.json();
        if (data.audioBase64) {
          await this.playBase64Audio(data.audioBase64, speed);
          return;
        }
      } catch (error) {
        console.warn('Google TTS API call failed, falling back to browser SpeechSynthesis:', error);
      }
    }

    // Fallback to browser SpeechSynthesis with English language matching
    await this.speakWithBrowserSynth(cleanText, speed, dialect);
  }

  private playBase64Audio(base64Data: string, playbackRate = 1.0): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/wav;base64,${base64Data}`);
        audio.playbackRate = playbackRate;
        this.currentAudio = audio;

        audio.onended = () => {
          this.currentAudio = null;
          this.notify(false, '');
          resolve();
        };

        audio.onerror = (e) => {
          this.currentAudio = null;
          this.notify(false, '');
          reject(e);
        };

        audio.play().catch((err) => {
          console.warn('Audio play error:', err);
          this.notify(false, '');
          resolve();
        });
      } catch (err) {
        this.notify(false, '');
        reject(err);
      }
    });
  }

  private speakWithBrowserSynth(text: string, speed = 1.0, dialect: EnglishDialect = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        this.notify(false, '');
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speed;
      utterance.pitch = 1.0;
      utterance.lang = dialect;

      // Select highest quality English voice available matching dialect
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.toLowerCase() === dialect.toLowerCase() || v.lang.replace('_', '-').toLowerCase() === dialect.toLowerCase()) ||
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Siri'))) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];

      if (preferred) {
        utterance.voice = preferred;
      }

      utterance.onend = () => {
        this.notify(false, '');
        resolve();
      };

      utterance.onerror = () => {
        this.notify(false, '');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const ttsService = new TTSService();
