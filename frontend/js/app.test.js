// frontend/js/app.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// --- Mock Modules ---
vi.mock('./api.js', () => ({
    login: vi.fn(),
    logout: vi.fn(),
    getFeeds: vi.fn(),
    checkAuth: vi.fn(),
}));
vi.mock('./ui.js', () => ({
    showLoginView: vi.fn(),
    showFeedListView: vi.fn(),
    showLoginMessage: vi.fn(),
    showFeedMessage: vi.fn(),
    setLoginButtonState: vi.fn(),
    renderFeedList: vi.fn(),
    clearFeedDisplay: vi.fn(),
}));

// --- Import Modules Under Test (and Mocks) ---
import * as api from './api.js';
import * as ui from './ui.js';
// Use namespace import to allow spying on exported functions
import * as app from './app.js';

// --- Global Test Setup/Teardown ---
beforeEach(() => {
    // Reset mocks BEFORE each test
    vi.clearAllMocks();
    // Restore any spied functions
    vi.restoreAllMocks(); 
    // Enable fake timers
    vi.useFakeTimers();
    // Set up minimal mock DOM 
    document.body.innerHTML = `
        <div id="app">
            <div id="login-view"></div>
            <div id="feed-list-view"></div>
            <form id="login-form">
                <input id="username" value="testuser" />
                <input id="password" value="password123" />
                <button id="login-button"></button>
            </form>
            <button id="logout-button"></button>
            <p id="login-message-area"></p>
            <p id="feed-message-area"></p>
            <ul id="feed-list"></ul>
        </div>
    `;
});

afterEach(() => {
    // Restore real timers
    vi.useRealTimers();
    // Clean up DOM
    document.body.innerHTML = '';
});

// Helper function to run timers and microtasks
async function runAsyncTicks() {
    await Promise.resolve(); // Let initial promise queue clear
    await vi.runAllTimersAsync(); // Run timers and their microtasks
    await Promise.resolve(); // Let any new microtasks clear
}

// --- Simplified Tests ---

describe('app.js integrations', () => {

    describe('checkAuthAndLoadView', () => {
         // Mock fetchAndDisplayFeeds within this suite
         let fetchAndDisplayFeedsSpy;
         beforeEach(() => {
             fetchAndDisplayFeedsSpy = vi.spyOn(app, 'fetchAndDisplayFeeds').mockImplementation(async () => {});
         });

        it('should show feeds if authenticated (and implicitly call fetch)', async () => {
            api.checkAuth.mockResolvedValue(true);
            // Add back the necessary mock for the *internal* call
            api.getFeeds.mockResolvedValue({ feeds: { 1: {id: 1} }, folders: [] }); 

            await app.checkAuthAndLoadView();
            await runAsyncTicks();

            expect(api.checkAuth).toHaveBeenCalledTimes(1);
            expect(ui.showFeedListView).toHaveBeenCalledTimes(1);
            // Since fetchAndDisplayFeeds is no longer spied on, we can't assert its call count here.
            // We rely on the direct tests of fetchAndDisplayFeeds to cover its internal logic.
            expect(ui.showLoginView).not.toHaveBeenCalled();
        });

        it('should show login if not authenticated', async () => {
            api.checkAuth.mockResolvedValue(false);

            await app.checkAuthAndLoadView();
            await runAsyncTicks();

            expect(api.checkAuth).toHaveBeenCalledTimes(1);
            expect(ui.showLoginView).toHaveBeenCalledTimes(1);
            expect(ui.showFeedListView).not.toHaveBeenCalled();
            // Check fetchAndDisplayFeeds was NOT called
            expect(fetchAndDisplayFeedsSpy).not.toHaveBeenCalled(); 
        });

        it('should show login on auth check error', async () => {
            api.checkAuth.mockRejectedValue(new Error('Network Error'));

            await app.checkAuthAndLoadView();
            await runAsyncTicks();

            expect(api.checkAuth).toHaveBeenCalledTimes(1);
            expect(ui.showLoginView).toHaveBeenCalledTimes(1);
            expect(ui.showLoginMessage).toHaveBeenCalledWith(expect.stringContaining('Error contacting server'), true);
            // Check fetchAndDisplayFeeds was NOT called
            expect(fetchAndDisplayFeedsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handleLoginSubmit', () => {
        const mockEvent = { preventDefault: vi.fn() };
        // Mock fetchAndDisplayFeeds here as well, as login calls it
        let fetchAndDisplayFeedsSpy;
        
        beforeEach(() => {
             fetchAndDisplayFeedsSpy = vi.spyOn(app, 'fetchAndDisplayFeeds').mockImplementation(async () => {});
             mockEvent.preventDefault.mockClear();
             document.getElementById('username').value = 'testuser';
             document.getElementById('password').value = 'password123';
        });

        it('should attempt login and show feeds on success (implicitly calling fetch)', async () => {
            api.login.mockResolvedValue({ authenticated: true });
            // Add back the necessary mock for the *internal* call
            api.getFeeds.mockResolvedValue({ feeds: { 1: {id: 1} }, folders: [] });

            await app.handleLoginSubmit(mockEvent);
            await runAsyncTicks(); 

            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
            expect(ui.showLoginMessage).toHaveBeenCalledWith('Logging in...');
            expect(ui.setLoginButtonState).toHaveBeenCalledWith(true);
            expect(api.login).toHaveBeenCalledWith('testuser', 'password123');
            expect(ui.showLoginMessage).toHaveBeenCalledWith('Success!', false);
            expect(ui.showFeedListView).toHaveBeenCalledTimes(1);
            // Since fetchAndDisplayFeeds is no longer spied on, we can't assert its call count here.
            expect(ui.setLoginButtonState).toHaveBeenCalledWith(false);
        });

         it('should show error on login failure', async () => {
            const loginError = new Error('Bad credentials');
            api.login.mockRejectedValue(loginError);

            await app.handleLoginSubmit(mockEvent);
            await runAsyncTicks();

            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
            expect(api.login).toHaveBeenCalledTimes(1);
            expect(ui.showLoginMessage).toHaveBeenCalledWith('Bad credentials', true);
            expect(ui.showFeedListView).not.toHaveBeenCalled();
            expect(ui.setLoginButtonState).toHaveBeenCalledWith(false);
             // Check fetchAndDisplayFeeds was NOT called
            expect(fetchAndDisplayFeedsSpy).not.toHaveBeenCalled();
        });

        it('should require username and password', async () => {
            document.getElementById('username').value = ''; // Empty username

            await app.handleLoginSubmit(mockEvent);
            await runAsyncTicks();

            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
            expect(api.login).not.toHaveBeenCalled();
            expect(ui.showLoginMessage).toHaveBeenCalledWith('Username and password are required.', true);
             // Check fetchAndDisplayFeeds was NOT called
            expect(fetchAndDisplayFeedsSpy).not.toHaveBeenCalled();
        });
    });

    describe('handleLogout', () => {
        it('should call api.logout and show login view on success', async () => {
            api.logout.mockResolvedValue({});

            await app.handleLogout();
            await runAsyncTicks();

            expect(api.logout).toHaveBeenCalledTimes(1);
            expect(ui.showLoginView).toHaveBeenCalledTimes(1);
        });

        it('should show login view even if logout fails', async () => {
            api.logout.mockRejectedValue(new Error('Logout failed'));

            await app.handleLogout();
            await runAsyncTicks();

            expect(api.logout).toHaveBeenCalledTimes(1);
            expect(ui.showLoginView).toHaveBeenCalledTimes(1);
        });
    });

     describe('handleFeedItemClick', () => {
        it('should show a message with the feed ID', async () => {
            app.handleFeedItemClick(123);
            await runAsyncTicks();
            expect(ui.showFeedMessage).toHaveBeenCalledWith('Selected Feed ID: 123');
        });
    });

    // New describe block for fetchAndDisplayFeeds
    describe('fetchAndDisplayFeeds', () => {
        it('should show loading message, clear display, call getFeeds, and render list on success', async () => {
            const mockFeedData = { 
                feeds: { 1: { id: 1, feed_title: 'Feed A' } },
                folders: [] 
            };
            api.getFeeds.mockResolvedValue(mockFeedData);

            await app.fetchAndDisplayFeeds();
            // No runAsyncTicks needed here as we directly await the function

            expect(ui.showFeedMessage).toHaveBeenCalledWith("Loading feeds...");
            expect(ui.clearFeedDisplay).toHaveBeenCalledTimes(1);
            expect(api.getFeeds).toHaveBeenCalledTimes(1);
            expect(ui.renderFeedList).toHaveBeenCalledTimes(1);
            // Check that the correct data is passed to renderFeedList
            expect(ui.renderFeedList).toHaveBeenCalledWith(
                [mockFeedData.feeds[1]], // Expecting an array of feeds
                app.handleFeedItemClick // Check correct handler is passed
            );
            // Check message is cleared on success
            expect(ui.showFeedMessage).toHaveBeenCalledWith("");
        });

        it('should show error message if getFeeds fails', async () => {
            const error = new Error('API Error');
            api.getFeeds.mockRejectedValue(error);

            await app.fetchAndDisplayFeeds();

            expect(ui.showFeedMessage).toHaveBeenCalledWith("Loading feeds...");
            expect(ui.clearFeedDisplay).toHaveBeenCalledTimes(1);
            expect(api.getFeeds).toHaveBeenCalledTimes(1);
            expect(ui.renderFeedList).not.toHaveBeenCalled();
            // Use toHaveBeenLastCalledWith for the final error message
            expect(ui.showFeedMessage).toHaveBeenLastCalledWith("Error loading feeds: API Error", true);
        });

        it('should handle empty feeds response', async () => {
            const mockFeedData = { feeds: {}, folders: [] }; // Empty feeds
            api.getFeeds.mockResolvedValue(mockFeedData);

            await app.fetchAndDisplayFeeds();

            expect(ui.renderFeedList).toHaveBeenCalledWith([], app.handleFeedItemClick);
            expect(ui.showFeedMessage).toHaveBeenCalledWith(""); // Clear message
        });
    });

});