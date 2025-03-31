import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    showLoginView,
    showFeedListView,
    showLoginMessage,
    showFeedMessage,
    setLoginButtonState,
    renderFeedList,
    clearFeedDisplay
} from './ui'; // Adjust path as necessary

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
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('feed-list-view').classList.remove('hidden');
            document.getElementById('feed-list').innerHTML = '<li>Some Feed</li>'; // Add dummy content
            document.getElementById('feed-message-area').textContent = 'Some message';
            document.getElementById('login-message-area').textContent = 'Some other message';

            showLoginView();

            expect(document.getElementById('login-view').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('feed-list-view').classList.contains('hidden')).toBe(true);
            // Check that dynamic content was cleared
            expect(document.getElementById('feed-list').innerHTML).toBe('');
            expect(document.getElementById('feed-message-area').textContent).toBe('');
            expect(document.getElementById('login-message-area').textContent).toBe('');
        });
    });

    describe('showFeedListView', () => {
        it('should show feed list view and hide login view', () => {
            // Start with login view visible (default state)
            document.getElementById('login-message-area').textContent = 'Error!';
            document.getElementById('password').value = 'secret';
            document.getElementById('login-button').disabled = true;

            showFeedListView();

            expect(document.getElementById('login-view').classList.contains('hidden')).toBe(true);
            expect(document.getElementById('feed-list-view').classList.contains('hidden')).toBe(false);
            // Check that login form state was cleared/reset
            expect(document.getElementById('login-message-area').textContent).toBe('');
            expect(document.getElementById('password').value).toBe('');
            // expect(document.getElementById('username').value).toBe(''); // Username might be kept
            expect(document.getElementById('login-button').disabled).toBe(false);
        });
    });

    describe('showLoginMessage', () => {
        it('should display a message in the login message area', () => {
            showLoginMessage('Login successful');
            const msgArea = document.getElementById('login-message-area');
            expect(msgArea.textContent).toBe('Login successful');
            expect(msgArea.classList.contains('text-red-500')).toBe(false);
            expect(msgArea.classList.contains('text-green-600')).toBe(true);
        });

        it('should display an error message with error styling', () => {
            showLoginMessage('Invalid credentials', true);
            const msgArea = document.getElementById('login-message-area');
            expect(msgArea.textContent).toBe('Invalid credentials');
            expect(msgArea.classList.contains('text-red-500')).toBe(true);
            expect(msgArea.classList.contains('text-green-600')).toBe(false);
        });
    });

     describe('showFeedMessage', () => {
        it('should display a message in the feed message area', () => {
            showFeedMessage('Loading feeds...');
            const msgArea = document.getElementById('feed-message-area');
            expect(msgArea.textContent).toBe('Loading feeds...');
            expect(msgArea.classList.contains('text-red-600')).toBe(false);
            expect(msgArea.classList.contains('text-gray-500')).toBe(true); // Check default style
        });

        it('should display an error message with error styling', () => {
            showFeedMessage('Failed to load feeds', true);
            const msgArea = document.getElementById('feed-message-area');
            expect(msgArea.textContent).toBe('Failed to load feeds');
            expect(msgArea.classList.contains('text-red-600')).toBe(true);
             expect(msgArea.classList.contains('font-semibold')).toBe(true);
        });
    });

    describe('setLoginButtonState', () => {
        it('should disable the login button', () => {
            setLoginButtonState(true);
            expect(document.getElementById('login-button').disabled).toBe(true);
        });

        it('should enable the login button', () => {
            document.getElementById('login-button').disabled = true; // Start disabled
            setLoginButtonState(false);
            expect(document.getElementById('login-button').disabled).toBe(false);
        });
    });

    describe('clearFeedDisplay', () => {
        it('should clear the feed list and message area', () => {
            document.getElementById('feed-list').innerHTML = '<li>Feed</li>';
            document.getElementById('feed-message-area').textContent = 'Message';
            clearFeedDisplay();
            expect(document.getElementById('feed-list').innerHTML).toBe('');
            expect(document.getElementById('feed-message-area').textContent).toBe('');
        });
    });

    describe('renderFeedList', () => {
        const mockFeeds = [
            { id: 1, feed_title: 'Tech Blog', favicon_url: 'tech.png', ps: 5, nt: 2, ng: 0 }, // 7 unread
            { id: 2, feed_title: 'News Site', ps: 0, nt: 0, ng: 0 }, // 0 unread
            { id: 3, feed_title: 'Comic', favicon_url: null, ps: 1, nt: 0, ng: 0 }, // 1 unread, no favicon
        ];
        const mockClickHandler = vi.fn();

        beforeEach(() => {
            mockClickHandler.mockClear(); // Reset mock before each test in this suite
        });

        it('should render a list of feeds with titles and favicons', () => {
            renderFeedList(mockFeeds, mockClickHandler);
            const listItems = document.querySelectorAll('#feed-list li');
            expect(listItems.length).toBe(3);

            // Check first item
            const firstItem = listItems[0];
            expect(firstItem.querySelector('span').textContent).toBe('Tech Blog');
            expect(firstItem.querySelector('img').src).toContain('tech.png');
            expect(firstItem.dataset.feedId).toBe('1');

             // Check third item (no favicon, check fallback)
             const thirdItem = listItems[2];
             expect(thirdItem.querySelector('span').textContent).toBe('Comic');
             expect(thirdItem.querySelector('img').src).toContain('data:image/gif;base64'); // Placeholder
             expect(thirdItem.dataset.feedId).toBe('3');
        });

        it('should display unread counts', () => {
            renderFeedList(mockFeeds, mockClickHandler);
            const listItems = document.querySelectorAll('#feed-list li');

            // First item (7 unread)
            const firstItemCount = listItems[0].querySelector('span.bg-blue-600');
            expect(firstItemCount).not.toBeNull();
            expect(firstItemCount.textContent).toBe('7');

            // Second item (0 unread)
            const secondItemCount = listItems[1].querySelector('span.bg-blue-600');
            expect(secondItemCount).toBeNull();

            // Third item (1 unread)
            const thirdItemCount = listItems[2].querySelector('span.bg-blue-600');
            expect(thirdItemCount).not.toBeNull();
            expect(thirdItemCount.textContent).toBe('1');
        });

         it('should attach click handlers to list items', () => {
            renderFeedList(mockFeeds, mockClickHandler);
            const listItems = document.querySelectorAll('#feed-list li');

            // Simulate click on the first item
            listItems[0].click();
            expect(mockClickHandler).toHaveBeenCalledTimes(1);
            expect(mockClickHandler).toHaveBeenCalledWith(1); // Feed ID 1

            // Simulate click on the third item
            listItems[2].click();
            expect(mockClickHandler).toHaveBeenCalledTimes(2);
            expect(mockClickHandler).toHaveBeenCalledWith(3); // Feed ID 3
        });

        it('should clear previous content before rendering', () => {
            document.getElementById('feed-list').innerHTML = '<li>Old Item</li>';
            document.getElementById('feed-message-area').textContent = 'Old message';
            renderFeedList(mockFeeds.slice(0, 1), mockClickHandler); // Render just one feed

            expect(document.querySelectorAll('#feed-list li').length).toBe(1);
            expect(document.getElementById('feed-message-area').textContent).toBe(''); // Message should be cleared
            expect(document.querySelector('#feed-list li span').textContent).toBe('Tech Blog');
        });

         it('should display a message if no feeds are provided', () => {
            renderFeedList([], mockClickHandler);
            expect(document.querySelectorAll('#feed-list li').length).toBe(0);
            expect(document.getElementById('feed-message-area').textContent).toBe('No feeds found. Add some on NewsBlur!');
        });

        it('should display a message if feeds array is null or undefined', () => {
            renderFeedList(null, mockClickHandler);
            expect(document.querySelectorAll('#feed-list li').length).toBe(0);
            expect(document.getElementById('feed-message-area').textContent).toBe('No feeds found. Add some on NewsBlur!');

             document.getElementById('feed-message-area').textContent = ''; // Reset for next check

             renderFeedList(undefined, mockClickHandler);
             expect(document.querySelectorAll('#feed-list li').length).toBe(0);
             expect(document.getElementById('feed-message-area').textContent).toBe('No feeds found. Add some on NewsBlur!');
        });

        // Test edge case for favicon error handling (difficult to test precisely without image loading)
        // We rely on the onerror attribute being set correctly
         it('should set onerror handler for favicons', () => {
             renderFeedList(mockFeeds.slice(0,1), mockClickHandler);
             const img = document.querySelector('#feed-list li img');
             expect(img.onerror).toBeInstanceOf(Function);
         });
    });

});
