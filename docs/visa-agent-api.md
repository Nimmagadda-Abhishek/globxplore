# GX CRM – Visa Agent Module API Documentation

## Overview
The Visa Agent module is a specialized operational system for handling visa clients from onboarding to final decision. Only approved internal operators should manage this process daily.

### Main functions:
- Admin creates Visa Agent accounts
- Visa Agents create clients
- Client login access
- DS-160 / portal credential management
- Payment links / QR via Razorpay
- Appointment & slot tracking
- Reminder automation
- Document checklist
- Biometrics / Interview workflow
- Final visa outcome tracking

## Roles
- **Admin**: Creates and manages Visa Agents.
- **Visa Agent**: Creates and manages visa clients.
- **Client**: Can login, upload docs, and track status.

## GX ID Rules
- Visa Agent → GXVA123456
- Visa Client → GXVC123456
- Login uses GX ID + password.

## Base URLs
- `/api/admin`
- `/api/visa-agent`
- `/api/client`

## Authentication
- Header: `Authorization: Bearer <token>`

## Supported Countries
Examples: USA, Canada, Germany, UK, Australia, More Countries

## Visa Types
B1, B2, B1/B2, F1, H1B, F2, H4

---

## 1. Admin APIs (Visa Agent Management)

### `POST /api/admin/visa-agents`
Create Visa Agent.
**Request**
```json
{
  "name": "Operator 1",
  "email": "visa1@mail.com",
  "phone": "9999999999"
}
```
**Auto Actions**: Generate GXVA ID, Generate password, Send credentials

### `GET /api/admin/visa-agents`
List all visa agents.

### `PATCH /api/admin/visa-agents/:id/status`
Activate / deactivate operator.

---

## 2. Visa Agent Authentication APIs

### `POST /api/visa-agent/login`
```json
{
  "gxId": "GXVA123456",
  "password": "password123"
}
```

### `POST /api/visa-agent/logout`

### `GET /api/visa-agent/me`
Current profile.

---

## 3. Dashboard APIs

### `GET /api/visa-agent/dashboard/summary`
**Returns**: Total Clients, Pending DS160, Pending Payments, Slot Monitoring Cases, Upcoming Biometrics, Upcoming Interviews, Approved, Rejected

### `GET /api/visa-agent/dashboard/alerts`
**Returns urgent actions**: 24h pending items, 48h escalation items, Payment overdue, Upcoming dates

---

## 4. Client Creation APIs

### `POST /api/visa-agent/clients`
Create visa client.
**Request**
```json
{
  "fullName": "Amit Sharma",
  "contact": "9999999999",
  "email": "amit@mail.com",
  "passport": "N1234567",
  "aadhar": "xxxx",
  "country": "USA",
  "visaType": "F1",
  "assignedAgentId": "GXVA123456",
  "cutOffDates": "Before July intake",
  "locationPriority": "Hyderabad"
}
```
**Auto Actions**: Generate GXVC ID, Generate password, Save createdOn, Create pipeline, Send login credentials, Send DS160 custom form link via WhatsApp + Email

### `GET /api/visa-agent/clients`
**Filters**: `?country=usa&visaType=f1&page=1`

### `GET /api/visa-agent/clients/:id`
Full client profile.

### `PUT /api/visa-agent/clients/:id`
Update allowed fields.

---

## 5. Client Login APIs

### `POST /api/client/login`
```json
{
  "gxId": "GXVC123456",
  "password": "password123"
}
```

### `GET /api/client/me`
Profile.

### `GET /api/client/pipeline`
Read-only status tracker.

### `POST /api/client/documents`
Upload documents.

---

## 6. DS-160 APIs

### `POST /api/visa-agent/clients/:id/ds160/create`
Create DS-160 credentials.
**Auto Actions**: Store credentials securely, Send credentials to client by email/WhatsApp

### `PATCH /api/visa-agent/clients/:id/ds160/status`
**Update**: pending, submitted

### `POST /api/visa-agent/clients/:id/ds160/pdf`
Upload submitted DS-160 PDF copy.

### `GET /api/visa-agent/clients/:id/ds160`
Fetch DS160 metadata.

---

## 7. Portal Credential APIs

### `POST /api/visa-agent/clients/:id/portal/create`
Create portal credentials.
**Auto Actions**: Save securely, Send to client

### `GET /api/visa-agent/clients/:id/portal`
Fetch metadata.

---

## 8. Payment APIs (Razorpay)

### `GET /api/visa-agent/payment/plans`
Optional service plans.

### `POST /api/visa-agent/clients/:id/payment/order`
Create Razorpay order.
**Request**
```json
{
  "amount": 15000,
  "type": "portal_fee"
}
```

### `POST /api/visa-agent/clients/:id/payment/verify`
Verify payment.
**Request**
```json
{
  "razorpay_order_id": "...",
  "razorpay_payment_id": "...",
  "razorpay_signature": "..."
}
```

### `POST /api/visa-agent/clients/:id/payment/link`
Generate payment link / QR to share with client.

### `GET /api/visa-agent/clients/:id/payments`
Payment history.

*If You See Error: "Failed to create order. Please try again later."*
**Check**: Razorpay key_id / key_secret, Amount in paise, Environment variables loaded, Razorpay account activated, Server logs, Route auth permissions, Network / webhook issues

---

## 9. Appointment APIs

### `PATCH /api/visa-agent/clients/:id/appointment/monitoring`
Mark monitoring started.

### `PATCH /api/visa-agent/clients/:id/appointment/booked`
Save slot details.
**Request**
```json
{
  "biometricDate": "2026-05-10",
  "interviewDate": "2026-05-18",
  "location": "Hyderabad"
}
```
**Auto Actions**: Send checklist docs, Notify client + visa agent

### `PATCH /api/visa-agent/clients/:id/appointment/reschedule`
Yes / No + notes.

### `PATCH /api/visa-agent/clients/:id/slot-confirmation`
Pending / Confirmed

### `POST /api/visa-agent/clients/:id/confirmation-page`
Upload confirmation page docs.

---

## 10. Reminder APIs

### `GET /api/visa-agent/reminders`
All reminders.

**Automation Rules**
- 24 Hour Delay: Notify Visa Agent.
- >48 Hour Delay: Notify Admin.
- Biometrics Reminder: From 5 days before biometric date (client, visa agent)
- Interview Reminder: 15, 7, 3, 1 days before (client, visa agent)
- Payment Pending: Repeat alerts until completed.

---

## 11. Screening APIs

### `PATCH /api/visa-agent/clients/:id/biometric-screening`
Done / Not done

### `PATCH /api/visa-agent/clients/:id/interview-screening`
Done / Not done

---

## 12. Final Decision APIs

### `PATCH /api/visa-agent/clients/:id/result`
Update: approved, not_approved

### `GET /api/visa-agent/analytics`
Returns: Approval %, Rejection %, Avg timeline, Pending load

---

## 13. Client Document Checklist APIs

### `GET /api/client/checklist`
Mandatory 10 docs checklist.

### `POST /api/client/checklist/:id/upload`
Upload item.

---

## 14. Notifications APIs

### `GET /api/visa-agent/notifications`
System alerts.

### `GET /api/client/notifications`
Client alerts.

---

## 15. Pipeline Flow
Client Created → DS160 Form Sent → DS160 Submitted → Portal Created → Portal Fee Payment → Slot Monitoring → Slot Booked → Biometrics → Interview → Decision
