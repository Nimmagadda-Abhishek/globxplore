# Administrator API Documentation

This document specifies the internal endpoints accessible only to the **ADMIN** role. 

---

## 🚀 Overview
- **Base URL:** `/api`
- **Standard Format:** JSON
- **Auth Scheme:** Bearer Token (`Authorization: Bearer <token>`)
- **Note:** All endpoints below require a token with `role: ADMIN`.

---

## 👥 User Management (Admin Only)

### 🗑️ Delete User
Permanently remove any user (Agent, Telecaller, Manager, etc.) from the system.
- **Endpoint:** `DELETE /user/:id`
- **Protection:** Admin only.
- **Constraint:** Admins cannot delete their own profile.
- **Returns:** `{ "success": true, "message": "User deleted successfully" }`

### 🏗️ Create Agent Manager
Create a new Agent Manager account. 
- **Endpoint:** `POST /user/agent-manager`
- **Body:** `{ "name", "email", "phone" }`
- **Notes:** Password is automatically generated and returned in the `autoPassword` field and included in the success `message`.

### 📋 List Agent Managers
Retrieve all Agent Managers in the system.
- **Endpoint:** `GET /user/agent-managers`

### 🏗️ Create Telecaller
Create a new Telecaller account.
- **Endpoint:** `POST /user/telecaller`
- **Body:** `{ "name", "email", "phone" }`
- **Notes:** Password is automatically generated and returned in the `autoPassword` field and included in the success `message`.

### 📋 List Telecallers
Retrieve all Telecallers in the system.
- **Endpoint:** `GET /user/telecallers`

### 🏗️ Create Visa Agent
Create a new Visa Agent account.
- **Endpoint:** `POST /user/visa-agent`
- **Body:** `{ "name", "email", "phone" }`
- **Notes:** Password is automatically generated and returned in the `autoPassword` field and included in the success `message`.

### 📋 List Visa Agents
Retrieve all Visa Agents in the system.
- **Endpoint:** `GET /user/visa-agents`

### 🚦 Update Agent Status
Update the verification or activity status of an Agent.
- **Endpoint:** `PATCH /user/agent/:id/status`
- **Body:** `{ "agentStatus": "Closed" }`
- **Enum:** `Not visited`, `Closed`, `Revisit`, `confirmed`.

---

## 📈 Analytics (Admin Only)

### 💰 Revenue Stats
Retrieve total revenue and transaction counts.
- **Endpoint:** `GET /analytics/revenue`

### 🏠 Admin Dashboard Overview
Aggregated data for the main Admin dashboard (totals, pipeline, recent leads).
- **Endpoint:** `GET /analytics/admin-dashboard`

---

## 🛡️ Role Hierarchy
As an **ADMIN**, you also have access to all endpoints documented in the [Agent Manager API](./agent-manager-api.md), including:
- Student stage management
- Lead creation and updates
- Document uploads
- Telecaller performance monitoring
