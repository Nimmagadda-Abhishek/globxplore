# GX CRM – Alumni Manager API Documentation

## 1. Authentication APIs
### `POST /api/alumni-manager/login`
```json
{
  "gxId": "GXALM123456",
  "password": "password123"
}
```

### `GET /api/alumni-manager/me`
Current profile.

### `POST /api/alumni-manager/logout`


## 2. Dashboard APIs
### `GET /api/alumni-manager/dashboard/summary`
Returns all KPI cards.

### `GET /api/alumni-manager/dashboard/activity`
Recent activity feed.


## 3. Alumni Registration APIs
### `GET /api/alumni-manager/registrations`
Pending + approved registrations.

### `GET /api/alumni-manager/registrations/:id`
Full alumni application + docs.

### `PATCH /api/alumni-manager/registrations/:id/approve`
Approve alumni.
**Auto Actions:**
- Create login account
- Generate GX ID
- Send credentials

### `PATCH /api/alumni-manager/registrations/:id/reject`
Reject with reason.


## 4. Users APIs
### `GET /api/alumni-manager/users`
All alumni users.

### `GET /api/alumni-manager/users/active-counts`
Returns the total active alumni and students in the CRM. Active means the user's `isActive` field is `true`.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeAlumni": 42,
    "activeStudents": 318,
    "totalActiveUsers": 360
  }
}
```

### `PATCH /api/alumni-manager/users/:id/status`
Activate / suspend.


## 5. Student Connect APIs
### `GET /api/alumni-manager/student-requests`
All bridge requests.

### `PATCH /api/alumni-manager/student-requests/:id/assign`
Assign alumni mentor.

### `PATCH /api/alumni-manager/student-requests/:id/resolve`
Mark resolved.


## 6. Service Request APIs
### `GET /api/alumni-manager/services/requests`
All service requests.

### `PATCH /api/alumni-manager/services/requests/:id/approve`
Approve service.

### `PATCH /api/alumni-manager/services/requests/:id/reject`
Reject request.

### `PATCH /api/alumni-manager/services/requests/:id/cost`
Modify cost.
**Request:**
```json
{
  "cost": 999
}
```


## 7. Pricing APIs
### `GET /api/alumni-manager/pricing`
Get price catalog.

### `PUT /api/alumni-manager/pricing`
Update pricing.


## 8. Payment APIs
### `GET /api/alumni-manager/payments`
All monetized service payments.

### `GET /api/alumni-manager/payments/summary`
Revenue summary.


## 9. Community APIs
### `POST /api/alumni-manager/community/announcement`
Create an announcement. Authentication is required.

**Request:**
```json
{
  "banner": "https://example.com/images/mentorship-banner.jpg",
  "title": "Alumni Mentorship Session",
  "description": "Applications for the next alumni mentorship session are now open.",
  "place": "Online",
  "date": "2026-10-15T10:00:00.000Z"
}
```

`title` and `description` are required. `banner`, `place`, and `date` are optional.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "665c1f2a9b1e2d0012345678",
    "author": "665c1f2a9b1e2d0098765432",
    "banner": "https://example.com/images/mentorship-banner.jpg",
    "title": "Alumni Mentorship Session",
    "description": "Applications for the next alumni mentorship session are now open.",
    "place": "Online",
    "date": "2026-10-15T10:00:00.000Z",
    "content": "Applications for the next alumni mentorship session are now open.",
    "type": "Announcement",
    "createdAt": "2026-09-22T10:30:00.000Z"
  }
}
```

### `PATCH /api/alumni-manager/community/announcement/:id`
Edit an existing announcement. All fields are optional in the request, but the saved announcement must contain both `title` and `description`.

**Request:**
```json
{
  "title": "Updated Alumni Mentorship Session",
  "description": "The session date and registration details have been updated.",
  "banner": "https://example.com/images/updated-banner.jpg",
  "place": "Online",
  "date": "2026-10-20T10:00:00.000Z"
}
```

The endpoint returns `404` when the ID does not belong to an announcement.

### `GET /api/alumni-manager/community/posts`
Returns all community posts, newest first. The author contains `name` and `gxId`.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "665c1f2a9b1e2d0012345678",
      "author": {
        "_id": "665c1f2a9b1e2d0098765432",
        "name": "Alumni Manager",
        "gxId": "GXALM123456"
      },
      "banner": "https://example.com/images/mentorship-banner.jpg",
      "title": "Alumni Mentorship Session",
      "description": "Applications for the next alumni mentorship session are now open.",
      "place": "Online",
      "date": "2026-10-15T10:00:00.000Z",
      "content": "Applications for the next alumni mentorship session are now open.",
      "type": "Announcement",
      "createdAt": "2026-09-22T10:30:00.000Z"
    }
  ]
}
```

### Student and Alumni Announcement Feeds
Manager announcements are available to both portal users through these authenticated endpoints:

`GET /api/student/announcements` (role: `STUDENT`)

`GET /api/alumni/announcements` (role: `ALUMNI` or `ADMIN`)

Both endpoints return the latest announcements in the same format:
```json
{
  "success": true,
  "data": [
    {
      "_id": "665c1f2a9b1e2d0012345678",
      "author": {
        "name": "Alumni Manager",
        "gxId": "GXALM123456"
      },
      "content": "Applications for the next alumni mentorship session are now open.",
      "type": "Announcement",
      "createdAt": "2026-09-22T10:30:00.000Z"
    }
  ]
}
```


## 10. Reports APIs
### `GET /api/alumni-manager/reports/export`
**Query:**
`?type=revenue&format=excel`


## Automation Rules
- **New Alumni Registration:** Notify Alumni Manager instantly.
- **Delayed Student Request > 24h:** Escalate alert.
- **Payment Success:** Mark service active.
- **No Alumni Response:** Reassign mentor.


## Security
- `authMiddleware`
- `roleMiddleware('alumni_manager')` // Note: In our current system, the role is typically 'ALUMNI_MANAGER'
- Ownership checks
- Payment verification
- File validation
- Audit logs


## Recommended Components
- `AlumniManagerDashboard.jsx`
- `RegistrationTable.jsx`
- `ServiceRequests.jsx`
- `PricingPanel.jsx`
- `RevenueCharts.jsx`
- `StudentBridgePanel.jsx`
- `CommunityFeed.jsx`
