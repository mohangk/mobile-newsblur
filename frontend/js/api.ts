// frontend/js/api.ts
// Define types directly here for now, or create a types.ts file later

// Import shared types from the new types file
import {
    BaseResponse,
    ApiError,
    FeedResponse,
    Story,
    StoryResponse,
    Feed,
    FeedMap,
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
export async function getStoriesForFeed(feedId: string): Promise<Story[]> {
    if (!feedId) {
        throw new Error("Feed ID is required to fetch stories.");
    }
    console.log(`API: Fetching stories for feed ${feedId} using apiFetch...`);
    // Use apiFetch with the original endpoint and response type
    // StoryResponse now correctly defines stories as Story[]
    const data = await apiFetch<StoryResponse>(`/reader/feed/${feedId}?order=newest`);
    
    // No need to convert map to array anymore
    const storiesArray: Story[] = data.stories || []; 
    
    // Keep client-side sorting
    storiesArray.sort((a: Story, b: Story) => { 
        const dateA = new Date(a.story_date).getTime();
        const dateB = new Date(b.story_date).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    console.log(`API: Received and processed stories for feed ${feedId}:`, storiesArray.length);
    return storiesArray;
}
