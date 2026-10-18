import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';
import {
  generateSpeechAudio,
  processFieldVoiceInteraction,
  generateFieldPromptQuestion,
} from './src/server/geminiService.ts';

dotenv.config();

function apiPlugin(): Plugin {
  return {
    name: 'voxform-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        res.setHeader('Content-Type', 'application/json');

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let rawBody = '';
        req.on('data', (chunk) => {
          rawBody += chunk;
        });

        req.on('end', async () => {
          try {
            const body = rawBody ? JSON.parse(rawBody) : {};

            if (url.pathname === '/api/tts') {
              const { text, voiceName, style, dialect } = body;
              if (!text) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing text parameter' }));
                return;
              }
              const result = await generateSpeechAudio({ text, voiceName, style, dialect });
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            if (url.pathname === '/api/verify-field') {
              const { field, userSpeech, currentPendingValue, awaitingConfirmation, userProfile } = body;
              if (!field || !userSpeech) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing field or userSpeech parameter' }));
                return;
              }
              const result = await processFieldVoiceInteraction({
                field,
                userSpeech,
                currentPendingValue,
                awaitingConfirmation,
                userProfile,
              });
              res.statusCode = 200;
              res.end(JSON.stringify(result));
              return;
            }

            if (url.pathname === '/api/field-prompt') {
              const { field } = body;
              if (!field) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing field parameter' }));
                return;
              }
              const prompt = await generateFieldPromptQuestion(field);
              res.statusCode = 200;
              res.end(JSON.stringify({ prompt }));
              return;
            }

            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
          } catch (error: any) {
            console.error('API Error:', error);
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: error?.message || 'Internal Server Error',
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
