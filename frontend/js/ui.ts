// frontend/js/ui.ts
import type { Feed, Story } from './types'; // Import Feed AND Story types

// --- Types ---
interface LoginCredentials {
    username: string;
    password: string;
}

interface AppHandlers {
    onLoginSubmit: () => Promise<void>; // Expecting async handler
    onLogoutClick: () => void;
    // Add handler type for the back button click if needed later
}

type FeedItemClickHandler = (feedId: string | number, feedTitle: string) => void; // Add feedTitle

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
// #story-list-view: Container for the story list screen.
//      - Used by: showStoryListView()
// #feed-list: The <ul> element where feed items are rendered.
//      - Used by: showLoginView(), clearFeedDisplay(), renderFeedList()
// #story-list: The <ul> element where story items are rendered.
//      - Used by: renderStories()
// #feed-message-area: Area to display messages (e.g., "Loading...", errors) on the feed list view.
//      - Used by: showLoginView(), showFeedMessage(), clearFeedDisplay()
// #story-message-area: Area to display messages on the story list view.
//      - Used by: showStoryMessage()
// #login-message-area: Area to display messages (e.g., login errors, success) on the login view.
//      - Used by: showLoginView(), showFeedListView(), showLoginMessage()
// #password: The password input field.
//      - Used by: showFeedListView() (to clear)
// #username: The username input field.
//      - Used by: showFeedListView() (to clear)
// #login-button: The login submit button.
//      - Used by: showFeedListView() (to re-enable), setLoginButtonState()
// #logout-button: The logout button in the feed list header.
// #back-to-feeds-button: Button to return from story list to feed list.
// #story-list-title: Span to display the current feed's title in story view.
//
// --- Potentially Used Elements (Not currently referenced in ui.js functions) ---
// #login-form: The form element containing login inputs.

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
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const feedListElement = getElement<HTMLUListElement>('feed-list');
    const feedMessageArea = getElement<HTMLParagraphElement>('feed-message-area');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');

    setVisibility(loginView, true);
    setVisibility(feedListView, false);
    setVisibility(storyListView, false);
    // Clear dynamic content when switching views
    if (feedListElement) feedListElement.innerHTML = '';
    if (feedMessageArea) feedMessageArea.textContent = '';
    if (loginMessageArea) loginMessageArea.textContent = '';
}

/** Show the feed list view and hide the login view */
export function showFeedListView(): void {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    const passwordInput = getElement<HTMLInputElement>('password');
    const usernameInput = getElement<HTMLInputElement>('username');
    const loginButton = getElement<HTMLButtonElement>('login-button');

    setVisibility(loginView, false);
    setVisibility(feedListView, true);
    setVisibility(storyListView, false);
    // Clear form fields and messages when switching views
    if (loginMessageArea) loginMessageArea.textContent = '';
    if (passwordInput) passwordInput.value = '';
    if (usernameInput) usernameInput.value = '';
    if (loginButton) loginButton.disabled = false;
}

/** Show the story list view and hide others */
export function showStoryListView(): void {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');

    setVisibility(loginView, false);
    setVisibility(feedListView, false);
    setVisibility(storyListView, true);

    // Clear dynamic content from other views (optional, but good practice)
    // clearFeedDisplay(); // Already hidden, probably not needed
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    if (loginMessageArea) loginMessageArea.textContent = '';
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

/** Displays a message in the story list message area */
export function showStoryMessage(message: string, isError: boolean = false): void {
    const storyMessageArea = getElement<HTMLParagraphElement>('story-message-area');
    if (!storyMessageArea) return;
    storyMessageArea.textContent = message;
    storyMessageArea.className = `text-center mb-4 h-5 ${isError ? 'text-red-600 font-semibold' : 'text-gray-500 dark:text-gray-400'}`;
}

/** Clears the feed list and feed message area */
export function clearFeedDisplay(): void {
     const feedListElement = getElement<HTMLUListElement>('feed-list');
     const feedMessageArea = getElement<HTMLParagraphElement>('feed-message-area');
     if (feedListElement) feedListElement.innerHTML = '';
     if (feedMessageArea) feedMessageArea.textContent = '';
}

/** Clears the story list and story message area */
export function clearStoryDisplay(): void {
     const storyListElement = getElement<HTMLUListElement>('story-list');
     const storyMessageArea = getElement<HTMLParagraphElement>('story-message-area');
     // Clear list by removing child nodes for potentially better JSDOM compatibility
     if (storyListElement) {
        while (storyListElement.firstChild) {
            storyListElement.removeChild(storyListElement.firstChild);
        }
     }
     if (storyMessageArea) storyMessageArea.textContent = '';
     // Clear title (optional)
     // const storyTitleElement = getElement<HTMLSpanElement>('story-list-title');
     // if (storyTitleElement) storyTitleElement.textContent = '';
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
        listItem.dataset.feedTitle = feed.feed_title || 'Untitled Feed';

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
                    feedItemClickHandler(feed.id, feed.feed_title || 'Untitled Feed');
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

/** Renders the list of stories for a feed in the UI */
export function renderStories(stories: Story[], feedTitle: string): void {
    const storyListElement = getElement<HTMLUListElement>('story-list');
    const storyTitleElement = getElement<HTMLSpanElement>('story-list-title');

    if (!storyListElement || !storyTitleElement) {
        console.error('Story list or title element not found!');
        return;
    }

    clearStoryDisplay(); // Clear previous stories and messages
    storyTitleElement.textContent = feedTitle; // Set the feed title

    if (!stories || stories.length === 0) {
        showStoryMessage('No stories found in this feed.');
        return;
    }

    // Create and append story items
    stories.forEach((story: Story) => {
        const listItem = document.createElement('li');
        // Base classes + border
        listItem.className = 'py-3 px-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0';
        listItem.dataset.storyId = String(story.id); // Assuming story.id exists

        // Apply read/unread styling
        // Using 0 for unread, 1 for read based on typical NewsBlur API (adjust if different)
        const isRead = story.read_status === 1;
        if (isRead) {
            listItem.classList.add('text-gray-500', 'dark:text-gray-400', 'font-normal');
        } else {
            listItem.classList.add('text-gray-800', 'dark:text-gray-100', 'font-semibold');
        }

        // Story Title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'block truncate'; // Allow truncation if needed
        titleSpan.textContent = story.story_title || 'Untitled Story';
        listItem.appendChild(titleSpan);

        // Story Date (simple format for now)
        try {
            const date = new Date(story.story_date);
            const dateSpan = document.createElement('span');
            dateSpan.className = 'text-xs text-gray-400 dark:text-gray-500 block mt-1';
            // Format as locale date string
            dateSpan.textContent = date.toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
             });
            listItem.appendChild(dateSpan);
        } catch (e) {
            console.warn('Could not parse story date:', story.story_date);
            // Optionally display the raw date or nothing
        }

        // Add click listener (placeholder for now, will be handled in app.ts later)
        listItem.addEventListener('click', () => {
            console.log(`Story clicked: ${story.id} (Read status: ${isRead})`);
            // TODO: Implement story view/mark as read logic in app.ts
        });

        storyListElement.appendChild(listItem);
    });

    showStoryMessage(''); // Clear loading/error message
}

// Add other UI-related functions as needed (e.g., renderFeedItems, renderStory)
// Note: If other functions are added that use elements like loginForm or logoutButton,
// they will need to query for those elements within their scope too.
