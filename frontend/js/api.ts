// frontend/js/api.ts
// Define types directly here for now, or create a types.ts file later

// --- Basic Response Structures (can be expanded) ---
interface BaseResponse {
    authenticated?: boolean;
    message?: string;
    errors?: Record<string, string[]>; // e.g., { "__all__": ["Error message"] }
}

export interface LoginResponse extends BaseResponse {
    authenticated: boolean; 
}

export interface LogoutResponse extends BaseResponse {}

export interface Feed {
    id: string | number;
    feed_title: string;
    favicon_url?: string | null;
    ps?: number; // Positive score count
    nt?: number; // Neutral score count
    ng?: number; // Negative score count
    // ... other feed properties from NewsBlur API
}

export type FeedMap = Record<string, Feed>;

export interface FeedResponse extends BaseResponse {
    feeds: FeedMap;
    folders: any[]; // Define folder structure later if needed
}

export interface Story {
    id: string; // NewsBlur story IDs are strings
    story_title: string;
    story_content: string;
    story_permalink: string;
    story_feed_id: number;
    story_date: string; // ISO 8601 format string
    read_status: 0 | 1; // 0 = unread, 1 = read
    starred: boolean;
    story_authors: string;
    story_tags: string[];
    // ... other story properties
}

export type StoryMap = Record<string, Story>;

export interface StoryResponse extends BaseResponse {
    stories: StoryMap;
}

// --- Helper: apiFetch ---
const BASE_URL = 'http://localhost:8787'; 

export interface ApiError extends Error {
    status?: number;
    data?: BaseResponse; // Use BaseResponse for potential error data
}

/**
 * Base fetch function for API calls.
 * @param {string} endpoint - The API endpoint (without /proxy prefix).
 * @param {RequestInit} [options={}] - Optional fetch options.
 * @returns {Promise<any>} - A promise that resolves to the parsed JSON response.
 * @throws {ApiError} - Throws an error with status and message if the API call fails.
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> { // Keep return type as `any` for now, specific functions will type it
    const url = `${BASE_URL}/proxy${endpoint}`; 
    const defaultOptions: RequestInit = {
        credentials: 'include', 
        headers: {
            'Accept': 'application/json',
            ...(options.headers || {}),
        },
    };

    const fetchOptions: RequestInit = {
        ...options,
        ...defaultOptions,
        headers: { 
            ...defaultOptions.headers,
            ...options.headers,
        }
    };

    console.log(`API: Fetching ${url} with options:`, fetchOptions);

    try {
        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
            let errorData: BaseResponse | null = null; // Use BaseResponse type
            let errorMessage = `HTTP error ${response.status}`;
            try {
                errorData = await response.json();
                errorMessage = errorData?.message || 
                               (errorData?.errors?.__all__ ? errorData.errors.__all__.join(', ') : errorMessage);
            } catch (e) {
                try {
                     const textBody = await response.text();
                     errorMessage = textBody || errorMessage;
                } catch (textErr) {}
                errorMessage = errorMessage || `HTTP error ${response.status}: Failed to parse error body.`;
            }

            const error: ApiError = new Error(errorMessage);
            error.status = response.status;
            error.data = errorData ?? undefined; // Assign errorData or undefined
            console.error("API Error Data:", errorData);
            throw error;
        }

        if (response.status === 204) {
            return {}; 
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API: Network or other error fetching ${url}:`, error);
        if (error instanceof Error && 'status' in error) {
            throw error; 
        } else if (error instanceof Error) {
             const networkError: ApiError = new Error(`Network error: ${error.message}`);
             networkError.status = undefined; 
             throw networkError; 
        } else {
            throw new Error(`An unknown error occurred: ${error}`);
        }
    }
}

// --- API Functions ---

export async function login(username: string, password: string): Promise<LoginResponse> {
    console.log('API: Attempting login...');
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
    };

    // Use type assertion as apiFetch returns Promise<any>
    const data = await apiFetch('/api/login', options) as LoginResponse; 
    console.log('API: Login response:', data);
    if (!data.authenticated) {
        const error: ApiError = new Error(data.errors?.__all__?.join(', ') || 'Invalid credentials.');
        error.status = 401; 
        error.data = data;
        throw error;
    }
    return data;
}

export async function logout(): Promise<LogoutResponse> {
    console.log('API: Logging out...');
    const data = await apiFetch('/api/logout', { method: 'POST' }) as LogoutResponse;
    console.log('API: Logout response:', data);
    return data;
}

export async function getFeeds(): Promise<FeedResponse> {
    console.log('API: Fetching feeds...');
    const data = await apiFetch('/reader/feeds?include_favicons=true') as FeedResponse;
    console.log('API: Received feeds:', Object.keys(data.feeds || {}).length);
    return data;
}

export async function checkAuth(): Promise<boolean> {
    console.log('API: Checking auth status...');
    try {
        await getFeeds();
        console.log('API: Auth check successful (getFeeds succeeded).');
        return true;
    } catch (error) {
        const apiError = error as ApiError;
        console.log('API: Auth check failed:', apiError.status, apiError.message);
        if (apiError.status === 401) {
            return false;
        }
        throw apiError;
    }
}

// Return Story[] instead of StoryMap for easier sorting/handling
export async function getStoriesForFeed(feedId: string | number | null): Promise<Story[]> { // Allow null for test validation
    if (!feedId) {
        throw new Error("Feed ID is required to fetch stories.");
    }
    console.log(`API: Fetching stories for feed ${feedId}...`);
    const data = await apiFetch(`/reader/feed/${feedId}`) as StoryResponse;
    const storiesMap = data.stories || {};
    const storiesArray = Object.values(storiesMap);
    console.log(`API: Received stories for feed ${feedId}:`, storiesArray.length);
    storiesArray.sort((a, b) => new Date(b.story_date).getTime() - new Date(a.story_date).getTime());
    return storiesArray;
}