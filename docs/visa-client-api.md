# GX CRM – Visa Client API Documentation

## Overview
The Visa Client API provides endpoints for visa applicants to log into their portal, monitor their application status, and securely upload necessary documents. 

## Base URL
`/api/client`

## Authentication
- **Header:** `Authorization: Bearer <token>`
- **Role Requirement:** `VISA_CLIENT`

---

## 1. Authentication APIs

### `POST /api/client/login`
Authenticates a Visa Client and returns an access token.

**Request Body:**
```json
{
  "gxId": "GXVC123456",
  "password": "password123"
}
```

### `GET /api/client/me`
Retrieves the logged-in Visa Client's profile information along with their core Visa Process details.

**Response Data:**
- `user`: Account details (name, email, phone, gxId)
- `process`: The linked VisaProcess document.

---

## 2. Pipeline Tracking APIs

### `GET /api/client/pipeline`
Provides a read-only snapshot of the client's current visa pipeline and statuses.

**Response Example:**
```json
{
  "success": true,
  "data": {
    "ds160Status": "Pending",
    "paymentStatus": "Pending",
    "appointmentStatus": "Monitoring",
    "slotBookingStatus": "Pending",
    "biometricStatus": "Pending",
    "interviewStatus": "Pending",
    "approvalStatus": "Pending",
    "notes": []
  }
}
```

---

## 3. Document Management APIs

### `GET /api/client/checklist`
Retrieves the list of universally mandatory documents, along with the documents that the client has already uploaded.

**Response Example:**
```json
{
  "success": true,
  "data": {
    "required": [
      "Passport Front & Back",
      "Aadhar Card",
      "DS-160 Confirmation Page",
      "Visa Appointment Confirmation",
      "I-20 (if F1)",
      "SEVIS Fee Receipt",
      "Financial Documents",
      "Academic Transcripts",
      "Standardized Test Scores",
      "Work Experience Letters (if any)"
    ],
    "uploaded": [
      {
        "name": "Passport Front & Back",
        "url": "https://bucket-url.com/file.pdf",
        "uploadedAt": "2026-04-28T10:00:00Z"
      }
    ]
  }
}
```

### `POST /api/client/documents`
Uploads a general/miscellaneous document to the client's file vault.

**Content-Type:** `multipart/form-data`
**Form Fields:**
- `file` (File, required): The document being uploaded.
- `name` (String, optional): A custom name for the document (defaults to "General Document").

### `POST /api/client/checklist/:id/upload`
Uploads a specific required checklist document. The `:id` parameter can be used as a slug or index to tie the upload to a checklist requirement.

**Content-Type:** `multipart/form-data`
**Form Fields:**
- `file` (File, required): The document being uploaded.
- `name` (String, optional): The name of the checklist item being fulfilled.

---

## 4. Notification APIs

### `GET /api/client/notifications`
Retrieves system notifications and alerts specifically targeted to the client (e.g., upcoming appointments, payment reminders).
*(Note: Currently returns an empty placeholder array until the notification service is fully integrated).*
