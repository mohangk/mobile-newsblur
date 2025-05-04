// frontend/js/ui.ts
import type { Feed, Story } from './types'; // Remove StoryContent

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
function getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`UI Error: Element with ID '${id}' not found.`);
    }
    return element as T;
}

/**
 * Formats an ISO date string (expected from Story.story_date) into 'MMM DD, HH:MM' (Singapore Time).
 * Returns 'Invalid Date' if the input string cannot be parsed as a valid date.
 * @param {string} dateString - The date string to format (expected ISO 8601 format).
 * @returns {string} The formatted date string (e.g., 'Oct 26, 18:00') or 'Invalid Date'.
 */
function formatDateString(dateString: string): string {
    try {
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date'; 
        } else {
            // Use options for specific, consistent formatting
            const options: Intl.DateTimeFormatOptions = { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: false, // Use 24-hour format
                timeZone: 'Asia/Singapore' // Specify SGT timezone for display
            };
            // The locale 'en-US' mainly affects month name, not the time itself here
            return date.toLocaleString('en-US', options); 
        }
    } catch { 
        return 'Invalid Date'; 
    }
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
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const storyContentView = getElement<HTMLDivElement>('story-content-view');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');

    loginView.classList.remove('hidden');
    feedListView.classList.add('hidden');
    storyListView.classList.add('hidden');
    storyContentView.classList.add('hidden');
    clearFeedDisplay();
    clearStoryDisplay();
    if (loginMessageArea) {
        loginMessageArea.textContent = '';
        loginMessageArea.classList.add('hidden');
    }
}

/** Show the feed list view and hide the login view */
export function showFeedListView(): void {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const storyContentView = getElement<HTMLDivElement>('story-content-view');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    const usernameInput = getElement<HTMLInputElement>('username');
    const passwordInput = getElement<HTMLInputElement>('password');
    const loginButton = getElement<HTMLButtonElement>('login-button');

    loginView.classList.add('hidden');
    feedListView.classList.remove('hidden');
    storyListView.classList.add('hidden');
    storyContentView.classList.add('hidden');
    
    if (loginMessageArea) {
        loginMessageArea.textContent = '';
        loginMessageArea.classList.add('hidden');
    }
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (loginButton) loginButton.disabled = false;
    
    clearStoryDisplay();
}

/** Show the story list view and hide others */
export function showStoryListView(): void {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const storyContentView = getElement<HTMLDivElement>('story-content-view');
    const loginMessageArea = getElement<HTMLParagraphElement>('login-message-area');
    const usernameInput = getElement<HTMLInputElement>('username');
    const passwordInput = getElement<HTMLInputElement>('password');

    loginView.classList.add('hidden');
    feedListView.classList.add('hidden');
    storyListView.classList.remove('hidden');
    storyContentView.classList.add('hidden');
    
    if (loginMessageArea) {
        loginMessageArea.textContent = '';
        loginMessageArea.classList.add('hidden');
    }
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
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
     if (storyListElement) {
        while (storyListElement.firstChild) {
            storyListElement.removeChild(storyListElement.firstChild);
        }
     }
     if (storyMessageArea) storyMessageArea.textContent = '';
}

/** Disables or enables the login button */
export function setLoginButtonState(disabled: boolean): void {
     const loginButton = getElement<HTMLButtonElement>('login-button');
     if (loginButton) loginButton.disabled = disabled;
}

// --- NEW Functions for App Interaction ---

/** Gets username and password from the input fields */
export function getLoginCredentials(): LoginCredentials | null {
    const usernameInput = getElement<HTMLInputElement>('username');
    const passwordInput = getElement<HTMLInputElement>('password');
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;

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
        event.preventDefault();
        handlers.onLoginSubmit();
    });

    logoutButton?.addEventListener('click', handlers.onLogoutClick);

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

    feeds.forEach((feed: Feed) => {
        const listItem = document.createElement('li') as HTMLLIElement;
        listItem.className = 'flex items-center py-3 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0';
        listItem.dataset.feedId = String(feed.id);
        listItem.dataset.feedTitle = feed.feed_title || 'Untitled Feed';

        const unreadCount = (feed.ps ?? 0) + (feed.nt ?? 0) + (feed.ng ?? 0);

        const faviconUrl = feed.favicon_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const faviconImg = document.createElement('img') as HTMLImageElement;
        faviconImg.src = faviconUrl;
        faviconImg.alt = '';
        faviconImg.className = 'w-5 h-5 mr-3 rounded-sm flex-shrink-0 object-contain';
        faviconImg.onerror = () => { faviconImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; };

        const titleSpan = document.createElement('span') as HTMLSpanElement;
        titleSpan.className = 'flex-grow font-medium text-gray-700 dark:text-gray-200 truncate';
        titleSpan.textContent = feed.feed_title || 'Untitled Feed';

        listItem.appendChild(faviconImg);
        listItem.appendChild(titleSpan);

        if (unreadCount > 0) {
            const countSpan = document.createElement('span') as HTMLSpanElement;
            countSpan.className = 'bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0';
            countSpan.textContent = String(unreadCount);
            listItem.appendChild(countSpan);
        }

        if (feedItemClickHandler) {
             listItem.addEventListener('click', () => {
                if (feedItemClickHandler) {
                    feedItemClickHandler(feed.id, feed.feed_title || 'Untitled Feed');
                }
            });
        } else {
            console.warn('Feed item click handler not set!');
        }

        feedListElement.appendChild(listItem);
    });

    showFeedMessage('');
}

/** Renders the list of stories for a feed in the UI */
export function renderStories(stories: Story[], feedTitle: string, onItemClick: (story: Story) => void): void {
    console.log(`UI: Rendering ${stories.length} stories for feed: ${feedTitle}`);
    const storyList = getElement<HTMLUListElement>('story-list');
    const storyListTitle = getElement<HTMLHeadingElement>('story-list-title');

    storyList.innerHTML = '';
    storyListTitle.textContent = feedTitle;

    if (stories.length === 0) {
        showStoryMessage('No stories found for this feed.');
        return;
    }

    stories.forEach(story => {
        const li = document.createElement('li');
        li.className = 'p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800';
        li.dataset.storyHash = story.story_hash ?? String(story.id);
        li.dataset.storyId = String(story.id);

        if (story.read_status === 1) {
            li.classList.add('font-normal', 'text-gray-500', 'dark:text-gray-400');
        } else {
            li.classList.add('font-semibold');
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'block font-medium';
        titleSpan.textContent = story.story_title || '[No Title]';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'block text-xs text-gray-500 dark:text-gray-400 mt-1';
        dateSpan.textContent = formatDateString(story.story_date);

        li.appendChild(titleSpan);
        li.appendChild(dateSpan);
        
        li.addEventListener('click', () => onItemClick(story));

        storyList.appendChild(li);
    });
    showStoryMessage('');
}

export function showStoryContentView() {
    const loginView = getElement<HTMLDivElement>('login-view');
    const feedListView = getElement<HTMLDivElement>('feed-list-view');
    const storyListView = getElement<HTMLDivElement>('story-list-view');
    const storyContentView = getElement<HTMLDivElement>('story-content-view');
    const storyContentTitle = getElement<HTMLHeadingElement>('story-content-title');
    const storyContentAuthor = getElement<HTMLParagraphElement>('story-content-author');
    const storyContentDate = getElement<HTMLParagraphElement>('story-content-date');
    const storyContentBody = getElement<HTMLDivElement>('story-content-body');
    const storyContentMessage = getElement<HTMLParagraphElement>('story-content-message');
    const backToStoryListButton = getElement<HTMLButtonElement>('back-to-story-list-button');

    loginView.classList.add('hidden');
    feedListView.classList.add('hidden');
    storyListView.classList.add('hidden');
    storyContentView.classList.remove('hidden');
    storyContentTitle.textContent = '';
    storyContentAuthor.textContent = '';
    storyContentDate.textContent = '';
    storyContentBody.innerHTML = '';
    storyContentMessage.textContent = '';
    storyContentMessage.classList.add('hidden');
}

export function renderStoryContent(story: Story) {
    console.log(`UI: Rendering content for story: ${story.story_title}`);
    const storyContentTitle = getElement<HTMLHeadingElement>('story-content-title');
    const storyContentAuthor = getElement<HTMLParagraphElement>('story-content-author');
    const storyContentDate = getElement<HTMLParagraphElement>('story-content-date');
    const storyContentBody = getElement<HTMLDivElement>('story-content-body');
    const storyContentMessage = getElement<HTMLParagraphElement>('story-content-message');

    storyContentTitle.textContent = story.story_title;
    storyContentAuthor.textContent = story.story_authors || '[No Author]';
    storyContentDate.textContent = formatDateString(story.story_date);
    storyContentBody.innerHTML = story.story_content;
    storyContentMessage.textContent = '';
    storyContentMessage.classList.add('hidden');
}

export function setBackToStoryListClickHandler(handler: () => void) {
    const backToStoryListButton = getElement<HTMLButtonElement>('back-to-story-list-button');
    backToStoryListButton.addEventListener('click', handler);
}
