// frontend/js/app.ts

// Import necessary functions from API and UI modules
import * as api from './api';
// Re-import necessary types specifically FROM ./types
import type { Feed, FeedMap, FeedResponse, Story } from './types';
// Import the whole ui module
import * as ui from './ui';

// --- State ---
let isLoading = false; // Prevent concurrent API calls

// --- Core Application Logic ---

/** Checks authentication status and loads the appropriate view */
async function checkAuthAndLoadView(): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    console.log("App: Checking auth status...");
    try {
        const isAuthenticated = await api.checkAuth();
        if (isAuthenticated) {
            console.log("App: Already authenticated.");
            // Don't reset isLoading here, fetchAndDisplayFeeds will do it
            console.log("DEBUG: About to call fetchAndDisplayFeeds from checkAuthAndLoadView (isLoading reset)");
            await fetchAndDisplayFeeds(); // Load feeds if authenticated
        } else {
            console.log("App: Not authenticated.");
            ui.showLoginView(); // Show login using ui module
            isLoading = false;
        }
    } catch (error) {
        console.error("App: Error checking auth:", error);
        ui.showLoginView(); // Show login on error
        isLoading = false;
    }
}

/** Handles the login form submission */
async function handleLoginSubmit(): Promise<void> { // Removed event parameter
    if (isLoading) return;

    // Get credentials via the UI module
    const credentials = ui.getLoginCredentials();

    if (!credentials) {
        ui.showLoginMessage("Username and password are required.", true);
        return; // Stop if input is invalid/missing
    }

    isLoading = true;
    ui.setLoginButtonState(true);
    ui.showLoginMessage('Logging in...');

    try {
        await api.login(credentials.username, credentials.password);
        ui.showLoginMessage('Login successful!', false);
        // Don't reset isLoading here, fetchAndDisplayFeeds will do it
        await fetchAndDisplayFeeds(); // Fetch feeds immediately after login
    } catch (error: any) {
        isLoading = false; // Reset loading state on error
        console.error("App: Login error:", error);
        const message = error.data?.message || error.message || 'Login failed.';
        ui.showLoginMessage(message, true);
        ui.setLoginButtonState(false);
    } 
    // No finally block needed for isLoading/button state here,
    // as fetchAndDisplayFeeds handles it on success,
    // and the catch block handles it on error.
}

/** Fetches feeds from the API and renders them in the UI */
async function fetchAndDisplayFeeds(): Promise<void> {
    console.log("DEBUG: fetchAndDisplayFeeds called");
    isLoading = true;
    ui.showFeedListView(); // Switch view first
    ui.showFeedMessage('Loading feeds...');
    ui.clearFeedDisplay();

    try {
        console.log("DEBUG: Calling api.getFeeds...");
        // Explicitly type the expected response structure using imported types
        const feedData: { feeds?: FeedMap, folders?: any[] } = await api.getFeeds();
        console.log("DEBUG: api.getFeeds returned:", feedData);

        const feedsMap = feedData?.feeds;
        // Ensure feedsArray is correctly typed as Feed[]
        const feedsArray: Feed[] = feedsMap ? Object.values(feedsMap) : [];
        console.log(`DEBUG: Processing feeds. Resulting feedsArray: ${feedsArray.length} feeds`);

        ui.renderFeedList(feedsArray);

    } catch (error: any) {
        console.error("DEBUG: Error in fetchAndDisplayFeeds:", error);
        const message = error.data?.message || error.message || 'Failed to load feeds.';
        ui.clearFeedDisplay(); // Clear partial list if any
        ui.showFeedMessage(message, true);
    } finally {
        isLoading = false;
        console.log("DEBUG: fetchAndDisplayFeeds finished (isLoading=false)");
    }
}

/** Handles clicking the logout button */
async function handleLogout(): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    console.log("App: Logging out...");
    try {
        await api.logout();
        console.log("App: Logout successful.");
    } catch (error) {
        // Log the error but proceed to show login view anyway
        console.error("App: Logout API call failed:", error);
    } finally {
        isLoading = false;
        ui.showLoginView(); // Always show login view after logout attempt
    }
}

/** Handles clicking on a specific feed item */
async function handleFeedItemClick(feedId: string | number, feedTitle: string): Promise<void> {
    if (isLoading) return;
    isLoading = true;
    console.log(`App: Feed item clicked: ${feedId} ('${feedTitle}')`);

    ui.showStoryListView(); // Show the view container immediately
    ui.clearStoryDisplay(); // Clear previous content/messages
    ui.showStoryMessage('Loading stories...'); // Show loading message

    try {
        const stories: Story[] = await api.getStoriesForFeed(feedId);
        console.log(`App: Received ${stories.length} stories for feed ${feedId}`);
        ui.renderStories(stories, feedTitle);
        // Message cleared by renderStories if successful
    } catch (error: any) {
        console.error(`App: Error fetching stories for feed ${feedId}:`, error);
        const message = error.data?.message || error.message || 'Failed to load stories.';
        ui.clearStoryDisplay(); // Clear partial content potentially
        ui.showStoryMessage(message, true);
        // Keep the story view visible to show the error
    } finally {
        isLoading = false;
    }
}

// --- Initialization ---

function initializeApp(): void {
    console.log("App: Initializing...");

    // Register the click handler with the UI module first
    // Note: ui.setFeedItemClickHandler expects (id, title) => void
    ui.setFeedItemClickHandler((feedId, feedTitle) => {
        handleFeedItemClick(feedId, feedTitle); // Call the async function
    });

    // Initialize the UI, passing the handlers for form/button events
    ui.initializeUI({
        onLoginSubmit: handleLoginSubmit, // Pass the function reference
        onLogoutClick: handleLogout       // Pass the function reference
    });

    // Add listener for the back button
    const backButton = document.getElementById('back-to-feeds-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            if (isLoading) return; // Don't switch view if something is loading
            console.log("App: Back button clicked.");
            ui.showFeedListView(); // Switch back to feed list
        });
    } else {
        console.warn("App: Back button not found during initialization.");
    }


    // Initial check to see if user is already logged in
    checkAuthAndLoadView();
}

// Start the application
initializeApp();
