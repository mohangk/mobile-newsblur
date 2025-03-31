// frontend/js/app.js

// Import necessary functions from API and UI modules
import {
    login as apiLogin,
    logout as apiLogout,
    getFeeds as apiGetFeeds,
    checkAuth as apiCheckAuth
} from './api.js';

import {
    showLoginView,
    showFeedListView,
    showLoginMessage,
    showFeedMessage,
    setLoginButtonState,
    renderFeedList,
    clearFeedDisplay
} from './ui.js';

// --- Configuration ---
// Adjust this if your local worker runs on a different port or if deployed
const WORKER_BASE_URL = 'http://localhost:8787'; // Default for wrangler dev
const API_BASE = `${WORKER_BASE_URL}/proxy`;

// --- DOM Elements ---
const loginView = document.getElementById('login-view');
const feedListView = document.getElementById('feed-list-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const loginMessageArea = document.getElementById('login-message-area');
const feedListElement = document.getElementById('feed-list');
const feedMessageArea = document.getElementById('feed-message-area');
const logoutButton = document.getElementById('logout-button');

// --- State --- (Simple state management)
let isLoading = false; // Prevent multiple simultaneous requests

// --- Helper Functions ---

/**
 * Recursively extracts feed objects from the nested folder structure provided by NewsBlur API.
 * Flattens the structure into a simple array of feed objects.
 */
function extractFeedsFromFolders(structure, allFeedsMap, extractedFeeds) {
    if (typeof structure === 'number') {
        // If it's a number, it's a feed ID
        if (allFeedsMap[structure]) extractedFeeds.push(allFeedsMap[structure]);
    } else if (Array.isArray(structure)) {
        // If it's an array, process each item
        structure.forEach(item => extractFeedsFromFolders(item, allFeedsMap, extractedFeeds));
    } else if (typeof structure === 'object' && structure !== null) {
        // If it's an object, it represents a folder; process its contents
        Object.values(structure).forEach(folderContent => {
            extractFeedsFromFolders(folderContent, allFeedsMap, extractedFeeds);
        });
    }
}


// --- Core Logic Functions ---

/**
 * Checks authentication status on load and displays the appropriate view.
 */
export async function checkAuthAndLoadView() {
    console.log('App: Checking auth status...');
    isLoading = true;
    try {
        const isAuthenticated = await apiCheckAuth();
        if (isAuthenticated) {
            console.log("App: Already authenticated.");
            showFeedListView();
            
            isLoading = false;
            
            console.log("DEBUG: About to call fetchAndDisplayFeeds from checkAuthAndLoadView (isLoading reset)");
            await fetchAndDisplayFeeds();
        } else {
            console.log('App: Not authenticated.');
            showLoginView();
            isLoading = false; // Reset here too if not authenticated
        }
    } catch (error) {
        console.error('App: Error checking auth:', error);
        showLoginView(); 
        showLoginMessage('Error contacting server. Please try again later.', true);
        isLoading = false; // Reset on error
    } 
    // Removed the finally block here as isLoading is handled in all paths
}

/**
 * Handles the login form submission.
 * @param {Event} event The form submission event.
 */
export async function handleLoginSubmit(event) {
    event.preventDefault(); // Prevent default form submission
    if (isLoading) return;

    // Get form elements within the handler
    const loginForm = document.getElementById('login-form');
    const usernameInput = loginForm.querySelector('#username');
    const passwordInput = loginForm.querySelector('#password');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginMessage('Username and password are required.', true);
        return;
    }

    isLoading = true;
    showLoginMessage('Logging in...');
    setLoginButtonState(true);

    try {
        await apiLogin(username, password);
        console.log('App: Login successful');
        showLoginMessage('Success!', false);
        showFeedListView();
        
        isLoading = false; 

        console.log("DEBUG: About to call fetchAndDisplayFeeds from handleLoginSubmit (isLoading reset)");
        await fetchAndDisplayFeeds();
    } catch (error) {
        console.error('App: Login error:', error);
        showLoginMessage(error.message || 'Login failed. Please check credentials.', true);
    } finally {
        // Still ensure isLoading is false in finally, especially for the error case
        isLoading = false; 
        setLoginButtonState(false);
    }
}

/**
 * Fetches feeds using the API module and renders them using the UI module.
 */
export async function fetchAndDisplayFeeds() {
    console.log("DEBUG: fetchAndDisplayFeeds called");
    if (isLoading) {
        console.log("DEBUG: fetchAndDisplayFeeds returning early (isLoading=true)");
        return;
    }
    isLoading = true;
    showFeedMessage('Loading feeds...');
    clearFeedDisplay(); // Clear previous list and message

    try {
        console.log("DEBUG: Calling api.getFeeds...");
        const data = await apiGetFeeds(); 
        console.log("DEBUG: api.getFeeds returned:", data);
        const feedsArray = data.feeds ? Object.values(data.feeds) : [];
        console.log(`DEBUG: Processing feeds. Resulting feedsArray: ${JSON.stringify(feedsArray)}`);

        renderFeedList(feedsArray, handleFeedItemClick);
        showFeedMessage(''); // Clear loading/error message on success or empty

    } catch (error) {
        console.error('DEBUG: Error in fetchAndDisplayFeeds:', error);
        showFeedMessage(`Error loading feeds: ${error.message}`, true);
    } finally {
        isLoading = false;
        console.log("DEBUG: fetchAndDisplayFeeds finished (isLoading=false)");
    }
}

/**
 * Handles clicking on a feed item.
 * (Placeholder for future functionality)
 * @param {string|number} feedId The ID of the clicked feed.
 */
export function handleFeedItemClick(feedId) {
    if (isLoading) return;
    console.log(`App: Feed item clicked: ${feedId}`);
    // Future: Navigate to feed detail view, fetch items, etc.
    showFeedMessage(`Selected Feed ID: ${feedId}`); // Temporary feedback
}

/**
 * Handles the logout button click.
 */
export async function handleLogout() {
    if (isLoading) return;
    console.log('App: Logging out...');
    isLoading = true;
    // Optionally show a message

    try {
        await apiLogout();
        console.log('App: Logout successful.');
    } catch (error) {
        // Log error but proceed to show login view anyway
        console.error('App: Logout API call failed:', error);
    } finally {
        // Always show login view after logout attempt
        showLoginView();
        isLoading = false;
    }
}

/**
 * Sets up event listeners and performs the initial auth check.
 * This should be called once the DOM is ready.
 */
export async function initializeApp() {
    console.log('App: Initializing...');

    // Get elements needed for event listeners
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');

    // Add event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    } else {
        console.error("App: Login form not found during init!");
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        console.error("App: Logout button not found during init!");
    }

    // Initial check to see if user is already logged in
    // Use await here to ensure check completes before potential test assertions
    await checkAuthAndLoadView();
    console.log('App: Initialization complete.');
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', initializeApp);
