# Mobile NewsBlur Feed Reader (Monorepo)

This repository contains the code for a mobile-focused NewsBlur feed reader, consisting of two main parts:

1.  **Backend:** A Cloudflare Worker acting as a secure proxy to the NewsBlur API.
2.  **Frontend:** A vanilla JavaScript, HTML, and CSS single-page application for displaying feeds.

## Project Structure

```
mobile-newsblur/
├── .gitignore
├── frontend/          <-- Frontend application code
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── node_modules/      <-- Backend dependencies
├── src/               <-- Backend worker source code
│   └── index.ts
├── package.json       <-- Backend package.json
├── package-lock.json
├── tsconfig.json      <-- Backend TypeScript config
└── wrangler.toml      <-- Backend Wrangler config
```

## Backend (Cloudflare Worker Proxy)

The backend is a Cloudflare Worker built with [Hono](https://hono.dev/) and TypeScript. Its primary purpose is to:

*   Bypass browser CORS restrictions by proxying requests from the frontend to the `newsblur.com` API.
*   Securely handle the NewsBlur session cookie (`newsblur_sessionid`) server-side using Cloudflare KV storage, preventing it from being exposed directly to the browser.

### Backend Setup

1.  **Install Dependencies:** Navigate to the project root (`mobile-newsblur/`) and run:
    ```bash
    npm install
    ```
2.  **Configure Wrangler:**
    *   Edit `wrangler.toml`.
    *   Choose a unique `name` for your worker if deploying.
    *   **Crucially**, set the `FRONTEND_URL` variable under `[vars]` to the URL where your frontend will be served (e.g., `http://localhost:8080` for local development, or the production URL if deployed).
3.  **Create KV Namespace:**
    *   Run the command: `npx wrangler kv:namespace create SESSIONS` (or choose another name).
    *   Copy the `id` value output by the command.
    *   Paste this `id` into `wrangler.toml` under the `[[kv_namespaces]]` section where `binding = "SESSIONS"`.

### Running Backend Locally

1.  Start the local development server:
    ```bash
    npx wrangler dev
    ```
2.  The worker will typically be available at `http://localhost:8787`.

### Deploying Backend

1.  Ensure you are logged in to Cloudflare (`npx wrangler login`).
2.  Deploy the worker:
    ```bash
    npx wrangler deploy
    ```
    Wrangler will output the public URL for your deployed worker.

### Testing Backend with cURL

You can test the running worker (local or deployed) using `curl`.

**1. Login:** Replace `<your_username>`/`<your_password>` and `<worker_url>` (e.g., `http://localhost:8787` or your deployed URL).

```bash
curl -i -X POST \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d 'username=<your_username>&password=<your_password>' \
     <worker_url>/proxy/api/login
```

If successful, the response will include `Set-Cookie: proxy_session_id=...`. This is the **proxy's** session cookie.

**2. Authenticated Request:** Use the `proxy_session_id` value from the login response.

```bash
curl -i -X GET \
     --cookie "proxy_session_id=<proxy_session_id_value>" \
     <worker_url>/proxy/reader/feeds
```

This should return your feed data if the session is valid.

## Frontend (JavaScript Feed Reader)

The frontend is a simple single-page application located in the `frontend/` directory.

### Frontend Setup

No build step is currently required. It's vanilla HTML, CSS, and JavaScript.

### Running Frontend Locally

1.  You need a simple static file server. If you have Node.js, you can use `http-server`:
    ```bash
    # From the project root directory (mobile-newsblur/)
    npx http-server frontend
    ```
    This will typically serve the frontend at `http://localhost:8080`.
2.  Alternatively, use an editor extension like VS Code's "Live Server" to serve `frontend/index.html`.

### Frontend Interaction

The JavaScript code in `frontend/js/app.js` should make API calls to the **backend worker's URL**, prefixing all NewsBlur API paths with `/proxy`.

*   **Example Login:** Send a POST request to `<worker_url>/proxy/api/login`.
*   **Example Get Feeds:** Send a GET request to `<worker_url>/proxy/reader/feeds`.

The browser's cookie mechanism will automatically handle sending the `proxy_session_id` cookie back to the worker on subsequent requests after a successful login, provided the worker is configured with the correct `FRONTEND_URL` for CORS and cookie settings.

## Combined Local Development

To run both the backend worker and the frontend locally for development, you'll typically need three terminals running concurrently in the project root (`mobile-newsblur/`):

1.  **Terminal 1 (Tailwind CSS Build):** Start the Tailwind CSS build process in watch mode. This compiles your Tailwind classes into `frontend/css/style.css` and watches for changes in your frontend files.
    ```bash
    # Navigate into the frontend directory first
    cd frontend 
    
    # Run the build script (defined in frontend/package.json)
    npm run build:css
    
    # Leave this terminal running
    ```

2.  **Terminal 2 (Backend Worker):** Start the Cloudflare Worker local development server.
    ```bash
    # From the project root directory
    npx wrangler dev
    
    # Leave this terminal running. Worker typically available at http://localhost:8787
    ```

3.  **Terminal 3 (Frontend Server):** Serve the static frontend files.
    ```bash
    # From the project root directory
    npx http-server frontend -a localhost -p 8080
    
    # Leave this terminal running. Frontend typically available at http://localhost:8080
    # (-a localhost ensures access via localhost, -p 8080 sets the port)
    ```

**Accessing the App:**

*   Open your browser to the frontend URL (usually `http://localhost:8080`).
*   The frontend JavaScript (`app.js`) will make API calls to the backend worker URL (usually `http://localhost:8787`).
*   Ensure the `FRONTEND_URL` variable in the root `wrangler.toml` is set correctly (e.g., `FRONTEND_URL = "http://localhost:8080"`).
