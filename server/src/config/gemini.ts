import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY environment variable is missing. Check your server/.env file.');
}

export const ai = new GoogleGenAI({
  apiKey: apiKey || 'dummy-key',
});

// Default to gemini-3.8-flash for latest high-reliability structured outputs, supporting override
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
