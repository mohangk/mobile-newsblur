// frontend/js/api.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { login, logout, getFeeds, checkAuth, getStoriesForFeed } from './api'; // Removed getStoryContent
import type { Feed, Story, FeedResponse, StoryResponse, ApiError } from './types'; // Removed StoryContent

// --- Mocking global fetch ---
// We mock the global `fetch` function rather than the internal `apiFetch` helper.
// This allows us to test the full behavior of the exported API functions
// (e.g., `login`, `getFeeds`), including how they utilize `apiFetch`
// (URL construction, option merging, error handling, response parsing),
// isolating the tests only from the actual network call.
globalThis.fetch = vi.fn();

const BASE_URL = 'http://localhost:8787'; // Define base URL for expectations

describe('API Functions', () => {
    beforeEach(() => {
        vi.mocked(globalThis.fetch).mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks(); // Ensure mocks are reset between tests
    });

    describe('login', () => {
        it('should call fetch with correct params and return data on successful login', async () => {
            const mockResponse = { authenticated: true };
            vi.mocked(globalThis.fetch).mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => mockResponse,
            } as Response);

            const result = await login('testuser', 'password123');

            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/proxy/api/login`, // Expect full URL
                expect.objectContaining({ // Check essential options
                    method: 'POST',
                    headers: expect.objectContaining({ 
                        'Content-Type': 'application/x-www-form-urlencoded' 
                    }),
                    body: expect.any(URLSearchParams), // Check body type
                    credentials: 'include'
                })
            );
            expect(result).toEqual(mockResponse);
        });

        it('should throw an error on login failure (non-200)', async () => {
            const mockError = { message: 'Login failed' };
            vi.mocked(globalThis.fetch).mockResolvedValue({
                ok: false,
                status: 401,
                json: async () => mockError,
            } as Response);

            await expect(login('test', 'wrong')).rejects.toThrow('Login failed');
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });

        it('should throw an error on network failure', async () => {
            const networkError = new Error('Network error');
            vi.mocked(globalThis.fetch).mockRejectedValue(networkError);

            await expect(login('test', 'pass')).rejects.toThrow('Network error');
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });
        
        it('should handle non-JSON error response', async () => {
            vi.mocked(globalThis.fetch).mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'Server Error', 
                json: async () => { throw new Error('Invalid JSON'); },
            } as unknown as Response);
            
            // Expect the raw error message thrown by the mock's .json() 
            await expect(login('test', 'pass')).rejects.toThrow('Server Error'); 
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/proxy/api/login`, 
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('logout', () => {
        it('should call fetch with correct params for logout', async () => {
             vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
             await logout();
             expect(globalThis.fetch).toHaveBeenCalledTimes(1);
             expect(globalThis.fetch).toHaveBeenCalledWith(
                 `${BASE_URL}/proxy/api/logout`, // Expect full URL
                 expect.objectContaining({ // Check essential options
                     method: 'POST',
                     credentials: 'include' 
                 })
             );
        });
        // Add tests for logout failure if needed
    });

    describe('getFeeds', () => {
        it('should call fetch for feeds and return data', async () => {
            const mockData = { feeds: { 1: {} }, folders: [] };
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, json: async () => mockData } as Response);
            
            const result = await getFeeds();
            
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/proxy/reader/feeds?include_favicons=true`, 
                expect.objectContaining({ // Only check credentials for default GET
                    credentials: 'include'
                })
            );
            expect(result).toEqual(mockData);
        });

        it('should throw error on getFeeds failure', async () => {
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({message: 'Failed'}) } as Response);
            await expect(getFeeds()).rejects.toThrow('Failed');
        });

        it('should throw error on getFeeds network error', async () => {
             vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Net Fail'));
             await expect(getFeeds()).rejects.toThrow('Network error or unexpected issue');
        });
    });

    describe('checkAuth', () => {
        it('should return true if getFeeds succeeds', async () => {
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ feeds: {} }) } as Response);
            const result = await checkAuth();
            expect(result).toBe(true);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/proxy/reader/feeds?include_favicons=true`, 
                expect.objectContaining({ credentials: 'include' }) // Only check credentials for default GET
            );
        });

        it('should return false if getFeeds returns 401', async () => {
             vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 401, json: async () => ({message: 'Auth required'}) } as Response);
             const result = await checkAuth();
             expect(result).toBe(false);
        });
        
        it('should throw an error if getFeeds fails with non-401 status', async () => {
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: false, status: 500, json: async () => ({message: 'Server Error'}) } as Response);
            // Wrap the async call in a function for expect(...).rejects
            await expect(() => checkAuth()).rejects.toThrow('Server Error');
            // Or check the error object if apiFetch adds status to it
            // try {
            //     await checkAuth();
            // } catch (e) {
            //     expect(e.status).toBe(500);
            //     expect(e.message).toBe('Server Error');
            // }
        });

        it('should throw an error on network failure', async () => {
            vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network failed'));
            await expect(() => checkAuth()).rejects.toThrow('Network error or unexpected issue');
        });
    });

    describe('getStoriesForFeed', () => {
        beforeEach(() => {
            vi.mocked(globalThis.fetch).mockClear();
        });

        it('should throw an error if feedId is not provided', async () => {
            await expect(getStoriesForFeed("")).rejects.toThrow('Feed ID is required');
            expect(globalThis.fetch).not.toHaveBeenCalled();
        });

        it('should call fetch with the correct feed URL', async () => {
            const feedId = '12345';
            // Mock response with stories as an array
            const mockStoriesData = { stories: [ { id: 's1', story_title: 'Story 1', story_content: '', story_authors: '', story_date:'' } ] }; // Provide minimal Story data
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, json: async () => mockStoriesData } as Response); 

            await getStoriesForFeed(feedId);

            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                `${BASE_URL}/proxy/reader/feed/${feedId}?order=newest`,
                expect.objectContaining({ credentials: 'include' })
            );
        });

        it('should return the sorted stories array on success', async () => {
            const feedId = '5678';
            // Mock stories array directly
            const mockStoriesArray = [
                { id: 's1', story_date: '2025-01-01T10:00:00Z', story_title:'Old', story_content:'', story_authors:'' }, 
                { id: 's2', story_date: '2025-01-01T12:00:00Z', story_title:'New', story_content:'', story_authors:'' }
            ]; 
            vi.mocked(globalThis.fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ stories: mockStoriesArray }) } as Response);

            const stories = await getStoriesForFeed(feedId);

            expect(Array.isArray(stories)).toBe(true);
            expect(stories.length).toBe(2);
            // Check sorting (newest first)
            expect(stories[0].story_title).toBe('New'); 
            expect(stories[1].story_title).toBe('Old');
        });

        it('should return an empty array if stories array is missing or null', async () => {
            const feedId = '999';
            // Test with missing stories property
            vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ message: 'ok' }) } as Response);
            let stories = await getStoriesForFeed(feedId);
            expect(stories).toEqual([]);
            
            // Test with null stories property
             vi.mocked(globalThis.fetch).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ stories: null }) } as Response);
             stories = await getStoriesForFeed(feedId);
             expect(stories).toEqual([]);
        });

        it('should throw ApiError if fetch fails (network error)', async () => {
            const feedId = '111';
            const error = new Error('API Failed');
            vi.mocked(globalThis.fetch).mockRejectedValue(error);
            await expect(getStoriesForFeed(feedId)).rejects.toThrow('Network error or unexpected issue');
        });
        
        it('should throw ApiError if api response is not ok', async () => {
            const feedId = '222';
            const errorMessage = 'Feed Not Found';
            vi.mocked(globalThis.fetch).mockResolvedValue({
                ok: false,
                status: 404,
                json: async () => ({ message: errorMessage }),
            } as Response);
            
            await expect(getStoriesForFeed(feedId)).rejects.toThrow(errorMessage);
             try {
                 await getStoriesForFeed(feedId);
             } catch (e) {
                 expect((e as ApiError).status).toBe(404);
             }
        });
    });
}); 