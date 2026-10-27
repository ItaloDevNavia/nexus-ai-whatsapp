import { Router } from 'express';
import { generateReply } from '../services/geminiService.js';
import { isGeminiConfigured } from '../config/gemini.js';

const router = Router();
const MAX_MESSAGE_LENGTH = 4000;

/**
 * POST /api/chat
 * Recibe { message: string } y retorna { reply: string }
 */
router.post('/chat', async (req, res) => {
  try {
    // 1. Validar presencia de clave sin exponer datos
    if (!isGeminiConfigured()) {
      return res.status(500).json({
        error: 'Error de configuración: La clave GEMINI_API_KEY no está configurada en el servidor.',
      });
    }

    // 2. Validar que el cuerpo de la petición contenga "message"
    const { message } = req.body || {};

    if (message === undefined || message === null) {
      return res.status(400).json({
        error: 'El campo "message" es requerido.',
      });
    }

    if (typeof message !== 'string') {
      return res.status(400).json({
        error: 'El campo "message" debe ser una cadena de texto.',
      });
    }

    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        error: 'El campo "message" no puede estar vacío.',
      });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `El mensaje excede el límite máximo permitido de ${MAX_MESSAGE_LENGTH} caracteres.`,
      });
    }

    // 3. Invocar al servicio unificado de Gemini
    const reply = await generateReply(trimmedMessage);

    return res.status(200).json({
      reply,
    });
  } catch (error) {
    // Registro interno seguro (sin imprimir credenciales ni datos sensibles)
    console.error('[API Chat Error Code]:', error.status || error.code || 'ERROR_OCCURRED');

    if (error.isConfigError) {
      return res.status(500).json({
        error: 'Error de configuración: La clave GEMINI_API_KEY no está configurada en el servidor.',
      });
    }

    const rawMessage = (error.message || '').toLowerCase();
    const status = error.status || error.statusCode;

    // Errores de validación
    if (status === 400) {
      return res.status(400).json({
        error: error.message || 'La solicitud enviada no es válida.',
      });
    }

    // Errores de autenticación
    if (status === 401 || rawMessage.includes('api_key') || rawMessage.includes('unauthenticated') || rawMessage.includes('credential')) {
      return res.status(401).json({
        error: 'Error de autenticación con el proveedor de IA. Verifique las credenciales del servidor.',
      });
    }

    // Errores de cuota
    if (status === 429 || rawMessage.includes('quota') || rawMessage.includes('resource_exhausted')) {
      return res.status(429).json({
        error: 'Límite de cuota excedido temporalmente. Por favor, intente más tarde.',
      });
    }

    // Servicio temporalmente no disponible / alta demanda
    if (status === 503 || rawMessage.includes('high demand') || rawMessage.includes('unavailable')) {
      return res.status(503).json({
        error: 'El servicio de IA se encuentra experimentando alta demanda. Por favor, reintente en unos instantes.',
      });
    }

    // Error genérico del servidor
    return res.status(500).json({
      error: 'Ocurrió un error al procesar la respuesta con el asistente de IA.',
    });
  }
});

export default router;
