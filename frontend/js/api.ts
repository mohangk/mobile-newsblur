// frontend/js/api.ts
// Define types directly here for now, or create a types.ts file later

// Import shared types from the new types file
import type {
    BaseResponse,
    ApiError,
    FeedResponse,
    Story, // Add back Story as it IS used directly
    StoryResponse
} from './types';

// --- API Configuration ---
const BASE_URL = 'http://localhost:8787'; 

// --- Type Definitions (Keep API-specific ones here) ---

/** Structure specific to the /api/login response */
interface LoginResponse extends BaseResponse {
    authenticated: boolean; 
}

/** Structure specific to the /api/logout response */
interface LogoutResponse extends BaseResponse {}

// --- Helper: apiFetch ---

/**
 * Base fetch function for API calls.
 * @param {string} endpoint - The API endpoint (without /proxy prefix).
 * @param {RequestInit} [options={}] - Optional fetch options.
 * @returns {Promise<any>} - A promise that resolves to the parsed JSON response.
 * @throws {ApiError} - Throws an error with status and message if the API call fails.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
            let errorData: BaseResponse | any = null;
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

            const error: ApiError = new Error(errorMessage) as ApiError;
            error.status = response.status;
            error.data = errorData;
            console.error('API Error Data:', error.data); // Log data for debugging
            throw error;
        }

        if (response.status === 204) {
            return {} as T; 
        }
        
        return await response.json() as T;
    } catch (error: unknown) {
        console.error(`API: Network or other error fetching ${url}:`, error);
        // Re-throw as ApiError or a generic error if it's not already one
        if (error instanceof Error && 'status' in error) {
            throw error; // It's already our ApiError or similar
        }
        const genericError: ApiError = new Error('Network error or unexpected issue') as ApiError;
        genericError.data = { message: (error instanceof Error) ? error.message : String(error) };
        throw genericError;
    }
}

// --- API Functions ---

/** Performs user login */
export async function login(username: string, password?: string): Promise<LoginResponse> {
    console.log('API: Attempting login...');
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password || '');

    const options: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
    };

    // Use type assertion as apiFetch returns Promise<any>
    const data = await apiFetch<LoginResponse>(`/api/login`, options); 
    console.log('API: Login response:', data);
    if (!data.authenticated) {
        // Access optional message from BaseResponse structure
        const errorMessage = (data as BaseResponse).message || 'Login failed due to unknown reasons.';
        throw new Error(errorMessage);
    }
    return data;
}

/** Performs user logout */
export async function logout(): Promise<LogoutResponse> {
    console.log('API: Logging out...');
    const data = await apiFetch<LogoutResponse>(`/api/logout`, { method: 'POST' });
    console.log('API: Logout response:', data);
    return data;
}

/** Fetches the list of feeds and folders */
export async function getFeeds(): Promise<FeedResponse> {
    console.log('API: Fetching feeds...');
    const data = await apiFetch<FeedResponse>(`/reader/feeds?include_favicons=true`);
    console.log('API: Received feeds:', Object.keys(data.feeds || {}).length);
    return data;
}

/** Checks if the user is currently authenticated */
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

/** Fetches stories for a specific feed */
export async function getStoriesForFeed(feedId: string | number): Promise<Story[]> {
    if (!feedId) {
        throw new Error("Feed ID is required to fetch stories.");
    }
    console.log(`API: Fetching stories for feed ${feedId}...`);
    // Request stories ordered by newest, but still sort client-side for safety
    const data = await apiFetch<StoryResponse>(`/reader/feed/${feedId}?order=newest`);
    const storiesMap = data.stories || {};
    const storiesArray = Object.values(storiesMap);
    // Explicitly sort client-side because Object.values() does not guarantee order
    // preservation when converting the API's story map object to an array.
    // This ensures newest stories appear first, regardless of JS engine behavior.
    storiesArray.sort((a: Story, b: Story) => { // Explicitly type a and b
        // Handle potential undefined or null dates if necessary, though API should provide them
        const dateA = new Date(a.story_date).getTime();
        const dateB = new Date(b.story_date).getTime();
        return dateB - dateA; // Descending order
    });
    console.log(`API: Received stories for feed ${feedId}:`, storiesArray.length);
    return storiesArray;
}