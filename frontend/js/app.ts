// frontend/js/app.ts

// Import necessary functions from API and UI modules
import {
    login as apiLogin,
    logout as apiLogout,
    getFeeds as apiGetFeeds,
    checkAuth as apiCheckAuth,
    Feed,
    FeedMap,
    ApiError
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

// --- DOM Elements ---
const loginView = document.getElementById('login-view')!;
const feedListView = document.getElementById('feed-list-view')!;
const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
const usernameInput = document.getElementById('username') as HTMLInputElement | null;
const passwordInput = document.getElementById('password') as HTMLInputElement | null;
const loginButton = document.getElementById('login-button') as HTMLButtonElement | null;
const loginMessageArea = document.getElementById('login-message-area')!;
const feedListElement = document.getElementById('feed-list')!;
const feedMessageArea = document.getElementById('feed-message-area')!;
const logoutButton = document.getElementById('logout-button') as HTMLButtonElement | null;

// --- State --- (Simple state management)
let isLoading = false; // Prevent multiple simultaneous requests

// --- Helper Functions ---

/**
 * Recursively extracts feed objects from the nested folder structure provided by NewsBlur API.
 * Flattens the structure into a simple array of feed objects.
 * Note: The exact structure type might need refinement based on actual API response.
 */
function extractFeedsFromFolders(
    structure: any,
    allFeedsMap: FeedMap,
    extractedFeeds: Feed[]
): void {
    if (typeof structure === 'number' || typeof structure === 'string') {
        const feedIdStr = String(structure);
        if (allFeedsMap[feedIdStr]) extractedFeeds.push(allFeedsMap[feedIdStr]);
    } else if (Array.isArray(structure)) {
        structure.forEach(item => extractFeedsFromFolders(item, allFeedsMap, extractedFeeds));
    } else if (typeof structure === 'object' && structure !== null) {
        Object.values(structure).forEach(folderContent => {
            extractFeedsFromFolders(folderContent, allFeedsMap, extractedFeeds);
        });
    }
}


// --- Core Logic Functions ---

/**
 * Checks authentication status on load and displays the appropriate view.
 */
export async function checkAuthAndLoadView(): Promise<void> {
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
            isLoading = false;
        }
    } catch (error) {
        console.error('App: Error checking auth:', error);
        showLoginView(); 
        showLoginMessage('Error contacting server. Please try again later.', true);
        isLoading = false;
    } 
}

/**
 * Handles the login form submission.
 * @param {Event} event The form submission event.
 */
export async function handleLoginSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (isLoading) return;

    // Fetch elements *inside* the handler to ensure they exist when called
    const currentLoginForm = document.getElementById('login-form') as HTMLFormElement | null;
    const currentUsernameInput = document.getElementById('username') as HTMLInputElement | null;
    const currentPasswordInput = document.getElementById('password') as HTMLInputElement | null;

    // Check if the form and its inputs were found *now*
    if (!currentLoginForm || !currentUsernameInput || !currentPasswordInput) {
        console.error("Login form or inputs not found when handling submit!");
        showLoginMessage('An unexpected error occurred. Please try again.', true);
        return; 
    }

    const username = currentUsernameInput.value.trim();
    const password = currentPasswordInput.value;

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
        const errorMessage = (error instanceof Error) ? error.message : 'Login failed. Please check credentials.';
        showLoginMessage(errorMessage, true);
    } finally {
        isLoading = false; 
        setLoginButtonState(false);
    }
}

/**
 * Fetches feeds using the API module and renders them using the UI module.
 */
export async function fetchAndDisplayFeeds(): Promise<void> {
    console.log("DEBUG: fetchAndDisplayFeeds called");
    if (isLoading) {
        console.log("DEBUG: fetchAndDisplayFeeds returning early (isLoading=true)");
        return;
    }
    isLoading = true;
    showFeedMessage('Loading feeds...');
    clearFeedDisplay();

    try {
        console.log("DEBUG: Calling api.getFeeds...");
        const data = await apiGetFeeds(); 
        console.log("DEBUG: api.getFeeds returned:", data);

        const allFeedsMap = data.feeds || {};
        let feedsArray: Feed[] = [];
        if (data.folders && data.folders.length > 0) {
             extractFeedsFromFolders(data.folders, allFeedsMap, feedsArray);
        } else {
            feedsArray = Object.values(allFeedsMap);
        }

        console.log(`DEBUG: Processing feeds. Resulting feedsArray: ${feedsArray.length} feeds`);

        renderFeedList(feedsArray, handleFeedItemClick);
        showFeedMessage('');

    } catch (error) {
        console.error('DEBUG: Error in fetchAndDisplayFeeds:', error);
        const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
        showFeedMessage(`Error loading feeds: ${errorMessage}`, true);
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
export function handleFeedItemClick(feedId: string | number): void {
    if (isLoading) return;
    console.log(`App: Feed item clicked: ${feedId}`);
    showFeedMessage(`Selected Feed ID: ${feedId}`);
}

/**
 * Handles the logout button click.
 */
export async function handleLogout(): Promise<void> {
    if (isLoading) return;
    console.log('App: Logging out...');
    isLoading = true;

    try {
        await apiLogout();
        console.log('App: Logout successful.');
    } catch (error) {
        console.error('App: Logout API call failed:', error);
    } finally {
        showLoginView();
        isLoading = false;
    }
}

/**
 * Sets up event listeners and performs the initial auth check.
 * This should be called once the DOM is ready.
 */
export async function initializeApp(): Promise<void> {
    console.log('App: Initializing...');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    await checkAuthAndLoadView();
    console.log('App: Initialization complete.');
}

// --- Initialization ---

document.addEventListener('DOMContentLoaded', initializeApp);
