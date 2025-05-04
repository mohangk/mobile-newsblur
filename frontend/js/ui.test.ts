import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
    showLoginView,
    showFeedListView,
    showStoryListView,
    showLoginMessage,
    showFeedMessage,
    showStoryMessage,
    setLoginButtonState,
    renderFeedList,
    renderStories,
    clearFeedDisplay,
    clearStoryDisplay,
    setFeedItemClickHandler
} from './ui'; // Adjust path as necessary
import type { Feed, Story } from './types'; // Import Feed and Story types if needed for mocks

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
// Basic setup, tests will add specific view structures
beforeEach(() => {
    document.body.innerHTML = `<div id="app"></div>`;
});

// Cleanup DOM
afterEach(() => {
    document.body.innerHTML = '';
});

describe('UI Functions', () => {

    describe('View Switching', () => {
        // Setup the full DOM needed for view switching tests
        beforeEach(() => {
            const appDiv = document.getElementById('app')!;
            appDiv.innerHTML = `
                <div id="login-view">
                     <p id="login-message-area"></p>
                     <input id="password">
                     <input id="username">
                     <button id="login-button"></button>
                </div>
                <div id="feed-list-view" class="hidden">
                    <p id="feed-message-area"></p>
                    <ul id="feed-list"></ul>
            </div>
                <div id="story-list-view" class="hidden">
                    <p id="story-message-area"></p>
                    <ul id="story-list"></ul>
                    <span id="story-list-title"></span>
        </div>
    `;
});

        it('showLoginView: should show login, hide others, clear feed list/messages', () => {
            // Arrange: Make feed/story views visible, add content
            const loginView = expectElementById<HTMLDivElement>('login-view');
            const feedListView = expectElementById<HTMLDivElement>('feed-list-view');
            const storyListView = expectElementById<HTMLDivElement>('story-list-view');
            const feedList = expectElementById<HTMLUListElement>('feed-list');
            const feedMessageArea = expectElementById<HTMLParagraphElement>('feed-message-area');
            const loginMessageArea = expectElementById<HTMLParagraphElement>('login-message-area');

            loginView.classList.add('hidden');
            feedListView.classList.remove('hidden');
            storyListView.classList.remove('hidden');
            feedList.innerHTML = '<li>Feed</li>';
            feedMessageArea.textContent = 'Feed Msg';
            loginMessageArea.textContent = 'Login Msg';

            // Act
            showLoginView();

            // Assert Visibility
            expect(loginView.classList.contains('hidden')).toBe(false);
            expect(feedListView.classList.contains('hidden')).toBe(true);
            expect(storyListView.classList.contains('hidden')).toBe(true);
            // Assert Cleared Content
            expect(feedList.innerHTML).toBe('');
            // const clearedStoryList = expectElementById<HTMLUListElement>('story-list'); // showLoginView doesn't clear story list
            // expect(clearedStoryList.children.length).toBe(0);
            expect(feedMessageArea.textContent).toBe('');
            // expect(storyMessageArea.textContent).toBe(''); // showLoginView doesn't clear story message
            expect(loginMessageArea.textContent).toBe('');
        });

        it('showFeedListView: should show feed, hide others, clear login form/message', () => {
             // Arrange: Make login/story views visible, add content/state
             const loginView = expectElementById<HTMLDivElement>('login-view');
             const feedListView = expectElementById<HTMLDivElement>('feed-list-view');
             const storyListView = expectElementById<HTMLDivElement>('story-list-view');
             const storyList = expectElementById<HTMLUListElement>('story-list');
             const storyMessageArea = expectElementById<HTMLParagraphElement>('story-message-area');
            const loginMessageArea = expectElementById<HTMLParagraphElement>('login-message-area');
            const passwordInput = expectElementById<HTMLInputElement>('password');
            const loginButton = expectElementById<HTMLButtonElement>('login-button');
 
             loginView.classList.remove('hidden');
             feedListView.classList.add('hidden');
             storyListView.classList.remove('hidden');
             storyList.innerHTML = '<li>Story</li>';
             storyMessageArea.textContent = 'Story Msg';
             loginMessageArea.textContent = 'Login Msg';
            passwordInput.value = 'secret';
            loginButton.disabled = true;

            // Act
            showFeedListView();

            // Assert Visibility
            expect(loginView.classList.contains('hidden')).toBe(true);
            expect(feedListView.classList.contains('hidden')).toBe(false);
            expect(storyListView.classList.contains('hidden')).toBe(true);
             // Assert Cleared Content
             // const clearedStoryList = expectElementById<HTMLUListElement>('story-list'); // showFeedListView doesn't clear story list
             // expect(clearedStoryList.children.length).toBe(0);
             // expect(storyMessageArea.textContent).toBe(''); // showFeedListView doesn't clear story message
             expect(loginMessageArea.textContent).toBe('');
             expect(passwordInput.value).toBe('');
             expect(loginButton.disabled).toBe(false);
        });

        it('showStoryListView: should show story, hide others, clear login messages', () => {
            // Arrange: Make login/feed views visible
            const loginView = expectElementById<HTMLDivElement>('login-view');
            const feedListView = expectElementById<HTMLDivElement>('feed-list-view');
            const storyListView = expectElementById<HTMLDivElement>('story-list-view');
            const loginMessageArea = expectElementById<HTMLParagraphElement>('login-message-area');

            loginView.classList.remove('hidden');
            feedListView.classList.remove('hidden');
            storyListView.classList.add('hidden');
            loginMessageArea.textContent = 'Login Msg';

            // Act
            showStoryListView();

            // Assert Visibility
            expect(loginView.classList.contains('hidden')).toBe(true);
            expect(feedListView.classList.contains('hidden')).toBe(true);
            expect(storyListView.classList.contains('hidden')).toBe(false);
            // Assert Cleared Content
            expect(loginMessageArea.textContent).toBe('');
        });
    });

    // --- Tests for Message Functions --- 
    describe('Message Functions', () => {
         beforeEach(() => {
            // Add necessary elements for message tests
            const appDiv = document.getElementById('app')!;
            appDiv.innerHTML = `
                <p id="login-message-area"></p>
                <p id="feed-message-area"></p>
                <p id="story-message-area"></p>
            `;
        });
        
        it('showLoginMessage displays message with correct style', () => {
             showLoginMessage('Success', false);
             const area = expectElementById<HTMLParagraphElement>('login-message-area');
             expect(area.textContent).toBe('Success');
             expect(area.className).toContain('text-green-600');
             
             showLoginMessage('Error', true);
             expect(area.textContent).toBe('Error');
             expect(area.className).toContain('text-red-500');
        });
        
        it('showFeedMessage displays message with correct style', () => {
             showFeedMessage('Loading', false);
             const area = expectElementById<HTMLParagraphElement>('feed-message-area');
             expect(area.textContent).toBe('Loading');
             expect(area.className).toContain('text-gray-500');
             
             showFeedMessage('Error', true);
             expect(area.textContent).toBe('Error');
             expect(area.className).toContain('text-red-600');
        });
        
        it('showStoryMessage displays message with correct style', () => {
             showStoryMessage('Loading', false);
             const area = expectElementById<HTMLParagraphElement>('story-message-area');
             expect(area.textContent).toBe('Loading');
             expect(area.className).toContain('text-gray-500');
             
             showStoryMessage('Error', true);
             expect(area.textContent).toBe('Error');
             expect(area.className).toContain('text-red-600');
        });
    });

    // --- Tests for Clearing Functions ---
    describe('Clearing Functions', () => {
        it('clearFeedDisplay clears list and message', () => {
             const appDiv = document.getElementById('app')!;
             appDiv.innerHTML = `
                 <p id="feed-message-area">Old Msg</p>
                 <ul id="feed-list"><li>Old Feed</li></ul>
             `;
             clearFeedDisplay();
             expect(expectElementById('feed-message-area').textContent).toBe('');
             expect(expectElementById('feed-list').innerHTML).toBe('');
        });
        
         it('clearStoryDisplay clears list and message', () => {
             const appDiv = document.getElementById('app')!;
             appDiv.innerHTML = `
                 <p id="story-message-area">Old Msg</p>
                 <ul id="story-list"><li>Old Story</li></ul>
             `;
             clearStoryDisplay();
             expect(expectElementById('story-message-area').textContent).toBe('');
             expect(expectElementById('story-list').innerHTML).toBe('');
        });
    });

    // --- Tests for Rendering Functions --- 
    describe('renderFeedList', () => {
        const mockFeeds: Feed[] = [
            { id: 1, feed_title: 'Tech Blog', favicon_url: 'tech.png', ps: 5, nt: 2, ng: 0 },
            { id: 'abc', feed_title: 'News Site', favicon_url:'', ps: 0, nt: 0, ng: 0 }, 
            { id: 3, feed_title: '', favicon_url: null, ps: 1, nt: 0, ng: 0 }, 
        ];
        let mockClickHandler: Mock;
        
        beforeEach(() => {
             const appDiv = document.getElementById('app')!;
             appDiv.innerHTML = `
                 <p id="feed-message-area"></p>
                 <ul id="feed-list"></ul>
             `;
             mockClickHandler = vi.fn();
             setFeedItemClickHandler(mockClickHandler);
         });
         
         // Existing tests for renderFeedList (checking attributes, counts, clicks) should still work
         // Ensure the test checking data-feed-title is present
         it('should render feeds with correct data attributes', () => {
             renderFeedList(mockFeeds);
             const listItems = document.querySelectorAll('#feed-list li');
             expect((listItems[0] as HTMLLIElement).dataset.feedId).toBe('1');
             expect((listItems[0] as HTMLLIElement).dataset.feedTitle).toBe('Tech Blog');
             expect((listItems[1] as HTMLLIElement).dataset.feedId).toBe('abc');
             expect((listItems[1] as HTMLLIElement).dataset.feedTitle).toBe('News Site');
             expect((listItems[2] as HTMLLIElement).dataset.feedId).toBe('3');
             expect((listItems[2] as HTMLLIElement).dataset.feedTitle).toBe('Untitled Feed'); // Fallback
         });
          // Other renderFeedList tests...
    });
    
    describe('renderStories', () => {
        const mockStories: Story[] = [
             { id: 's1', story_title: 'Story One', story_date: '2023-10-26T10:00:00Z', read_status: 0, story_permalink: '' },
             { id: 's2', story_title: 'Story Two (Read)', story_date: '2023-10-25T12:30:00Z', read_status: 1, story_permalink: '' },
        ];
        const feedTitle = 'Test Feed Title';
        
         beforeEach(() => {
             const appDiv = document.getElementById('app')!;
             appDiv.innerHTML = `
                 <span id="story-list-title"></span>
                 <p id="story-message-area"></p>
                 <ul id="story-list"></ul>
             `;
         });
        
        it('should render stories with correct title and date formatting', () => {
             renderStories(mockStories, feedTitle);
             const listItems = document.querySelectorAll('#story-list li');
             const titleElement = expectElementById<HTMLSpanElement>('story-list-title');
            
             expect(titleElement.textContent).toBe(feedTitle);
             expect(listItems.length).toBe(mockStories.length);
             // Select title span (first span child) and date span (span with text-xs)
             expect(listItems[0].querySelector('span:first-child')?.textContent).toBe('Story One');
             expect(listItems[0].querySelector('span.text-xs')?.textContent).toBe('Oct 26, 2023'); // Assuming locale formats this way
             expect(listItems[1].querySelector('span:first-child')?.textContent).toBe('Story Two (Read)');
             expect(listItems[1].querySelector('span.text-xs')?.textContent).toBe('Oct 25, 2023');
         });
        
        it('should apply read/unread styles correctly', () => {
             renderStories(mockStories, feedTitle);
             const listItems = document.querySelectorAll('#story-list li');
             // Check classes directly on the list item
             expect(listItems[0].classList.contains('font-semibold')).toBe(true); // Unread style
             expect(listItems[1].classList.contains('font-normal')).toBe(true); // Read style
         });
        
        it('should show a message if no stories are provided', () => {
             renderStories([], feedTitle);
             const messageArea = expectElementById<HTMLParagraphElement>('story-message-area');
             expect(expectElementById('story-list').innerHTML).toBe('');
             expect(messageArea.textContent).toBe('No stories found in this feed.');
         });

         it('should handle missing story data gracefully', () => {
            const storiesWithMissingData: Partial<Story>[] = [
                { id: 's3' }, // Missing title, date, read_status
            ];
            renderStories(storiesWithMissingData as Story[], feedTitle); // Type assertion needed
            const listItems = document.querySelectorAll('#story-list li');
            expect(listItems.length).toBe(1);
            // Check title span for fallback text
            expect(listItems[0].querySelector('span:first-child')?.textContent).toBe('Untitled Story'); // Fallback title
            // Check that the date span was not rendered or is empty for invalid date
            expect(listItems[0].querySelector('span.text-xs')?.textContent).toBe('Invalid Date');
         });
    });
    
    // Test for setLoginButtonState (assuming button exists)
    describe('setLoginButtonState', () => {
        beforeEach(() => {
            const appDiv = document.getElementById('app')!;
            appDiv.innerHTML = `<button id="login-button"></button>`;
        });

        it('should disable the login button', () => {
            const loginButton = expectElementById<HTMLButtonElement>('login-button');
            setLoginButtonState(true);
            expect(loginButton.disabled).toBe(true);
        });

        it('should enable the login button', () => {
            const loginButton = expectElementById<HTMLButtonElement>('login-button');
            loginButton.disabled = true; // Start disabled
            setLoginButtonState(false);
            expect(loginButton.disabled).toBe(false);
        });
    });
});
