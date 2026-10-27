# Nexus AI — Intelligent Multi-Channel Assistant

[![Node.js](https://img.shields.io/badge/Node.js-v24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.3.0-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-v6.3.5-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gen%20AI-gemini--3.5--flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![WhatsApp Cloud API](https://img.shields.io/badge/Meta-WhatsApp%20Cloud%20API%20(v21.0)-25D366?logo=whatsapp&logoColor=white)](https://developers.facebook.com/docs/whatsapp/cloud-api)

**Nexus AI** is a full-stack, multi-channel conversational AI assistant engineered to unify natural language interactions across both a modern responsive web client and **WhatsApp Cloud API**, powered by the official **Google Gen AI SDK (`@google/genai`)** with the high-performance `gemini-3.5-flash` model.

Designed with clean architectural boundaries, Nexus AI isolates external provider integrations into modular services, features cryptographic webhook validation, memory-efficient event deduplication, defensive input sanitization, and a dual-client delivery model (Browser Single-Page Application & Instant Messaging).

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Visual Demonstration](#visual-demonstration)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Installation & Local Execution](#installation--local-execution)
- [Environment Variables](#environment-variables)
- [WhatsApp Cloud API Workflow](#whatsapp-cloud-api-workflow)
- [API Reference](#api-reference)
- [Security Considerations](#security-considerations)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Author & License](#author--license)

---

## Overview

### Problem Statement
Modern businesses and developers frequently face fragmented communication channels: web chat systems and messaging platforms (such as WhatsApp) often run on isolated backends, duplicating natural language processing logic, multiplying API costs, and creating inconsistent brand interactions.

### The Nexus AI Solution
Nexus AI establishes a **centralized AI processing gateway** where:
1. **A unified AI orchestration service** (`geminiService.js`) enforces consistent system instructions, language policies, and hallucination guardrails across all clients.
2. **Web clients** interact through a responsive React single-page application with immediate session state management and development proxying.
3. **WhatsApp users** converse asynchronously through official Meta Cloud API Webhooks with automated challenge verification, cryptographic signature verification, and duplicate event protection.
4. **Local development environments** can safely simulate message dispatching through dedicated mock controls without exhausting provider quotas or triggering test-recipient blocks.

---

## Key Features

- **Google Gen AI Official SDK Integration**: Powered by `@google/genai` utilizing the latest generation `gemini-3.5-flash` model for high-speed, cost-effective inference with custom system instructions in Spanish.
- **Enterprise-Grade WhatsApp Cloud API Webhook**:
  - Verification challenge responder (`hub.mode` and `hub.challenge`).
  - Cryptographic validation of incoming payloads via `x-hub-signature-256` (HMAC SHA-256 with constant-time equality checks using `crypto.timingSafeEqual`).
  - In-memory event deduplication cache with sliding TTL (15-minute window) to prevent reprocessing of Meta network retries.
  - Sub-second acknowledgment (`HTTP 200 { status: 'EVENT_RECEIVED' }`) with background asynchronous AI processing to comply with Meta timeout windows.
  - Safe fallback responses for non-text messages (voice notes, images, stickers).
- **Modern Responsive React Web Client**:
  - Clean light design tailored for developer portfolios with micro-animations and status telemetry.
  - Suggested query chips for immediate exploration.
  - Interactive states: pulsing typing indicator, keyboard shortcut support (`Enter` to submit, `Shift + Enter` for line breaks), input length validation.
  - Transient session history saved to `sessionStorage` with instant conversation wipe functionality.
  - Built-in error alert with automated retry capability.
- **Defensive API Architecture**:
  - String sanitization, empty payload detection, and strict payload length caps (max 4,000 characters).
  - Safe error masking (sanitizing 400, 401, 429, 503, and provider errors to prevent leaking API keys, tokens, or internal stack traces).
  - Native development reverse proxy via Vite configuration to avoid cross-origin friction.

---

## Visual Demonstration

### Text-Based UI Blueprint
> The following wireframe illustrates the layout, interactive states, and component hierarchy implemented in `frontend/src/App.jsx`.

```text
+-----------------------------------------------------------------------+
|  [Nexus AI]  ● Gemini Flash en línea             [ Limpiar chat ]     |
+-----------------------------------------------------------------------+
|                                                                       |
|                       (✦)  ¡Hola! Soy Nexus AI                        |
|        Asistente virtual impulsado por Google Gemini.                 |
|                                                                       |
|  [ ⚡ Arquitectura del proyecto ]    [ 🚀 Ventajas del SDK @google/genai ]
|  [ 💡 Buenas prácticas en APIs  ]    [ ✨ Habilidades del portafolio    ]
|                                                                       |
|  (Tú)      > ¿Cuáles son los 3 colores primarios?                      |
|                                                                       |
|  (Nexus)   > Los tres colores primarios tradicionales son rojo,       |
|              amarillo y azul.                                         |
|                                                                       |
+-----------------------------------------------------------------------+
|  [ Escribe un mensaje a Nexus AI...                      ] [ Send ➔ ] |
|  Presiona Enter para enviar, Shift + Enter para salto      38 / 4000  |
+-----------------------------------------------------------------------+
```

### Adding Visual Assets
To showcase actual screenshots or an animated GIF of the running application:
1. Capture screenshots of the web client (`http://localhost:5173`) and a WhatsApp conversation.
2. Place the image files into a directory such as `docs/images/` (e.g., `docs/images/web-client.png`).
3. Embed them using standard Markdown:
   ```markdown
   ![Nexus AI Web Client Interface](./docs/images/web-client.png)
   ![Nexus AI WhatsApp Interaction](./docs/images/whatsapp-chat.png)
   ```

---

## System Architecture

Nexus AI uses a decoupled client-server architecture where both HTTP clients and webhook consumers route through an Express API to a shared AI service layer.

```mermaid
flowchart TD
    subgraph Clients["Clients"]
        Browser["Web Browser (React 19 + Vite 6)"]
        WhatsAppUser["WhatsApp User (Mobile Device)"]
    end

    subgraph Infrastructure["Tunnel & Edge"]
        Cloudflare["Cloudflare Quick Tunnel (HTTPS)"]
    end

    subgraph Backend["Express 5 Backend Server (Node.js)"]
        ViteProxy["Vite Dev Proxy (:5173 -> :5000)"]
        ChatRouter["POST /api/chat"]
        WebhookRouter["GET & POST /webhook"]
        Deduplicator["Deduplication Cache (15m TTL)"]
        HMACValidator["HMAC SHA-256 Validator"]
        HealthEndpoint["GET /api/health"]
        GeminiService["Unified Gemini Service (geminiService.js)"]
        WhatsAppService["WhatsApp Dispatcher (whatsappService.js)"]
    end

    subgraph External["External Cloud APIs"]
        GeminiAPI["Google Gemini AI Platform (@google/genai)"]
        MetaGraph["Meta Graph API (v21.0 / v26.0)"]
    end

    %% Web Client Flow
    Browser -->|HTTP /api/chat| ViteProxy
    ViteProxy --> ChatRouter
    ChatRouter --> GeminiService

    %% WhatsApp Inbound Flow
    WhatsAppUser -->|Message| MetaGraph
    MetaGraph -->|POST /webhook| Cloudflare
    Cloudflare --> WebhookRouter
    WebhookRouter --> HMACValidator
    HMACValidator --> Deduplicator
    Deduplicator -->|Async Event| GeminiService

    %% AI Processing
    GeminiService -->|Generate Content| GeminiAPI
    GeminiAPI -->|Inference Result| GeminiService

    %% Outbound Responses
    GeminiService -->|Reply Payload| ChatRouter
    ChatRouter -->|JSON { reply }| Browser

    GeminiService -->|Reply Payload| WhatsAppService
    WhatsAppService -->|POST /messages| MetaGraph
    MetaGraph -->|Message Delivery| WhatsAppUser
```

---

## Technology Stack

| Layer / Domain | Technology | Version | Purpose in Nexus AI |
| :--- | :--- | :---: | :--- |
| **Backend Runtime** | [Node.js](https://nodejs.org/) | `^20.x` / `^24.x` | Asynchronous JavaScript runtime utilizing native ES Modules (`"type": "module"`). |
| **Backend Framework**| [Express](https://expressjs.com/) | `^5.3.0` | Routing engine, webhook endpoints, raw-buffer body parsing for HMAC verification, global error interceptors. |
| **AI SDK** | [@google/genai](https://www.npmjs.com/package/@google/genai) | `^2.31.0` | Official Google Gen AI client library interfacing directly with `gemini-3.5-flash`. |
| **Frontend Core** | [React](https://react.dev/) | `^19.1.0` | Declarative UI state management, real-time message feed rendering, and error recovery. |
| **Build Tool** | [Vite](https://vite.dev/) | `^6.3.5` | Fast HMR dev server and production bundler with automated development reverse proxy. |
| **Styling** | Vanilla CSS3 | Modern CSS | Custom design system, CSS custom properties, responsive viewport units (`100dvh`), micro-animations. |
| **Typography** | [Google Fonts](https://fonts.google.com/) | Web API | Clean typography using `Plus Jakarta Sans`. |
| **Cross-Origin** | [cors](https://www.npmjs.com/package/cors) | `^2.8.6` | Configures Cross-Origin Resource Sharing for API security. |
| **Environment** | [dotenv](https://www.npmjs.com/package/dotenv) | `^18.0.9` | Secure ingestion of local configuration variables from `.env`. |
| **Security / Crypto** | Node.js `crypto` | Native | Constant-time HMAC-SHA256 signature verification (`timingSafeEqual`). |
| **Tunneling** | [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) | Latest CLI | Public HTTPS ingress tunnel routing Meta webhook events to the local development server. |

---

## Repository Structure

```text
nexus-ai-whatsapp/
├── .gitignore                   # Excludes .env files, node_modules, build artifacts, logs, keys
├── README.md                    # Technical project documentation
│
├── backend/                     # Independent Express API service
│   ├── .env.example             # Template for required environment variables
│   ├── package.json             # Backend dependencies and scripts (start, dev)
│   └── src/
│       ├── index.js             # Server entry point, middleware, route mounting, health telemetry
│       ├── config/
│       │   └── gemini.js        # Google Gen AI client configuration, model selection & system prompt
│       ├── routes/
│       │   ├── chat.js          # POST /api/chat route handler for web client
│       │   └── webhook.js       # GET & POST /webhook handlers for Meta Cloud API
│       └── services/
│           ├── geminiService.js # Unified AI inference logic with input validation and system rules
│           └── whatsappService.js # Meta Graph API outbound dispatcher, signature validator, mock handler
│
└── frontend/                    # Independent React SPA (Vite)
    ├── index.html               # HTML5 shell with Google Fonts and SEO meta tags
    ├── package.json             # Frontend dependencies and build scripts (dev, build, lint, preview)
    ├── vite.config.js           # Vite configuration with /api reverse proxy to port 5000
    └── src/
        ├── App.jsx              # Main chat interface component with state & session management
        ├── App.css              # Custom styling for chat bubbles, animations, and responsive layout
        ├── index.css            # CSS reset, typography, and theme design tokens
        └── main.jsx             # React DOM entry point
```

---

## Prerequisites

Before running Nexus AI locally, ensure you have:

1. **Node.js**: Version `20.x` or higher (`v24.x` recommended).
2. **npm**: Version `10.x` or higher.
3. **Google AI Studio API Key**: A free key obtainable from [Google AI Studio](https://aistudio.google.com/).
4. **Meta for Developers Account** *(Optional — only required for live WhatsApp messaging)*:
   - A registered Meta Developer App with the **WhatsApp** product added.
   - A System User Access Token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - WhatsApp Phone Number ID and WhatsApp Business Account (WABA) ID.
5. **Tunneling Tool** *(Optional — only required for receiving live WhatsApp webhooks locally)*:
   - [Cloudflare Tunnel (`cloudflared`)](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) or [ngrok](https://ngrok.com/).

> [!TIP]
> **Evaluating Only the Web Chatbot?**  
> You do **not** need Meta credentials or a tunnel to run the web interface. Providing only `GEMINI_API_KEY` in `backend/.env` is sufficient to run the full web chat client.

---

## Installation & Local Execution

### 1. Clone the Repository
```bash
git clone https://github.com/ItaloDevNavia/nexus-ai-whatsapp.git
cd nexus-ai-whatsapp
```

---

### 2. Configure and Run the Backend

#### Step A: Install Dependencies
```bash
cd backend
npm install
```

#### Step B: Set Up Environment Variables
Create a local `.env` file inside `backend/` based on `.env.example`:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Open `backend/.env` and insert your credentials:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```
*(If configuring WhatsApp, add the corresponding Meta variables as described in [Environment Variables](#environment-variables)).*

#### Step C: Start the Backend Service
```bash
npm run dev
```
The server will start at `http://localhost:5000` (using Node `--watch` for automatic reloads).  
Verify server health by opening: `http://localhost:5000/api/health`.

---

### 3. Configure and Run the Frontend Client

Open a **separate terminal window**:

```bash
cd frontend
npm install
npm run dev
```

Vite will serve the web application (typically at `http://localhost:5173` or `http://localhost:5174`).  
The development proxy automatically routes all `/api` requests to the backend at `http://localhost:5000`.

---

### 4. Expose Webhook for WhatsApp (Optional for Live Messaging)

Open a **third terminal window** to establish an HTTPS tunnel so Meta can reach your local server:

**Using Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:5000
```

Cloudflare will provide a public URL (e.g., `https://example-subdomain.trycloudflare.com`).  
Use `https://example-subdomain.trycloudflare.com/webhook` as the Callback URL in your Meta App Dashboard.

---

## Environment Variables

All runtime configurations and credentials are read from `backend/.env`. A sanitised reference file is provided in [backend/.env.example](backend/.env.example).

| Variable Name | Required? | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `5000` | Port on which the Express server listens. |
| `GEMINI_API_KEY` | **Required** | `your_gemini_api_key` | API key from Google AI Studio for Gemini inference. |
| `GEMINI_MODEL` | Optional | `gemini-3.5-flash` | Gemini model identifier used for content generation. |
| `WHATSAPP_ACCESS_TOKEN` | Required for WA | `your_whatsapp_access_token` | Meta Graph API System User Bearer token. |
| `WHATSAPP_PHONE_NUMBER_ID` | Required for WA | `your_phone_number_id` | Meta-assigned sender phone number ID (15–16 digits). |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Required for WA | `your_waba_account_id` | WhatsApp Business Account (WABA) identifier (15–16 digits). |
| `WHATSAPP_VERIFY_TOKEN` | Required for WA | `your_custom_verify_token` | Custom string for verifying Meta's GET challenge handshake. |
| `WHATSAPP_APP_SECRET` | Optional | `your_app_secret` | App Secret used to validate `x-hub-signature-256` HMAC. |
| `WHATSAPP_MOCK_SEND` | Optional | `false` | When `true`, intercepts outbound calls to Meta for testing without real messages. |

> [!CAUTION]
> Never commit `.env` files to git. The repository `.gitignore` explicitly excludes `.env`, `.env.*`, and private keys (`*.key`, `*.pem`).

---

## WhatsApp Cloud API Workflow

```
[Phone User] ---> WhatsApp Network ---> Meta Servers ---> [Your Webhook: POST /webhook]
                                                                     |
                                                                     v
                                                            [Express Backend]
                                                                     |
                                                                     v
                                                            [Gemini 3.5 Flash]
                                                                     |
                                                                     v
[Phone User] <--- WhatsApp Network <--- Meta Servers <--- [Meta Graph API: POST /messages]
```

### 1. Webhook Verification (`GET /webhook`)
When configuring the Callback URL in Meta for Developers:
1. Provide the public HTTPS tunnel URL: `https://<YOUR-TUNNEL>/webhook`.
2. Enter the verification token defined in `WHATSAPP_VERIFY_TOKEN`.
3. Meta sends a request with `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`.
4. Nexus AI verifies that `hub.verify_token` matches and echoes back `hub.challenge` with `HTTP 200`.

### 2. WhatsApp Business Account Subscription (`POST /{WABA_ID}/subscribed_apps`)
To receive live inbound messages from actual phone numbers (rather than only test events from the developer console), the app must be subscribed to the WABA:

```bash
curl -X POST "https://graph.facebook.com/v26.0/<YOUR_WABA_ID>/subscribed_apps" \
     -H "Authorization: Bearer <YOUR_WHATSAPP_ACCESS_TOKEN>"
```

### 3. Inbound Processing & Deduplication (`POST /webhook`)
- Incoming payload arrives with `entry[].changes[].value.messages[]`.
- Status updates (delivered, read receipts) are acknowledged and ignored.
- The unique message ID (`wamid.HBg...`) is checked against an in-memory cache. If already processed within 15 minutes, it is skipped.
- The server responds `HTTP 200 { status: 'EVENT_RECEIVED' }` immediately to prevent Meta timeout retries.
- The AI service processes the user's text asynchronously and formats the response.

### 4. Outbound Response (`POST /v21.0/<PHONE_NUMBER_ID>/messages`)
- `whatsappService.js` transmits the response to Meta Graph API `v21.0`.

> [!NOTE]
> **Meta Development / Sandbox Mode Restriction**:  
> In development mode, Meta restricts outbound messaging strictly to phone numbers verified in **WhatsApp > API Setup > To > Manage Phone Number List**. Outbound messages to unverified numbers will be rejected by Meta with error `#131030 (Recipient phone number not in allowed list)`.

---

## API Reference

### 1. Health Telemetry
Returns operational status and provider readiness flags.

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "message": "Servidor del Chatbot activo",
  "geminiConfigured": true,
  "whatsappConfigured": true,
  "model": "gemini-3.5-flash"
}
```

---

### 2. Web Chat Interface
Direct conversational endpoint for web clients.

- **URL**: `/api/chat`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "message": "¿Cómo está estructurado este proyecto?"
}
```
- **Success Response**: `200 OK`
```json
{
  "reply": "Este proyecto utiliza una arquitectura desacoplada con Express en el backend y React en el frontend..."
}
```
- **Error Responses**:
  - `400 Bad Request`: Message is empty, missing, not a string, or exceeds 4,000 characters.
  - `401 Unauthorized`: AI provider authentication failure.
  - `429 Too Many Requests`: Provider rate limits exceeded.
  - `503 Service Unavailable`: Provider experiencing temporary high demand.
  - `500 Internal Server Error`: Server configuration issue or internal failure.

---

### 3. WhatsApp Webhook Verification
Endpoint queried by Meta during webhook subscription validation.

- **URL**: `/webhook` (also available via alias `/api/webhook`)
- **Method**: `GET`
- **Query Parameters**:
  - `hub.mode`: `subscribe`
  - `hub.verify_token`: Must match `WHATSAPP_VERIFY_TOKEN`
  - `hub.challenge`: Integer string challenge
- **Success Response**: `200 OK` (Body contains the raw string from `hub.challenge`).
- **Error Response**: `403 Forbidden` if verification token fails.

---

### 4. WhatsApp Webhook Inbound Events
Receives message notifications and status updates from Meta Cloud API.

- **URL**: `/webhook` (also available via alias `/api/webhook`)
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `x-hub-signature-256` *(optional; validated if `WHATSAPP_APP_SECRET` is set)*
  - `x-mock-send: true` *(optional; forces simulation mode for automated testing)*
- **Success Response**: `200 OK`
```json
{
  "status": "EVENT_RECEIVED"
}
```

---

## Security Considerations

### Implemented Security Measures
- **Strict Credential Isolation**: All API keys, tokens, and secrets are read from server-side environment variables and never sent to the browser.
- **Repository Sanitization**: Comprehensive `.gitignore` protects `.env`, `.env.*`, keys (`*.key`, `*.pem`), build folders, and coverage directories.
- **Constant-Time Signature Verification**: When `WHATSAPP_APP_SECRET` is configured, incoming payloads validate `x-hub-signature-256` using Node's `crypto.timingSafeEqual` over the captured raw body buffer.
- **Defensive Input Validation**: Inputs are trimmed, verified as strings, and capped at 4,000 characters. JSON syntax errors are handled by custom middleware without leaking internal stack traces.
- **Sanitized Logging**: Server logs record operational status codes and event IDs without logging request headers, bearer tokens, or full authorization payloads.
- **Safe Testing / Mock Controls**: Testing can enable `WHATSAPP_MOCK_SEND=true` or send `x-mock-send: true` to test the full ingestion and AI generation pipeline without incurring Meta messaging costs.

### Production Recommendations
- [ ] Add rate-limiting middleware (e.g., `express-rate-limit`) on `/api/chat` to protect against request flooding.
- [ ] Configure strict CORS origin whitelisting in `cors()` to restrict web requests exclusively to your production frontend domain.
- [ ] Place the Node.js server behind a reverse proxy (e.g., NGINX, Cloudflare, or AWS ALB) with managed SSL/TLS termination.

---

## Known Limitations

1. **In-Memory Deduplication**: The event deduplication cache uses an in-memory `Map` with a 15-minute TTL. Restarting the backend server process resets this cache.
2. **Ephemeral Web Chat History**: The web client stores conversation history in browser `sessionStorage`. Closing the browser tab or window clears the conversation.
3. **Stateless Conversational Context**: The current implementation handles each user query as a single-turn prompt enriched by the system prompt. Multi-turn historical context is not yet stored in a persistent database.
4. **Text-Only Inbound Processing**: While text messages are fully answered by Gemini, non-text media (audio messages, images, documents, stickers) trigger an automated polite text notice stating that only text is currently supported.

---

## Future Improvements

- [ ] **Persistent Database Layer**: Integrate MongoDB or PostgreSQL to persist conversation sessions, user history, and interaction analytics.
- [ ] **Multi-Modal Capabilities**: Leverage `@google/genai` to transcribe incoming WhatsApp voice notes and analyze uploaded images.
- [ ] **Token Streaming**: Implement Server-Sent Events (SSE) or WebSockets on the web client for real-time word-by-word streaming responses.
- [ ] **Distributed Deduplication**: Use Redis for distributed message deduplication and rate limiting across scaled container instances.
- [ ] **Automated CI/CD**: Add GitHub Actions workflows for automated linting, unit testing, and deployment validation.

---

## Author & License

### Author
**Italo Navía Torres**
- GitHub: [@ItaloDevNavia](https://github.com/ItaloDevNavia)
- Repository: [nexus-ai-whatsapp](https://github.com/ItaloDevNavia/nexus-ai-whatsapp)

### License
This repository does not currently include a formal open-source license. All rights are reserved by the author. Terms of reuse, redistribution, and modification are not yet formally defined.
