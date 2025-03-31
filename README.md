# Mobile NewsBlur Feed Reader (Monorepo)

This repository contains the code for a mobile-focused NewsBlur feed reader, consisting of:

1.  **Backend:** A Cloudflare Worker (using Hono and TypeScript) acting as a secure proxy to the NewsBlur API.
2.  **Frontend:** A vanilla JavaScript, HTML, and Tailwind CSS single-page application.

The backend proxy handles CORS and securely manages the NewsBlur session cookie using Cloudflare KV.

## Project Structure

```
mobile-newsblur/
├── .gitignore
├── frontend/          <-- Frontend application
│   ├── package.json
│   ├── tailwind.config.js
│   ├── index.html
│   ├── css/
│   │   ├── input.css   (Tailwind input)
│   │   └── style.css   (Tailwind output)
│   └── js/
│       ├── app.js      (Main application logic)
│       ├── api.js      (API call wrappers)
│       ├── ui.js       (DOM manipulation functions)
│       ├── app.test.js (Integration tests for app.js)
│       ├── api.test.js (Unit tests for api.js)
│       ├── ui.test.js  (Unit tests for ui.js)
│       └── vitest.setup.js (Test environment setup)
├── node_modules/      <-- Backend dependencies
├── frontend/node_modules/ <-- Frontend dependencies (incl. Vitest, JSDOM)
├── src/               <-- Backend worker source
│   └── index.ts
├── package.json       <-- Backend package.json
├── package-lock.json
├── tsconfig.json      <-- Backend TypeScript config
└── wrangler.toml      <-- Backend Wrangler config
```

## Setup

1.  **Install Backend Dependencies:** Navigate to the project root (`mobile-newsblur/`) and run:
    ```bash
    npm install
    ```
2.  **Install Frontend Dependencies:** Navigate into the frontend directory and run `npm install`:
    ```bash
    cd frontend
    npm install
    cd ..
    ```
3.  **Configure Wrangler (`wrangler.toml`):**
    *   Edit the root `wrangler.toml` file.
    *   Set the `FRONTEND_URL` variable under `[vars]` to the URL where your frontend will be served locally (usually `http://localhost:8080`). For production deployments, update this to the production frontend URL.
4.  **Create Cloudflare KV Namespace:**
    *   Run `npx wrangler kv:namespace create SESSIONS`.
    *   Copy the output `id` and paste it into `wrangler.toml` under the `[[kv_namespaces]]` section for the `binding = "SESSIONS"`.

## Frontend Development & Testing

### JavaScript Modules

The frontend JavaScript (`frontend/js/`) has been modularized:

*   `app.js`: Contains the main application flow, event listeners, and orchestrates calls between UI and API modules.
*   `api.js`: Wraps `fetch` calls to interact with the backend proxy worker.
*   `ui.js`: Contains functions dedicated to updating the DOM (showing/hiding views, rendering lists, displaying messages).

### Testing with Vitest

[Vitest](https://vitest.dev/) is used for testing the frontend JavaScript modules. The tests run in a Node.js environment using [JSDOM](https://github.com/jsdom/jsdom) to simulate the browser DOM.

*   **Test Files:** Located alongside the modules they test (e.g., `app.test.js`, `ui.test.js`, `api.test.js`).
*   **Setup:** `vitest.setup.js` configures the JSDOM environment before tests run.
*   **Mocks:** `vi.mock()` is used extensively in `app.test.js` to isolate the `app.js` logic by mocking the `api.js` and `ui.js` modules.

**Running Frontend Tests:**

Navigate to the `frontend/` directory and run:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Combined Local Development

To run the full application locally, you'll need **three terminals** running concurrently from the project root (`mobile-newsblur/`):

1.  **Terminal 1 (Tailwind CSS Build):** Compiles Tailwind CSS and watches for changes.
    ```bash
    cd frontend
    npm run build:css
    # Leave this running
    ```
2.  **Terminal 2 (Backend Worker):** Runs the Cloudflare Worker locally.
    ```bash
    # Ensure you are in the project root directory
    npx wrangler dev
    # Leave this running (Usually serves on http://localhost:8787)
    ```
3.  **Terminal 3 (Frontend Server):** Serves the static frontend files.
    ```bash
    # Ensure you are in the project root directory
    npx http-server frontend -a localhost -p 8080
    # Leave this running (Usually serves on http://localhost:8080)
    ```

**Accessing the App:**

*   Open your browser to the frontend URL (e.g., `http://localhost:8080`).
*   The frontend interacts with the backend worker at its URL (e.g., `http://localhost:8787`).
*   Ensure `wrangler.toml` has the correct `FRONTEND_URL` set for the frontend server's origin.

## Frontend Interaction Notes

*   The JavaScript code in `frontend/js/app.js` makes API calls to the backend worker URL, prefixing all NewsBlur API paths with `/proxy` (e.g., `/proxy/api/login`, `/proxy/reader/feeds`).
*   Authentication relies on the `proxy_session_id` cookie set by the worker and automatically handled by the browser (requires correct `SameSite`, `Secure`, and CORS configuration).

## Deploying

1.  **Backend:**
    *   Update `FRONTEND_URL` in `wrangler.toml` to your production frontend URL.
    *   Consider updating `SameSite` cookie settings in `src/index.ts` to `None` (and ensure `Secure` is `true`) if deploying frontend and backend to different domains.
    *   Run `npx wrangler deploy` from the project root.
2.  **Frontend:**
    *   Build the final CSS (remove `--watch` from `build:css` script if desired).
    *   Deploy the contents of the `frontend/` directory as a static site using a service like Cloudflare Pages, Netlify, Vercel, etc.
    *   Ensure the deployed frontend code points its API calls to the deployed worker URL.

## Backend API Testing (Optional)

You can test the backend worker API directly using `curl`. See examples below, replacing `<worker_url>` with the local (`http://localhost:8787`) or deployed URL.

*   **Login:**
    ```bash
    curl -i -X POST \
         -H "Content-Type: application/x-www-form-urlencoded" \
         -d 'username=<user>&password=<pass>' \
         <worker_url>/proxy/api/login
    # Note the Set-Cookie: proxy_session_id=... value
    ```
*   **Get Feeds:**
    ```bash
    curl -i -X GET \
         --cookie "proxy_session_id=<value_from_login>" \
         <worker_url>/proxy/reader/feeds
    ```