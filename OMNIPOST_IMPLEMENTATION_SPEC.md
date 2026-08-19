# OmniPost Studio — Implementation Specification

## 1. Project Overview

OmniPost Studio is a minimalist centralized social media publishing platform.

The system allows a user to:

1. Create an account and log in.
2. Connect supported social media accounts.
3. Create a post containing text and media.
4. Upload media using ImageKit.
5. Select one or multiple connected social accounts.
6. Publish the post immediately.
7. Schedule the post for a future date/time.
8. Track publication status separately for each selected social account.
9. View post history.
10. Retry failed publications.
11. View scheduled posts through a simple calendar.
12. View basic dashboard statistics.

The project must remain intentionally simple and suitable for a university project and demonstration.

---

# 2. Important Scope Rule

DO NOT turn OmniPost Studio into a full enterprise social media management platform.

The following features are OUT OF SCOPE:

- AI content generation
- AI content improvement
- AI captions
- AI hashtag generation
- AI recommendations
- Advanced analytics
- Social listening
- Social inbox
- Comment management
- Campaign management
- Team collaboration
- Complex workspaces
- Enterprise permissions
- Billing/subscriptions
- Content suggestions
- Sentiment analysis
- Advanced reporting
- Complex automation workflows

The core project is:

> Create → Select accounts → Publish/Schedule → Track

---

# 3. Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- React Hook Form
- Zod
- Lucide React

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- Zod validation

## Infrastructure

- Redis
- BullMQ
- ImageKit

## Social APIs

- Facebook
- Instagram
- LinkedIn

## Development

Use environment variables for all secrets and external service credentials.

---

# 4. Architecture

```text
                         ┌─────────────────────┐
                         │   React + Vite      │
                         │   Tailwind CSS      │
                         └──────────┬──────────┘
                                    │
                              REST API
                                    │
                         ┌──────────▼──────────┐
                         │ Node.js + Express   │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌──────────┐          ┌──────────┐         ┌──────────┐
        │ MongoDB  │          │ ImageKit │         │  Redis   │
        └──────────┘          └──────────┘         └────┬─────┘
                                                        │
                                                     BullMQ
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Publishing Worker│
                                              └────────┬─────────┘
                                                       │
                                              Publishing Service
                                                       │
                            ┌──────────────────────────┼─────────────────────┐
                            │                          │                     │
                            ▼                          ▼                     ▼
                       Facebook                  Instagram              LinkedIn
                            │                          │                     │
                            └──────────────────────────┼─────────────────────┘
                                                       │
                                                       ▼
                                               Publication Results
                                                       │
                                                       ▼
                                                    MongoDB
```

---

# 5. Important Architectural Rule

The Express API and publishing worker must be separate processes.

Example:

```text
npm run server
npm run worker
```

The API server handles:

* Authentication
* CRUD
* OAuth
* Post creation
* Scheduling
* Media authentication
* Dashboard data

The worker handles:

* Publishing jobs
* Scheduled jobs
* Retries
* Token refresh when required
* Updating publication results

---

# 6. Redis Requirement

Redis is a real dependency of the scheduling system.

DO NOT silently replace Redis/BullMQ with an in-memory or fake scheduler when Redis is unavailable.

If Redis is unavailable:

```text
Redis connection failed
```

must be reported clearly.

Do not create different scheduling behavior depending on whether Redis is available.

For local development, the developer should run a real Redis instance.

---

# 7. Mock Social Provider

A mock provider MAY be implemented for development/testing.

Structure:

```text
server/providers/social/

├── SocialProvider.js
├── FacebookProvider.js
├── InstagramProvider.js
├── LinkedInProvider.js
└── MockProvider.js
```

The mock provider is ONLY for testing.

It must not replace the real scheduling system.

---

# 8. Social Provider Abstraction

All social platforms must follow a common interface.

Example conceptual interface:

```javascript
class SocialProvider {
    connect() {}
    getAccounts() {}
    publishPost() {}
    uploadMedia() {}
    refreshToken() {}
    disconnect() {}
}
```

Each provider implements the required methods.

```text
SocialProvider
      │
      ├── FacebookProvider
      ├── InstagramProvider
      ├── LinkedInProvider
      └── MockProvider
```

The PublishingService must not contain platform-specific API logic.

---

# 9. Social Platform Implementation Order

DO NOT implement all platforms simultaneously.

Implement them sequentially.

## Phase 1

Facebook

Complete:

```text
OAuth
 ↓
Connect Account
 ↓
Create Post
 ↓
ImageKit Media
 ↓
Publish
 ↓
Track Result
```

## Phase 2

Instagram

Complete the same flow.

## Phase 3

LinkedIn

Complete the same flow.

Only after each individual platform works should multi-platform publishing be finalized.

---

# 10. Social API Requirements

Do not use outdated tutorials or invented API endpoints.

Before implementing each provider:

1. Verify the current official API documentation.
2. Verify current OAuth requirements.
3. Verify required permissions/scopes.
4. Verify supported account types.
5. Verify media requirements.
6. Verify token expiration/refresh behavior.
7. Verify current publishing endpoints.

If an API requirement has changed, update the implementation accordingly.

---

# 11. Database Models

## User

```javascript
{
    name,
    email,
    passwordHash,
    timezone,
    createdAt,
    updatedAt
}
```

---

## SocialAccount

```javascript
{
    userId,
    platform,
    externalAccountId,
    accountName,
    username,
    accessToken,
    refreshToken,
    expiresAt,
    status,
    metadata,
    createdAt,
    updatedAt
}
```

Sensitive OAuth tokens must:

* Never be returned to the frontend.
* Never appear in logs.
* Never be included in normal API responses.
* Be encrypted at rest where practical.

The React application must never receive raw access/refresh tokens.

---

# 12. Post Model

Keep the model simple.

```javascript
{
    userId,
    content,
    media: [
        {
            url,
            fileId,
            fileName,
            type
        }
    ],
    platforms,
    status,
    scheduledAt,
    timezone,
    createdAt,
    updatedAt
}
```

Possible status values:

```text
draft
scheduled
publishing
published
partially_published
failed
cancelled
```

---

# 13. PostPublication Model

Every selected social account gets its own publication record.

```javascript
{
    postId,
    socialAccountId,
    platform,
    status,
    externalPostId,
    errorCode,
    errorMessage,
    retryCount,
    lastAttemptAt,
    publishedAt,
    createdAt,
    updatedAt
}
```

Possible statuses:

```text
pending
publishing
published
failed
cancelled
```

This allows one post to have different results:

```text
Post #123

Facebook     ✓ Published
Instagram    ✓ Published
LinkedIn     ✗ Failed
```

The overall post status must be calculated from the publication results.

---

# 14. ImageKit

ImageKit is the media storage solution.

Preferred flow:

```text
React
   │
   │ request upload authentication
   ▼
Express
   │
   ▼
ImageKit authentication parameters
   │
   ▼
React
   │
   │ direct upload
   ▼
ImageKit
   │
   ▼
Media URL
   │
   ▼
MongoDB Post.media
```

Do not build a custom file-storage system.

Do not store large binary media files inside MongoDB.

---

# 15. Publishing Flow — Immediate

When a user selects "Publish Now":

```text
React
 ↓
POST /api/posts
 ↓
Express
 ↓
Validate request
 ↓
Create Post
 ↓
Create PostPublication records
 ↓
Queue publication jobs
 ↓
Return response
```

Worker:

```text
BullMQ
 ↓
Publishing Worker
 ↓
PublishingService
 ↓
Select provider
 ↓
Publish
 ↓
Update PostPublication
 ↓
Update Post status
```

The HTTP request must not remain open while waiting for social APIs.

---

# 16. Scheduling Flow

When a user schedules a post:

```text
React
 ↓
POST /api/posts/schedule
 ↓
Express
 ↓
Validate date/time
 ↓
Convert scheduled time to UTC
 ↓
Save Post
 ↓
Create PostPublication records
 ↓
Create BullMQ delayed job
 ↓
Return success
```

At scheduled time:

```text
Redis
 ↓
BullMQ
 ↓
Publishing Worker
 ↓
PublishingService
 ↓
Social Provider
 ↓
Social API
 ↓
Update MongoDB
```

Store scheduled timestamps consistently in UTC.

Display them in the user's configured timezone.

---

# 17. Retry Logic

Keep retry behavior simple.

Maximum automatic retries:

```text
3
```

Example:

```text
Attempt 1
   ↓
Failed
   ↓
Retry
   ↓
Attempt 2
   ↓
Failed
   ↓
Retry
   ↓
Attempt 3
   ↓
Failed
   ↓
Mark Failed
```

Manual retry must only retry failed publications.

Example:

```text
Facebook     Published
Instagram    Failed
LinkedIn     Published
```

Retry:

```text
Instagram ONLY
```

Do not republish successful platforms.

---

# 18. Duplicate Protection

The system must prevent accidental duplicate publication.

Before publishing:

```text
Check PostPublication.status
```

If:

```text
published
```

do not publish again.

This is especially important when workers retry jobs.

---

# 19. REST API

Use clean REST endpoints.

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Social Accounts

```text
GET    /api/social-accounts
GET    /api/social-accounts/:platform/connect
GET    /api/social-accounts/:platform/callback
DELETE /api/social-accounts/:id
```

## Posts

```text
POST   /api/posts
GET    /api/posts
GET    /api/posts/:id
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/posts/:id/publish
POST   /api/posts/:id/schedule
POST   /api/posts/:id/reschedule
POST   /api/posts/:id/cancel
POST   /api/posts/:id/retry
```

## Media

```text
GET /api/media/auth
```

## Dashboard

```text
GET /api/dashboard/stats
```

---

# 20. Frontend Pages

Keep the frontend simple.

```text
/
├── Login
├── Register
│
└── Dashboard
    ├── Dashboard
    ├── Create Post
    ├── Posts
    ├── Calendar
    ├── Accounts
    └── Settings
```

---

# 21. Dashboard

Show only basic statistics:

```text
Total Posts
Scheduled
Published
Failed
Connected Accounts
```

Also show:

```text
Upcoming Posts
Recent Posts
```

Do NOT implement advanced analytics.

---

# 22. Create Post Page

This is the primary feature of the application.

Required fields:

```text
Post content
Media upload
Target accounts
Publish Now / Schedule
Date
Time
```

Example:

```text
Create Post

┌──────────────────────────────────────┐
│ Write your post...                   │
│                                      │
│                                      │
└──────────────────────────────────────┘

Media
[ Upload Image/Video ]

Publish to:

☑ Facebook
☑ Instagram
☐ LinkedIn

○ Publish Now
○ Schedule

Date: __________
Time: __________

[ Publish ]   [ Schedule ]
```

---

# 23. Posts Page

Provide:

```text
All
Drafts
Scheduled
Published
Failed
Cancelled
```

Each post should show:

```text
Content preview
Media preview
Platforms
Scheduled time
Status
Created date
```

Actions:

```text
View
Edit
Delete
Cancel
Retry
```

Only display actions that make sense for the current status.

---

# 24. Calendar

The calendar is a simple visualization of scheduled posts.

Required:

* Monthly view
* Scheduled posts
* Click post to view details
* Reschedule
* Cancel

Do not build an advanced calendar system.

---

# 25. Accounts Page

Show:

```text
Facebook
Instagram
LinkedIn
```

For each:

```text
Connected / Not Connected
Account name
Username
Connect
Disconnect
```

Never display OAuth access tokens.

---

# 26. Authentication

Use JWT-based authentication.

Protected backend routes require authentication.

Password requirements:

* Hash passwords using a secure password hashing algorithm.
* Never store plaintext passwords.
* Never return password hashes to the frontend.

Authentication errors should return appropriate HTTP status codes.

---

# 27. Validation

Use Zod for request validation.

Validate:

* Email
* Password
* Post content
* Media
* Platforms
* Scheduled date/time
* IDs
* Pagination/filter parameters

Never trust client-side validation alone.

---

# 28. Error Handling

Use centralized Express error handling.

Response format should be consistent.

Example:

```json
{
    "success": false,
    "message": "Unable to publish post",
    "code": "PUBLISH_FAILED"
}
```

Do not expose:

* Stack traces
* Access tokens
* Passwords
* Internal secrets

in production responses.

---

# 29. Logging

Use structured logging.

Log useful information such as:

```text
User ID
Post ID
Publication ID
Platform
Job ID
Status
Error code
```

Never log:

```text
Passwords
JWT secrets
OAuth access tokens
OAuth refresh tokens
ImageKit private keys
```

---

# 30. Project Structure

Recommended:

```text
omnipost-studio/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── lib/
│   │   └── App.jsx
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── publishing/
│   │   │   └── scheduling/
│   │   ├── providers/
│   │   │   └── social/
│   │   ├── queues/
│   │   ├── utils/
│   │   └── app.js
│   │
│   ├── worker/
│   │   └── publishingWorker.js
│   │
│   └── package.json
│
├── .env.example
├── README.md
└── package.json
```

---

# 31. Environment Variables

Create `.env.example`.

Example:

```env
NODE_ENV=development

PORT=5000

MONGODB_URI=

JWT_SECRET=

REDIS_URL=

IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=

INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_REDIRECT_URI=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=
```

Never commit the real `.env` file.

---

# 32. Development Mode

Development should support:

```text
Real MongoDB
Real Redis
Real ImageKit
Mock Social Provider
```

This allows the complete application flow to be tested without requiring live social API credentials.

Example:

```text
Create Post
 ↓
ImageKit
 ↓
Mock Facebook
 ↓
Mock Instagram
 ↓
Mock LinkedIn
 ↓
Publication tracking
```

The scheduler remains REAL.

Only the external social API can be mocked.

---

# 33. Implementation Order

Do not implement everything simultaneously.

Follow this exact order.

## Phase 1 — Project Setup

* Monorepo structure
* Client
* Server
* Environment configuration
* MongoDB connection
* Basic Express server

## Phase 2 — Authentication

* Register
* Login
* Logout
* JWT
* Protected routes
* Current user

## Phase 3 — Basic UI

* Sidebar
* Dashboard
* Create Post
* Posts
* Accounts
* Calendar
* Settings

## Phase 4 — Posts

* Create
* Read
* Update
* Delete
* Drafts

## Phase 5 — ImageKit

* ImageKit authentication
* Direct upload
* Media preview
* Store media metadata

## Phase 6 — Facebook

Implement completely:

```text
OAuth
 ↓
Account
 ↓
Post
 ↓
Publish
 ↓
Publication tracking
```

## Phase 7 — Instagram

Implement the same flow.

## Phase 8 — LinkedIn

Implement the same flow.

## Phase 9 — Multi-account publishing

Example:

```text
One Post

☑ Facebook
☑ Instagram
☑ LinkedIn
```

Create one `PostPublication` per selected account.

## Phase 10 — Redis + BullMQ

Implement:

* Queue
* Worker
* Immediate jobs
* Delayed jobs

## Phase 11 — Scheduling

Implement:

* Schedule
* Reschedule
* Cancel
* Timezone conversion

## Phase 12 — Retry

Implement:

* Automatic retries
* Manual retry
* Per-platform retry

## Phase 13 — Calendar

Implement:

* Monthly view
* Scheduled posts
* Reschedule
* Cancel

## Phase 14 — Dashboard

Implement:

* Total posts
* Scheduled
* Published
* Failed
* Connected accounts
* Recent activity
* Upcoming posts

## Phase 15 — Testing

Test all critical flows.

---

# 34. Testing Requirements

## Authentication

```text
Register
Login
Logout
Protected route
Invalid credentials
Duplicate email
```

## Posts

```text
Create draft
Edit draft
Delete draft
Publish
Schedule
Cancel
```

## ImageKit

```text
Upload
Preview
Store URL
```

## Publishing

```text
One platform
Multiple platforms
Successful publication
Failed publication
Partial publication
Duplicate protection
```

## Scheduling

```text
Schedule
Wait for job
Worker executes
Publication occurs
Status updates
```

## Retry

```text
Facebook published
Instagram failed
LinkedIn published

Retry

Only Instagram executes
```

## Timezone

Verify:

```text
User timezone
        ↓
Convert to UTC
        ↓
Store UTC
        ↓
Worker executes at correct time
        ↓
Display in user's timezone
```

---

# 35. Definition of Done

OmniPost Studio is considered complete when a user can perform this complete flow:

```text
Register
   ↓
Login
   ↓
Connect social account
   ↓
Create post
   ↓
Upload media using ImageKit
   ↓
Select multiple accounts
   ↓
Publish immediately
   ↓
See publication result per account
```

AND:

```text
Create Post
   ↓
Select accounts
   ↓
Choose future date/time
   ↓
Schedule
   ↓
BullMQ delayed job
   ↓
Redis
   ↓
Publishing Worker
   ↓
Social Provider
   ↓
Social API
   ↓
Publication Result
   ↓
Dashboard/Post History
```

This complete flow is the primary success criterion.

---

# 36. Open-Source Reference Policy

Postiz and other open-source social media management projects may be used as architectural references.

DO NOT copy Postiz source code into OmniPost Studio unless the project is intentionally being distributed under and in compliance with the applicable AGPL-3.0 requirements.

The goal is to independently implement the simplified OmniPost Studio architecture.

Do not copy proprietary assets, branding, UI, logos, or project identity.

---

# 37. Design Philosophy

OmniPost Studio should be:

* Minimal
* Clean
* Fast
* Easy to understand
* Easy to demonstrate
* Easy to defend
* Modular
* Secure

Avoid unnecessary complexity.

When two solutions are possible, prefer the simpler solution that satisfies the requirement.

---

# 38. Final Feature Boundary

## IN SCOPE

```text
✓ Authentication
✓ Social account connection
✓ Facebook
✓ Instagram
✓ LinkedIn
✓ Text posts
✓ Image/video media
✓ ImageKit
✓ Multiple account selection
✓ Immediate publishing
✓ Scheduled publishing
✓ Redis
✓ BullMQ
✓ Publishing worker
✓ Publication tracking
✓ Basic retry
✓ Post history
✓ Calendar
✓ Basic dashboard
```

## OUT OF SCOPE

```text
✗ AI
✗ AI content generation
✗ AI content improvement
✗ AI captions
✗ Advanced analytics
✗ Social inbox
✗ Comments
✗ Social listening
✗ Campaigns
✗ Teams
✗ Enterprise permissions
✗ Billing
✗ Advanced automation
✗ Sentiment analysis
✗ Content recommendations
```

---

# 39. Final Instruction to the Coding Agent

Build OmniPost Studio according to this specification.

Do not introduce additional features without explicit approval.

Do not replace Redis/BullMQ with an in-memory scheduler.

Do not expose OAuth tokens to the frontend.

Do not implement all social providers simultaneously; complete each provider end-to-end before moving to the next.

Do not copy source code from AGPL-licensed projects unless explicitly instructed to create an AGPL-compliant derivative.

Keep the architecture modular and simple.

Prioritize a working end-to-end publishing and scheduling flow over advanced UI or additional features.

At the end of every implementation phase:

1. Run the application.
2. Run relevant tests.
3. Fix errors.
4. Verify the feature manually.
5. Update documentation.
6. Do not proceed to the next major phase until the current phase works.

The final goal is a stable, minimalist MERN-based social media publishing platform called:

# OmniPost Studio
