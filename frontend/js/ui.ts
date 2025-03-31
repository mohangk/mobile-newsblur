// frontend/js/ui.ts
import type { Feed } from './api'; // Import Feed type

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
    // Use specific types and handle potential nulls
    const loginView = document.getElementById('login-view') as HTMLDivElement | null;
    const feedListView = document.getElementById('feed-list-view') as HTMLDivElement | null;
    const feedListElement = document.getElementById('feed-list') as HTMLUListElement | null;
    const feedMessageArea = document.getElementById('feed-message-area') as HTMLParagraphElement | null;
    const loginMessageArea = document.getElementById('login-message-area') as HTMLParagraphElement | null;

    setVisibility(loginView, true);
    setVisibility(feedListView, false);
    // Clear dynamic content when switching views
    if (feedListElement) feedListElement.innerHTML = '';
    if (feedMessageArea) feedMessageArea.textContent = '';
    if (loginMessageArea) loginMessageArea.textContent = ''; 
}

/** Show the feed list view and hide the login view */
export function showFeedListView(): void {
    const loginView = document.getElementById('login-view') as HTMLDivElement | null;
    const feedListView = document.getElementById('feed-list-view') as HTMLDivElement | null;
    const loginMessageArea = document.getElementById('login-message-area') as HTMLParagraphElement | null;
    const passwordInput = document.getElementById('password') as HTMLInputElement | null;
    const usernameInput = document.getElementById('username') as HTMLInputElement | null;
    const loginButton = document.getElementById('login-button') as HTMLButtonElement | null;

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
    const loginMessageArea = document.getElementById('login-message-area') as HTMLParagraphElement | null;
    if (!loginMessageArea) return;
    loginMessageArea.textContent = message;
    loginMessageArea.className = `text-xs italic h-4 ${isError ? 'text-red-500' : 'text-green-600'}`;
}

/** Displays a message in the feed list message area */
export function showFeedMessage(message: string, isError: boolean = false): void {
    const feedMessageArea = document.getElementById('feed-message-area') as HTMLParagraphElement | null;
    if (!feedMessageArea) return;
    feedMessageArea.textContent = message;
    feedMessageArea.className = `text-center mb-4 h-5 ${isError ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`;
}

/** Clears the feed list and feed message area */
export function clearFeedDisplay(): void {
     const feedListElement = document.getElementById('feed-list') as HTMLUListElement | null;
     const feedMessageArea = document.getElementById('feed-message-area') as HTMLParagraphElement | null;
     if (feedListElement) feedListElement.innerHTML = '';
     if (feedMessageArea) feedMessageArea.textContent = '';
}

/** Disables or enables the login button */
export function setLoginButtonState(disabled: boolean): void {
     const loginButton = document.getElementById('login-button') as HTMLButtonElement | null;
     // Use optional chaining for potentially null button
     if (loginButton) loginButton.disabled = disabled;
}

/** Function type for the feed item click handler */
type FeedItemClickHandler = (feedId: string | number) => void;

/**
 * Renders the list of feeds in the UI.
 * @param {Array<Feed> | null | undefined} feeds - Array of feed objects to render.
 * @param {FeedItemClickHandler} onItemClick - Callback function when a feed item is clicked.
 */
export function renderFeedList(feeds: Feed[] | null | undefined, onItemClick: FeedItemClickHandler): void {
    console.log("DEBUG: renderFeedList called with feeds:", feeds);
    const feedListElement = document.getElementById('feed-list') as HTMLUListElement | null;
    if (!feedListElement) return;

    clearFeedDisplay(); 

    if (!feeds || feeds.length === 0) {
        showFeedMessage('No feeds found. Add some on NewsBlur!');
        return;
    }

    // Create and append list items
    feeds.forEach((feed: Feed) => { // Add type to feed parameter
        const listItem = document.createElement('li') as HTMLLIElement;
        listItem.className = 'flex items-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0';
        // Use String() as dataset properties expect strings
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

        listItem.addEventListener('click', () => onItemClick(feed.id));

        feedListElement.appendChild(listItem);
    });
}

// Add other UI-related functions as needed (e.g., renderFeedItems, renderStory)
// Note: If other functions are added that use elements like loginForm or logoutButton,
// they will need to query for those elements within their scope too.
