# Stage 1

## Notification System API Design

So basically the frontend dev needs APIs to show notifications to logged-in users. The platform handles 3 types of notifications - Placements, Events, and Results.

### Auth

Every request needs a Bearer token in the header:
```
Authorization: Bearer <access_token>
```

### What the platform needs to support

- Users should be able to see all their notifications
- They should be able to filter by type (placement/event/result)
- Mark notifications as read (single or all at once)
- Get count of unread ones (for the badge on UI)
- Get real-time updates when new notifications come in

---

### Endpoints

**GET /notifications**

Gets all notifications for the logged in user. Supports pagination and filtering.

Query params:
- `page` - page number (default 1)
- `limit` - how many per page (default 10)  
- `notification_type` - filter by "Event", "Result", or "Placement"
- `time` - get notifications from this date

Response:
```json
{
  "notifications": [
    {
      "id": "d16d951a-d686-4a34-9e69-3908a14576bc",
      "type": "Result",
      "message": "mid-sem",
      "timestamp": "2026-04-22 17:51:30",
      "isRead": false
    },
    {
      "id": "d283218f-ea53-4b7c-93a9-1f2f2246d4b0",
      "type": "Placement",
      "message": "Amazon Gen AI hiring",
      "timestamp": "2026-04-22 17:51:18",
      "isRead": false
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50
  }
}
```

---

**GET /notifications/:id**

Get one notification by id.

Returns 404 if not found:
```json
{ "error": "Notification not found" }
```

---

**PATCH /notifications/:id/read**

Marks one notification as read.

```json
{ "message": "Notification marked as read", "id": "d16d951a-..." }
```

---

**PATCH /notifications/read-all**

Marks everything as read for the current user.

```json
{ "message": "All notifications marked as read", "updatedCount": 12 }
```

---

**GET /notifications/unread/count**

Just returns how many unread notifications the user has. Frontend can use this for the notification bell badge.

```json
{ "unreadCount": 12 }
```

---

### Notification Object Structure

```json
{
  "id": "uuid string",
  "type": "Event | Result | Placement",
  "message": "string",
  "timestamp": "datetime string",
  "isRead": true/false
}
```

### Headers

Request side:
- `Authorization: Bearer <token>` (always required)
- `Content-Type: application/json` (for PATCH requests)

Response always comes back as `application/json`.

---

### Real-time Notifications - SSE (Server-Sent Events)

For pushing new notifications to users in real-time, I'm going with SSE instead of WebSockets. Reason being - notifications only flow from server to client, we dont need bidirectional communication. SSE is simpler, works over normal HTTP, and browsers handle reconnection automatically with EventSource API.

**Endpoint:**
```
GET /notifications/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

The server keeps the connection open and pushes new notifications as they arrive:
```
event: notification
data: {"id":"abc123","type":"Placement","message":"Google hiring drive","timestamp":"2026-04-22T18:00:00Z","isRead":false}
```

On the frontend side:
```javascript
const source = new EventSource('/notifications/stream');
source.addEventListener('notification', (e) => {
  const notif = JSON.parse(e.data);
  // add to notification list, update badge count etc
});
```

This way users dont need to refresh to see new notifications.

---

### Error handling

Standard HTTP status codes:
- 400 - bad request (wrong params)
- 401 - token missing or expired
- 404 - notification not found
- 500 - server error

Error format:
```json
{ "error": "description of what went wrong" }
```

---

# Stage 2

## Storage

Going with **PostgreSQL** - data is relational (students have notifications, notifications have types), we need proper filtering and sorting, and postgres handles enums and indexes well.

### Schema

```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    roll_no VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notif_student ON notifications(student_id, is_read, created_at DESC);
```

### Scaling problems

As data grows (millions of rows) - full table scans get slow, OFFSET pagination becomes expensive, bulk inserts can cause locks. Solutions: composite indexes (already added above), table partitioning by month, cursor-based pagination instead of offset.

### Queries

```sql
-- get notifications for a student (paginated)
SELECT id, type, message, is_read, created_at FROM notifications
WHERE student_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- filter by type
SELECT id, type, message, is_read, created_at FROM notifications
WHERE student_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4;

-- unread count
SELECT COUNT(*) FROM notifications WHERE student_id = $1 AND is_read = false;

-- mark as read
UPDATE notifications SET is_read = true WHERE id = $1 AND student_id = $2;

-- mark all read
UPDATE notifications SET is_read = true WHERE student_id = $1 AND is_read = false;

-- bulk insert (notify all students)
INSERT INTO notifications (student_id, type, message)
SELECT id, $1, $2 FROM students;
```

---

# Stage 3

## Query Analysis

The given query:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

**Why its slow:** With 50k students and 5M notifications, this does a full table scan if theres no index on (studentID, isRead, createdAt). `SELECT *` also fetches all columns which is wasteful. And ordering by createdAt ASC without an index means the DB has to sort all matching rows in memory.

**What to fix:**
- Dont use `SELECT *`, only pick columns you need
- Add a composite index: `CREATE INDEX idx_student_unread ON notifications(studentID, isRead, createdAt);`
- This lets the DB jump directly to the right student's unread notifications in sorted order

**Should we index every column?** No thats bad advice. Each index takes up storage and slows down INSERT/UPDATE operations since the DB has to maintain all those indexes. Only index columns that are actually used in WHERE/ORDER BY clauses of frequent queries.

**Query - students who got placement notification in last 7 days:**
```sql
SELECT DISTINCT student_id FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## Performance - DB getting overwhelmed

Problem: notifications are fetched on every single page load for every student. Thats way too many DB hits.

**Solutions:**

1. **Redis caching** - cache each student's recent notifications in Redis with a TTL of like 2-3 minutes. On page load hit Redis first, only go to DB on cache miss. Tradeoff: slight delay in seeing brand new notifications (max 2-3 min stale).

2. **SSE for new ones** - instead of polling the DB on every page load, use the SSE stream from Stage 1. Frontend loads notifications once and then listens for new ones via SSE. This massively reduces DB reads.

3. **Unread count cache** - store unread count in Redis, increment on new notification, decrement on mark-read. Avoids running COUNT(*) every time.

4. **Pagination** - dont load all notifications at once. Load first 10-20, let user scroll/click for more. Less data per request = less DB strain.

Basically the strategy is: cache aggressively, push updates via SSE instead of polling, and paginate everything.

---

# Stage 5

## Bulk Notify All - Redesign

The pseudocode given:
```
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

**Problems with this:**
- Its synchronous and sequential - 50k iterations one by one will take forever
- If email fails midway (like it did for 200 students), everything after that is lost with no retry
- Email API is an external call - its slow and unreliable, shouldnt be in the main loop
- If the server crashes at iteration 30k, we dont know which ones succeeded
- DB insert and email shouldnt be coupled - if email fails the notification should still be saved

**For the 200 failed emails:** We need a dead letter queue / failed jobs table. Track which student_ids failed and retry them separately.

**Redesigned approach:**
```
function notify_all(student_ids, message):
    // 1. bulk insert all notifications to DB first (one query)
    bulk_insert_notifications(student_ids, message)
    
    // 2. push jobs to a message queue for async processing
    for student_id in student_ids:
        queue.push({
            student_id: student_id,
            message: message,
            tasks: ['email', 'push_notification']
        })

// separate workers process the queue
worker.on('job', (job) => {
    try:
        send_email(job.student_id, job.message)
    catch:
        retry_queue.push(job)  // retry later
    
    push_to_app(job.student_id, job.message)
})
```

Key changes:
- DB insert happens in bulk first (one SQL query, fast)
- Email and push notifications are async via a message queue (like RabbitMQ or Redis Bull)
- Failed emails go to a retry queue instead of being lost
- Workers can process jobs in parallel (multiple workers = faster)
- DB save and email are decoupled - notification exists in DB regardless of email success
