import { useState, useEffect, useRef } from 'react';
import './App.css';

const SESSION_STORAGE_KEY = 'nexus_ai_chat_history';

const SUGGESTED_PROMPTS = [
  {
    icon: '⚡',
    title: 'Arquitectura del proyecto',
    prompt: '¿Cómo está estructurado este proyecto y qué tecnologías utiliza en frontend y backend?',
  },
  {
    icon: '🚀',
    title: 'Ventajas del SDK @google/genai',
    prompt: 'Explícame qué ventajas ofrece el SDK oficial @google/genai frente a versiones anteriores.',
  },
  {
    icon: '💡',
    title: 'Buenas prácticas en APIs',
    prompt: '¿Cuáles son las mejores prácticas para estructurar endpoints seguros con Express y Node.js?',
  },
  {
    icon: '✨',
    title: 'Habilidades del portafolio',
    prompt: '¿Qué habilidades y capacidades de desarrollo full-stack demuestra este chatbot?',
  },
];

export default function App() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Guardar en sessionStorage al actualizar mensajes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
    } catch (err) {
      console.warn('No se pudo guardar el historial en sessionStorage', err);
    }
  }, [messages]);

  // Auto-scroll al final del chat
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, errorMessage]);

  // Ajustar altura dinámica del textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputMessage]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setErrorMessage(null);
    setLastFailedMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorDetail = data?.error || `Error del servidor (${response.status})`;
        throw new Error(errorDetail);
      }

      if (!data || typeof data.reply !== 'string') {
        throw new Error('Respuesta del servidor en formato inesperado.');
      }

      const assistantMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply.trim() || '(Respuesta vacía recibida del asistente)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Error al comunicarse con /api/chat:', err);
      setLastFailedMessage(text);
      setErrorMessage(
        err.message || 'No se pudo conectar con el servidor. Verifica que el backend esté ejecutándose en el puerto 5000.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (isLoading) return;
    setMessages([]);
    setErrorMessage(null);
    setLastFailedMessage(null);
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn('Error al limpiar sessionStorage', err);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  return (
    <div className="chat-app" id="nexus-chat-app">
      {/* Encabezado */}
      <header className="chat-header">
        <div className="header-brand">
          <div className="header-logo-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
              <path d="M18 14v1a6 6 0 0 1-12 0v-1" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </div>
          <div className="header-info">
            <h1>Nexus AI</h1>
            <div className="header-status">
              <span className="status-dot"></span>
              <span>Gemini Flash en línea</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-icon-secondary"
            onClick={handleClearChat}
            disabled={messages.length === 0 && !errorMessage}
            title="Limpiar conversación actual"
            id="clear-chat-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            <span>Limpiar chat</span>
          </button>
        </div>
      </header>

      {/* Área de Mensajes */}
      <main className="chat-messages-container" id="chat-messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen" id="welcome-screen">
            <div className="welcome-avatar-large">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
            </div>
            <h2>¡Hola! Soy Nexus AI</h2>
            <p>
              Asistente virtual impulsado por Google Gemini. Explora preguntas sobre desarrollo web, arquitectura de software o este portafolio.
            </p>

            <span className="suggestions-title">Preguntas sugeridas</span>
            <div className="suggestions-grid">
              {SUGGESTED_PROMPTS.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggestion-card"
                  onClick={() => handleSendMessage(item.prompt)}
                  id={`suggestion-${index}`}
                >
                  <span className="suggestion-icon">{item.icon}</span>
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.role}`} id={msg.id}>
              <div className={`message-avatar ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                  </svg>
                ) : (
                  'Tú'
                )}
              </div>
              <div className="message-content-wrapper">
                <div className="message-bubble">{msg.content}</div>
                <span className="message-time">{msg.timestamp}</span>
              </div>
            </div>
          ))
        )}

        {/* Indicador de carga */}
        {isLoading && (
          <div className="message-row assistant" id="typing-indicator-row">
            <div className="message-avatar assistant">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
              </svg>
            </div>
            <div className="message-content-wrapper">
              <div className="typing-bubble">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}

        {/* Banner de error */}
        {errorMessage && (
          <div className="error-banner" role="alert" id="chat-error-banner">
            <div className="error-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
            {lastFailedMessage && (
              <button type="button" className="btn-retry" onClick={handleRetry} id="retry-btn">
                Reintentar
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Entrada de Texto */}
      <footer className="chat-input-area">
        <form
          className="input-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          id="chat-input-form"
        >
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            rows="1"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje a Nexus AI... (Enter para enviar)"
            disabled={isLoading}
            maxLength={4000}
            id="chat-textarea"
          />

          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || isLoading}
            title="Enviar mensaje"
            id="send-message-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>

        <div className="input-footer">
          <span>Presiona <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para salto de línea</span>
          <span>{inputMessage.length} / 4000</span>
        </div>
      </footer>
    </div>
  );
}
