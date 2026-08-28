## 2026-08-25 - [Privilege Escalation via Mass Assignment]\n**Vulnerability:** Registration endpoint extracted 'role' directly from the request JSON and applied it to the new user object, allowing any new user to register as an admin.\n**Learning:** Destructuring request bodies without explicit whitelisting allows users to overwrite sensitive fields.\n**Prevention:** Only extract explicitly allowed fields from user input. For roles or permissions, determine them server-side based on predefined rules or email matching, never directly from user input.

## 2026-08-27 - [Missing Authentication on Email Endpoint]
**Vulnerability:** The `/api/notify/email` endpoint did not enforce any authentication, allowing any unauthenticated user to trigger email dispatch. This could be exploited as an open email relay for spam or phishing campaigns.
**Learning:** Never trust the client side (`notificationService.ts`) to be the only layer defining when a sensitive action like email sending is allowed. Server-side endpoints must always independently verify authorization.
**Prevention:** Ensure that every sensitive server endpoint (e.g. POST, PUT, DELETE, and actions like sending emails/notifications) uses an authentication checker like `getUserFromRequest`.

## 2025-03-05 - [Missing Authentication on Third-Party API Endpoints]
**Vulnerability:** The `/api/ai/generate` and `/api/scrape` endpoints lacked authentication checks, meaning anyone could call them and consume paid API credits (Gemini, Firecrawl) without authorization.
**Learning:** Endpoints proxying paid or external APIs require identical authentication safeguards to core CRUD endpoints. Relying solely on client-side routing protection exposes the server URLs to direct abuse.
**Prevention:** Implement `getUserFromRequest()` check on all API routes consuming external resources or paid integrations, enforcing 401 returns on missing/invalid sessions.
