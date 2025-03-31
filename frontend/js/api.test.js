// frontend/js/api.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, logout, getFeeds, checkAuth } from './api'; // Import functions to test

// --- Mocking fetch ---
// Store the original fetch implementation
const originalFetch = global.fetch;

beforeEach(() => {
    // Before each test, mock the global fetch
    global.fetch = vi.fn();
});

afterEach(() => {
    // After each test, restore the original fetch
    global.fetch = originalFetch;
    // Reset any mocks if needed (though vi.fn() usually resets calls)
    vi.restoreAllMocks();
});

// Helper to create mock Response objects
const createMockResponse = (body, status, ok) => {
    return Promise.resolve({
        ok: ok,
        status: status,
        statusText: `Status ${status}`,
        json: () => Promise.resolve(body),
        // Add other Response methods if needed (e.g., headers.get)
    });
};

// --- Tests ---

describe('API Functions', () => {

    describe('login', () => {
        it('should make a POST request to /api/login with credentials', async () => {
            const mockSuccessResponse = { authenticated: true, message: "Login successful (proxy)" };
            fetch.mockReturnValue(createMockResponse(mockSuccessResponse, 200, true));

            await login('testuser', 'password123');

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/proxy/api/login'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                    }),
                    body: expect.any(URLSearchParams), // Check body type
                })
            );
            // More specific body check (requires inspecting the URLSearchParams object)
            const fetchOptions = fetch.mock.calls[0][1];
            const bodyParams = new URLSearchParams(fetchOptions.body);
            expect(bodyParams.get('username')).toBe('testuser');
            expect(bodyParams.get('password')).toBe('password123');
        });

        it('should return parsed JSON on successful login', async () => {
            const mockSuccessResponse = { authenticated: true, message: "Success" };
            fetch.mockReturnValue(createMockResponse(mockSuccessResponse, 200, true));

            const result = await login('testuser', 'password123');
            expect(result).toEqual(mockSuccessResponse);
        });

        it('should throw an error with API message on failed login', async () => {
            const mockErrorResponse = {
                code: -1,
                errors: { "__all__": ["Invalid credentials."] },
                result: "ok",
                authenticated: false
            };
            // Simulate NewsBlur returning 200 OK but authenticated: false
            fetch.mockReturnValue(createMockResponse(mockErrorResponse, 200, true)); 

            await expect(login('testuser', 'wrongpass'))
                .rejects.toThrow('Invalid credentials.');
        });

         it('should throw an error on network failure', async () => {
            fetch.mockRejectedValue(new Error('Network failed'));

            await expect(login('testuser', 'password123'))
                .rejects.toThrow('Network failed');
        });
    });

    describe('logout', () => {
        it('should make a POST request to /api/logout', async () => {
            fetch.mockReturnValue(createMockResponse({ message: "Logged out" }, 200, true));
            await logout();
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/proxy/api/logout'),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('getFeeds', () => {
        it('should make a GET request to /reader/feeds?include_favicons=true', async () => {
            const mockFeedsResponse = { feeds: {}, folders: [], authenticated: true };
            fetch.mockReturnValue(createMockResponse(mockFeedsResponse, 200, true));
            await getFeeds();
            expect(fetch).toHaveBeenCalledTimes(1);
             // Check the URL separately, then check the method on the captured options object
            expect(fetch).toHaveBeenCalledWith(
                'http://localhost:8787/proxy/reader/feeds?include_favicons=true',
                 expect.objectContaining({ // Check relevant options
                    method: 'GET',
                    credentials: 'include'
                })
            );
             const fetchOptions = fetch.mock.calls[0][1]; 
            expect(fetchOptions.method).toBe('GET'); 
            expect(fetchOptions.credentials).toBe('include'); 
        });

         it('should return parsed JSON on success', async () => {
            const mockFeedsResponse = { feeds: {1: {id: 1}}, folders: [], authenticated: true };
            fetch.mockReturnValue(createMockResponse(mockFeedsResponse, 200, true));
            const result = await getFeeds();
            expect(result).toEqual(mockFeedsResponse);
        });

        it('should throw an error on 401 Unauthorized', async () => {
            fetch.mockReturnValue(createMockResponse({ message: "Unauthorized" }, 401, false));
             await expect(getFeeds()).rejects.toThrow('Unauthorized');
             // Check status is attached
             try { await getFeeds(); } catch(e) { expect(e.status).toBe(401); }

        });
    });

     describe('checkAuth', () => {
        it('should return true if getFeeds is successful', async () => {
            const mockFeedsResponse = { feeds: {}, folders: [], authenticated: true };
            fetch.mockReturnValue(createMockResponse(mockFeedsResponse, 200, true));
            const result = await checkAuth();
            expect(result).toBe(true);
        });

        it('should return false if getFeeds returns 401', async () => {
            fetch.mockReturnValue(createMockResponse({ message: "Unauthorized" }, 401, false));
            const result = await checkAuth();
            expect(result).toBe(false);
        });

         it('should throw an error if getFeeds fails with non-401 status', async () => {
             fetch.mockReturnValue(createMockResponse({ message: "Server Error" }, 500, false));
             await expect(checkAuth()).rejects.toThrow('Server Error');
              try { await checkAuth(); } catch(e) { expect(e.status).toBe(500); }
         });

         it('should throw an error on network failure', async () => {
            fetch.mockRejectedValue(new Error('Network failed'));
            await expect(checkAuth()).rejects.toThrow('Network failed');
        });
    });

}); 