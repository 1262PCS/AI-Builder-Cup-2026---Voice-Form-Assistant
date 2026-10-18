import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export interface TTSRequest {
  text: string;
  voiceName?: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  style?: string;
  dialect?: 'en-US' | 'en-IN' | 'en-GB' | 'en-AU';
}

export async function generateSpeechAudio({
  text,
  voiceName = 'Kore',
  style,
  dialect = 'en-US',
}: TTSRequest): Promise<{ audioBase64: string; format: string }> {
  const ai = getGenAI();

  const cleanText = text.trim().slice(0, 800);
  if (!cleanText) {
    throw new Error('Text to speak cannot be empty');
  }

  const dialectDescriptions: Record<string, string> = {
    'en-IN': 'Speak in a clear, natural, and friendly Indian English accent, with warm and articulate pronunciation for accessibility.',
    'en-GB': 'Speak in a crisp, clear, and natural British English accent, with articulate and pleasant pronunciation.',
    'en-AU': 'Speak in a friendly, conversational, and natural Australian English accent.',
    'en-US': 'Speak in a clear, articulate, and natural American English accent, with pleasant pacing.',
  };

  const accentPrompt = dialectDescriptions[dialect] || dialectDescriptions['en-US'];
  const finalStyle = style ? `${style}. ${accentPrompt}` : accentPrompt;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash-lite-tts',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: cleanText,
            speechMetadata: {
              style: finalStyle,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new Error('No audio data returned by Gemini TTS');
  }

  return {
    audioBase64: base64Audio,
    format: 'audio/wav',
  };
}

export interface FieldContext {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  options?: string[];
  currentValue?: string;
  required?: boolean;
  fieldIndex?: number;
  totalFields?: number;
  blindGuidance?: string;
}

export interface VerificationRequest {
  field: FieldContext;
  userSpeech: string;
  currentPendingValue?: string;
  awaitingConfirmation?: boolean;
  userProfile?: Record<string, string>;
}

export interface VerificationResult {
  intent: 'confirm' | 'reject' | 'provide_value' | 'skip' | 'back' | 'repeat' | 'help' | 'where_am_i' | 'autofill' | 'submit';
  extractedValue: string;
  isConfirmed: boolean;
  questionToAsk: string;
  explanation: string;
  normalizedText: string;
}

export async function processFieldVoiceInteraction({
  field,
  userSpeech,
  currentPendingValue,
  awaitingConfirmation,
  userProfile,
}: VerificationRequest): Promise<VerificationResult> {
  const ai = getGenAI();

  const prompt = `You are an assistive voice screen reader and form-filling agent specifically designed for BLIND and VISUALLY IMPAIRED web users.
Because the user cannot see the screen, your spoken responses must be:
- Articulate, unambiguous, and reassuring
- Describe what field they are on and what value was detected
- Provide clear spoken instructions (e.g., "Say Yes to confirm, or say No to change it")

Current form field:
- Label: "${field.label}"
- Type: "${field.type}"
- Required: ${field.required ? 'Yes' : 'No'}
- Position: Field ${field.fieldIndex ? field.fieldIndex + 1 : 1} of ${field.totalFields || 1}
- Options: ${field.options ? JSON.stringify(field.options) : 'None'}
- Guidance: "${field.blindGuidance || ''}"
- Currently Pending Confirmation Value: "${currentPendingValue || ''}"
- Awaiting Confirmation: ${awaitingConfirmation ? 'YES' : 'NO'}

User spoken input: "${userSpeech}"

User's saved personal profile in Firebase (if they ask to autofill):
${JSON.stringify(userProfile || {})}

Tasks:
1. Determine the user's intent:
   - "confirm" (e.g. "yes", "that's correct", "looks good", "confirm", "right", "yeah", "yep", "sure")
   - "reject" (e.g. "no", "that's wrong", "not that", "retry", "change it")
   - "provide_value" (user is speaking their answer to the field)
   - "repeat" (e.g. "repeat the question", "what did you say?", "pardon?", "say again")
   - "help" (e.g. "help", "what can I say?", "how does this work?")
   - "where_am_i" (e.g. "where am I?", "what field is this?", "which page?")
   - "skip" (e.g. "skip", "next field", "leave empty", "skip this")
   - "back" (e.g. "go back", "previous field")
   - "autofill" (e.g. "use my saved details", "use my vault", "fill my name from profile")
   - "submit" (e.g. "submit the form", "finish and send", "yes submit")

2. If user provides a value:
   - CRITICAL RULE FOR EMAIL FIELDS OR SPOKEN EMAILS:
     Users speak email addresses verbally (e.g. "alex at gmail dot com", "alex at gmail", "alex at gmailk").
     * You MUST convert spoken "at", "at the rate", "at sign" to "@".
     * You MUST convert spoken "dot", "period", "point" to ".".
     * You MUST remove ALL internal spaces.
     * Fix speech recognition typos / slang: "alex at gmailk" or "alex at gmail" MUST become "alex@gmail.com".
     * Extracted value MUST NEVER contain literal "at" or "gmailk". It MUST be a valid formatted email like "alex@gmail.com".
   - Normalize phone numbers, dates, and names cleanly without trailing punctuation.
   - If options exist (e.g. "Window", "Aisle"), match the best option.
   - If user asks for saved info, retrieve it from the profile.

3. Craft the spoken response for the blind user:
   - If intent is "confirm": "Confirmed. [field.label] set to [value]."
   - If intent is "reject": "No problem. Let's try again. What should I put for [field.label]?"
   - If intent is "help": "You are on [field.label]. You can speak your answer, say 'Yes' to confirm, 'Repeat' to hear the question again, 'Skip' to move to the next field, or 'Autofill' to use saved info."
   - If intent is "where_am_i": "You are on field ${field.fieldIndex ? field.fieldIndex + 1 : 1} of ${field.totalFields || 1}: ${field.label}. ${field.required ? 'This field is required.' : 'This field is optional.'}"
   - If intent is "repeat": Repeat the prompt question clearly.
   - If a valid non-empty value is provided: "I heard [Extracted Value]. Say Yes to confirm, or say No to retry."
   - If the speech was unclear, incomplete, or empty: "I didn't quite catch your [field.label]. Could you please say it again?" NEVER say "I heard ." or "I heard .." or mention "I heard" if there is no valid extracted value.

Output strictly valid JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: {
            type: Type.STRING,
            description: "One of 'confirm', 'reject', 'provide_value', 'skip', 'back', 'repeat', 'help', 'where_am_i', 'autofill', 'submit'",
          },
          extractedValue: {
            type: Type.STRING,
            description: 'The clean formatted value for the input field',
          },
          isConfirmed: {
            type: Type.BOOLEAN,
            description: 'True if the value has been confirmed and can be placed into the DOM field',
          },
          questionToAsk: {
            type: Type.STRING,
            description: 'The exact conversational line to read out to the blind user via Google TTS',
          },
          explanation: {
            type: Type.STRING,
            description: 'Short explanatory note on how the input was parsed',
          },
          normalizedText: {
            type: Type.STRING,
            description: 'Cleaned-up transcript of user speech',
          },
        },
        required: ['intent', 'extractedValue', 'isConfirmed', 'questionToAsk', 'explanation', 'normalizedText'],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{}');

  let cleanValue = (parsed.extractedValue || '').trim().replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');
  let intent = parsed.intent || 'provide_value';

  // Fallback intent overrides for affirmative / rejection speech tokens
  const lowerSpeech = userSpeech.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  if (/^(yes|yeah|yep|yup|sure|correct|confirm|thats correct|that is correct|looks good)\b/i.test(lowerSpeech)) {
    intent = 'confirm';
  } else if (/^(no|nope|nah|wrong|incorrect|retry|change it|try again)\b/i.test(lowerSpeech)) {
    intent = 'reject';
  }

  // If user is confirming, ensure we preserve the pending value being confirmed
  if (intent === 'confirm') {
    const confirmedVal = currentPendingValue || cleanValue || '';
    return {
      intent: 'confirm',
      extractedValue: confirmedVal,
      isConfirmed: true,
      questionToAsk: `Confirmed. Set ${field.label} to ${confirmedVal || 'your input'}.`,
      explanation: parsed.explanation || 'User confirmed the pending value.',
      normalizedText: parsed.normalizedText || userSpeech,
    };
  }

  // If user rejected/wants to retry
  if (intent === 'reject') {
    return {
      intent: 'reject',
      extractedValue: '',
      isConfirmed: false,
      questionToAsk: `No problem. Let's try again. What is your ${field.label}?`,
      explanation: parsed.explanation || 'User rejected the pending value.',
      normalizedText: parsed.normalizedText || userSpeech,
    };
  }

  const isEmail =
    field.type === 'email' ||
    /email/i.test(field.label || '') ||
    /email/i.test(field.id || '') ||
    /\b(?:at\s+the\s+rate|at)\b/i.test(userSpeech) ||
    /@/.test(cleanValue) ||
    /@/.test(userSpeech) ||
    /\b(?:gmail|yahoo|hotmail|outlook|icloud)\b/i.test(userSpeech);

  if (isEmail) {
    if (!cleanValue && userSpeech) {
      // Normalize spoken email from raw userSpeech if LLM omitted it
      const raw = userSpeech.trim();
      let normalized = raw
        .replace(/\s+(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\s+/gi, '@')
        .replace(/\b(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\b/gi, '@')
        .replace(/\s+(?:dot|point|period)\s+/gi, '.')
        .replace(/\s+/g, '');
      if (!normalized.includes('@') && /(?<=\S)\s*(?:gmail|yahoo|hotmail|outlook|icloud)\b/i.test(normalized)) {
        normalized = normalized.replace(/(?<=\S)\s*(?:gmail|yahoo|hotmail|outlook|icloud)\b/gi, (m) => '@' + m.trim());
      }
      normalized = normalized
        .replace(/@gmail(?!\.[a-z]{2,})(?:\b|$)/i, '@gmail.com')
        .replace(/@yahoo(?!\.[a-z]{2,})(?:\b|$)/i, '@yahoo.com')
        .replace(/@hotmail(?!\.[a-z]{2,})(?:\b|$)/i, '@hotmail.com')
        .replace(/@outlook(?!\.[a-z]{2,})(?:\b|$)/i, '@outlook.com')
        .replace(/@icloud(?!\.[a-z]{2,})(?:\b|$)/i, '@icloud.com');

      const match = normalized.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (match) {
        cleanValue = match[0].toLowerCase();
      }
    }

    if (cleanValue) {
      cleanValue = cleanValue
        .replace(/\s+(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\s+/gi, '@')
        .replace(/\b(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\b/gi, '@')
        .replace(/\s+(?:dot|point|period)\s+/gi, '.')
        .replace(/\s+/g, '')
        .replace(/@gmailk(?:\.com)?$/i, '@gmail.com')
        .replace(/@gmail(?!\.[a-z]{2,})(?:\b|$)/i, '@gmail.com')
        .replace(/@yahook(?:\.com)?$/i, '@yahoo.com')
        .replace(/@yahoo(?!\.[a-z]{2,})(?:\b|$)/i, '@yahoo.com')
        .replace(/@outlook(?!\.[a-z]{2,})(?:\b|$)/i, '@outlook.com')
        .replace(/@hotmail(?!\.[a-z]{2,})(?:\b|$)/i, '@hotmail.com')
        .replace(/@icloud(?!\.[a-z]{2,})(?:\b|$)/i, '@icloud.com')
        .replace(/^[\s.,;:]+|[\s.,;:]+$/g, '')
        .toLowerCase();
    }
  }

  // Sanitize cleanValue
  cleanValue = (cleanValue || '').trim().replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');

  let question = `Please provide a value for ${field.label}.`;
  if (cleanValue && cleanValue.length > 0 && cleanValue !== '.' && cleanValue !== '..') {
    question = `I heard ${cleanValue}. Say Yes to confirm, or say No to retry.`;
  } else if (parsed.questionToAsk && !/i heard\s*(\.{1,3}|\s*\.|\s*\[|\s*$)/i.test(parsed.questionToAsk)) {
    question = parsed.questionToAsk;
  } else {
    question = `I didn't quite catch your ${field.label}. Could you please say it again?`;
  }

  return {
    intent,
    extractedValue: cleanValue,
    isConfirmed: Boolean(parsed.isConfirmed),
    questionToAsk: question,
    explanation: parsed.explanation || '',
    normalizedText: parsed.normalizedText || userSpeech,
  };
}

export async function generateFieldPromptQuestion(field: FieldContext): Promise<string> {
  const ai = getGenAI();

  const prompt = `You are a friendly voice accessibility assistant reading a web form to a BLIND user.
Generate a concise, natural, polite spoken prompt asking the user for this field:
- Field Label: "${field.label}"
- Input Type: "${field.type}"
- Required: ${field.required ? 'yes' : 'no'}
- Position: Field ${field.fieldIndex !== undefined ? field.fieldIndex + 1 : 1} of ${field.totalFields || 1}
- Options: ${field.options ? field.options.join(', ') : 'none'}
- Guidance: "${field.blindGuidance || ''}"

State the field name, whether it's required, and ask for their answer clearly in 1 or 2 spoken sentences.
Example:
"Field 1 of 6: Full Legal Name, required. Please say your first and last name."
"Field 4 of 6: Seating preference. Options are Window, Aisle, or Middle. Which would you prefer?"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    return response.text?.trim() || `Field: ${field.label}. ${field.required ? 'Required.' : 'Optional.'} What is your ${field.label}?`;
  } catch (err) {
    return `Field: ${field.label}. Please state your ${field.label}.`;
  }
}
