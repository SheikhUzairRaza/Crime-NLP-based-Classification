# Crime & Cybercrime NLP Triage & Reporting System
## Comprehensive Technical & API Documentation

---

### Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Machine Learning Microservice (DistilBERT v3)](#2-machine-learning-microservice-distilbert-v3)
3. [Database Schema & Entity Models](#3-database-schema--entity-models)
4. [Security, Hardening & Error Handling](#4-security-hardening--error-handling)
5. [Complete Endpoint Reference & Response Guide](#5-complete-endpoint-reference--response-guide)
   - [5.1 Health Check (`GET /api/v1/health`)](#51-health-check-get-apiv1health)
   - [5.2 Swagger Interactive UI (`GET /api-docs`)](#52-swagger-interactive-ui-get-api-docs)
   - [5.3 Public Citizen Crime Report Submission (`POST /api/v1/reports`)](#53-public-citizen-crime-report-submission-post-apiv1reports)
   - [5.4 Public Citizen Incident Tracking (`GET /api/v1/reports/track/:trackingId`)](#54-public-citizen-incident-tracking-get-apiv1reportstracktrackingid)
   - [5.5 Admin Officer Login (`POST /api/v1/auth/login`)](#55-admin-officer-login-post-apiv1authlogin)
   - [5.6 Access Token Refresh Rotation (`POST /api/v1/auth/refresh-token`)](#56-access-token-refresh-rotation-post-apiv1authrefresh-token)
   - [5.7 Admin Officer Logout (`POST /api/v1/auth/logout`)](#57-admin-officer-logout-post-apiv1authlogout)
   - [5.8 Admin Triage Reports List (`GET /api/v1/admin/reports`)](#58-admin-triage-reports-list-get-apiv1adminreports)
   - [5.9 Admin Single Report Details (`GET /api/v1/admin/reports/:id`)](#59-admin-single-report-details-get-apiv1adminreportsid)
   - [5.10 Admin Report Triage & Notes Update (`PATCH /api/v1/admin/reports/:id`)](#510-admin-report-triage--notes-update-patch-apiv1adminreportsid)
   - [5.11 Admin Report Reclassification (`POST /api/v1/admin/reports/:id/reclassify`)](#511-admin-report-reclassification-post-apiv1adminreportsidreclassify)
   - [5.12 Admin Operations & Analytics Stats (`GET /api/v1/admin/stats`)](#512-admin-operations--analytics-stats-get-apiv1adminstats)
6. [Standardized Error Codes & Failure Modes](#6-standardized-error-codes--failure-modes)

---

### 1. System Architecture Overview

The system is designed as a production-grade, multi-tier incident intake and automated triage platform:

```
[ Citizen Web Client / Mobile ] 
           │
           │ (HTTPS)
           ▼
[ Express.js Backend API Gateway - Port 5000 ]
  ├── Rate Limiters (5 req/hr for filing, 30 req/15min for tracking)
  ├── Zod Request Validation Middleware
  ├── JWT Auth Middleware (Bearer Token Verification)
  ├── Centralized Error Sanitation (Zero Stack Trace Leakage)
  ├── OpenAPI 3.0 / Swagger UI (/api-docs)
  │
  ├───▶ [ Python FastAPI ML Microservice - Port 8000 ]
  │       └── Fine-Tuned DistilBERT v3 (11 Crime Classes)
  │             ├── Domain Classification (Physical vs. Cyber)
  │             ├── Severity Level Assignment (Critical, High, Medium)
  │             ├── Urgent Emergency Dispatch Flag
  │             └── Citizen Safety Advisory Generation
  │
  └───▶ [ MySQL Relational Database (Sequelize ORM) ]
          ├── `reports` (Incident complaints, ML predictions, notes)
          ├── `officers` (Admins and investigating officers, bcrypt hashes)
          └── `refresh_tokens` (Rotating JWT refresh sessions, replay tracking)
```

---

### 2. Machine Learning Microservice (DistilBERT v3)

- **Model Engine**: Fine-tuned DistilBERT Sequence Classifier (`inference/v3/`).
- **Inference Service**: Python FastAPI on `http://localhost:8000`.
- **Classification Output**: 11 clean crime classes segregated into 2 primary domains.

| Category | Domain | Severity | Urgent? | Automated Action & Advisory |
| :--- | :--- | :--- | :--- | :--- |
| **Robbery & Armed Snatching** | Physical | Critical | Yes | Immediate armed threat. Call Emergency Police Helpline (15). |
| **Assault & Physical Violence** | Physical | Critical | Yes | Seek immediate medical care and obtain MLC. Immediate FIR. |
| **Physical Extortion & Blackmail** | Physical | Critical | Yes | Do not pay ransom. Contact Anti-Violent Crime Cell (AVCC). |
| **Hacking & Unauthorized Access** | Cyber | Critical | Yes | Disconnect affected machines from network. Isolate servers. |
| **Ransomware & Digital Extortion** | Cyber | Critical | Yes | Do not pay ransom. Disconnect network and backup drives. |
| **Financial Fraud** | Cyber | High | Yes | Call bank helpline immediately (15/1991) to freeze accounts. |
| **Identity Theft & Impersonation** | Cyber | High | Yes | Alert contacts not to send funds. Report imposter account. |
| **Cyber Harassment & Stalking** | Cyber | High | No | Preserve screenshots and links. Report to Cyber Crime Portal. |
| **Burglary & Break-in** | Physical | High | No | Do not touch scene surfaces until forensic teams inspect. |
| **Physical Harassment & Stalking** | Physical | High | No | Avoid travelling alone on isolated routes. Report to police. |
| **Cryptocurrency Fraud** | Cyber | Medium | No | Record transaction hashes (TXID) and scammer wallet addresses. |

---

### 3. Database Schema & Entity Models

#### 3.1 `reports` Table
Stores citizen submissions, ML predictions, and police investigation history.
- `id`: Auto-increment integer primary key.
- `tracking_id`: Unique tracking reference formatted as `CRIME-<YEAR>-<10 HEX CHARACTERS>` (e.g. `CRIME-2026-A83B4C91D2`).
- `citizen_name`: Complainant name (hidden from public tracking).
- `contact_number`: Complainant phone number (hidden from public tracking).
- `incident_location`: Geographic location / address where incident took place.
- `incident_date`: Timestamp of incident (validated non-future).
- `description`: Full citizen narrative (minimum 20 characters).
- `predicted_category`: ML-assigned classification (or `NULL` if ML service was offline during submission).
- `domain`: `ENUM('Cyber', 'Physical')`.
- `confidence_score`: Float (0.0 to 100.0).
- `severity`: `ENUM('Critical', 'High', 'Medium')`.
- `is_urgent`: Boolean indicating emergency priority.
- `safety_advisory`: Tailored citizen safety instructions generated by AI.
- `top_candidates`: JSON array of top alternative categories and probabilities.
- `status`: `ENUM('Pending', 'Under Investigation', 'Resolved', 'Dismissed')` (Default: `'Pending'`).
- `officer_id`: Foreign key referencing assigned officer in `officers` table (`NULL` on submission).
- `officer_notes`: Chronological audit trail of officer remarks appended with timestamps.
- `created_at`, `updated_at`, `classified_at`: Timestamps.

#### 3.2 `officers` Table
Administrative and investigating police personnel.
- `id`: Primary key.
- `name`: Officer full name.
- `email`: Unique login identifier.
- `password_hash`: Bcrypt hashed password (salt rounds = 10).
- `role`: `ENUM('admin', 'officer')` (Default: `'officer'`).
- `badge_number`: Optional badge number.
- `created_at`, `updated_at`: Timestamps.

#### 3.3 `refresh_tokens` Table
Manages long-lived JWT refresh sessions with rotation and replay defense.
- `id`: Primary key.
- `officer_id`: Foreign key to `officers.id`.
- `token`: Unique cryptographically random refresh token string.
- `expires_at`: Token expiry timestamp (7 days).
- `is_revoked`: Boolean flag flipped to `true` upon rotation or logout.
- `created_at`, `updated_at`: Timestamps.

---

### 4. Security, Hardening & Error Handling

1. **IP Rate Limiting**:
   - `POST /api/v1/reports`: 5 submissions per hour per IP. Exceeding triggers HTTP `429 Too Many Requests`.
   - `GET /api/v1/reports/track/:trackingId`: 30 queries per 15 minutes per IP.
2. **Centralized Error Sanitization**:
   - Production errors return clean JSON envelopes (`{ "success": false, "error": { "message": "..." } }`).
   - Node stack traces, database credentials, and internal table structures are strictly blocked from client responses.
3. **Authentication Defense**:
   - Short-lived Access Token (15 minutes).
   - Long-lived Refresh Token (7 days).
   - Token Rotation: Every call to `/refresh-token` consumes the current token and issues a new pair.
   - Replay Protection: Re-using an already consumed/revoked refresh token revokes all tokens for that officer and returns `401 Unauthorized`.

---

### 5. Complete Endpoint Reference & Response Guide

#### 5.1 Health Check (`GET /api/v1/health`)
- **Access**: Public
- **Purpose**: Verifies that the Express API server is active and returns the API version.
- **Request**:
  - `GET http://localhost:5000/api/v1/health`
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "version": "v1"
}
```

---

#### 5.2 Swagger Interactive UI (`GET /api-docs`)
- **Access**: Public
- **Purpose**: Interactive OpenAPI 3.0 documentation with built-in "Try It Out" test interface.
- **Endpoints**:
  - Web UI: `GET http://localhost:5000/api-docs`
  - Raw JSON Spec: `GET http://localhost:5000/api-docs.json`
- **Response**: Renders interactive web UI loaded with schemas, parameters, and live execution.

---

#### 5.3 Public Citizen Crime Report Submission (`POST /api/v1/reports`)
- **Access**: Public
- **Rate Limit**: 5 submissions per hour per IP.
- **Purpose**: Citizen files an incident report. The backend immediately dispatches the complaint narrative to the DistilBERT v3 ML microservice, enriches the report with AI categorization, severity, urgency dispatch flags, and advisory, and stores it in MySQL.
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "citizen_name": "Ali Khan",
  "contact_number": "+923001234567",
  "incident_location": "Gulshan-e-Iqbal, Karachi",
  "incident_date": "2026-10-20T10:00:00Z",
  "description": "Two armed individuals intercepted my car at gunpoint and stole my wallet, mobile phone, and vehicle registration papers."
}
```
- **Validation Rules**:
  - `citizen_name`: String, required.
  - `contact_number`: String, required.
  - `incident_location`: String, required.
  - `incident_date`: ISO 8601 Date string, cannot be in the future.
  - `description`: Minimum 20 characters, maximum 10,000 characters.

- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Report submitted and classified successfully",
  "data": {
    "tracking_id": "CRIME-2026-8D92B45A01",
    "status": "Pending",
    "predicted_category": "Robbery & Armed Snatching",
    "domain": "Physical",
    "confidence_score": 97.4,
    "severity": "Critical",
    "is_urgent": true,
    "safety_advisory": "EMERGENCY: Immediate armed threat. Call Emergency Police Helpline (15) immediately for rapid patrol response.",
    "top_candidates": [
      { "category": "Robbery & Armed Snatching", "confidence": 97.4 },
      { "category": "Assault & Physical Violence", "confidence": 2.1 },
      { "category": "Physical Extortion & Blackmail", "confidence": 0.5 }
    ],
    "classified_at": "2026-10-21T01:10:00.000Z",
    "created_at": "2026-10-21T01:10:00.000Z"
  }
}
```

- **Fallback Behavior (When ML Service is Down)**:
  - If the ML microservice is unreachable, the complaint is still securely saved in the database with `predicted_category: null`, `domain: null`, `severity: null`.
  - Admins can later reclassify it with one click via `POST /api/v1/admin/reports/:id/reclassify`.

- **Error Responses**:
  - `400 Bad Request`: Validation failure (e.g. description under 20 characters, future incident date).
  - `429 Too Many Requests`: Exceeded 5 reports per hour.

---

#### 5.4 Public Citizen Incident Tracking (`GET /api/v1/reports/track/:trackingId`)
- **Access**: Public
- **Rate Limit**: 30 queries per 15 minutes per IP.
- **Purpose**: Allows a citizen to check the live status of their filed complaint using their unique Tracking ID.
- **Privacy Enforcement**: Complainant contact details, internal officer notes, and private metadata are strictly excluded.
- **Request**:
  - `GET http://localhost:5000/api/v1/reports/track/CRIME-2026-8D92B45A01`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "tracking_id": "CRIME-2026-8D92B45A01",
    "incident_location": "Gulshan-e-Iqbal, Karachi",
    "incident_date": "2026-10-20T10:00:00.000Z",
    "status": "Under Investigation",
    "predicted_category": "Robbery & Armed Snatching",
    "domain": "Physical",
    "severity": "Critical",
    "safety_advisory": "EMERGENCY: Immediate armed threat. Call Emergency Police Helpline (15) immediately for rapid patrol response.",
    "classified_at": "2026-10-21T01:10:00.000Z",
    "created_at": "2026-10-21T01:10:00.000Z",
    "assigned_officer": "Inspector Sarah Ahmed"
  }
}
```
- **Error Responses**:
  - `404 Not Found`:
```json
{
  "success": false,
  "error": {
    "message": "Report with tracking ID CRIME-2026-INVALID not found"
  }
}
```
  - `429 Too Many Requests`: Rate limit exceeded.

---

#### 5.5 Admin Officer Login (`POST /api/v1/auth/login`)
- **Access**: Public
- **Purpose**: Authenticates administrative staff and investigating officers using email and bcrypt password matching. Issues both a short-lived Access Token and a persistent Refresh Token.
- **Security Feature**: Returns identical `"Invalid credentials"` error for nonexistent email or wrong password to prevent user enumeration attacks.
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "admin@crimeportal.gov",
  "password": "Admin@12345"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "officer": {
      "id": 1,
      "name": "Super Administrator",
      "email": "admin@crimeportal.gov",
      "role": "admin"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "48b6c0e5a87b41... (7-day token)"
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`:
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```

---

#### 5.6 Access Token Refresh Rotation (`POST /api/v1/auth/refresh-token`)
- **Access**: Public (Requires valid Refresh Token)
- **Purpose**: Rotates credentials. Verifies the existing refresh token, revokes it in the database to prevent replay, and issues a brand-new access token and refresh token.
- **Headers**:
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "refreshToken": "48b6c0e5a87b41..."
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "9f32e1a4b8702c..."
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Token is invalid, expired, or already used (triggers security revoke of all officer sessions).

---

#### 5.7 Admin Officer Logout (`POST /api/v1/auth/logout`)
- **Access**: Public / Authenticated
- **Purpose**: Explicitly revokes the refresh token in the database, invalidating the session immediately.
- **Request Body**:
```json
{
  "refreshToken": "9f32e1a4b8702c..."
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 5.8 Admin Triage Reports List (`GET /api/v1/admin/reports`)
- **Access**: Protected (Requires `Authorization: Bearer <accessToken>`)
- **Purpose**: Comprehensive case triage endpoint with dynamic SQL filtering, multi-condition urgency/severity sorting, and pagination.
- **Sorting Logic**:
  - Employs a SQL `CASE` statement sorting `Critical` (1) first, `High` (2) second, `Medium` (3) third, and unclassified `NULL` reports (4) at the bottom.
  - Secondary sort orders by `created_at DESC` (newest first).
- **Query Parameters**:
  - `page`: Page number (integer, default: `1`).
  - `limit`: Records per page (integer, default: `20`, max: `100`).
  - `domain`: Filter by `'Cyber'` or `'Physical'`.
  - `severity`: Filter by `'Critical'`, `'High'`, or `'Medium'`.
  - `status`: Filter by `'Pending'`, `'Under Investigation'`, `'Resolved'`, or `'Dismissed'`.
  - `officer_id`: Filter by assigned officer ID (e.g., `1`), or `'unassigned'` to fetch cases with no assigned officer.
  - `category`: Filter by crime category (e.g., `Financial Fraud`, URL-encoded for `&`).
  - `is_urgent`: Boolean filter (`true` or `false`).
- **Request Example**:
  - `GET http://localhost:5000/api/v1/admin/reports?domain=Cyber&severity=Critical&status=Pending&page=1&limit=10`
  - `Authorization: Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": 14,
        "tracking_id": "CRIME-2026-F1A29D80BE",
        "citizen_name": "Tariq Mahmood",
        "contact_number": "+923214567890",
        "incident_location": "I.I Chundrigar Road, Karachi",
        "incident_date": "2026-10-20T14:30:00.000Z",
        "description": "Our core company database was breached by an unknown attacker demanding 5 BTC ransom.",
        "predicted_category": "Ransomware & Digital Extortion",
        "domain": "Cyber",
        "confidence_score": 98.7,
        "severity": "Critical",
        "is_urgent": true,
        "status": "Pending",
        "officer_notes": null,
        "created_at": "2026-10-21T00:15:00.000Z",
        "officer": null
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

#### 5.8b Officer Assigned Tasks (`GET /api/v1/admin/reports/my-tasks`)
- **Access**: Protected (`Authorization: Bearer <accessToken>`)
- **Purpose**: Dedicated endpoint for investigating officers. Automatically extracts the authenticated officer's ID (`req.user.id`) from the JWT Bearer token and returns only the cases assigned to them (`WHERE officer_id = req.user.id`).
- **Sorting Logic**: Critical & urgent cases appear first, followed by newest created.
- **Query Parameters**:
  - `page`: Page index (default: `1`).
  - `limit`: Items per page (default: `20`, max: `100`).
  - `status`: Optional filter (`Under Investigation`, `Resolved`, `Dismissed`, `Pending`).
  - `domain`: Optional filter (`Cyber` or `Physical`).
  - `severity`: Optional filter (`Critical`, `High`, `Medium`).
  - `is_urgent`: Optional boolean filter (`true` or `false`).
- **Request Example**:
  - `GET http://localhost:5000/api/v1/admin/reports/my-tasks?status=Under%20Investigation`
  - `Authorization: Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Officer assigned tasks retrieved successfully",
  "data": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "pages": 1,
    "reports": [
      {
        "id": 14,
        "tracking_id": "CRIME-2026-F1A29D80BE",
        "citizen_name": "Tariq Mahmood",
        "contact_number": "+923214567890",
        "incident_location": "I.I Chundrigar Road, Karachi",
        "incident_date": "2026-10-20T14:30:00.000Z",
        "description": "Our core company database was breached by an unknown attacker demanding 5 BTC ransom.",
        "predicted_category": "Ransomware & Digital Extortion",
        "domain": "Cyber",
        "confidence_score": 98.7,
        "severity": "Critical",
        "is_urgent": true,
        "status": "Under Investigation",
        "officer_notes": "[2026-10-21T01:12:00.000Z] Super Administrator: Contacted complainant. Server hard drives secured for digital forensics inspection.",
        "created_at": "2026-10-21T00:15:00.000Z",
        "officer": {
          "id": 1,
          "name": "Super Administrator",
          "email": "admin@crimeportal.gov",
          "role": "admin"
        }
      }
    ]
  }
}
```
      "pages": 1
    }
  }
}
```
- **Error Responses**:
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

#### 5.9 Admin Single Report Details (`GET /api/v1/admin/reports/:id`)
- **Access**: Protected (`Authorization: Bearer <accessToken>`)
- **Purpose**: Full inspection of an incident record, including unmasked complainant details, full ML diagnostics (`top_candidates`), assigned officer details, and chronological investigation notes.
- **Request**:
  - `GET http://localhost:5000/api/v1/admin/reports/14`
  - `Authorization: Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "id": 14,
    "tracking_id": "CRIME-2026-F1A29D80BE",
    "citizen_name": "Tariq Mahmood",
    "contact_number": "+923214567890",
    "incident_location": "I.I Chundrigar Road, Karachi",
    "incident_date": "2026-10-20T14:30:00.000Z",
    "description": "Our core company database was breached by an unknown attacker demanding 5 BTC ransom.",
    "predicted_category": "Ransomware & Digital Extortion",
    "domain": "Cyber",
    "confidence_score": 98.7,
    "severity": "Critical",
    "is_urgent": true,
    "safety_advisory": "CRITICAL: Do not pay ransom. Disconnect local network and backup drives immediately to halt encryption spread.",
    "top_candidates": [
      { "category": "Ransomware & Digital Extortion", "confidence": 98.7 },
      { "category": "Hacking & Unauthorized Access", "confidence": 1.1 }
    ],
    "status": "Pending",
    "officer_id": null,
    "officer_notes": null,
    "created_at": "2026-10-21T00:15:00.000Z",
    "updated_at": "2026-10-21T00:15:00.000Z",
    "officer": null
  }
}
```
- **Error Responses**:
  - `404 Not Found`: Report with given ID does not exist.

---

#### 5.10 Admin Report Triage & Notes Update (`PATCH /api/v1/admin/reports/:id`)
- **Access**: Protected (`Authorization: Bearer <accessToken>`)
- **Purpose**: Updates case status, assigns an investigating officer, and appends timestamped investigation notes to the audit trail.
- **Rules & Constraints**:
  - `status`: Only `'Under Investigation'`, `'Resolved'`, or `'Dismissed'` are accepted (rejects invalid states with `400`).
  - `officer_id`: Must exist in `officers` table (rejects invalid officer ID with `400`).
  - `officer_notes`: Appends new remarks to existing notes rather than overwriting (`[TIMESTAMP] Officer Name: Note text`).
- **Headers**:
  - `Authorization: Bearer <accessToken>`
  - `Content-Type: application/json`
- **Request Body**:
```json
{
  "status": "Under Investigation",
  "officer_id": 1,
  "officer_notes": "Contacted complainant. Server hard drives secured for digital forensics inspection."
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": 14,
    "tracking_id": "CRIME-2026-F1A29D80BE",
    "status": "Under Investigation",
    "officer_id": 1,
    "officer_notes": "[2026-10-21T01:12:00.000Z] Super Administrator: Contacted complainant. Server hard drives secured for digital forensics inspection.",
    "updated_at": "2026-10-21T01:12:00.000Z",
    "officer": {
      "id": 1,
      "name": "Super Administrator",
      "email": "admin@crimeportal.gov",
      "role": "admin"
    }
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: Invalid status or non-existent officer ID.
  - `404 Not Found`: Report does not exist.

---

#### 5.11 Admin Report Reclassification (`POST /api/v1/admin/reports/:id/reclassify`)
- **Access**: Protected (`Authorization: Bearer <accessToken>`)
- **Purpose**: Triggers a re-evaluation through the DistilBERT v3 ML microservice for reports whose ML prediction fields are currently `NULL` (e.g. submitted during ML microservice downtime).
- **Request**:
  - `POST http://localhost:5000/api/v1/admin/reports/14/reclassify`
  - `Authorization: Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Report successfully reclassified by ML microservice",
  "data": {
    "id": 14,
    "tracking_id": "CRIME-2026-F1A29D80BE",
    "predicted_category": "Ransomware & Digital Extortion",
    "domain": "Cyber",
    "confidence_score": 98.7,
    "severity": "Critical",
    "is_urgent": true,
    "safety_advisory": "CRITICAL: Do not pay ransom. Disconnect local network and backup drives immediately to halt encryption spread.",
    "classified_at": "2026-10-21T01:14:00.000Z"
  }
}
```
- **Error Responses**:
  - `400 Bad Request`: If report is already classified.
  - `503 Service Unavailable`: If ML microservice is still unreachable.

---

#### 5.12 Admin Operations & Analytics Stats (`GET /api/v1/admin/stats`)
- **Access**: Protected (`Authorization: Bearer <accessToken>`)
- **Purpose**: Aggregates incident metrics in real-time directly inside the MySQL database using SQL `GROUP BY` and `COUNT`, avoiding loading datasets into Node.js application memory.
- **Request**:
  - `GET http://localhost:5000/api/v1/admin/stats`
  - `Authorization: Bearer <accessToken>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "total": 45,
    "by_domain": {
      "Cyber": 24,
      "Physical": 20,
      "Unclassified": 1
    },
    "by_severity": {
      "Critical": 18,
      "High": 16,
      "Medium": 10,
      "Unclassified": 1
    },
    "top_categories": [
      {
        "category": "Financial Fraud",
        "count": 12
      },
      {
        "category": "Robbery & Armed Snatching",
        "count": 9
      },
      {
        "category": "Identity Theft & Impersonation",
        "count": 7
      },
      {
        "category": "Assault & Physical Violence",
        "count": 6
      },
      {
        "category": "Hacking & Unauthorized Access",
        "count": 5
      }
    ]
  }
}
```

---

### 6. Standardized Error Codes & Failure Modes

All API failure responses follow a unified schema:

```json
{
  "success": false,
  "error": {
    "message": "Human readable explanation of the error",
    "code": "ERROR_CODE_STRING",
    "details": [] 
  }
}
```

| HTTP Status | Condition | Example Reason |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Validation failure | Missing required fields, invalid date, description < 20 chars |
| **`401 Unauthorized`** | Authentication missing or failed | Invalid credentials, expired token, revoked refresh token |
| **`403 Forbidden`** | Insufficient permissions | Role restricted access |
| **`404 Not Found`** | Resource missing | Unknown report ID or tracking ID |
| **`429 Too Many Requests`** | Rate limit tripped | Exceeded 5 reports/hr or 30 lookups/15min |
| **`500 Internal Server Error`** | Server exception | Handled centrally without disclosing database internals |
| **`503 Service Unavailable`** | Microservice down | ML pipeline unreachable during reclassification |
