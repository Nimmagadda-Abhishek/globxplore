# Agent Manager API Documentation

This document provides a comprehensive reference for all API endpoints accessible to the **Agent Manager** role within the GlobXplorer CRM.

---

## 🚀 Overview
- **Base URL:** `/api`
- **Standard Format:** JSON
- **Auth Scheme:** Bearer Token (`Authorization: Bearer <token>`)

## 🔑 Authentication
### POST `/auth/login`
Authenticate and obtain access tokens.
- **Body:** `{ "identifier": "AM0001", "password": "..." }`
- **Identifiers:** GxId, Email, Phone, or Username.

### PUT `/auth/change-password`
Update your account password.
- **Body:** `{ "oldPassword": "...", "newPassword": "..." }`

---

## 👥 User & Agent Management
Agent Managers are primarily responsible for overseeing **Agents**.

### POST `/user/agent`
Create a new Agent under your management.
- **Content-Type:** `multipart/form-data`
- **Required Fields:** `name`, `email`, `phone`, `password`, `businessName`, `customerWhatsappNumber`, `locationUrl`, `businessAreaName`, `street`, `natureOfBusiness`.
- **File:** `businessBoardPhoto` (Required).
- **Notes:** `createdBy` is automatically set to your User ID. The temporary password is returned in the `autoPassword` field and included in the success `message`.

### GET `/user/subordinates`
Retrieve all Agents directly created by/assigned to you.
- **Returns:** List of Agent records.

### GET `/user/agents`
Global list of all Agents in the system.
- **Note:** Use this for cross-agent lookups. For your specific dashboard, `/subordinates` is recommended.

### GET `/user/agent/:id`
Retrieve detailed profile of a specific Agent.

---

## 📈 Lead Management
### POST `/lead`
Create a new lead.
- **Body:** `{ "name", "phone", "email", "leadType", "source", "assignedTo" }`
- **Note:** `assignedTo` defaults to you if omitted. `gxId` is auto-generated.

### GET `/lead/queue`
Access the Telecaller work queue.
- **Returns:** `{ newLeads: [], missedFollowups: [], oldLeads: [] }`
- **Note:** Agent Managers use this to monitor pipeline health.

### GET `/lead/my`
Retrieve leads assigned directly to you.

### GET `/lead/:id`
Retrieve full details of a specific lead.

### PATCH `/lead/:id/status`
Update lead status and qualification details.
- **Body:** `{ "status", "notes", "followUpDate", ...qualificationDetails }`
- **Statuses:** `Lead received`, `Contacted`, `Call not answered`, `Declined`, `Interested`, `Not interested`.
- **Auto-Conversion:** Updating a lead to **`Interested`** automatically creates a **Student** profile.

---

## 🎓 Student & Pipeline Management
### GET `/student`
Retrieve all students in the system.
- **Note:** Agent Managers have global visibility into the student pipeline.

### POST `/student`
Directly create a student profile (bypassing Lead stage).

### PATCH `/student/:id/stage`
Move a student through the workflow.
- **Body:** `{ "stage", "notes" }`
- **Stages:** `Lead Received` ➡️ `Contacted` ➡️ `Qualified` ➡️ `Application Started` ➡️ `Offer Received` ➡️ `Visa Filed` ➡️ `Visa Approved` (Full list in Data Models).

### POST `/student/:id/document`
Upload a document (Image only) to a student profile.
- **Body:** `name`, `type`, `visibility` (`Student` or `Office`).
- **File:** `file`.

### POST `/student/:id/message`
Post a message to the student's internal chat/log.
- **Body:** `{ "content": "..." }`

---

## 📊 Analytics & Reporting
### GET `/analytics/conversion`
Overall system conversion rate (Leads -> Students).

### GET `/analytics/telecaller`
Performance stats for Telecallers.
- **Query Params:** `startDate`, `endDate`, `telecallerId`.

### GET `/analytics/performance`
Overview of system activity and session counts.

---

## ⏱️ Activity & Task Tracking
### POST `/activity/heartbeat`
Send a heartbeat to keep your session active.

### POST `/activity/task/start`
Mark the start of a specific internal task.

### POST `/activity/task/end/:taskId`
Mark the completion of a task.

### POST `/activity/log`
Log a custom activity event.
- **Body:** `{ "action", "metadata" }`

---

## 🏷️ Support Modules
### GET `/offer`
Retrieve all active offers and promotions available for students.

### GET `/webinar/student`
List of upcoming webinars scheduled for students/leads.

---

## 📂 Data Models (Reference)
### Lead Statuses
`Lead received`, `Contacted`, `Call not answered`, `Declined`, `Call not reachable`, `Interested`, `Not interested`, `Call Again`.

### Student Pipeline Stages
1. `Lead Received`
2. `Contacted`
3. `Webinar Conducted`
4. `Student Docs Shared`
5. `Qualified`
6. `Country Shortlisted`
7. `Counselling Done`
8. `Application Started`
9. `Offer Received`
10. `Unconditional offer`
11. `Visa Filed`
12. `Visa Approved`
13. `Departure`

### Agent Statuses
`Not visited`, `Closed`, `Revisit`, `confirmed`.

---

## ⚠️ Notes
- **Uploads:** Currently, only image formats (`jpg`, `png`, `webp`) are supported for both Agent and Student document uploads.
- **Permissions:** Some endpoints are shared with Admin/Telecaller roles but behavior may change based on your `AGENT_MANAGER` token.
