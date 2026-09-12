## 2026-08-25 - [Privilege Escalation via Mass Assignment]\n**Vulnerability:** Registration endpoint extracted 'role' directly from the request JSON and applied it to the new user object, allowing any new user to register as an admin.\n**Learning:** Destructuring request bodies without explicit whitelisting allows users to overwrite sensitive fields.\n**Prevention:** Only extract explicitly allowed fields from user input. For roles or permissions, determine them server-side based on predefined rules or email matching, never directly from user input.

## 2026-08-27 - [Missing Authentication on Email Endpoint]
**Vulnerability:** The `/api/notify/email` endpoint did not enforce any authentication, allowing any unauthenticated user to trigger email dispatch. This could be exploited as an open email relay for spam or phishing campaigns.
**Learning:** Never trust the client side (`notificationService.ts`) to be the only layer defining when a sensitive action like email sending is allowed. Server-side endpoints must always independently verify authorization.
**Prevention:** Ensure that every sensitive server endpoint (e.g. POST, PUT, DELETE, and actions like sending emails/notifications) uses an authentication checker like `getUserFromRequest`.

## 2025-03-05 - [Missing Authentication on Third-Party API Endpoints]
**Vulnerability:** The `/api/ai/generate` and `/api/scrape` endpoints lacked authentication checks, meaning anyone could call them and consume paid API credits (Gemini, Firecrawl) without authorization.
**Learning:** Endpoints proxying paid or external APIs require identical authentication safeguards to core CRUD endpoints. Relying solely on client-side routing protection exposes the server URLs to direct abuse.
**Prevention:** Implement `getUserFromRequest()` check on all API routes consuming external resources or paid integrations, enforcing 401 returns on missing/invalid sessions.

## 2025-02-27 - [Unauthenticated External API Proxies]
**Vulnerability:** External API proxy endpoints (`/api/nobb/*`) were exposed without authentication, allowing anyone to bypass client-side checks and make requests using the server's API key, potentially leading to quota exhaustion and financial impact.
**Learning:** This is a pattern in this application where server-side routes fetching external data (like Firecrawl, Gemini, and NOBB) are added but authentication checks are missed or forgotten. This allows abuse since the server uses environment variables to authenticate with external services on behalf of the client.
**Prevention:** Ensure all `/api/*` endpoints that proxy external API calls or perform sensitive operations include an explicit authentication check using `getUserFromRequest` before processing the request.

## 2025-02-27 - [Authorization Bypass via Undefined Property Matching]
**Vulnerability:** IDOR and broken access control in the data endpoints allowed non-admins to access, modify, or delete items. The ownership check compared properties like `item.companyId === user.companyId`. If an item lacked a `companyId` (e.g., was undefined), and the user also had an undefined `companyId` (or if checking against other undefined properties), the equality check evaluated to `true`, granting unauthorized access. Furthermore, token checks fell back to checking `item.id === token`, allowing token bypass using predictable object IDs.
**Learning:** In Javascript, `undefined === undefined` is true. When filtering or authorizing based on object properties, failing to check if the property actually exists on both objects before comparing them can lead to severe privilege escalation and data leakage.
**Prevention:** Always verify the truthiness of ownership properties (e.g., `item.companyId && item.companyId === user.companyId`) before equality checks in authorization logic. Avoid using object IDs as fallbacks for secure random tokens.
## 2025-03-05 - [IDOR in GDPR Export]
**Vulnerability:** The GDPR export endpoint (`/api/gdpr/export`) used truthiness-agnostic equality checks for filtering data (e.g., `item.companyId === user.companyId`). If both `item.companyId` and `user.companyId` were `undefined`, the check returned true, exposing other tenants' data that lacked an explicitly assigned `companyId`.
**Learning:** This is a recurrence of the previously logged "Authorization Bypass via Undefined Property Matching" vulnerability, but found in a different file (`gdpr/export/route.ts`). Destructuring and loose matching of optional/undefined IDs in JS arrays often leads to data leaks.
**Prevention:** Always verify the truthiness of ownership properties (e.g., `item.companyId && item.companyId === user.companyId`) before equality checks in data filtering and authorization logic.
## 2026-09-12 - Fixed Hardcoded Credentials in Auth
**Vulnerability:** Hardcoded administrative passwords and privilege escalation via email match in register route.
**Learning:** Always verify credentials strictly against hashed values stored in the database without backdoor checks. Do not grant admin privileges automatically based on email match during registration.
**Prevention:** Rely strictly on bcrypt.compare for authentication and remove dynamic admin granting in registration endpoints.

## 2026-09-12 - Whitelisted Database Collections
**Vulnerability:** The data endpoints allowed arbitrary collection names from the route parameter, which could lead to interacting with unintended database tables or memory stores.
**Learning:** Always validate and whitelist dynamic route parameters that map directly to database tables or collections to prevent unauthorized data access or pollution.
**Prevention:** Added a strict `ALLOWED_COLLECTIONS` whitelist array in the data endpoints and return a 400 status if an unknown collection is requested.

## 2026-09-12 - Idempotency in Agent Actions
**Learning:** The agent dispatch route originally processed "approve_change_order" and "reject_change_order" blindly. If a request was retried (e.g. network timeout or double-click), it would redundantly update the database and spam the "agent_activities" log.
**Prevention:** Added idempotency checks. By fetching the object via `getCollectionItemById` first, we can immediately return early if the object is already in the target state, preventing duplicated work and logs.

## 2026-09-12 - Added Timeouts to AI Actions
**Learning:** The `GoogleGenAI` SDK generateContent calls in server actions (`aiActions.ts` and `scrape/route.ts`) did not have explicit timeouts, which could cause requests to hang indefinitely if the API stalled.
**Prevention:** Wrapped the external AI calls in a `Promise.race` with a 10000ms timeout rejection to ensure robust error handling and avoid hanging server processes.
