/** Base structure for many API responses */
export interface BaseResponse {
    authenticated?: boolean;
    message?: string;
    // Add other common fields if they exist
}

/** Custom error class for API fetch issues */
export interface ApiError extends Error { // Interface extending Error
    status?: number;
    data?: BaseResponse | any; // Response data if available
}

/** Structure representing a single feed */
export interface Feed {
    id: number | string; // Sometimes number, sometimes string in API?
    feed_title: string;
    favicon_url: string | null;
    ps?: number; // Positive unread count
    nt?: number; // Neutral unread count
    ng?: number; // Negative unread count
    // Add other relevant feed properties
}

/** Map of feed IDs to Feed objects */
export type FeedMap = Record<string, Feed>;

/** Structure for the /reader/feeds response */
export interface FeedResponse extends BaseResponse {
    feeds: FeedMap;
    folders: any[]; // Define folder structure later if needed
}

/** Structure representing a single story */
export interface Story {
    id: string | number; // Assuming ID can be string or number
    story_title: string;
    story_permalink: string;
    story_date: string; // ISO date string
    story_content: string; // Made required based on API response
    story_authors: string; // Added based on API response
    read_status?: number; // 0 or 1
    story_hash: string; // Added based on API response (was implicitly there via StoryMap key)
    // Add other relevant story properties if needed from curl output
}

/** Structure for the /reader/feed/{feedId} response */
export interface StoryResponse extends BaseResponse {
    stories: Story[]; // Changed from StoryMap to Story[] based on API response
    // Add other relevant fields from this endpoint
} 