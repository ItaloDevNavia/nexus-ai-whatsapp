import { getGeminiClient, isGeminiConfigured, DEFAULT_MODEL, SYSTEM_INSTRUCTION } from '../config/gemini.js';

const MAX_MESSAGE_LENGTH = 4000;

/**
 * Servicio unificado para generar respuestas con Gemini.
 * Reutilizado tanto por el Chat Web (/api/chat) como por WhatsApp (/webhook).
 * 
 * @param {string} message - Texto del usuario
 * @returns {Promise<string>} - Respuesta del asistente
 */
export async function generateReply(message) {
  if (!isGeminiConfigured()) {
    const error = new Error('GEMINI_API_KEY no está configurada en el servidor.');
    error.isConfigError = true;
    throw error;
  }

  if (typeof message !== 'string') {
    const error = new Error('El mensaje debe ser una cadena de texto.');
    error.statusCode = 400;
    throw error;
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    const error = new Error('El mensaje no puede estar vacío.');
    error.statusCode = 400;
    throw error;
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`El mensaje excede el límite máximo de ${MAX_MESSAGE_LENGTH} caracteres.`);
    error.statusCode = 400;
    throw error;
  }

  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: trimmed,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return (response.text || '').trim();
}
