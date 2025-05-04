# Mobile NewsBlur Feed Reader (Monorepo)

This repository contains the code for a mobile-focused NewsBlur feed reader, consisting of:

1.  **Backend:** A Cloudflare Worker (using Hono and TypeScript) acting as a secure proxy to the NewsBlur API. It handles session management from the frontend to the newsblur api.
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
│       ├── app.ts      (Main application logic)
│       ├── api.ts      (API call wrappers)
│       ├── ui.ts       (DOM manipulation functions)
│       ├── types.ts    (Shared TypeScript types)
│       ├── app.test.ts (Integration tests for app.ts)
│       ├── api.test.ts (Unit tests for api.ts)
│       ├── ui.test.ts  (Unit tests for ui.ts)
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

### TypeScript Modules

The frontend TypeScript code (`frontend/js/`) has been modularized:

*   `app.ts`: Contains the main application flow, event listeners, and orchestrates calls between UI and API modules.
*   `api.ts`: Wraps `fetch` calls to interact with the backend proxy worker.
*   `ui.ts`: Contains functions dedicated to updating the DOM (showing/hiding views, rendering lists, displaying messages).
*   `types.ts`: Defines shared TypeScript interfaces and types used across modules.

### Testing with Vitest

[Vitest](https://vitest.dev/) is used for testing the frontend TypeScript modules. The tests run in a Node.js environment using [JSDOM](https://github.com/jsdom/jsdom) to simulate the browser DOM.

*   **Test Files:** Located alongside the modules they test (e.g., `app.test.ts`, `ui.test.ts`, `api.test.ts`).
*   **Setup:** `vitest.setup.js` configures the JSDOM environment before tests run.
*   **Mocks:** `vi.mock()` is used extensively in `app.test.ts` to isolate the `app.ts` logic by mocking the `api.ts` and `ui.ts` modules. For API testing (`api.test.ts`), the global `fetch` function is mocked using `vi.fn()`. This approach allows testing the full behavior of exported API functions (like `login()`, `getFeeds()`) and their internal use of the `apiFetch` helper (URL construction, error handling, etc.), isolating the tests only from the actual network layer.

**Running Frontend Tests:**

Navigate to the `frontend/` directory and run:

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

## Combined Local Development

To run the full application locally, you'll need **three terminals** running concurrently:

1.  **Terminal 1 (Backend Worker):** Runs the Cloudflare Worker locally.
    ```bash
    # Ensure you are in the project root directory (mobile-newsblur/)
    npm run dev
    # Leave this running (Usually serves on http://localhost:8787)
    ```
2.  **Terminal 2 (Tailwind CSS Build):** Compiles Tailwind CSS and watches for changes.
    ```bash
    # Navigate to the frontend directory
    cd frontend
    npm run build:css
    # Leave this running
    ```
3.  **Terminal 3 (Frontend Server):** Serves the frontend using Vite.
    ```bash
    # Navigate to the frontend directory
    cd frontend
    npm run dev
    # Leave this running (Usually serves on http://localhost:5173 or similar - check Vite output)
    ```

**Accessing the App:**

*   Open your browser to the frontend URL provided by the Vite server (e.g., `http://localhost:5173`).
*   The frontend interacts with the backend worker at its URL (e.g., `http://localhost:8787`).
*   Ensure `wrangler.toml` has the correct `FRONTEND_URL` set for the frontend server's origin (e.g., `http://127.0.0.1:5173` or `http://localhost:5173`). Note that the port might differ.

## Frontend Interaction Notes

*   The backend Cloudflare Worker (in `src/`) acts as a proxy to the official NewsBlur API (`https://newsblur.com/api`). This proxy is necessary to handle CORS issues and securely manage the NewsBlur session cookie (stored in Cloudflare KV) required for authentication.
*   The frontend TypeScript code in `frontend/js/app.ts` makes API calls *to the backend worker URL* (e.g., `http://localhost:8787`). The worker then forwards these requests to NewsBlur.
*   All calls targeting the NewsBlur API via the worker should be prefixed with `/proxy` (e.g., `/proxy/api/login`, `/proxy/reader/feeds`). This prefixing, along with adding necessary credentials, is handled automatically by the `apiFetch` helper function in [frontend/js/api.ts](mdc:frontend/js/api.ts).
*   Authentication relies on the `proxy_session_id` cookie set by the worker and automatically handled by the browser (requires correct `SameSite`, `Secure`, and CORS configuration).

## Deployment

Deploying involves building the frontend and deploying both the backend worker and the frontend static assets.

1.  **Deploy Backend Worker:**
    *   Ensure `wrangler.toml` is configured with your Cloudflare `account_id` (or use the `CLOUDFLARE_ACCOUNT_ID` env var) and the production `id` for the `SESSIONS` KV namespace binding.
    *   From the project root directory, run:
        ```bash
        npx wrangler deploy
        ```
    *   Note the deployed worker URL (e.g., `https://<worker-name>.<your-subdomain>.workers.dev`) from the command output.

2.  **Build Frontend:**
    *   Ensure the `frontend/.env.production` file exists and its `VITE_API_BASE_URL` variable points to the deployed worker URL noted in the previous step.
    *   Navigate to the frontend directory:
        ```bash
        cd frontend
        ```
    *   Run the build command:
        ```bash
        npm run build
        ```
    *   This creates the production assets in `frontend/dist/`.
    *   Navigate back to the project root:
        ```bash
        cd ..
        ```

3.  **Deploy Frontend (using Cloudflare Pages):**
    *   From the **project root** directory, run:
        ```bash
        # Ensure <project-name> matches your Cloudflare Pages project
        npx wrangler pages deploy --project-name <your-cf-pages-project-name> ./frontend/dist
        ```
    *   *(Replace `<your-cf-pages-project-name>` with the actual name of your Cloudflare Pages project)*.
    *   Ensure your DNS is configured to point to the deployed Cloudflare Pages site if using a custom domain.

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

### Frontend Development

Navigate to the `frontend/` directory for specific frontend tasks.

```bash
cd frontend
npm install
```

Key commands:

*   `npm run dev`: Starts the Vite development server (usually on `http://localhost:5173`). Requires the backend worker to be running separately.
*   `npm test`: Runs Vitest unit tests.
*   `npm run build`: Creates a production build of the frontend in `frontend/dist/`.
*   `npm run build:css`: Runs Tailwind CSS to generate `style.css` from `input.css`. The `dev` script doesn't automatically handle Tailwind processing, so you might need to run this separately or in watch mode (`npm run build:css -- --watch`) alongside `npm run dev` if making style changes.

#### API Base URL Configuration

The frontend needs to know the URL of the backend proxy worker. This is configured using environment variables managed by Vite:

1.  Create two files in the `frontend/` directory:
    *   `.env.development`: Used by `npm run dev`.
        ```env
        # Example: Use local wrangler dev server
        VITE_API_BASE_URL=http://localhost:8787
        ```
    *   `.env.production`: Used by `npm run build`.
        ```env
        # Example: Use deployed worker URL
        VITE_API_BASE_URL=https://your-worker-subdomain.workers.dev 
        ```
        *(Replace `https://your-worker-subdomain.workers.dev` with your actual deployed worker URL)*

2.  The variable **must** be prefixed with `VITE_` (e.g., `VITE_API_BASE_URL`) for Vite to expose it to the frontend code ([frontend/js/api.ts](frontend/js/api.ts) reads `import.meta.env.VITE_API_BASE_URL`).