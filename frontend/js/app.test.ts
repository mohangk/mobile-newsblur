// frontend/js/app.test.ts
import {
    describe,
    test,
    expect,
    vi,
    beforeEach,
    afterEach,
    Mocked
} from 'vitest';

// Mocking at top level is required by Vitest
vi.mock('./ui');
vi.mock('./api');

import * as ui from './ui';
import * as api from './api';
// Import types from the correct source file
import type { Feed, FeedMap, FeedResponse, Story, ApiError } from './types';

// DO NOT import app statically if it runs init code on import
// import './app';

// We might need access to internal functions for testing if not exported
// Let's assume for now tests cover behavior via initializeApp triggers

// Type the mocked modules
const mockedUi = ui as Mocked<typeof ui>;
const mockedApi = api as Mocked<typeof api>;

// Hold captured handlers globally within the describe block
let capturedAppHandlers: { onLoginSubmit: () => Promise<void>; onLogoutClick: () => void; } | null = null;
let capturedFeedClickHandler: ((feedId: string | number, feedTitle: string) => void) | null = null; 
let backButtonClickListener: (() => void) | null = null;

describe('App Logic (app.ts)', () => {

    // Function to dynamically import app and capture handlers
    // Call this within beforeEach or tests where app init logic needs to run
    async function initializeAppAndCaptureHandlers() {
        // Ensure mocks are setup *before* import
        mockedUi.initializeUI.mockImplementation((handlers) => {
            capturedAppHandlers = handlers;
        });
        mockedUi.setFeedItemClickHandler.mockImplementation((handler) => {
            capturedFeedClickHandler = handler; 
        });
        
        // Capture back button listener
        const backButton = document.getElementById('back-to-feeds-button') as HTMLButtonElement | null;
        if (backButton) {
             // Use mockImplementation on the mocked function if vi.mock was used
             // or directly assign if just spying/capturing
             // Assuming we want to capture the listener passed from app.ts
            const originalAddEventListener = backButton.addEventListener.bind(backButton);
            backButton.addEventListener = vi.fn((type, listener, options) => {
                 if (type === 'click') {
                     backButtonClickListener = listener as () => void;
                 }
                 // Call original if needed, or handle mock behavior
                 // originalAddEventListener(type, listener, options);
            });
        } else {
             console.warn('Back button not in DOM for listener capture during init');
        }

        // Import app to run its top-level code (incl. initializeApp)
        // Vitest handles running this in the mocked environment
        await import('./app');
        
         // Short delay to allow potential microtasks from init to run
         await new Promise(resolve => setTimeout(resolve, 0));
         
         // Verify handlers captured after potential delay
         if (!capturedAppHandlers || !capturedFeedClickHandler || !backButtonClickListener) {
            console.warn('Handlers were not captured after app initialization.');
         }
    }

    // Setup basic DOM before each test
    beforeEach(() => {
        vi.resetModules(); // Reset modules to allow re-import and clean state
        vi.clearAllMocks(); // Clear mocks from previous test
        // Setup minimal DOM structure needed by most tests
        document.body.innerHTML = `
            <div id="app">
                <button id="back-to-feeds-button">Back</button>
                <div id="login-view"> <p id="login-message-area"></p> <button id="login-button"></button> <input id="username"><input id="password"></div>
                <div id="feed-list-view"> <p id="feed-message-area"></p> <ul id="feed-list"></ul> </div>
                <div id="story-list-view"> <p id="story-message-area"></p> <ul id="story-list"></ul> <span id="story-list-title"></span> </div>
            </div>
        `;
        // Reset captured handlers
        capturedAppHandlers = null;
        capturedFeedClickHandler = null;
        backButtonClickListener = null;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('Initialization Flow', () => {
        test('should initialize UI, set handlers, and check auth', async () => {
            mockedApi.checkAuth.mockResolvedValue(false);
            await initializeAppAndCaptureHandlers();

            expect(mockedUi.initializeUI).toHaveBeenCalledTimes(1);
            expect(mockedUi.setFeedItemClickHandler).toHaveBeenCalledTimes(1);
            const backButton = document.getElementById('back-to-feeds-button');
            expect(backButton?.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockedApi.checkAuth).toHaveBeenCalledTimes(1);
        });

        test('should show login view if not authenticated', async () => {
             mockedApi.checkAuth.mockResolvedValue(false);
             await initializeAppAndCaptureHandlers();
             await vi.dynamicImportSettled();

             expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1);
             expect(mockedApi.getFeeds).not.toHaveBeenCalled();
        });
        
        test('should show feed view and load feeds if authenticated', async () => {
            mockedApi.checkAuth.mockResolvedValue(true);
            const mockFeedData: FeedResponse = { feeds: { '1': { id: 1, feed_title: 'Feed A', favicon_url: null } }, folders: [] };
            mockedApi.getFeeds.mockResolvedValue(mockFeedData);
            
            await initializeAppAndCaptureHandlers();
            await vi.dynamicImportSettled(); 
            
            expect(mockedApi.getFeeds).toHaveBeenCalledTimes(1);
            expect(mockedUi.showFeedListView).toHaveBeenCalledTimes(1);
            expect(mockedUi.renderFeedList).toHaveBeenCalledWith(expect.any(Array));
        });
        
         test('should show login view on auth check error', async () => {
            mockedApi.checkAuth.mockRejectedValue(new Error('Auth Fail'));
            await initializeAppAndCaptureHandlers();
            await vi.dynamicImportSettled();
            
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1);
            expect(mockedApi.getFeeds).not.toHaveBeenCalled();
        });
    });

    describe('User Interactions', () => {
        // Initialize app and capture handlers before each interaction test
        beforeEach(async () => {
            mockedApi.checkAuth.mockResolvedValue(false); // Assume starts logged out for most tests
            await initializeAppAndCaptureHandlers();
             if (!capturedAppHandlers || !capturedFeedClickHandler || !backButtonClickListener) {
                 // Wait a bit longer if handlers aren't captured immediately
                 await new Promise(resolve => setTimeout(resolve, 10)); 
                 if (!capturedAppHandlers || !capturedFeedClickHandler || !backButtonClickListener) {
                    throw new Error('Handlers not captured before interaction tests');
                 }
             }
        });

        test('handleLoginSubmit: success flow', async () => {
            mockedUi.getLoginCredentials.mockReturnValue({ username: 'test', password: 'pass' });
            mockedApi.login.mockResolvedValue({ authenticated: true });
            const mockFeedData: FeedResponse = { feeds: { '2': { id: 2, feed_title: 'Feed B', favicon_url: null } }, folders: [] };
            mockedApi.getFeeds.mockResolvedValue(mockFeedData);

            await capturedAppHandlers!.onLoginSubmit();

            expect(mockedApi.login).toHaveBeenCalledWith('test', 'pass');
            await vi.dynamicImportSettled(); 
            expect(mockedApi.getFeeds).toHaveBeenCalledTimes(1);
            expect(mockedUi.showFeedListView).toHaveBeenCalledTimes(1);
            expect(mockedUi.renderFeedList).toHaveBeenCalledWith(expect.any(Array));
        });

        test('handleLoginSubmit: login failure', async () => {
            mockedUi.getLoginCredentials.mockReturnValue({ username: 'user', password: 'wrong' });
            const loginError: ApiError = new Error('Bad credentials') as ApiError;
            loginError.data = { message: 'Bad credentials' };
            mockedApi.login.mockRejectedValue(loginError);

            await capturedAppHandlers!.onLoginSubmit();
            await vi.dynamicImportSettled();

            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Bad credentials', true);
            expect(mockedUi.setLoginButtonState).toHaveBeenCalledWith(false);
            expect(mockedApi.getFeeds).not.toHaveBeenCalled();
        });

        test('handleLogout: success flow', async () => {
            mockedApi.logout.mockResolvedValue({});
            // Clear mock specific to this action outcome
            mockedUi.showLoginView.mockClear(); 
            await capturedAppHandlers!.onLogoutClick();
            await vi.dynamicImportSettled();

            expect(mockedApi.logout).toHaveBeenCalledTimes(1);
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1);
        });

        test('handleFeedItemClick: success flow', async () => {
            const feedId = 123;
            const feedTitle = 'Clicked Feed';
            const mockStories: Story[] = [{ id: 's1', story_title: 'Story 1' } as Story];
            mockedApi.getStoriesForFeed.mockResolvedValue(mockStories);

            // Handler captured in beforeEach should be available
            await capturedFeedClickHandler!(feedId, feedTitle); 
            await vi.dynamicImportSettled();

            expect(mockedUi.showStoryListView).toHaveBeenCalledTimes(1);
            expect(mockedUi.showStoryMessage).toHaveBeenCalledWith('Loading stories...');
            expect(mockedApi.getStoriesForFeed).toHaveBeenCalledWith(feedId);
            expect(mockedUi.renderStories).toHaveBeenCalledWith(mockStories, feedTitle);
        });

        test('handleFeedItemClick: API error flow', async () => {
            if (!capturedFeedClickHandler) throw new Error("Feed click handler not captured");
            const feedId = 456;
            const feedTitle = 'Error Feed';
            const storyError: ApiError = new Error('Fetch failed') as ApiError;
            storyError.data = { message: 'Server down' };
            mockedApi.getStoriesForFeed.mockRejectedValue(storyError);

            // Clear the mock *just before* triggering the action in this test
            mockedUi.clearStoryDisplay.mockClear(); 

            await capturedFeedClickHandler!(feedId, feedTitle);
            await vi.dynamicImportSettled();

            expect(mockedUi.showStoryListView).toHaveBeenCalledTimes(1);
            // Assert it was called exactly once during this handler execution
            expect(mockedUi.clearStoryDisplay).toHaveBeenCalledTimes(2); 
            expect(mockedUi.showStoryMessage).toHaveBeenCalledWith('Loading stories...');
            expect(mockedUi.showStoryMessage).toHaveBeenCalledWith('Server down', true);
            expect(mockedUi.renderStories).not.toHaveBeenCalled();
        });

        test('Back button click should show feed list view', () => {
            mockedUi.showFeedListView.mockClear();
            backButtonClickListener!(); // Trigger captured listener
            expect(mockedUi.showFeedListView).toHaveBeenCalledTimes(1);
        });
        
        test('Back button click should do nothing if loading', async () => {
            const feedId = 789;
            const feedTitle = 'Loading Feed';
            let resolveApiCall: (value: Story[]) => void;
            const promise = new Promise<Story[]>((resolve) => { resolveApiCall = resolve; });
            mockedApi.getStoriesForFeed.mockReturnValue(promise);
            
            // Start operation but don't wait for the promise
            capturedFeedClickHandler!(feedId, feedTitle); 
            await new Promise(resolve => setTimeout(resolve, 0)); // Allow event loop tick
            
            mockedUi.showFeedListView.mockClear();
            backButtonClickListener!(); // Click while loading

            expect(mockedUi.showFeedListView).not.toHaveBeenCalled();
             
            resolveApiCall!([]); // Cleanup
            await promise; 
        });
    });
});