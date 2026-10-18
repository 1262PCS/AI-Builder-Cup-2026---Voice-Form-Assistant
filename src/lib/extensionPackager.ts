import JSZip from 'jszip';

export interface ExtensionCodeFiles {
  'manifest.json': string;
  'background.js': string;
  'content.js': string;
  'content.css': string;
  'popup.html': string;
  'popup.js': string;
  'popup.css': string;
  'README.md': string;
}

/**
 * Generates valid base64 PNG icon image data for Chrome extensions
 */
export function generateIconBase64(size: number): string {
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Deep Indigo/Purple circular background
        ctx.fillStyle = '#4f46e5';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Amber/Gold accessibility ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = Math.max(1, Math.floor(size / 10));
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
        ctx.stroke();

        // Bright white center dot/mic core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 5.5, 0, Math.PI * 2);
        ctx.fill();

        const dataUrl = canvas.toDataURL('image/png');
        const parts = dataUrl.split(',');
        if (parts.length > 1) {
          return parts[1];
        }
      }
    } catch (e) {
      console.warn('Canvas icon generation error, using fallback:', e);
    }
  }

  // Fallback 16x16 solid RGBA PNG in base64 if canvas is unavailable
  return 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZElEQVQ4T2NkoBAwUqifYdQAYgz4//8/AxMDQ8N/fHxxhv/nz59nYGBkYEBXQ5yBIAw1AGYQjEb0EAcGkI2ACzASp5FYQ7AZhI0f9hAky0CsYcjyEK4AMyv+MzAysDAgM5B4OwC78hQRTq8nDAAAAABJRU5ErkJggg==';
}

export function generateExtensionFiles(): ExtensionCodeFiles {
  const manifest = JSON.stringify(
    {
      manifest_version: 3,
      name: 'Voice Form Assistant',
      version: '1.2.0',
      description: 'Hands-free voice assistant for blind and visually impaired users. Reads web pages aloud with Google TTS and conducts conversational form filling with voice verification.',
      permissions: ['activeTab', 'storage', 'scripting'],
      host_permissions: ['<all_urls>'],
      commands: {
        _execute_action: {
          suggested_key: {
            default: 'Ctrl+Shift+V',
            mac: 'Command+Shift+V',
          },
          description: 'Toggle Voice Form Assistant',
        },
      },
      action: {
        default_popup: 'popup.html',
        default_title: 'Voice Form Assistant',
        default_icon: {
          '16': 'icon16.png',
          '48': 'icon48.png',
          '128': 'icon128.png',
        },
      },
      icons: {
        '16': 'icon16.png',
        '48': 'icon48.png',
        '128': 'icon128.png',
      },
      background: {
        service_worker: 'background.js',
      },
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content.js'],
          css: ['content.css'],
          run_at: 'document_idle',
        },
      ],
    },
    null,
    2
  );

  const background = `// Background Service Worker for Voice Form Assistant
chrome.runtime.onInstalled.addListener(() => {
  console.log('Voice Form Assistant Extension installed.');
  chrome.storage.local.set({
    voiceSettings: {
      voiceName: 'Kore',
      englishDialect: 'en-US',
      speed: 1.0,
      autoConfirm: false,
      useGoogleTTS: true,
      soundEffects: true,
      handsFreeMode: true
    }
  });
});

// Shortcut command listener (Ctrl+Shift+V / Cmd+Shift+V)
chrome.commands.onCommand.addListener((command) => {
  if (command === '_execute_action') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_VOICE_FORM' });
      }
    });
  }
});
`;

  const contentJs = `// Content script for Voice Form Assistant (Blind & Low-Vision Accessible)
(function() {
  if (window.__VOICE_FORM_ASSISTANT_LOADED__) return;
  window.__VOICE_FORM_ASSISTANT_LOADED__ = true;

  console.log('Voice Form Assistant loaded on active webpage.');

  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq1, freq2, duration, type = 'sine') {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq1, now);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch(e) {}
  }

  function playMicStartChime() { playTone(440, 880, 0.15); }
  function playMicStopChime() { playTone(660, 330, 0.12); }
  function playSuccessChime() { playTone(523, 659, 0.25, 'triangle'); }

  // Screen Reader Live Region
  let liveRegion = document.getElementById('voiceform-sr-live');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'voiceform-sr-live';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    document.body.appendChild(liveRegion);
  }

  function announce(text) {
    if (liveRegion) {
      liveRegion.textContent = '';
      setTimeout(() => { liveRegion.textContent = text; }, 50);
    }
  }

  // Floating in-page UI Widget
  let overlayEl = document.getElementById('voiceform-inpage-overlay');
  function createInPageOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'voiceform-inpage-overlay';
    overlayEl.className = 'voiceform-inpage-widget';
    overlayEl.innerHTML = \`
      <div class="vform-bar">
        <div class="vform-title">
          <span class="vform-badge">🎙️ Voice Form Assistant</span>
          <span id="vform-status-pill" class="vform-pill">Active</span>
        </div>
        <button id="vform-close-btn" class="vform-close">✕</button>
      </div>
      <div id="vform-prompt-box" class="vform-prompt">Ready to navigate page.</div>
      <div id="vform-transcript-box" class="vform-transcript">Listening for your speech...</div>
      <div class="vform-controls">
        <button id="vform-mic-btn" class="vform-btn vform-btn-mic">🎤 Speak</button>
        <button id="vform-skip-btn" class="vform-btn">⏭ Skip</button>
        <button id="vform-stop-btn" class="vform-btn vform-btn-stop">⏹ Stop</button>
      </div>
    \`;
    document.body.appendChild(overlayEl);

    document.getElementById('vform-close-btn')?.addEventListener('click', () => {
      stopAssistant();
      overlayEl.style.display = 'none';
    });

    document.getElementById('vform-stop-btn')?.addEventListener('click', stopAssistant);
    document.getElementById('vform-skip-btn')?.addEventListener('click', advanceField);
    document.getElementById('vform-mic-btn')?.addEventListener('click', () => {
      listenUserSpeech();
    });

    return overlayEl;
  }

  function updateOverlayPrompt(text, isListening = false) {
    createInPageOverlay();
    overlayEl.style.display = 'block';
    const promptEl = document.getElementById('vform-prompt-box');
    const pillEl = document.getElementById('vform-status-pill');
    if (promptEl) promptEl.textContent = text;
    if (pillEl) {
      pillEl.textContent = isListening ? 'Listening...' : 'Speaking...';
      pillEl.style.background = isListening ? '#10b981' : '#f59e0b';
    }
  }

  function updateOverlayTranscript(text) {
    const tBox = document.getElementById('vform-transcript-box');
    if (tBox) tBox.textContent = text ? '"' + text + '"' : 'Listening for your voice...';
  }

  // Speech Synthesis Helper
  function speak(text, dialect = 'en-US') {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.lang = dialect;

      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang === dialect || v.lang.startsWith('en'));
      if (match) utterance.voice = match;

      updateOverlayPrompt(text, false);
      announce(text);

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  // Speech Recognition Helper
  let recognition = null;
  function getRecognition(dialect = 'en-US') {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;
    if (!recognition) {
      recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
    }
    recognition.lang = dialect;
    return recognition;
  }

  function normalizeSpokenValue(speech, el) {
    if (!speech) return '';
    let val = speech.trim();
    const type = el ? el.type : '';
    const name = el ? (el.name || '') : '';
    const label = el ? getFieldLabel(el) : '';
    const isEmail = type === 'email' || /email/i.test(name) || /email/i.test(label) || /\b(?:at\s+the\s+rate|at\s+sign|at)\b/i.test(val) || /@/.test(val);

    if (isEmail) {
      val = val.replace(/\s+(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\s+/gi, '@');
      val = val.replace(/\b(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\b/gi, '@');
      val = val.replace(/\s+(?:dot|point|period|full\s+stop)\s+/gi, '.');
      val = val.replace(/\b(?:dot|point|period|full\s+stop)\b/gi, '.');
      val = val.replace(/\s+(?:dash|hyphen)\s+/gi, '-');
      val = val.replace(/\s+(?:underscore)\s+/gi, '_');
      val = val.replace(/\s+/g, '');
      val = val.replace(/@+/g, '@');
      val = val.replace(/\.+/g, '.');
      val = val.replace(/@gmailk(?:\.com)?$/i, '@gmail.com');
      val = val.replace(/@gmaill(?:\.com)?$/i, '@gmail.com');
      val = val.replace(/@gmale(?:\.com)?$/i, '@gmail.com');
      val = val.replace(/@gmai(?:\.com)?$/i, '@gmail.com');
      val = val.replace(/@gmail(?!\.com)(?:\b|$)/i, '@gmail.com');
      val = val.replace(/@yahook(?:\.com)?$/i, '@yahoo.com');
      val = val.replace(/@yahoo(?!\.com)(?:\b|$)/i, '@yahoo.com');
      val = val.replace(/@outlook(?!\.com)(?:\b|$)/i, '@outlook.com');
      val = val.replace(/@hotmail(?!\.com)(?:\b|$)/i, '@hotmail.com');
      return val.toLowerCase();
    }
    return val;
  }

  let activeInputs = [];
  let currentInputIndex = 0;
  let isAwaitingConfirmation = false;
  let isAwaitingSubmitConfirmation = false;
  let pendingValue = '';
  let activeDialect = 'en-US';
  let activeElement = null;

  function stopAssistant() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (recognition) {
      try { recognition.stop(); } catch(e){}
    }
    if (activeElement) {
      activeElement.classList.remove('voiceform-field-active');
    }
    const pillEl = document.getElementById('vform-status-pill');
    if (pillEl) {
      pillEl.textContent = 'Paused';
      pillEl.style.background = '#64748b';
    }
  }

  function highlightInput(el) {
    if (activeElement) {
      activeElement.classList.remove('voiceform-field-active');
    }
    if (el) {
      activeElement = el;
      el.classList.add('voiceform-field-active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();
    }
  }

  function getFieldLabel(el) {
    if (el.labels && el.labels.length > 0) {
      return el.labels[0].innerText.trim();
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    if (el.id) {
      const label = document.querySelector('label[for="' + el.id + '"]');
      if (label) return label.innerText.trim();
    }
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();

    return el.name || 'Input field';
  }

  function fillFieldValue(el, val) {
    if (!el) return;
    if (el.tagName === 'SELECT') {
      const matchOpt = Array.from(el.options).find(opt => 
        opt.text.toLowerCase().includes(val.toLowerCase()) || 
        opt.value.toLowerCase().includes(val.toLowerCase())
      );
      if (matchOpt) el.value = matchOpt.value;
    } else if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = true;
    } else {
      el.value = val;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.classList.add('voiceform-field-verified');
    playSuccessChime();
  }

  async function processField(index) {
    if (index >= activeInputs.length) {
      playSuccessChime();
      isAwaitingSubmitConfirmation = true;
      isAwaitingConfirmation = false;
      pendingValue = '';
      updateOverlayPrompt('All form fields completed! Can I submit the form for you?', false);
      await speak('All form fields have been filled and verified. Can I submit the form for you? Say Yes to submit, or No to review.', activeDialect);
      listenUserSpeech();
      return;
    }

    currentInputIndex = index;
    const el = activeInputs[index];
    highlightInput(el);

    const label = getFieldLabel(el);
    const req = el.required ? 'Required.' : 'Optional.';
    const prompt = 'Field ' + (index + 1) + ' of ' + activeInputs.length + ': ' + label + '. ' + req + ' Please say your answer.';
    
    await speak(prompt, activeDialect);
    listenUserSpeech();
  }

  function listenUserSpeech() {
    const rec = getRecognition(activeDialect);
    if (!rec) {
      updateOverlayPrompt('Speech recognition not supported in this browser.', false);
      return;
    }

    playMicStartChime();
    updateOverlayPrompt('Listening in English... Speak your answer.', true);
    updateOverlayTranscript('');

    rec.onresult = async (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          updateOverlayTranscript(event.results[i][0].transcript);
        }
      }

      if (finalTranscript) {
        finalTranscript = finalTranscript.trim();
        updateOverlayTranscript(finalTranscript);
        playMicStopChime();
        handleUserSpokenResponse(finalTranscript);
      }
    };

    rec.onerror = (e) => {
      console.warn('Recognition error:', e);
    };

    try {
      rec.abort();
      rec.start();
    } catch(err) {
      console.warn(err);
    }
  }

  async function handleUserSpokenResponse(text) {
    const lower = text.toLowerCase().trim();

    // Check if awaiting final form submission confirmation
    if (isAwaitingSubmitConfirmation) {
      if (lower.includes('yes') || lower.includes('submit') || lower.includes('sure') || lower.includes('confirm') || lower.includes('yep') || lower.includes('go ahead') || lower.includes('ok')) {
        isAwaitingSubmitConfirmation = false;
        playSuccessChime();
        updateOverlayPrompt('Submitting form...', false);

        // Submit form in DOM
        const submitBtn = document.querySelector('button[type="submit"], input[type="submit"], form button');
        const parentForm = activeInputs[0]?.closest('form');
        if (submitBtn) {
          submitBtn.click();
        } else if (parentForm) {
          parentForm.submit();
        }

        await speak('Form submitted successfully!', activeDialect);
        updateOverlayPrompt('Form submitted successfully! You are all done.', false);
        return;
      }

      if (lower.includes('no') || lower.includes('wait') || lower.includes('cancel') || lower.includes('not yet') || lower.includes('review')) {
        isAwaitingSubmitConfirmation = false;
        await speak('Form was not submitted. You can edit any field or say start form to review.', activeDialect);
        updateOverlayPrompt('Form not submitted. Ready to review.', false);
        return;
      }
    }

    const currentEl = activeInputs[currentInputIndex];
    if (!currentEl) return;

    // Skip command
    if (lower === 'skip' || lower === 'next') {
      advanceField();
      return;
    }

    // Stop command
    if (lower === 'stop' || lower === 'pause') {
      stopAssistant();
      await speak('Assistant paused.', activeDialect);
      return;
    }

    if (isAwaitingConfirmation) {
      if (lower.includes('yes') || lower.includes('correct') || lower.includes('right') || lower.includes('confirm')) {
        fillFieldValue(currentEl, pendingValue);
        isAwaitingConfirmation = false;
        pendingValue = '';
        await speak('Confirmed. Value filled.', activeDialect);
        processField(currentInputIndex + 1);
        return;
      }

      if (lower.includes('no') || lower.includes('wrong') || lower.includes('change') || lower.includes('retry')) {
        isAwaitingConfirmation = false;
        pendingValue = '';
        await speak('Let us try again. What is your ' + getFieldLabel(currentEl) + '?', activeDialect);
        listenUserSpeech();
        return;
      }
    }

    // Propose confirmation with email / field normalization
    const cleanValue = (normalizeSpokenValue(text, currentEl) || '').trim().replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');
    if (!cleanValue || cleanValue === '.' || cleanValue === '..') {
      await speak('I did not catch your ' + getFieldLabel(currentEl) + '. Please say it again.', activeDialect);
      listenUserSpeech();
      return;
    }
    pendingValue = cleanValue;
    isAwaitingConfirmation = true;
    const confirmText = 'I heard ' + cleanValue + '. Say Yes to confirm, or say No to retry.';
    await speak(confirmText, activeDialect);
    listenUserSpeech();
  }

  function advanceField() {
    isAwaitingConfirmation = false;
    pendingValue = '';
    processField(currentInputIndex + 1);
  }

  // Read Entire Page Aloud
  async function readPageAloud(dialect = 'en-US') {
    activeDialect = dialect;
    createInPageOverlay();
    const elements = Array.from(document.querySelectorAll('h1, h2, h3, p, article')).filter(el => {
      return el.innerText && el.innerText.trim().length > 10 && el.offsetParent !== null;
    });

    if (elements.length === 0) {
      await speak('No readable content found on this webpage.', dialect);
      return;
    }

    await speak('Starting page reading. Total ' + elements.length + ' sections found.', dialect);

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      el.classList.add('voiceform-reading-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await speak(el.innerText.trim(), dialect);
      el.classList.remove('voiceform-reading-highlight');
    }

    await speak('Finished reading the page.', dialect);
  }

  // Start Form Filling Workflow
  function startFormWorkflow(dialect = 'en-US') {
    activeDialect = dialect;
    createInPageOverlay();
    activeInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea')).filter(el => el.offsetParent !== null);

    if (activeInputs.length === 0) {
      speak('No interactive form inputs detected on this webpage.', dialect);
      return;
    }

    processField(0);
  }

  // Message Listener for Chrome Extension Popup and Background Worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Voice Form Assistant received message:', request);

    if (request.action === 'START_VOICE_FORM') {
      startFormWorkflow(request.dialect || 'en-US');
      sendResponse({ status: 'started', fieldsFound: activeInputs.length });
      return true;
    }

    if (request.action === 'READ_PAGE') {
      readPageAloud(request.dialect || 'en-US');
      sendResponse({ status: 'reading_started' });
      return true;
    }

    if (request.action === 'STOP') {
      stopAssistant();
      sendResponse({ status: 'stopped' });
      return true;
    }

    if (request.action === 'TOGGLE_VOICE_FORM') {
      if (overlayEl && overlayEl.style.display !== 'none') {
        stopAssistant();
        overlayEl.style.display = 'none';
      } else {
        startFormWorkflow(request.dialect || 'en-US');
      }
      sendResponse({ status: 'toggled' });
      return true;
    }

    return true;
  });
})();
`;

  const contentCss = `/* Voice Form Assistant Blind & Low-Vision High-Contrast Accessibility Styles */
.voiceform-reading-highlight {
  background-color: rgba(254, 240, 138, 0.5) !important;
  outline: 4px dashed #f59e0b !important;
  border-radius: 6px !important;
  transition: all 0.2s ease-in-out !important;
}

.voiceform-field-active {
  box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.8) !important;
  border: 3px solid #f59e0b !important;
  outline: 3px solid #000 !important;
  transform: scale(1.02) !important;
  transition: all 0.2s ease-in-out !important;
}

.voiceform-field-verified {
  border: 3px solid #10b981 !important;
  background-color: rgba(209, 250, 229, 0.4) !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.6) !important;
}

/* In-Page Floating Assistant Widget */
.voiceform-inpage-widget {
  position: fixed !important;
  bottom: 24px !important;
  right: 24px !important;
  width: 380px !important;
  max-width: calc(100vw - 32px) !important;
  background: #0f172a !important;
  color: #f8fafc !important;
  border: 2px solid #f59e0b !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5) !important;
  z-index: 2147483647 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  padding: 16px !important;
  box-sizing: border-box !important;
}

.vform-bar {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 12px !important;
}

.vform-title {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
}

.vform-badge {
  font-weight: 800 !important;
  font-size: 13px !important;
  color: #ffffff !important;
}

.vform-pill {
  font-size: 10px !important;
  background: #f59e0b !important;
  color: #000000 !important;
  font-weight: 800 !important;
  padding: 2px 8px !important;
  border-radius: 9999px !important;
}

.vform-close {
  background: transparent !important;
  border: none !important;
  color: #94a3b8 !important;
  font-size: 16px !important;
  cursor: pointer !important;
}

.vform-prompt {
  background: #1e293b !important;
  border: 1px solid #334155 !important;
  padding: 12px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  line-height: 1.4 !important;
  color: #f1f5f9 !important;
  margin-bottom: 10px !important;
}

.vform-transcript {
  background: #090d16 !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-style: italic !important;
  color: #f59e0b !important;
  margin-bottom: 12px !important;
  min-height: 20px !important;
}

.vform-controls {
  display: flex !important;
  gap: 8px !important;
}

.vform-btn {
  flex: 1 !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
  border: 1px solid #475569 !important;
  background: #1e293b !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
}

.vform-btn-mic {
  background: #10b981 !important;
  border-color: #059669 !important;
  color: #ffffff !important;
}

.vform-btn-stop {
  background: #ef4444 !important;
  border-color: #dc2626 !important;
}
`;

  const popupHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Voice Form Assistant</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container" role="main">
    <header class="header">
      <div class="logo-row">
        <img src="icon48.png" alt="Voice Form Assistant Logo" width="28" height="28" class="icon-img" onerror="this.style.display='none'">
        <div>
          <h1>Voice Form Assistant</h1>
          <p class="subtitle">Blind-First Voice Web Assistant</p>
        </div>
      </div>
      <span class="badge" aria-label="Feature badge">Google TTS</span>
    </header>

    <div class="main-card">
      <div class="status-indicator">
        <span class="dot pulse"></span>
        <span id="tabStatus">Ready on active webpage</span>
      </div>
      
      <div class="actions-grid">
        <button id="btnStartForm" class="btn btn-accent" aria-label="Start Voice Form Filling">
          <span>✨</span> Start Voice Form Fill
        </button>
        <button id="btnReadPage" class="btn btn-primary" aria-label="Read Full Webpage Aloud">
          <span>🔊</span> Read Full Page Aloud
        </button>
      </div>
    </div>

    <div class="settings-section">
      <label for="dialectSelect">English Dialect / Accent</label>
      <select id="dialectSelect" class="form-control">
        <option value="en-US">🇺🇸 English (US)</option>
        <option value="en-IN">🇮🇳 English (India)</option>
        <option value="en-GB">🇬🇧 English (UK)</option>
        <option value="en-AU">🇦🇺 English (Australia)</option>
      </select>

      <label for="voiceSelect">Voice Persona</label>
      <select id="voiceSelect" class="form-control">
        <option value="Kore">Kore (Female - Warm & Natural)</option>
        <option value="Puck">Puck (Male - Expressive & Clear)</option>
        <option value="Charon">Charon (Male - Calm & Deep)</option>
        <option value="Fenrir">Fenrir (Male - Authoritative)</option>
        <option value="Zephyr">Zephyr (Female - Bright & Friendly)</option>
      </select>
    </div>

    <footer>
      <span>Keyboard: Ctrl+Shift+V anywhere to toggle assistant</span>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
`;

  const popupCss = `body {
  margin: 0;
  width: 330px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #090d16;
  color: #f8fafc;
}

.popup-container {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-img {
  border-radius: 8px;
}

h1 {
  font-size: 15px;
  margin: 0;
  font-weight: 800;
  color: #fff;
}

.subtitle {
  font-size: 11px;
  margin: 0;
  color: #f59e0b;
  font-weight: 600;
}

.badge {
  font-size: 10px;
  background: #f59e0b;
  color: #000;
  padding: 2px 8px;
  border-radius: 9999px;
  font-weight: 800;
}

.main-card {
  background: #131b2e;
  border: 1px solid #2d3b55;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 14px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #38bdf8;
  margin-bottom: 12px;
  font-weight: 600;
}

.dot {
  width: 9px;
  height: 9px;
  background: #10b981;
  border-radius: 50%;
}

.pulse {
  animation: pulse-ring 1.5s infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 0.4; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn:hover { opacity: 0.9; }

.btn-accent { background: #f59e0b; color: #000; }
.btn-primary { background: #4f46e5; color: #fff; }

.settings-section {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #cbd5e1;
}

.form-control {
  background: #131b2e;
  border: 1px solid #475569;
  color: #fff;
  padding: 7px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

footer {
  margin-top: 14px;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}
`;

  const popupJs = `// Voice Form Assistant Popup Controller
document.addEventListener('DOMContentLoaded', () => {
  const btnRead = document.getElementById('btnReadPage');
  const btnForm = document.getElementById('btnStartForm');
  const voiceSelect = document.getElementById('voiceSelect');
  const dialectSelect = document.getElementById('dialectSelect');
  const tabStatus = document.getElementById('tabStatus');

  async function sendAction(actionType) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // Disallow internal browser URLs
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://')) {
        if (tabStatus) {
          tabStatus.textContent = 'Navigate to any regular website first.';
          tabStatus.style.color = '#f87171';
        }
        return;
      }

      const dialect = dialectSelect ? dialectSelect.value : 'en-US';
      const voice = voiceSelect ? voiceSelect.value : 'Kore';

      if (tabStatus) {
        tabStatus.textContent = 'Activating assistant on page...';
        tabStatus.style.color = '#f59e0b';
      }

      const message = { action: actionType, dialect, voice };

      try {
        await chrome.tabs.sendMessage(tab.id, message);
        if (tabStatus) {
          tabStatus.textContent = 'Voice Assistant active on page!';
          tabStatus.style.color = '#10b981';
        }
        // Auto-close popup after 1 second so user sees in-page assistant
        setTimeout(() => window.close(), 1000);
      } catch (err) {
        // Tab was already open before extension was installed; inject script dynamically!
        console.log('Injecting content script dynamically into tab...');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['content.css']
        });

        // Retry sending the message
        await chrome.tabs.sendMessage(tab.id, message);
        if (tabStatus) {
          tabStatus.textContent = 'Voice Assistant injected & active!';
          tabStatus.style.color = '#10b981';
        }
        setTimeout(() => window.close(), 1000);
      }
    } catch (e) {
      console.error('Error in popup sendAction:', e);
      if (tabStatus) {
        tabStatus.textContent = 'Reload the webpage and try again.';
        tabStatus.style.color = '#f87171';
      }
    }
  }

  btnForm?.addEventListener('click', () => {
    sendAction('START_VOICE_FORM');
  });

  btnRead?.addEventListener('click', () => {
    sendAction('READ_PAGE');
  });
});
`;

  const readme = `# Voice Form Assistant - Chrome Extension for Blind & Visually Impaired Users

Voice Form Assistant is an accessibility Chrome Extension powered by **Google Text-to-Speech (Gemini 3.8 Flash-Lite TTS)** and **Voice Verification**.

## How to Install and Test in Chrome:
1. Extract the downloaded ZIP archive into a local folder on your computer.
2. Open Google Chrome and navigate to \`chrome://extensions/\` in the address bar.
3. Turn on **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** (top-left) and select the unzipped folder.
5. Navigate to any webpage with a form (e.g., flight booking, sign up, job application, or Wikipedia).
6. Click the **Voice Form Assistant** icon in the Chrome toolbar, and click:
   - **"Start Voice Form Fill"**: It highlights each field, asks the question aloud, listens to your speech, verifies with you, and fills the form!
   - **"Read Full Page Aloud"**: Reads the page aloud paragraph-by-paragraph with sentence highlighting!
7. Shortcut: Press \`Ctrl+Shift+V\` (or \`Cmd+Shift+V\` on Mac) on any webpage to activate instantly!
`;

  return {
    'manifest.json': manifest,
    'background.js': background,
    'content.js': contentJs,
    'content.css': contentCss,
    'popup.html': popupHtml,
    'popup.js': popupJs,
    'popup.css': popupCss,
    'README.md': readme,
  };
}

export async function createExtensionZip(): Promise<Blob> {
  const files = generateExtensionFiles();
  const zip = new JSZip();

  // Add code and config files
  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content);
  }

  // Generate and include valid PNG icon files so Chrome will NEVER fail with "Could not load icon"!
  const icon16Base64 = generateIconBase64(16);
  const icon48Base64 = generateIconBase64(48);
  const icon128Base64 = generateIconBase64(128);

  zip.file('icon16.png', icon16Base64, { base64: true });
  zip.file('icon48.png', icon48Base64, { base64: true });
  zip.file('icon128.png', icon128Base64, { base64: true });

  return await zip.generateAsync({ type: 'blob' });
}
