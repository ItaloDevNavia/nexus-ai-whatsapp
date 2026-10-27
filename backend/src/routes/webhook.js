import { Router } from 'express';
import { generateReply } from '../services/geminiService.js';
import { verifySignature, sendWhatsAppMessage } from '../services/whatsappService.js';

const router = Router();

// Cache en memoria para deduplicación de mensajes (ID de mensaje -> marca de tiempo)
const processedMessages = new Map();
const DEDUPLICATION_TTL_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Comprueba si un mensaje ya ha sido procesado previamente por su ID (wamid).
 * Limpia automáticamente entradas con antigüedad superior a 15 minutos.
 * 
 * @param {string} messageId
 * @returns {boolean}
 */
export function isDuplicateMessage(messageId) {
  if (!messageId) return false;
  
  const now = Date.now();
  // Limpieza periódica de registros antiguos
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > DEDUPLICATION_TTL_MS) {
      processedMessages.delete(id);
    }
  }

  if (processedMessages.has(messageId)) {
    return true;
  }

  processedMessages.set(messageId, now);
  return false;
}

/**
 * GET /webhook
 * Verificación del Webhook por parte de Meta Cloud API.
 */
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token && expectedToken && token === expectedToken.trim()) {
    console.log('[WhatsApp Webhook] Verificación GET exitosa de Meta.');
    return res.status(200).send(challenge);
  }

  console.warn('[WhatsApp Webhook] Intento fallido de verificación GET. Token no coincide.');
  return res.status(403).json({
    error: 'Verificación fallida: el token o modo no coincide.',
  });
});

/**
 * POST /webhook
 * Recepción de eventos y mensajes entrantes desde WhatsApp Cloud API.
 */
router.post('/webhook', async (req, res) => {
  // 1. Validar firma criptográfica si está configurado WHATSAPP_APP_SECRET
  if (!verifySignature(req)) {
    console.error('[WhatsApp Webhook] Firma x-hub-signature-256 no válida.');
    return res.status(401).json({ error: 'Firma de solicitud no válida.' });
  }

  const body = req.body;

  // 2. Comprobar que sea un evento de WhatsApp Business Account
  if (!body || body.object !== 'whatsapp_business_account') {
    return res.status(404).json({ error: 'Objeto no reconocido.' });
  }

  // 3. Confirmar recepción inmediatamente a Meta con 200 OK para evitar reintentos por timeout
  res.status(200).json({ status: 'EVENT_RECEIVED' });

  // 4. Procesar el evento de manera asíncrona
  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // Si son actualizaciones de estado (mensajes entregados, leídos, etc.), ignorar
        if (value.statuses && !value.messages) {
          continue;
        }

        const messages = value.messages || [];

        for (const message of messages) {
          const messageId = message.id;
          const from = message.from;
          const messageType = message.type;

          // Manejo de mensajes duplicados
          if (isDuplicateMessage(messageId)) {
            console.log(`[WhatsApp Webhook] Mensaje duplicado omitido (ID: ${messageId})`);
            continue;
          }

          const isMock = req.headers['x-mock-send'] === 'true' || process.env.WHATSAPP_MOCK_SEND === 'true';

          if (messageType === 'text') {
            const userText = message.text?.body;
            console.log(`[WhatsApp Webhook] Mensaje de texto recibido de ${from}`);

            // Reutilización del servicio unificado de Gemini
            try {
              const reply = await generateReply(userText);
              console.log(`[WhatsApp Webhook] Respuesta generada por Gemini con éxito. Enviando a ${from}...`);

              await sendWhatsAppMessage(from, reply, { mock: isMock });
            } catch (aiErr) {
              console.error('[WhatsApp Webhook AI Error]:', aiErr.message || 'Error al procesar con Gemini');
              // Enviar mensaje de cortesía en caso de falla temporal de IA
              await sendWhatsAppMessage(
                from,
                'Hola, en este momento estoy experimentando una alta demanda. Por favor, intenta enviarme tu consulta nuevamente en un instante.',
                { mock: isMock }
              ).catch(() => {});
            }
          } else {
            console.log(`[WhatsApp Webhook] Tipo de mensaje no soportado (${messageType}) recibido de ${from}`);
            await sendWhatsAppMessage(
              from,
              'Hola, por el momento solo puedo procesar mensajes de texto. Por favor envíame tu consulta escrita.',
              { mock: isMock }
            ).catch(() => {});
          }
        }
      }
    }
  } catch (error) {
    console.error('[WhatsApp Webhook Handler Error]:', error.message || error);
  }
});

export default router;
