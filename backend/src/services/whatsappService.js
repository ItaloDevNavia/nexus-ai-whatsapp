import crypto from 'crypto';

/**
 * Comprueba de forma segura si las variables de WhatsApp están presentes
 * sin exponer sus contenidos.
 */
export function isWhatsAppConfigured() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  return Boolean(
    token && token.trim() &&
    phoneId && phoneId.trim() &&
    verifyToken && verifyToken.trim()
  );
}

/**
 * Valida la firma criptográfica x-hub-signature-256 enviada por Meta.
 * Si WHATSAPP_APP_SECRET no está configurado, omite la validación y retorna true.
 * 
 * @param {import('express').Request} req
 * @returns {boolean}
 */
export function verifySignature(req) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !appSecret.trim()) {
    // Si no se ha configurado el secret de la app, no se bloquea la solicitud
    return true;
  }

  const signatureHeader = req.headers['x-hub-signature-256'];
  if (!signatureHeader) {
    console.warn('[WhatsApp Security] Advertencia: Solicitud recibida sin encabezado x-hub-signature-256.');
    return false;
  }

  if (!req.rawBody) {
    console.warn('[WhatsApp Security] Advertencia: req.rawBody no disponible para verificar firma.');
    return false;
  }

  try {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', appSecret.trim())
      .update(req.rawBody)
      .digest('hex');

    const signatureBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    console.error('[WhatsApp Security] Error al validar firma:', err.message);
    return false;
  }
}

/**
 * Envía un mensaje de texto saliente a WhatsApp Cloud API.
 * Soporta modo MOCK para evitar llamadas reales a Meta durante pruebas automatizadas.
 * 
 * @param {string} to - Número de teléfono del destinatario
 * @param {string} text - Contenido del mensaje de respuesta
 * @param {object} [options] - Opciones adicionales (ej. mock: true)
 * @returns {Promise<{success: boolean, mock?: boolean, messageId?: string}>}
 */
export async function sendWhatsAppMessage(to, text, options = {}) {
  const isMock = options.mock || process.env.WHATSAPP_MOCK_SEND === 'true';

  if (isMock) {
    console.log(`[WhatsApp Mock Send] Mensaje para ${to} interceptado con éxito en modo simulación.`);
    return {
      success: true,
      mock: true,
      to,
      preview: text.slice(0, 80),
    };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no están configurados en el servidor.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId.trim()}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.trim(),
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Error HTTP ${response.status} de Meta Graph API`;
    console.error('[WhatsApp Outbound Error]:', errorMsg);
    throw new Error(`Fallo al enviar mensaje por WhatsApp: ${errorMsg}`);
  }

  return {
    success: true,
    messageId: data?.messages?.[0]?.id,
  };
}
