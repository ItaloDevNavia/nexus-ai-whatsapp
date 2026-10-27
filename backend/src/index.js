import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { isGeminiConfigured, DEFAULT_MODEL } from './config/gemini.js';
import { isWhatsAppConfigured } from './services/whatsappService.js';
import chatRouter from './routes/chat.js';
import webhookRouter from './routes/webhook.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares estándar
app.use(cors());

// Parser JSON con almacenamiento de rawBody para verificación de firmas HMAC
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// Middleware para manejar JSON inválido sin exponer trazas
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'El cuerpo de la solicitud no es un JSON válido.',
    });
  }
  next();
});

// Rutas del Webhook de WhatsApp (/webhook y /api/webhook)
app.use('/', webhookRouter);
app.use('/api', webhookRouter);

// Rutas de la API de Chat Web (/api/chat)
app.use('/api', chatRouter);

// Endpoint de verificación del estado del servicio
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor del Chatbot activo',
    geminiConfigured: isGeminiConfigured(),
    whatsappConfigured: isWhatsAppConfigured(),
    model: DEFAULT_MODEL,
  });
});

// Manejador global de errores no controlados
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err.message || err);
  res.status(500).json({
    error: 'Error interno del servidor.',
  });
});

app.listen(PORT, () => {
  console.log(`[Backend] Servidor activo en http://localhost:${PORT}`);
});
