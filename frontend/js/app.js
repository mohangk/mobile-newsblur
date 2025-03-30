// frontend/js/app.js

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

// --- Functions --- //

/** Helper to show/hide elements using Tailwind's hidden class */
function setVisibility(element, visible) {
    if (!element) return;
    if (visible) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

/** Show the login view and hide the feed list view */
function showLoginView() {
    setVisibility(loginView, true);
    setVisibility(feedListView, false);
    if (feedListElement) feedListElement.innerHTML = ''; // Clear feed list when logging out
    if (feedMessageArea) feedMessageArea.textContent = ''; // Clear feed messages
}

/** Show the feed list view and hide the login view */
function showFeedListView() {
    setVisibility(loginView, false);
    setVisibility(feedListView, true);
    if (loginMessageArea) loginMessageArea.textContent = ''; // Clear login messages
    if (passwordInput) passwordInput.value = ''; // Clear password field
}

/** Displays a message in the login message area */
function showLoginMessage(message, isError = false) {
    if (!loginMessageArea) return;
    loginMessageArea.textContent = message;
    loginMessageArea.className = `text-xs italic h-4 ${isError ? 'text-red-500' : 'text-green-600'}`;
    // Optionally hide after a few seconds if it's not an error?
}

/** Displays a message in the feed list message area */
function showFeedMessage(message, isError = false) {
    if (!feedMessageArea) return;
    feedMessageArea.textContent = message;
    feedMessageArea.className = `text-center mb-4 h-5 ${isError ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`;
}

/**
 * Checks if the user is likely already authenticated by trying to fetch feeds.
 */
async function checkAuthStatus() {
    console.log('Checking auth status...');
    try {
        const response = await fetch(`${API_BASE}/reader/feeds`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (response.ok) {
            console.log('Already authenticated.');
            showFeedListView();
            fetchAndRenderFeeds(); // Fetch feeds since we're logged in
        } else if (response.status === 401) {
            console.log('Not authenticated.');
            showLoginView();
        } else {
            // Handle other potential errors (e.g., server down)
            console.error('Unexpected error checking auth:', response.status);
            showLoginView(); // Default to login view on unexpected errors
            showLoginMessage(`Error: ${response.statusText}`, true);
        }
    } catch (error) {
        console.error('Network error checking auth:', error);
        showLoginView(); // Default to login view on network errors
        showLoginMessage('Network error. Is the server running?', true);
    }
}

/**
 * Handles the login form submission.
 * @param {Event} event The form submission event.
 */
async function handleLoginFormSubmit(event) {
    event.preventDefault(); // Prevent actual form submission
    if (isLoading) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        showLoginMessage('Username and password are required.', true);
        return;
    }

    isLoading = true;
    showLoginMessage('Logging in...');
    if (loginButton) loginButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
            },
            body: new URLSearchParams({
                'username': username,
                'password': password,
            }),
        });

        const data = await response.json();

        if (response.ok && data.authenticated) {
            showLoginMessage('Success!', false);
            // Delay slightly to show success message before switching view
            setTimeout(() => {
                showFeedListView();
                fetchAndRenderFeeds();
            }, 500);
        } else {
            // Use error message from API response if available
            let errorMessage = 'Login failed. Please check credentials.';
            if (data.errors && data.errors.__all__ && data.errors.__all__.length > 0) {
                errorMessage = data.errors.__all__[0];
            } else if (data.message) {
                 errorMessage = data.message;
            }
            throw new Error(errorMessage);
        }

    } catch (error) {
        console.error('Login error:', error);
        showLoginMessage(error.message || 'An unknown error occurred.', true);
    } finally {
        isLoading = false;
        if (loginButton) loginButton.disabled = false;
    }
}


/**
 * Fetches and renders the list of feeds.
 */
async function fetchAndRenderFeeds() {
    if (isLoading) return;
    isLoading = true;
    showFeedMessage('Loading feeds...');
    if (feedListElement) feedListElement.innerHTML = ''; // Clear previous list

    try {
        // Fetch request is the same as in checkAuthStatus, could be refactored
        const response = await fetch(`${API_BASE}/reader/feeds?include_favicons=true`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Session expired or became invalid between check and now
                showLoginView();
                showLoginMessage('Session expired. Please log in again.', true);
                return; // Stop execution here
            }
            throw new Error(`Failed to fetch feeds. Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.authenticated === false || !data.feeds) {
             throw new Error(data.message || 'Authentication failed or no feeds data.');
        }

        renderFeeds(data.feeds, data.folders);
        showFeedMessage(''); // Clear loading message on success

    } catch (error) {
        console.error('Error fetching/rendering feeds:', error);
        showFeedMessage(error.message || 'An unknown error occurred while fetching feeds.', true);
    } finally {
        isLoading = false;
    }
}

/**
 * Recursively extracts feed objects from the nested folder structure.
 */
function extractFeeds(structure, allFeedsMap, extractedFeeds) {
    if (typeof structure === 'number') {
        if (allFeedsMap[structure]) extractedFeeds.push(allFeedsMap[structure]);
    } else if (Array.isArray(structure)) {
        structure.forEach(item => extractFeeds(item, allFeedsMap, extractedFeeds));
    } else if (typeof structure === 'object' && structure !== null) {
        Object.values(structure).forEach(folderContent => {
            extractFeeds(folderContent, allFeedsMap, extractedFeeds);
        });
    }
}

/**
 * Renders the list of feeds in the UI.
 */
function renderFeeds(feedsData, foldersData) {
    if (!feedListElement || !feedsData) return;

    const allFeeds = [];
    extractFeeds(foldersData, feedsData, allFeeds);
    allFeeds.sort((a, b) => (a.feed_title || '').toLowerCase().localeCompare((b.feed_title || '').toLowerCase()));

    feedListElement.innerHTML = ''; // Clear again just in case

    if (allFeeds.length === 0) {
        showFeedMessage('No feeds found. Add some on NewsBlur!');
        return;
    }

    allFeeds.forEach(renderFeedItem);
}

/**
 * Renders a single feed item and appends it to the list.
 */
function renderFeedItem(feed) {
     if (!feedListElement) return;

    const listItem = document.createElement('li');
    // Added dark mode classes and border styles
    listItem.className = 'flex items-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0';
    listItem.dataset.feedId = feed.id;

    const unreadCount = (feed.ps || 0) + (feed.nt || 0) + (feed.ng || 0);

    const faviconUrl = feed.favicon_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const faviconImg = document.createElement('img');
    faviconImg.src = faviconUrl;
    faviconImg.alt = '';
    faviconImg.className = 'w-5 h-5 mr-3 rounded-sm flex-shrink-0 object-contain';
    faviconImg.onerror = () => { faviconImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; };

    const titleSpan = document.createElement('span');
    // Added dark mode text color
    titleSpan.className = 'flex-grow font-medium text-gray-700 dark:text-gray-200 truncate';
    titleSpan.textContent = feed.feed_title || 'Untitled Feed';

    listItem.appendChild(faviconImg);
    listItem.appendChild(titleSpan);

    if (unreadCount > 0) {
        const countSpan = document.createElement('span');
        countSpan.className = 'bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0';
        countSpan.textContent = unreadCount;
        listItem.appendChild(countSpan);
    }

    listItem.addEventListener('click', handleFeedClick);
    feedListElement.appendChild(listItem);
}

/**
 * Handles clicks on a feed list item.
 */
function handleFeedClick(event) {
    const feedId = event.currentTarget.dataset.feedId;
    if (feedId) {
        console.log(`Feed clicked: ${feedId}`);
        // TODO: Implement logic to fetch and display feed items
        showFeedMessage(`Loading items for feed ${feedId}...`);
    }
}

/**
 * Handles the logout button click.
 */
async function handleLogoutClick() {
    if (isLoading) return;
    isLoading = true;
    showFeedMessage('Logging out...');

    try {
        // NOTE: We still need to implement the /proxy/api/logout endpoint in the worker!
        const response = await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            credentials: 'include',
        });

        // Regardless of backend success, switch to login view
        // The checkAuthStatus on next load will confirm logout
        console.log('Logout response status:', response.status);

    } catch (error) {
        console.error('Logout error:', error);
        // Show error in login view after switching
        showLoginView();
        showLoginMessage('Logout failed. Please try again.', true);
        isLoading = false;
        return; // Prevent further state changes in finally block for this case
    } finally {
         if (!isLoading) { // Only reset if not already reset in catch block
            isLoading = false;
         }
         // Always switch to login view after attempting logout
         showLoginView();
         console.log('Logged out (client-side).');
    }
}


// --- Initialization & Event Listeners ---

// Add listeners only after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginFormSubmit);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogoutClick);
    }

    // Check initial authentication status
    checkAuthStatus();
});
