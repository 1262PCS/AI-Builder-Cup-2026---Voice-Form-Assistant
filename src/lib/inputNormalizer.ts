/**
 * Input normalization utility for Voice Form Assistant
 * Handles spoken email formatting (converting "at" -> "@", "dot" -> ".", stripping spaces, fixing domain typos)
 * and general spoken form field cleaning and intent detection.
 */

/**
 * Checks if the user's spoken phrase is an affirmative confirmation (Yes, Correct, Confirm, etc.)
 */
export function isAffirmativeSpeech(speech: string): boolean {
  if (!speech) return false;
  const clean = speech
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'#$*()_—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return false;

  const exactAffirmatives = new Set([
    'yes',
    'yeah',
    'yep',
    'yup',
    'yea',
    'yes please',
    'yes it is',
    'yes that is',
    'yes that is correct',
    'yes thats correct',
    'yes thats right',
    'yes that is right',
    'yes confirm',
    'yes submit',
    'yes sure',
    'yes okay',
    'yes ok',
    'sure',
    'sure thing',
    'ok',
    'okay',
    'correct',
    'thats correct',
    'that is correct',
    'right',
    'thats right',
    'that is right',
    'right on',
    'confirm',
    'confirmed',
    'looks good',
    'it looks good',
    'sounds good',
    'perfect',
    'go ahead',
    'proceed',
    'please',
    'please do',
    'submit',
    'affirmative',
    'done',
    'fine',
    'all good',
    'accept',
    'agree',
  ]);

  if (exactAffirmatives.has(clean)) return true;

  // Starts with strong affirmative token followed by word boundary
  if (/^(yes|yeah|yep|yup|sure|correct|confirm)\b/i.test(clean)) {
    return true;
  }

  // Contains affirmative phrase
  if (
    clean.includes('thats correct') ||
    clean.includes('that is correct') ||
    clean.includes('thats right') ||
    clean.includes('that is right') ||
    clean.includes('looks good') ||
    clean.includes('sounds good') ||
    clean.includes('go ahead')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the user's spoken phrase is a rejection/retry intent (No, Wrong, Change, etc.)
 */
export function isRejectionSpeech(speech: string): boolean {
  if (!speech) return false;
  const clean = speech
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'#$*()_—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return false;

  const exactRejections = new Set([
    'no',
    'nope',
    'nah',
    'no wait',
    'no change',
    'no retry',
    'wrong',
    'thats wrong',
    'that is wrong',
    'incorrect',
    'change',
    'change it',
    'retry',
    'try again',
    'cancel',
    'not that',
    'not right',
    'thats not right',
    'that is not right',
    'dont',
    'dont do that',
    'stop',
    'wait',
    'negative',
    'review',
    'no review',
    'clear',
    'clear it',
  ]);

  if (exactRejections.has(clean)) return true;

  if (/^(no|nope|nah|wrong|incorrect|retry|cancel)\b/i.test(clean)) {
    return true;
  }

  if (
    clean.includes('thats wrong') ||
    clean.includes('that is wrong') ||
    clean.includes('change it') ||
    clean.includes('try again')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if user is asking to autofill/use their Gmail or stored profile email
 */
export function isGmailIntent(speech: string): boolean {
  if (!speech) return false;
  const clean = speech
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'#$*()_—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    clean === 'gmail' ||
    clean === 'my gmail' ||
    clean === 'use gmail' ||
    clean === 'use my gmail' ||
    clean === 'fill gmail' ||
    clean === 'fill my gmail' ||
    clean === 'my email' ||
    clean === 'use my email' ||
    clean === 'autofill email' ||
    clean === 'gmail account' ||
    clean === 'my gmail account'
  );
}

/**
 * Normalizes user speech for form fields.
 * If user is giving commands/confirmations, passes them through cleanly.
 * For emails, resolves spoken "at", "dot", domain typos, and removes whitespace.
 */
export function normalizeSpokenInput(
  speech: string,
  fieldType?: string,
  fieldName?: string,
  fieldLabel?: string
): string {
  if (!speech) return '';
  let val = speech.trim();

  // If the speech is clearly a confirmation or rejection or navigation command, don't mangle it into field syntax
  if (isAffirmativeSpeech(val) || isRejectionSpeech(val)) {
    return val;
  }

  const lower = val.toLowerCase().replace(/[.,!?;:]/g, '').trim();
  if (
    lower === 'skip' ||
    lower === 'skip field' ||
    lower === 'next' ||
    lower === 'next field' ||
    lower === 'back' ||
    lower === 'go back' ||
    lower === 'previous' ||
    lower === 'repeat' ||
    lower === 'repeat question' ||
    lower === 'help' ||
    lower === 'where am i' ||
    lower === 'autofill'
  ) {
    return lower;
  }

  const isEmail =
    fieldType === 'email' ||
    /email/i.test(fieldName || '') ||
    /email/i.test(fieldLabel || '') ||
    /\b(?:at\s+the\s+rate|at\s+sign|at)\b/i.test(val) ||
    /@/.test(val) ||
    /\b(?:gmail|yahoo|hotmail|outlook|icloud)\b/i.test(val);

  if (isEmail) {
    // If the input is only the word "gmail" or "my gmail", resolve to the user's Gmail
    if (isGmailIntent(val)) {
      return 'meandmelia1234@gmail.com';
    }

    // Strip conversational prefixes like "my email is", "it's", "enter", "put"
    val = val.replace(
      /^(?:my\s+(?:email|email\s+address|gmail|mail)\s+(?:is|'s)?\s*|it\s+is\s+|it's\s+|put\s+(?:in\s+)?|enter\s+|please\s+enter\s+|please\s+put\s+|email\s+is\s+|i\s+want\s+to\s+use\s+)/gi,
      ''
    );

    // Strip trailing conversational noise like "please", "thank you", "thanks"
    val = val.replace(/\s+(?:please|thank\s+you|thanks)$/gi, '');

    // 1. Spoken "at the rate of", "at the rate", "at sign", " at " -> "@"
    val = val.replace(/\s+(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\s+/gi, '@');
    val = val.replace(/\b(?:at\s+the\s+rate(?:\s+of)?|at\s+sign|at)\b/gi, '@');

    // If user said "alex gmail.com" or "alex gmail" without saying "at"
    if (!val.includes('@')) {
      val = val.replace(/(?<=\S)\s*(?:gmail|yahoo|hotmail|outlook|icloud)\b/gi, (m) => '@' + m.trim());
    }

    // 2. Spoken dots: " dot ", " point ", " period ", " full stop " -> "."
    val = val.replace(/\s+(?:dot|point|period|full\s+stop)\s+/gi, '.');
    val = val.replace(/\b(?:dot|point|period|full\s+stop)\b/gi, '.');

    // 3. Spoken dashes and underscores
    val = val.replace(/\s+(?:dash|hyphen)\s+/gi, '-');
    val = val.replace(/\b(?:dash|hyphen)\b/gi, '-');
    val = val.replace(/\s+(?:underscore)\s+/gi, '_');
    val = val.replace(/\b(?:underscore)\b/gi, '_');

    // 4. Remove all whitespace inside email address
    val = val.replace(/\s+/g, '');

    // 5. Clean up duplicate @ or .
    val = val.replace(/@+/g, '@');
    val = val.replace(/\.+/g, '.');

    // 6. Fix speech recognition typos / slang on common email domains
    val = val.replace(/@gmail\s*com\b/i, '@gmail.com');
    val = val.replace(/@yahoo\s*com\b/i, '@yahoo.com');
    val = val.replace(/@outlook\s*com\b/i, '@outlook.com');
    val = val.replace(/@hotmail\s*com\b/i, '@hotmail.com');
    val = val.replace(/@icloud\s*com\b/i, '@icloud.com');

    // "alex at gmailk" -> "alex@gmail.com"
    val = val.replace(/@gmailk(?:\.com)?$/i, '@gmail.com');
    val = val.replace(/@gmaill(?:\.com)?$/i, '@gmail.com');
    val = val.replace(/@gmale(?:\.com)?$/i, '@gmail.com');
    val = val.replace(/@gmai(?:\.com)?$/i, '@gmail.com');
    val = val.replace(/@gmail(?!\.[a-z]{2,})(?:\b|$)/i, '@gmail.com');

    // Yahoo fixes
    val = val.replace(/@yahook(?:\.com)?$/i, '@yahoo.com');
    val = val.replace(/@yahoo(?!\.[a-z]{2,})(?:\b|$)/i, '@yahoo.com');

    // Outlook & Hotmail fixes
    val = val.replace(/@outlook(?!\.[a-z]{2,})(?:\b|$)/i, '@outlook.com');
    val = val.replace(/@hotmail(?!\.[a-z]{2,})(?:\b|$)/i, '@hotmail.com');
    val = val.replace(/@icloud(?!\.[a-z]{2,})(?:\b|$)/i, '@icloud.com');

    // Clean any leading or trailing dots/symbols/whitespace
    val = val.replace(/^[\s.,;:!?'"]+|[\s.,;:!?'"]+$/gi, '');

    // If user provided a username or partial email without @ (e.g. "alex", "meandmelia1234", "alex gmail")
    if (val && !val.includes('@')) {
      if (/gmail/i.test(val)) {
        val = val.replace(/gmail.*$/i, '').trim();
        val = (val ? val : 'meandmelia1234') + '@gmail.com';
      } else {
        val = `${val}@gmail.com`;
      }
    } else if (val && val.endsWith('@')) {
      val = `${val}gmail.com`;
    } else if (val && /@[a-z0-9]+$/i.test(val) && !val.includes('.')) {
      val = `${val}.com`;
    }

    return val.replace(/^[\s.,;:!?'"]+|[\s.,;:!?'"]+$/gi, '').toLowerCase();
  }

  // Phone number cleaning
  const isPhone =
    fieldType === 'tel' ||
    /phone|mobile|cell/i.test(fieldName || '') ||
    /phone|mobile|cell/i.test(fieldLabel || '');

  if (isPhone) {
    val = val.replace(/\s+(?:dash|hyphen)\s+/gi, '-');
    val = val.replace(/\b(?:dash|hyphen)\b/gi, '-');
    val = val
      .replace(/\bzero\b/gi, '0')
      .replace(/\bone\b/gi, '1')
      .replace(/\btwo\b/gi, '2')
      .replace(/\bthree\b/gi, '3')
      .replace(/\bfour\b/gi, '4')
      .replace(/\bfive\b/gi, '5')
      .replace(/\bsix\b/gi, '6')
      .replace(/\bseven\b/gi, '7')
      .replace(/\beight\b/gi, '8')
      .replace(/\bnine\b/gi, '9');
    return val;
  }

  // General field: strip trailing punctuation (e.g. speech recognition periods)
  val = val.replace(/^[\s.,;:]+|[\s.,;:]+$/g, '');
  return val;
}
