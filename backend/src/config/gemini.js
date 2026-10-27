import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

// Instrucción de sistema para el asistente
export const SYSTEM_INSTRUCTION = 
  'Eres un asistente de inteligencia artificial profesional, claro y servicial para un portafolio web. ' +
  'Responde siempre en español de manera concisa y educada. ' +
  'No inventes información, datos ni fuentes; si no conoces una respuesta o necesitas más detalles, indícalo con honestidad.';

// Modelo Flash por defecto (compatible y verificado)
export const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

/**
 * Obtiene una instancia inicializada del SDK de Gemini.
 * Lanza un error controlado si no existe la clave de API.
 */
export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    const error = new Error('GEMINI_API_KEY no está configurada en el entorno.');
    error.isConfigError = true;
    throw error;
  }

  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Verifica de forma segura si la clave está presente sin exponer su valor.
 */
export function isGeminiConfigured() {
  const apiKey = process.env.GEMINI_API_KEY;
  return Boolean(apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0);
}
