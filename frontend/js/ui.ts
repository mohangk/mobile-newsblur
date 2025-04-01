// frontend/js/ui.ts
import type { Feed } from './types'; // Import Feed type FROM ./types

// --- Types ---
interface LoginCredentials {
    username: string;
    password: string;
}

interface AppHandlers {
    onLoginSubmit: () => Promise<void>; // Expecting async handler
    onLogoutClick: () => void;
}

type FeedItemClickHandler = (feedId: string | number) => void;

// --- State ---
let feedItemClickHandler: FeedItemClickHandler | null = null;

// --- Internal Helper ---
/** Generic helper to get typed elements by ID */
function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

// --- HTML Element ID Reference ---
// This file interacts with the following element IDs in index.html:
//
// #login-view: Container for the login screen.
//      - Used by: showLoginView(), showFeedListView()
// #feed-list-view: Container for the feed list screen.
//      - Used by: showLoginView(), showFeedListView()
// #feed-list: The <ul> element where feed items are rendered.
//      - Used by: showLoginView(), clearFeedDisplay(), renderFeedList()
// #feed-message-area: Area to display messages (e.g., "Loading...", errors) on the feed list view.
//      - Used by: showLoginView(), showFeedMessage(), clearFeedDisplay()
// #login-message-area: Area to display messages (e.g., login errors, success) on the login view.
//      - Used by: showLoginView(), showFeedListView(), showLoginMessage()
// #password: The password input field.
//      - Used by: showFeedListView() (to clear)
// #username: The username input field.
//      - Used by: showFeedListView() (to clear)
// #login-button: The login submit button.
//      - Used by: showFeedListView() (to re-enable), setLoginButtonState()
//
// --- Potentially Used Elements (Not currently referenced in ui.js functions) ---
// #login-form: The form element containing login inputs.
// #logout-button: The logout button in the feed list header.

// --- UI Update Functions ---

/** Helper to show/hide elements using Tailwind's hidden class */
function setVisibility(element: HTMLElement | null, visible: boolean): void {
    if (!element) return;
    if (visible) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

/** Show the login view and hide the feed list view */
export function showLoginView(): void {
    // Use specific types and handle potential nulls via helper
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const feedListElement = getElement<HTMLUListElement>('feed-list');
    const feedMessageArea = getElement<HTMLParagraphElement>('feed-message-area');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');

    setVisibility(loginView, true);
    setVisibility(feedListView, false);
    // Clear dynamic content when switching views
    if (feedListElement) feedListElement.innerHTML = '';
    if (feedMessageArea) feedMessageArea.textContent = '';
    if (loginMessageArea) loginMessageArea.textContent = '';
}

/** Show the feed list view and hide the login view */
export function showFeedListView(): void {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    const passwordInput = getElement<HTMLInputElement>('password');
    const usernameInput = getElement<HTMLInputElement>('username');
    const loginButton = getElement<HTMLButtonElement>('login-button');

    setVisibility(loginView, false);
    setVisibility(feedListView, true);
    // Clear form fields and messages when switching views
    if (loginMessageArea) loginMessageArea.textContent = '';
    if (passwordInput) passwordInput.value = '';
    if (usernameInput) usernameInput.value = '';
    if (loginButton) loginButton.disabled = false;
}

/** Displays a message in the login message area */
export function showLoginMessage(message: string, isError: boolean = false): void {
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    if (!loginMessageArea) return;
    loginMessageArea.textContent = message;
    loginMessageArea.className = `text-xs italic h-4 ${isError ? 'text-red-500' : 'text-green-600'}`;
}

/** Displays a message in the feed list message area */
export function showFeedMessage(message: string, isError: boolean = false): void {
    const feedMessageArea = getElement<HTMLParagraphElement>('feed-message-area');
    if (!feedMessageArea) return;
    feedMessageArea.textContent = message;
    feedMessageArea.className = `text-center mb-4 h-5 ${isError ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`;
}

/** Clears the feed list and feed message area */
export function clearFeedDisplay(): void {
     const feedListElement = getElement<HTMLUListElement>('feed-list');
     const feedMessageArea = getElement<HTMLParagraphElement>('feed-message-area');
     if (feedListElement) feedListElement.innerHTML = '';
     if (feedMessageArea) feedMessageArea.textContent = '';
}

/** Disables or enables the login button */
export function setLoginButtonState(disabled: boolean): void {
     const loginButton = getElement<HTMLButtonElement>('login-button');
     // Use optional chaining for potentially null button
     if (loginButton) loginButton.disabled = disabled;
}

// --- NEW Functions for App Interaction ---

/** Gets username and password from the input fields */
export function getLoginCredentials(): LoginCredentials | null {
    const usernameInput = getElement<HTMLInputElement>('username');
    const passwordInput = getElement<HTMLInputElement>('password');
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value; // Don't trim password

    // Return null if either is missing/empty to signal invalid input
    if (!username || !password) {
        return null;
    }
    return { username, password };
}

/** Sets the function to be called when a feed item is clicked */
export function setFeedItemClickHandler(handler: FeedItemClickHandler): void {
    feedItemClickHandler = handler;
}

/** Initializes UI elements and attaches primary event listeners handled by app.ts */
export function initializeUI(handlers: AppHandlers): void {
    const loginForm = getElement<HTMLFormElement>('login-form');
    const logoutButton = getElement<HTMLButtonElement>('logout-button');

    loginForm?.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission
        handlers.onLoginSubmit(); // Call the async handler from app.ts
    });

    logoutButton?.addEventListener('click', handlers.onLogoutClick);

    // Any other one-time UI setup could go here
    console.log('UI Initialized with handlers.');
}

/**
 * Renders the list of feeds in the UI.
 * @param {Array<Feed> | null | undefined} feeds - Array of feed objects to render.
 */
export function renderFeedList(feeds: Feed[] | null | undefined): void {
    console.log("DEBUG: renderFeedList called with feeds:", feeds);
    const feedListElement = getElement<HTMLUListElement>('feed-list');
    if (!feedListElement) return;

    clearFeedDisplay();

    if (!feeds || feeds.length === 0) {
        showFeedMessage('No feeds found. Add some on NewsBlur!');
        return;
    }

    // Create and append list items
    feeds.forEach((feed: Feed) => {
        const listItem = document.createElement('li') as HTMLLIElement;
        listItem.className = 'flex items-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0';
        listItem.dataset.feedId = String(feed.id);

        // Calculate unread count safely, defaulting to 0
        const unreadCount = (feed.ps ?? 0) + (feed.nt ?? 0) + (feed.ng ?? 0);

        // Favicon
        const faviconUrl = feed.favicon_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const faviconImg = document.createElement('img') as HTMLImageElement;
        faviconImg.src = faviconUrl;
        faviconImg.alt = '';
        faviconImg.className = 'w-5 h-5 mr-3 rounded-sm flex-shrink-0 object-contain';
        // Ensure onerror is typed correctly (it's an event handler)
        faviconImg.onerror = () => { faviconImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; };

        // Title
        const titleSpan = document.createElement('span') as HTMLSpanElement;
        titleSpan.className = 'flex-grow font-medium text-gray-700 dark:text-gray-200 truncate';
        titleSpan.textContent = feed.feed_title || 'Untitled Feed';

        listItem.appendChild(faviconImg);
        listItem.appendChild(titleSpan);

        // Unread Count Badge
        if (unreadCount > 0) {
            const countSpan = document.createElement('span') as HTMLSpanElement;
            countSpan.className = 'bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0';
            countSpan.textContent = String(unreadCount);
            listItem.appendChild(countSpan);
        }

        // Use the stored click handler
        if (feedItemClickHandler) {
             listItem.addEventListener('click', () => {
                if (feedItemClickHandler) { // Double-check handler exists before calling
                    feedItemClickHandler(feed.id);
                }
            });
        } else {
            console.warn('Feed item click handler not set!');
        }

        feedListElement.appendChild(listItem);
    });

    // Clear the loading message now that feeds have been rendered
    showFeedMessage('');
}

// Add other UI-related functions as needed (e.g., renderFeedItems, renderStory)
// Note: If other functions are added that use elements like loginForm or logoutButton,
// they will need to query for those elements within their scope too.
