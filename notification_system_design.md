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
