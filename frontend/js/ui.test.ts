import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
    showLoginView,
    showFeedListView,
    showLoginMessage,
    showFeedMessage,
    setLoginButtonState,
    renderFeedList,
    clearFeedDisplay,
    setFeedItemClickHandler
} from './ui'; // Adjust path as necessary
import type { Feed } from './types'; // Import Feed type if needed for mocks

// Helper function to assert element exists and return it typed
function expectElement<T extends HTMLElement>(selector: string): T {
    const element = document.querySelector(selector) as T | null;
    if (!element) {
        throw new Error(`Test setup error: Element with selector "${selector}" not found.`);
    }
    return element;
}
function expectElementById<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id) as T | null;
    if (!element) {
        throw new Error(`Test setup error: Element with ID "${id}" not found.`);
    }
    return element;
}

// --- Mock DOM Setup ---
// Create basic DOM structure needed for the UI functions before each test
beforeEach(() => {
    document.body.innerHTML = `
        <div id="app" class="h-screen w-screen flex flex-col">
            <!-- Login View -->
            <div id="login-view" class="flex-grow flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-800 p-4">
                <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Mobile NewsBlur</h1>
                <form id="login-form" class="bg-white dark:bg-gray-700 p-8 rounded shadow-md w-full max-w-sm">
                    <div class="mb-4">
                        <label for="username" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Username</label>
                        <input type="text" id="username" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-600 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div class="mb-6">
                        <label for="password" class="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">Password</label>
                        <input type="password" id="password" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-300 dark:bg-gray-600 mb-3 leading-tight focus:outline-none focus:shadow-outline">
                    </div>
                    <div id="login-message-area" class="text-xs italic text-red-500 h-4 mb-2"></div>
                    <div class="flex items-center justify-between">
                        <button id="login-button" type="submit" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50">
                            Sign In
                        </button>
                    </div>
                </form>
            </div>

            <!-- Feed List View (Initially Hidden) -->
            <div id="feed-list-view" class="flex-grow flex flex-col bg-white dark:bg-gray-900 hidden">
                <header class="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Your Feeds</h2>
                    <button id="logout-button" class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm focus:outline-none focus:shadow-outline">Logout</button>
                </header>
                <div id="feed-message-area" class="text-center p-4 text-gray-500 dark:text-gray-400 h-5"></div>
                 <div class="overflow-y-auto flex-grow">
                    <ul id="feed-list" class="divide-y divide-gray-200 dark:divide-gray-700">
                        <!-- Feed items will be added here -->
                    </ul>
                </div>
            </div>
        </div>
    `;
});

// --- Tests ---

describe('UI Functions', () => {

    describe('showLoginView', () => {
        it('should show login view and hide feed list view', () => {
            // Start with feed list visible (simulating logged-in state)
            const loginView = expectElementById<HTMLDivElement>('login-view');
            const feedListView = expectElementById<HTMLDivElement>('feed-list-view');
            const feedList = expectElementById<HTMLUListElement>('feed-list');
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            const loginMessageArea = expectElementById<HTMLParagraphElement>('login-message-area');

            loginView.classList.add('hidden');
            feedListView.classList.remove('hidden');
            feedList.innerHTML = '<li>Some Feed</li>'; // Add dummy content
            feedMessageArea.textContent = 'Some message';
            loginMessageArea.textContent = 'Some other message';

            showLoginView();

            expect(loginView.classList.contains('hidden')).toBe(false);
            expect(feedListView.classList.contains('hidden')).toBe(true);
            // Check that dynamic content was cleared
            expect(feedList.innerHTML).toBe('');
            expect(feedMessageArea.textContent).toBe('');
            expect(loginMessageArea.textContent).toBe('');
        });
    });

    describe('showFeedListView', () => {
        it('should show feed list view and hide login view', () => {
            // Start with login view visible (default state)
            const loginMessageArea = expectElementById<HTMLParagraphElement>('login-message-area');
            const passwordInput = expectElementById<HTMLInputElement>('password');
            const loginButton = expectElementById<HTMLButtonElement>('login-button');
            const loginView = expectElementById<HTMLDivElement>('login-view');
            const feedListView = expectElementById<HTMLDivElement>('feed-list-view');

            loginMessageArea.textContent = 'Error!';
            passwordInput.value = 'secret';
            loginButton.disabled = true;

            showFeedListView();

            expect(loginView.classList.contains('hidden')).toBe(true);
            expect(feedListView.classList.contains('hidden')).toBe(false);
            // Check that login form state was cleared/reset
            expect(loginMessageArea.textContent).toBe('');
            expect(passwordInput.value).toBe('');
            // expect(expectElementById<HTMLInputElement>('username').value).toBe(''); // Username might be kept
            expect(loginButton.disabled).toBe(false);
        });
    });

    describe('showLoginMessage', () => {
        it('should display a message in the login message area', () => {
            showLoginMessage('Login successful');
            const msgArea = expectElementById<HTMLParagraphElement>('login-message-area');
            expect(msgArea.textContent).toBe('Login successful');
            expect(msgArea.classList.contains('text-red-500')).toBe(false);
            expect(msgArea.classList.contains('text-green-600')).toBe(true);
        });

        it('should display an error message with error styling', () => {
            showLoginMessage('Invalid credentials', true);
            const msgArea = expectElementById<HTMLParagraphElement>('login-message-area');
            expect(msgArea.textContent).toBe('Invalid credentials');
            expect(msgArea.classList.contains('text-red-500')).toBe(true);
            expect(msgArea.classList.contains('text-green-600')).toBe(false);
        });
    });

     describe('showFeedMessage', () => {
        it('should display a message in the feed message area', () => {
            showFeedMessage('Loading feeds...');
            const msgArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            expect(msgArea.textContent).toBe('Loading feeds...');
            expect(msgArea.classList.contains('text-red-600')).toBe(false);
            expect(msgArea.classList.contains('text-gray-500')).toBe(true); // Check default style
        });

        it('should display an error message with error styling', () => {
            showFeedMessage('Failed to load feeds', true);
            const msgArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            expect(msgArea.textContent).toBe('Failed to load feeds');
            expect(msgArea.classList.contains('text-red-600')).toBe(true);
             expect(msgArea.classList.contains('font-semibold')).toBe(true);
        });
    });

    describe('setLoginButtonState', () => {
        it('should disable the login button', () => {
            setLoginButtonState(true);
            expect(expectElementById<HTMLButtonElement>('login-button').disabled).toBe(true);
        });

        it('should enable the login button', () => {
            const loginButton = expectElementById<HTMLButtonElement>('login-button');
            loginButton.disabled = true; // Start disabled
            setLoginButtonState(false);
            expect(loginButton.disabled).toBe(false);
        });
    });

    describe('clearFeedDisplay', () => {
        it('should clear the feed list and message area', () => {
            const feedList = expectElementById<HTMLUListElement>('feed-list');
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            feedList.innerHTML = '<li>Feed</li>';
            feedMessageArea.textContent = 'Message';
            clearFeedDisplay();
            expect(feedList.innerHTML).toBe('');
            expect(feedMessageArea.textContent).toBe('');
        });
    });

    describe('renderFeedList', () => {
        // Use Feed type for mock data consistency
        const mockFeeds: Feed[] = [
            { id: 1, feed_title: 'Tech Blog', favicon_url: 'tech.png', ps: 5, nt: 2, ng: 0 }, // 7 unread
            { id: 2, feed_title: 'News Site', favicon_url:'', ps: 0, nt: 0, ng: 0 }, // 0 unread, empty favicon_url
            { id: 3, feed_title: 'Comic', favicon_url: null, ps: 1, nt: 0, ng: 0 }, // 1 unread, null favicon
        ];
        let mockClickHandler: Mock;

        beforeEach(() => {
            // Create mock click handler
            mockClickHandler = vi.fn();
            // Reset the internal click handler in ui.ts before each test
            // by passing a no-op function to satisfy the type
            setFeedItemClickHandler(() => {}); // Pass dummy function instead of null
        });

        it('should render a list of feeds with titles and favicons', () => {
            setFeedItemClickHandler(mockClickHandler); // Set handler first
            renderFeedList(mockFeeds); // Call with only feeds
            const listItems = document.querySelectorAll('#feed-list li');
            expect(listItems.length).toBe(3);

            // Check first item
            const firstItem = listItems[0] as HTMLLIElement;
            const firstItemSpan = expectElement<HTMLSpanElement>('#feed-list li:first-child span');
            const firstItemImg = expectElement<HTMLImageElement>('#feed-list li:first-child img');
            expect(firstItemSpan.textContent).toBe('Tech Blog');
            expect(firstItemImg.src).toContain('tech.png');
            expect(firstItem.dataset.feedId).toBe('1');

            // Check second item (empty string favicon_url, check fallback)
             const secondItem = listItems[1] as HTMLLIElement;
             const secondItemSpan = expectElement<HTMLSpanElement>('#feed-list li:nth-child(2) span');
             const secondItemImg = expectElement<HTMLImageElement>('#feed-list li:nth-child(2) img');
             expect(secondItemSpan.textContent).toBe('News Site');
             expect(secondItemImg.src).toContain('data:image/gif;base64'); // Placeholder
             expect(secondItem.dataset.feedId).toBe('2');

             // Check third item (null favicon, check fallback)
             const thirdItem = listItems[2] as HTMLLIElement;
             const thirdItemSpan = expectElement<HTMLSpanElement>('#feed-list li:nth-child(3) span');
             const thirdItemImg = expectElement<HTMLImageElement>('#feed-list li:nth-child(3) img');
             expect(thirdItemSpan.textContent).toBe('Comic');
             expect(thirdItemImg.src).toContain('data:image/gif;base64'); // Placeholder
             expect(thirdItem.dataset.feedId).toBe('3');
        });

        it('should display unread counts', () => {
            setFeedItemClickHandler(mockClickHandler);
            renderFeedList(mockFeeds);
            const listItems = document.querySelectorAll('#feed-list li');

            // First item (7 unread)
            const firstItemCount = listItems[0].querySelector('span.bg-blue-600');
            expect(firstItemCount).not.toBeNull();
            expect(firstItemCount!.textContent).toBe('7');

            // Second item (0 unread)
            const secondItemCount = listItems[1].querySelector('span.bg-blue-600');
            expect(secondItemCount).toBeNull();

            // Third item (1 unread)
            const thirdItemCount = listItems[2].querySelector('span.bg-blue-600');
            expect(thirdItemCount).not.toBeNull();
            expect(thirdItemCount!.textContent).toBe('1');
        });

         it('should attach click handlers to list items', () => {
            setFeedItemClickHandler(mockClickHandler);
            renderFeedList(mockFeeds);
            const listItems = document.querySelectorAll('#feed-list li');

            // Simulate click on the first item (cast to HTMLLIElement)
            (listItems[0] as HTMLLIElement).click();
            expect(mockClickHandler).toHaveBeenCalledTimes(1);
            expect(mockClickHandler).toHaveBeenCalledWith(1); // Feed ID 1

            // Simulate click on the third item (cast to HTMLLIElement)
            (listItems[2] as HTMLLIElement).click();
            expect(mockClickHandler).toHaveBeenCalledTimes(2);
            expect(mockClickHandler).toHaveBeenCalledWith(3); // Feed ID 3
        });

        it('should clear previous content before rendering', () => {
            const feedList = expectElementById<HTMLUListElement>('feed-list');
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            feedList.innerHTML = '<li>Old Item</li>';
            feedMessageArea.textContent = 'Old message';

            setFeedItemClickHandler(mockClickHandler);
            renderFeedList(mockFeeds.slice(0, 1)); // Render just one feed

            expect(document.querySelectorAll('#feed-list li').length).toBe(1);
            expect(feedMessageArea.textContent).toBe(''); // Message should be cleared
            const firstItemSpan = expectElement<HTMLSpanElement>('#feed-list li:first-child span');
            expect(firstItemSpan.textContent).toBe('Tech Blog');
        });

         it('should display a message if no feeds are provided', () => {
            setFeedItemClickHandler(mockClickHandler);
            renderFeedList([]);
            expect(document.querySelectorAll('#feed-list li').length).toBe(0);
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            expect(feedMessageArea.textContent).toBe('No feeds found. Add some on NewsBlur!');
        });

        it('should display a message if feeds array is null or undefined', () => {
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');

            setFeedItemClickHandler(mockClickHandler);
            renderFeedList(null);
            expect(document.querySelectorAll('#feed-list li').length).toBe(0);
            expect(feedMessageArea.textContent).toBe('No feeds found. Add some on NewsBlur!');

            feedMessageArea.textContent = ''; // Reset for next check

             renderFeedList(undefined);
             expect(document.querySelectorAll('#feed-list li').length).toBe(0);
             expect(feedMessageArea.textContent).toBe('No feeds found. Add some on NewsBlur!');
        });

         it('should set onerror handler for favicons', () => {
             setFeedItemClickHandler(mockClickHandler);
             renderFeedList(mockFeeds.slice(0,1));
             const img = expectElement<HTMLImageElement>('#feed-list li img');
             expect(img.onerror).toBeInstanceOf(Function);
         });
    });

});
