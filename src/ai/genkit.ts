import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Configuração central do Genkit.
 * Certifique-se de que a variável de ambiente GOOGLE_GENAI_API_KEY está configurada.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY,
    }),
  ],
  model: 'googleai/gemini-1.5-flash',
});
