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
Create announcement.

### `GET /api/alumni-manager/community/posts`
Community feed.


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
