// frontend/js/api.js

// --- Configuration ---
// Defined here, but could also be passed in or loaded from elsewhere
const WORKER_BASE_URL = 'http://localhost:8787'; // Default for wrangler dev
const API_BASE = `${WORKER_BASE_URL}/proxy`;

/**
 * Performs a fetch request with common options and error handling.
 * @param {string} endpoint - The API endpoint (e.g., '/reader/feeds').
 * @param {RequestInit} options - Fetch options (method, headers, body, etc.).
 * @returns {Promise<any>} - The JSON response data.
 * @throws {Error} - Throws an error if the fetch fails or the response indicates an error.
 */
async function apiFetch(endpoint, options = {}) {
    const defaultOptions = {
        credentials: 'include', // Send cookies
        headers: {
            'Accept': 'application/json',
            ...options.headers, // Allow overriding default headers
        },
    };
    // Combine options, explicitly including method if passed
    const fetchOptions = { ...defaultOptions, ...options }; 

    const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);

    // Attempt to parse JSON regardless of status for potential error messages
    let data;
    try {
        // Handle potential 204 No Content responses gracefully
        if (response.status === 204) {
            data = null;
        } else {
            data = await response.json();
        }
    } catch (e) {
        // If JSON parsing fails on an error status, create a generic error
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}. Failed to parse error body.`);
        }
        // If JSON parsing fails on a success status, that's unexpected
        console.error("Failed to parse JSON on successful response:", e)
        throw new Error("Received success status, but failed to parse response body.");
    }


    if (!response.ok) {
        // Use specific messages from parsed JSON data if available
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        let specificErrorFound = false;
        if (data) {
             if (data.errors && data.errors.__all__ && data.errors.__all__.length > 0) {
                errorMessage = data.errors.__all__[0]; // NewsBlur specific error format
                specificErrorFound = true;
            } else if (data.message) {
                errorMessage = data.message; // General message format from our proxy/Hono
                specificErrorFound = true;
            }
        }
        // Only fall back to generic auth failed if no specific message was found and data indicates auth failure
        // (This specific check might be less relevant now with the change below, but kept for robustness)
        if (!specificErrorFound && data && data.authenticated === false) {
             errorMessage = data.message || "Authentication failed.";
        }

        const error = new Error(errorMessage);
        error.status = response.status; // Attach status code to the error
        error.data = data; // Attach full data if needed
        throw error;
    }

    // Specific check for NewsBlur's { authenticated: false } pattern on *successful* (response.ok) statuses
    // This handles the case where NewsBlur might return 200 OK but still indicate failed auth in the body
    if (response.ok && data && data.authenticated === false) {
         let specificAuthErrorMessage = "Authentication failed."; // Default
        if (data.errors && data.errors.__all__ && data.errors.__all__.length > 0) {
            specificAuthErrorMessage = data.errors.__all__[0];
        } else if (data.message) {
            specificAuthErrorMessage = data.message;
        }
        const error = new Error(specificAuthErrorMessage);
        error.status = 401; // Treat as unauthorized even if original status was 200
        error.data = data;
        throw error;
    }

    return data; // Return parsed JSON data on success
}

/**
 * Attempts to log in the user via the proxy.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<any>} - The JSON response from the login endpoint.
 */
export async function login(username, password) {
    return apiFetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            'username': username,
            'password': password,
        }),
    });
}

/**
 * Logs out the user via the proxy.
 * @returns {Promise<any>} - The JSON response from the logout endpoint.
 */
export async function logout() {
    // Doesn't really need response data, but apiFetch handles errors
    return apiFetch('/api/logout', {
        method: 'POST',
    });
}

/**
 * Fetches the user's feeds and folders.
 * @returns {Promise<any>} - The JSON response containing feeds and folders.
 */
export async function getFeeds() {
    // Request favicons along with feed data
    // Explicitly set method for clarity and testability
    return apiFetch('/reader/feeds?include_favicons=true', { method: 'GET' });
}

/**
 * Checks authentication status by attempting to fetch feeds.
 * Returns true if successful (authenticated), false otherwise.
 * Does not throw errors for 401, only for network/other issues.
 * @returns {Promise<boolean>} - True if authenticated, false otherwise.
 */
export async function checkAuth() {
     try {
        await getFeeds(); // Use the existing getFeeds function
        return true; // If getFeeds succeeds, we're authenticated
    } catch (error) {
        if (error.status === 401) {
            return false; // 401 means not authenticated, not an unexpected error
        }
        // Re-throw other errors (network, server errors, etc.)
        console.error("Unexpected error during auth check:", error);
        throw error;
    }
}