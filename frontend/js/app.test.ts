// frontend/js/app.test.ts
import {
    describe,
    test,
    expect,
    vi,
    beforeEach,
    Mocked
} from 'vitest';

// --- Mocks ---
// Mock UI and API modules BEFORE importing app
vi.mock('./ui');
vi.mock('./api');

import * as ui from './ui';
import * as api from './api';
// Import types from the correct source file
import type { Feed, FeedMap, FeedResponse } from './types';

// DO NOT import app statically if it runs init code on import
// import './app';

// We might need access to internal functions for testing if not exported
// Let's assume for now tests cover behavior via initializeApp triggers

// Type the mocked modules
const mockedUi = ui as Mocked<typeof ui>;
const mockedApi = api as Mocked<typeof api>;

// --- Test Suite ---
describe('App Logic (app.ts)', () => {

    // Variables to hold captured handlers - reset in relevant describe blocks
    let capturedAppHandlers: { onLoginSubmit: () => Promise<void>; onLogoutClick: () => void; };
    let capturedFeedClickHandler: (feedId: string | number) => void;

    // General cleanup
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Function to initialize mocks and import the app module dynamically
    async function initializeAppWithMocks() {
         // Reset modules to ensure app runs its init code again
        vi.resetModules();

        // Mock implementations to capture the handlers passed from app.ts
        mockedUi.initializeUI.mockImplementation((handlers) => {
            capturedAppHandlers = handlers;
        });
        mockedUi.setFeedItemClickHandler.mockImplementation((handler) => {
            capturedFeedClickHandler = handler;
        });

        // Dynamically import the app module to trigger its execution
        await import('./app');

        // Add checks to ensure handlers were captured
        if (!capturedAppHandlers) {
            console.error("Test Setup Error: initializeUI was not called by app.ts");
        }
        if (!capturedFeedClickHandler) {
             console.error("Test Setup Error: setFeedItemClickHandler was not called by app.ts");
        }
    }

    // == Test initial load flow ==
    describe('Initial Load Flow', () => {
        test('should call checkAuth, then show feeds if authenticated', async () => {
            // Arrange Mocks FIRST
            mockedApi.checkAuth.mockResolvedValue(true);
            const mockFeedData: FeedResponse = { feeds: { '1': { id: 1, feed_title: 'Feed A', favicon_url: null } }, folders: [] };
            mockedApi.getFeeds.mockResolvedValue(mockFeedData);

            // Act: Initialize app with these mocks
            await initializeAppWithMocks();

            // Assert calls made during initialization
            expect(mockedApi.checkAuth).toHaveBeenCalledTimes(1);
            // Assert fetchAndDisplayFeeds flow
            expect(mockedUi.showFeedListView).toHaveBeenCalled();
            expect(mockedUi.showFeedMessage).toHaveBeenCalledWith('Loading feeds...');
            expect(mockedUi.clearFeedDisplay).toHaveBeenCalled();
            expect(mockedApi.getFeeds).toHaveBeenCalledTimes(1);
            expect(mockedUi.renderFeedList).toHaveBeenCalledWith([{ id: 1, feed_title: 'Feed A', favicon_url: null }]);
            // renderFeedList clears message internally on success
        });

        test('should call checkAuth, then show login if not authenticated', async () => {
            // Arrange Mocks FIRST
            mockedApi.checkAuth.mockResolvedValue(false);

            // Act: Initialize app with these mocks
            await initializeAppWithMocks();

            // Assert
            expect(mockedApi.checkAuth).toHaveBeenCalledTimes(1);
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1);
            expect(mockedApi.getFeeds).not.toHaveBeenCalled();
            expect(mockedUi.showFeedListView).not.toHaveBeenCalled();
        });

        test('should show login view on auth check error', async () => {
            // Arrange Mocks FIRST
            mockedApi.checkAuth.mockRejectedValue(new Error('Auth Network Error'));

            // Act: Initialize app with these mocks
            await initializeAppWithMocks();

            // Assert
            expect(mockedApi.checkAuth).toHaveBeenCalledTimes(1);
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1);
            expect(mockedApi.getFeeds).not.toHaveBeenCalled();
        });
    });

    // == Test user interactions (login, logout, feed click) ==
    // These tests rely on handlers captured during initialization
    describe('User Interactions', () => {
        // Initialize app once before tests in this suite to capture handlers
        beforeEach(async () => {
            // Setup default mocks needed for initialization if any
            // (e.g., if checkAuth fails, subsequent tests might depend on login view state)
            mockedApi.checkAuth.mockResolvedValue(false); // Default to not authenticated
            await initializeAppWithMocks();
            // Verify handlers are captured before running tests
            if (!capturedAppHandlers || !capturedFeedClickHandler) {
                 throw new Error('Handlers not captured during interaction test setup');
            }
        });

        test('handleLoginSubmit: success flow', async () => {
            // Arrange: Setup mocks for login and feed fetch success
            mockedUi.getLoginCredentials.mockReturnValue({ username: 'test', password: 'pass' });
            mockedApi.login.mockResolvedValue({ authenticated: true });
            const mockFeedData: FeedResponse = { feeds: { '2': { id: 2, feed_title: 'Feed B', favicon_url: 'b.png' } }, folders: [] };
            mockedApi.getFeeds.mockResolvedValue(mockFeedData);

            // Act: Trigger the captured handler
            await capturedAppHandlers.onLoginSubmit();

            // Assert Login Flow
            expect(mockedUi.getLoginCredentials).toHaveBeenCalledTimes(1);
            expect(mockedUi.setLoginButtonState).toHaveBeenCalledWith(true);
            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Logging in...');
            expect(mockedApi.login).toHaveBeenCalledWith('test', 'pass');
            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Login successful!', false);

            // Assert fetchAndDisplayFeeds Flow (called after successful login)
            expect(mockedUi.showFeedListView).toHaveBeenCalled();
            expect(mockedUi.showFeedMessage).toHaveBeenCalledWith('Loading feeds...'); // Initial message
            expect(mockedUi.clearFeedDisplay).toHaveBeenCalled();
            expect(mockedApi.getFeeds).toHaveBeenCalledTimes(1);
            expect(mockedUi.renderFeedList).toHaveBeenCalledWith([{ id: 2, feed_title: 'Feed B', favicon_url: 'b.png' }]);
        });

        test('handleLoginSubmit: login failure', async () => {
            // Arrange: Mock login failure
            mockedUi.getLoginCredentials.mockReturnValue({ username: 'user', password: 'wrong' });
            const loginError = new Error('Bad credentials') as any;
            loginError.data = { message: 'Bad credentials' };
            mockedApi.login.mockRejectedValue(loginError);

            // Act
            await capturedAppHandlers.onLoginSubmit();

            // Assert
            expect(mockedUi.getLoginCredentials).toHaveBeenCalledTimes(1);
            expect(mockedUi.setLoginButtonState).toHaveBeenCalledWith(true); // Disabled during attempt
            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Logging in...');
            expect(mockedApi.login).toHaveBeenCalledWith('user', 'wrong');
            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Bad credentials', true); // Error shown
            expect(mockedUi.setLoginButtonState).toHaveBeenCalledWith(false); // Re-enabled after error
            expect(mockedApi.getFeeds).not.toHaveBeenCalled(); // Feed fetch should not happen
            expect(mockedUi.renderFeedList).not.toHaveBeenCalled();
        });

        test('handleLoginSubmit: missing credentials', async () => {
            // Arrange: Mock missing credentials
            mockedUi.getLoginCredentials.mockReturnValue(null);

            // Act
            await capturedAppHandlers.onLoginSubmit();

            // Assert
            expect(mockedUi.getLoginCredentials).toHaveBeenCalledTimes(1);
            expect(mockedUi.showLoginMessage).toHaveBeenCalledWith('Username and password are required.', true);
            expect(mockedApi.login).not.toHaveBeenCalled();
            expect(mockedUi.setLoginButtonState).not.toHaveBeenCalled();
        });

        test('handleLogout: success flow', async () => {
            // Arrange: Mock successful logout
            // We need to clear mocks *after* the beforeEach setup call to isolate this test's calls
            vi.clearAllMocks(); // Clear mocks from beforeEach init
            mockedApi.logout.mockResolvedValue({});

            // Act
            await capturedAppHandlers.onLogoutClick();

            // Assert
            expect(mockedApi.logout).toHaveBeenCalledTimes(1);
            // Expect 1 call *during this test's execution*
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1); 
        });

        test('handleLogout: failure flow', async () => {
            // Arrange: Mock failed logout
            // Clear mocks *after* the beforeEach setup call
            vi.clearAllMocks(); 
            mockedApi.logout.mockRejectedValue(new Error('Logout failed'));

            // Act
            await capturedAppHandlers.onLogoutClick();

            // Assert
            expect(mockedApi.logout).toHaveBeenCalledTimes(1);
            // Expect 1 call *during this test's execution*, even on failure
            expect(mockedUi.showLoginView).toHaveBeenCalledTimes(1); 
        });

        test('handleFeedItemClick: interaction', () => {
            // Arrange
            const feedId = 42;

            // Act: Trigger captured handler
            capturedFeedClickHandler(feedId);

            // Assert
            expect(mockedUi.showFeedMessage).toHaveBeenCalledTimes(1);
            expect(mockedUi.showFeedMessage).toHaveBeenCalledWith(`Selected Feed ID: ${feedId}. Story loading not implemented yet.`);
        });
    });
});