# Student API Documentation

This document provides the complete specifications for all endpoints accessible to the **STUDENT** role in the Globexplorer CRM.

---

## 🚀 Overview
- **Base URL:** `/api`
- **Standard Format:** JSON
- **Auth Scheme:** Bearer Token (`Authorization: Bearer <token>`) for protected routes.

---

## 🔑 Authentication & Registration (Public)

### 📝 Register Student
Submit a registration request to the agency.
- **Endpoint:** `POST /student/register`
- **Body:** `{ "fullName", "email", "phone", "interestedCountry", "loanStatus" }`

### 🚪 Student Login
Login to the Student Portal.
- **Endpoint:** `POST /student/login`
- **Body:** `{ "gxId", "password" }`
- **Returns:** `{ "accessToken", "studentInfo" }`

---

## 👤 Profile & Dashboard (Protected)

### 📊 Get Student Dashboard
Retrieve high-level overview metrics for the student.
- **Endpoint:** `GET /student/dashboard`
- **Returns:** Current stage, missing docs count, assigned counsellor, pending tasks, notifications, etc.

### 🧑‍🎓 Get My Profile (Me)
Retrieve the full student profile and assigned counsellor details.
- **Endpoint:** `GET /student/me`

### ✏️ Update Profile
Update the student's personal information or application preferences.
- **Endpoint:** `PUT /student/profile`
- **Body:** Fields to update (e.g., `interestedUniversity`, `interestedLocation`, `educationBackground`, etc.)

### 🔔 Get Alerts
Retrieve notifications and alerts for the student.
- **Endpoint:** `GET /student/alerts`

---

## 📄 Document Management (Protected)

### 📂 Get My Documents
List all documents uploaded by the student or requested by the agency.
- **Endpoint:** `GET /student/documents`

### 📤 Upload General Document
Upload a document to the student's main profile.
- **Endpoint:** `POST /student/documents`
- **Content-Type:** `multipart/form-data`
- **File:** `file`
- **Body Fields:** `category` (optional), `name` (optional)

---

## 💬 Communication (Protected)

### ✉️ Post Message to Counsellor/Agent
Send a message or query regarding your application.
- **Endpoint:** `POST /student/:id/message`
- **Body:** `{ "content": "..." }`
- **Note:** The `:id` parameter refers to the Student's database ID. The message will be visible to your assigned Agent Manager and Counsellors.

---

## 🛂 Visa Tracking (Protected)

### 🔍 View Visa Status
Retrieve the current status of your visa application.
- **Endpoint:** `GET /visa/my-status`

### 📤 Upload Visa Specific Document
Upload missing or requested documents specifically for your visa process.
- **Endpoint:** `POST /visa/:id/document`
- **Content-Type:** `multipart/form-data`
- **File:** `file`
- **Note:** The `:id` refers to the Visa Process ID.

---

## 💳 Subscriptions (Protected)

### 📋 Get Subscription Plans
Retrieve available subscription tiers and their features.
- **Endpoint:** `GET /student/subscriptions/plans`

### 🛒 Create Subscription Order
Initialize a Razorpay order for a subscription plan.
- **Endpoint:** `POST /student/subscription/order`
- **Body:** `{ "planId" }`
- **Returns:** Razorpay order ID and amount.

### ✅ Verify Subscription Payment
Verify the Razorpay payment to activate the subscription.
- **Endpoint:** `POST /student/subscription/verify`
- **Body:** `{ "razorpay_order_id", "razorpay_payment_id", "razorpay_signature" }`

---

## 🏷️ Support & Events (Protected)

### 🎁 View Student Offers
Access special offers and scholarships documentation.
- **Endpoint:** `GET /offer`

### 📅 View Student Webinars
List of upcoming sessions tailored for students.
- **Endpoint:** `GET /webinar/student`
