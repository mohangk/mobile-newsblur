import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { Context } from 'hono';

// Define the expected shape of the Cloudflare environment bindings
type Bindings = {
    // *** Uses SESSIONS to match wrangler.toml binding ***
    SESSIONS: KVNamespace;
    FRONTEND_URL?: string; // Make optional to handle default
    // Add other bindings like secrets or D1 databases if needed
};

// Define the shape of variables possibly available on the context
type Variables = {
    // Add any custom variables you might inject via middleware
};

// Constants
const NEWSBLUR_BASE_URL = 'https://newsblur.com';
const PROXY_SESSION_COOKIE_NAME = 'proxy_session_id';

// Initialize Hono App with TypeScript generics
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// --- Helper Functions ---

function getFrontendOrigin(c: Context<{ Bindings: Bindings; Variables: Variables }>): string {
    const requestOrigin = c.req.header('Origin');

    if (requestOrigin) {
        // If the Origin header is present, trust it as the frontend origin.
        // console.log(`Using request Origin header for CORS: ${requestOrigin}`); // Optional log
        return requestOrigin;
    } else {
        // Fallback if Origin header is missing (e.g., some server-to-server requests, older browsers, or misconfigurations)
        const envUrl = c.env.FRONTEND_URL;
        if (envUrl) {
            console.warn(`Origin header missing, falling back to FRONTEND_URL env var: ${envUrl}`);
            return envUrl;
        } else {
            // Last resort: Throw an error if no origin can be determined
            console.error(`Origin header missing and FRONTEND_URL env var not set. Cannot configure CORS.`);
            // Use HTTPException for proper error handling in Hono
            throw new HTTPException(500, { message: 'Worker configuration error: Frontend origin cannot be determined.' });
        }
    }
}

function getSecureFlag(c: Context<{ Bindings: Bindings; Variables: Variables }>): boolean {
    // Cookies should be secure if the worker is likely running over HTTPS.
    // For local dev (localhost or 127.0.0.1 over HTTP), it should be false.
    try {
        const url = new URL(c.req.url);
        // Check if protocol is HTTPS OR if hostname is NOT a local development one
        const isSecureProtocol = url.protocol === 'https:';
        const isLocalDevHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
        
        // Return true (secure) if it's HTTPS.
        // Return false (not secure) if it's HTTP AND a local dev host.
        // Return true (secure) by default if it's HTTP but NOT a known local dev host (e.g., a deployed worker accessed via HTTP somehow - unlikely but safer default)
        if (isSecureProtocol) {
            return true; 
        } else {
            // It's HTTP
            return !isLocalDevHost; // Secure=false ONLY if it's local dev host over HTTP
        }
    } catch {
        return true; // Default to secure if URL parsing fails
    }
}

/**
 * Determines the SameSite attribute based on request origin vs worker origin.
 * Returns 'Lax' if the request Origin header matches the worker's origin (same-site).
 * Returns 'None' otherwise (cross-site or Origin header missing).
 */
function getSameSiteAttribute(c: Context<{ Bindings: Bindings; Variables: Variables }>): 'None' | 'Lax' {
    try {
        const workerUrl = new URL(c.req.url);
        const workerOrigin = workerUrl.origin; // e.g., "https://worker.example.com"
        const requestOrigin = c.req.header('Origin'); // e.g., "https://frontend.example.com" or the worker origin

        // If the Origin header exists and matches the worker's origin, it's a same-site request.
        if (requestOrigin && requestOrigin === workerOrigin) {
            //console.log(`SameSite Check: Request origin (${requestOrigin}) matches worker origin (${workerOrigin}). Using SameSite=Lax.`);
            return 'Lax';
        } else {
             //console.log(`SameSite Check: Request origin (${requestOrigin || 'missing'}) differs from worker origin (${workerOrigin}). Using SameSite=None.`);
        }
    } catch (e) {
        // Should not happen with valid c.req.url, but be safe
        console.error("Error determining SameSite attribute:", e);
    }
    // Default to 'None' for cross-origin requests or if Origin header is absent/mismatched.
    // This requires Secure=true (handled by getSecureFlag).
    return 'None';
}

// --- Middleware ---

// 1. CORS
app.use('/proxy/*', async (c, next) => {
    const frontendOrigin = getFrontendOrigin(c);
    // console.log(`Configuring CORS for origin: ${frontendOrigin}`); // Optional log
    const corsMiddleware = cors({
        origin: frontendOrigin,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', /* Add other headers frontend sends */],
        credentials: true,
        exposeHeaders: ['ETag', /* Add others if needed */], // Expose headers frontend might need
    });
    await corsMiddleware(c, next);
});

// Handle CORS preflight requests explicitly
app.options('/proxy/*', (c) => {
    // CORS middleware adds headers. Just return 204 No Content.
    return c.body(null, 204);
});


// --- Routes ---

// 1. Login Route (/proxy/api/login)
app.post('/proxy/api/login', async (c) => {
    let username: unknown, password: unknown;
    try {
        const body = await c.req.parseBody();
        username = body['username'];
        password = body['password'];

        if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
             // Use HTTPException for clearer error handling
             throw new HTTPException(400, { message: 'Username and password are required strings.' });
        }
    } catch (e) {
        console.error("Error parsing login body:", e);
        if (e instanceof HTTPException) throw e; // Re-throw Hono exceptions
        throw new HTTPException(400, { message: 'Invalid request body.', cause: e });
    }

    console.log(`[${new Date().toISOString()}] Attempting NewsBlur login via proxy for user: ${username}`);

    try {
        const loginResponse = await fetch(`${NEWSBLUR_BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Hono-NewsBlur-Proxy-TS/1.0 (Cloudflare Worker)'
            },
            body: new URLSearchParams({
                'username': username as string, // Assert type after validation
                'password': password as string, // Assert type after validation
                'next': '/'
            }),
            redirect: 'manual'
        });

        console.log(`[${new Date().toISOString()}] NewsBlur login response status: ${loginResponse.status}`);

        const setCookieHeader = loginResponse.headers.get('set-cookie');
        let newsblurSessionCookieValue: string | null = null;

        if (setCookieHeader && loginResponse.status >= 200 && loginResponse.status < 400) {
            const match = setCookieHeader.match(/newsblur_sessionid=([^;]+)/);
            if (match && match[1]) {
                newsblurSessionCookieValue = `newsblur_sessionid=${match[1]}`;
                console.log(`[${new Date().toISOString()}] Successfully extracted NewsBlur session cookie.`);
            }
        }

        if (newsblurSessionCookieValue) {
            const sessionId = crypto.randomUUID();
            const sessionDurationSeconds = 24 * 60 * 60; // 1 day

            try {
                 // Store in KV. Use waitUntil so response isn't blocked.
                 // *** Uses c.env.SESSIONS ***
                 c.executionCtx.waitUntil(
                    c.env.SESSIONS.put(sessionId, newsblurSessionCookieValue, {
                        expirationTtl: sessionDurationSeconds
                    })
                 );
                 console.log(`[${new Date().toISOString()}] NewsBlur session store triggered for proxy session ID: ${sessionId.substring(0,8)}...`);

                 // Use 'as const' for correct type inference, especially for sameSite
                 const cookieOptions = {
                    path: '/',
                    httpOnly: true,
                    secure: getSecureFlag(c), // Use existing helper for Secure
                    sameSite: getSameSiteAttribute(c), // Use NEW helper for SameSite
                    maxAge: sessionDurationSeconds
                 } as const;
                 console.log(`[${new Date().toISOString()}] Setting cookie with options: ${JSON.stringify(cookieOptions)}`);
                 setCookie(c, PROXY_SESSION_COOKIE_NAME, sessionId, cookieOptions);

                 return c.json({ authenticated: true, message: "Login successful (proxy)" });

            } catch (kvError) {
                 console.error(`[${new Date().toISOString()}] FATAL: Error triggering KV store put!`, kvError);
                 // Let user know something failed server-side, even if KV put is async
                  throw new HTTPException(500, { message: 'Proxy internal server error (KV Store configuration issue?).' });
            }

        } else {
            console.error(`[${new Date().toISOString()}] NewsBlur login failed for user ${username}. Status: ${loginResponse.status}`);
            let errorBody: any = { authenticated: false, message: 'Login failed on NewsBlur.' };
            try {
                const clonedResponse = loginResponse.clone();
                errorBody = await clonedResponse.json();
            } catch { /* Ignore if parsing fails */ }

            // Clear potentially invalid proxy cookie
            deleteCookie(c, PROXY_SESSION_COOKIE_NAME, { path: '/' });
            // Return NewsBlur's status code and body
            return c.json(errorBody, loginResponse.status as any); // Hono expects number literal sometimes
        }

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during NewsBlur login fetch for user ${username}:`, error);
         if (error instanceof HTTPException) throw error;
        throw new HTTPException(502, { message: 'Proxy error contacting NewsBlur login.', cause: error });
    }
});


// 2. Generic Proxy Route (/proxy/*)
app.all('/proxy/*', async (c) => {
    const sessionId = getCookie(c, PROXY_SESSION_COOKIE_NAME);

    if (!sessionId) {
         if (c.req.method === 'GET' && c.req.path.endsWith('favicon.ico')) {
            return new Response(null, { status: 404 });
        }
        console.log(`[${new Date().toISOString()}] Proxy access denied: No session cookie.`);
        throw new HTTPException(401, { message: 'Not authenticated via proxy. Please log in.' });
    }

    let newsblurCookieValue: string | null = null;
    try {
        // *** Uses c.env.SESSIONS ***
        newsblurCookieValue = await c.env.SESSIONS.get(sessionId);
    } catch (kvError) {
         console.error(`[${new Date().toISOString()}] FATAL: KV read error! Session ID: ${sessionId}`, kvError);
         throw new HTTPException(500, { message: 'Proxy internal server error (KV Store read failure). Check binding.' });
    }

    if (!newsblurCookieValue) {
        console.log(`[${new Date().toISOString()}] Proxy session invalid/expired: ${sessionId.substring(0,8)}...`);
        deleteCookie(c, PROXY_SESSION_COOKIE_NAME, { path: '/' });
        throw new HTTPException(401, { message: 'Proxy session expired or invalid. Please log in again.' });
    }

    const url = new URL(c.req.url);
    const targetPath = url.pathname.replace('/proxy', '');
    const targetUrl = `${NEWSBLUR_BASE_URL}${targetPath}${url.search}`;

    console.log(`[${new Date().toISOString()}] Proxying: ${c.req.method} ${targetPath} for session ${sessionId.substring(0,8)}...`);

    try {
        const requestHeaders = new Headers(c.req.raw.headers);
        requestHeaders.set('Cookie', newsblurCookieValue);
        requestHeaders.set('User-Agent', 'Hono-NewsBlur-Proxy-TS/1.0 (Cloudflare Worker)');

        // Clean Cloudflare/proxy specific headers
        ['Host', 'Cf-Connecting-Ip', 'Cf-Ipcountry', 'Cf-Visitor', 'Cf-Ray', 'Cf-Worker', 'X-Forwarded-For', 'X-Forwarded-Proto', 'Connection'].forEach(h => requestHeaders.delete(h));

        const newsblurResponse = await fetch(targetUrl, {
             method: c.req.method,
             headers: requestHeaders,
             body: (c.req.method !== 'GET' && c.req.method !== 'HEAD') ? c.req.raw.body : undefined,
             redirect: 'manual'
        });

        console.log(`[${new Date().toISOString()}] NewsBlur upstream status for ${targetPath}: ${newsblurResponse.status}`);

        if (newsblurResponse.status === 401 || newsblurResponse.status === 403) {
            console.log(`[${new Date().toISOString()}] Upstream auth error (Status: ${newsblurResponse.status}) for session ${sessionId.substring(0,8)}.... Clearing session.`);
            // *** Uses c.env.SESSIONS ***
            c.executionCtx.waitUntil(c.env.SESSIONS.delete(sessionId)); // Async delete
            deleteCookie(c, PROXY_SESSION_COOKIE_NAME, { path: '/' });
            throw new HTTPException(401, { message: 'NewsBlur session expired or invalid. Please log in again via proxy.' });
        }

        const responseHeaders = new Headers();
        newsblurResponse.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (['content-type', 'content-length', 'date', 'etag'].includes(lowerKey)) {
                responseHeaders.set(key, value);
            }
        });

        // Stream the response body
        return new Response(newsblurResponse.body, {
            status: newsblurResponse.status,
            statusText: newsblurResponse.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error proxying ${c.req.method} ${targetPath}:`, error);
         if (error instanceof HTTPException) throw error;
        throw new HTTPException(502, { message: 'Proxy error contacting NewsBlur upstream.', cause: error });
    }
});

// --- Logout Route ---
app.post('/proxy/api/logout', async (c) => {
    const sessionId = getCookie(c, PROXY_SESSION_COOKIE_NAME);
    console.log(`[${new Date().toISOString()}] Logout requested for session: ${sessionId ? sessionId.substring(0,8)+'...' : 'None'}`);

    if (sessionId) {
        try {
            // Asynchronously delete the session from KV, don't block response
            c.executionCtx.waitUntil(c.env.SESSIONS.delete(sessionId));
            console.log(`[${new Date().toISOString()}] KV delete triggered for session ${sessionId.substring(0,8)}...`);
        } catch (kvError) {
            // Log the error but proceed with cookie deletion, as KV might be temporarily unavailable
            console.error(`[${new Date().toISOString()}] Non-fatal: Failed to delete session from KV during logout: ${sessionId}`, kvError);
        }
    }

    // Always instruct the browser to delete the cookie
    deleteCookie(c, PROXY_SESSION_COOKIE_NAME, {
        path: '/',
        secure: getSecureFlag(c),
        httpOnly: true,
        sameSite: 'Lax'
    });

    // Return a success response
    return c.json({ message: "Logged out successfully." });
});

// --- Error Handling ---
// Catch errors thrown by routes or middleware
app.onError((err, c) => {
    console.error(`[${new Date().toISOString()}] Hono Error Handler Caught:`, err);
    if (err instanceof HTTPException) {
        // Use the HTTPException's response directly
        return err.getResponse();
    }
    // Generic fallback
    return c.json({ message: 'Internal Server Error', error: err.message || 'Unknown error' }, 500);
});

// --- Export the Hono App for Cloudflare Workers ---
export default app;
