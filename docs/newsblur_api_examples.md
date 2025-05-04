# Sample API Requests & Responses (via Proxy Worker)

This document shows examples of interacting with the backend proxy worker (`http://localhost:8787`) using `curl`.

**Note:** These requests require a valid `proxy_session_id` cookie obtained after logging in through the frontend application. Replace `<cookie_value>` with your actual cookie value.

## Fetching Stories for a Feed

This corresponds to the `getStoriesForFeed()` function in `frontend/js/api.ts`. Based on our `curl` tests, the response from `/reader/feed/<feed_id>` includes the full content for each story within the `stories` array.

### Request

Replace `<cookie_value>` and `<feed_id>` (e.g., `7693011`). The `-i` flag includes headers in the output, and `| cat` prevents paging.

```sh
curl -i --cookie "proxy_session_id=<cookie_value>" http://localhost:8787/proxy/reader/feed/<feed_id> | cat
```

**Example using provided data:**

```sh
curl -i --cookie "proxy_session_id=fb27810a-369a-4d43-a169-4ce25acb138a" http://localhost:8787/proxy/reader/feed/7693011 | cat
```

### Example Response (JSON Body - Structure & Sample Data)

The actual response starts with HTTP headers, followed by the JSON body shown below. The `stories` array contains the detailed story objects.

```json
{
  "stories": [
    {
      "id": "7693011:320513",
      "story_hash": "7693011:320513",
      "read_status": 0,
      "starred_status": 0,
      "starred_timestamp": 0,
      "share_count": 0,
      "comment_count": 0,
      "intelligence": {
        "feed": 0,
        "author": 0,
        "tags": 0,
        "title": 0
      },
      "short_parsed_date": "2 days ago",
      "long_parsed_date": "Wed May 15, 2024 8:43 AM PDT",
      "story_tags": [],
      "story_timestamp": 1715787780,
      "source_user_id": null,
      "shared_by_friends": [],
      "shared_by_public": [],
      "commented_by_friends": [],
      "share_user_ids": [],
      "reply_count": 0,
      "user_tags": [],
      "story_authors": "Simon Willison",
      "story_title": "Stuff I wrote in April 2024",
      "story_permalink": "https://simonwillison.net/2024/May/15/april-links/",
      "story_content": "<p>April was another busy month...</p>\n<p>I released Datasette 1.0 alpha 7...</p>\n<!-- Full HTML content here -->",
      "story_date": "2024-05-15T15:43:00Z"
    },
    {
      "id": "7693011:aabbcc", // Example other story
      "story_hash": "7693011:aabbcc",
      "read_status": 1,
      "story_tags": ["example", "tech"],
      "story_timestamp": 1715700000,
      "story_authors": "Another Author",
      "story_title": "Another Example Story (Read)",
      "story_permalink": "https://example.com/another-story",
      "story_content": "<p>Some other content.</p>",
      "story_date": "2024-05-14T10:00:00Z"
    }
    // ... more stories ...
  ],
  "user_profiles": [],
  "feed_tags": [],
  "feed_authors": [
    [
      "Simon Willison",
      null
    ]
  ],
  "feed_title": "Simon Willison's Weblog",
  "updated": "Wed, 15 May 2024 15:43:00 +0000",
  "link": "https://simonwillison.net/",
  "feed_address": "http://simonwillison.net/atom/everything/",
  "feed_link": "https://simonwillison.net/",
  "num_subscribers": 10318,
  "favicon_fetching": false,
  "favicon_fade": null,
  "favicon_color": null,
  "favicon_text_color": null,
  "favicon_border": null,
  "favicon_url": "https://s3.amazonaws.com/icons.newsblur.com/7693011.png",
  "feed_id": 7693011,
  "result": "ok",
  "authenticated": true
}
```