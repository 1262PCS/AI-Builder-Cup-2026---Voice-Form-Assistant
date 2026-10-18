import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  generateSpeechAudio,
  processFieldVoiceInteraction,
  generateFieldPromptQuestion,
} from './src/server/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// API routes
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName, style, dialect } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text parameter' });
    }
    const result = await generateSpeechAudio({ text, voiceName, style, dialect });
    res.json(result);
  } catch (error: any) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

app.post('/api/verify-field', async (req, res) => {
  try {
    const { field, userSpeech, currentPendingValue, awaitingConfirmation, userProfile } = req.body;
    if (!field || !userSpeech) {
      return res.status(400).json({ error: 'Missing field or userSpeech parameter' });
    }
    const result = await processFieldVoiceInteraction({
      field,
      userSpeech,
      currentPendingValue,
      awaitingConfirmation,
      userProfile,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Verify field error:', error);
    res.status(500).json({ error: error?.message || 'Field verification failed' });
  }
});

app.post('/api/field-prompt', async (req, res) => {
  try {
    const { field } = req.body;
    if (!field) {
      return res.status(400).json({ error: 'Missing field parameter' });
    }
    const prompt = await generateFieldPromptQuestion(field);
    res.json({ prompt });
  } catch (error: any) {
    console.error('Field prompt error:', error);
    res.status(500).json({ error: error?.message || 'Failed generating field prompt' });
  }
});

// Serve static frontend assets from dist in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VoxForm AI full-stack server running on port ${PORT}`);
});
