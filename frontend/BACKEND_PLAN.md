# Datacom Daily Schedule System - Backend Architecture Plan

## Planning Status

This document describes a proposed backend design for the future production version of the Datacom Daily Schedule System. It is architecture planning only; the current application remains frontend-only and uses browser `localStorage` for demo data.

## 1. Proposed Backend Architecture

### Suggested Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Office frontend | Existing HTML, CSS, JavaScript application | Used by Sales, Warehouse, Management, and Admin. |
| Field frontend | Future Field Job Platform | Used by Driver, Technician, and Engineer. |
| Backend API | Node.js with Express.js | Authentication, authorization, workflow processing, reporting, notifications, and sync endpoints. |
| Database | PostgreSQL | Central source of truth for users, schedules, permissions, field updates, and audit history. |

### Target Architecture

```text
Office Daily Schedule System Frontend
             |
             | HTTPS REST API
             v
     Node.js + Express.js Backend
             |
             | SQL transactions
             v
          PostgreSQL
             ^
             | HTTPS REST API / sync updates
             |
       Field Job Platform Frontend
```

The production target is **two frontends, one backend, one database**. Both applications communicate through the shared API; frontends should not write directly to the database.

### Backend Responsibilities

- Authenticate users and issue secure sessions or access tokens.
- Authorize each route according to role and permission rules.
- Store schedule, user, notification, permission, and activity-log records.
- Manage schedule lifecycle actions such as status updates and carry forward.
- Expose field assignments to the Field Job Platform.
- Receive field-status updates and reflect them in office dashboard data.
- Create audit log records for sensitive and operational actions.

## 2. Suggested Folder Structure

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      database.js
    routes/
      auth.routes.js
      users.routes.js
      schedules.routes.js
      notifications.routes.js
      permissions.routes.js
      activity-logs.routes.js
      field-sync.routes.js
    controllers/
      auth.controller.js
      users.controller.js
      schedules.controller.js
      notifications.controller.js
      permissions.controller.js
      activity-logs.controller.js
      field-sync.controller.js
    services/
      auth.service.js
      schedule.service.js
      permission.service.js
      notification.service.js
      audit.service.js
      field-sync.service.js
    middleware/
      authenticate.js
      authorize.js
      validate.js
      error-handler.js
    validators/
      auth.validator.js
      schedule.validator.js
      user.validator.js
    repositories/
      users.repository.js
      schedules.repository.js
      notifications.repository.js
      role-permissions.repository.js
      activity-logs.repository.js
    db/
      migrations/
      seeds/
    utils/
      constants.js
      date-time.js
  tests/
    integration/
    unit/
  .env.example
  package.json
```

This structure separates HTTP handling, business workflow logic, database queries, authorization, validation, and migration scripts.

## 3. Suggested PostgreSQL Tables

Use UUID primary keys in production where possible. Timestamp columns should use `timestamptz` and be stored in UTC, with the frontend displaying the required local timezone.

### `users`

Stores office-system accounts and, later, field-platform identities if a unified identity model is selected.

| Column | Suggested Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | User identifier. |
| `username` | `varchar(100)` unique not null | Login name. |
| `password_hash` | `text` not null | Store hashed passwords only. |
| `role` | `varchar(40)` not null | Office roles: Sales, Warehouse, Management, Admin. Future field roles may be separated or platform-scoped. |
| `platform_access` | `varchar(30)` not null | Suggested values: `office`, `field`, or `both`. |
| `status` | `varchar(30)` not null | Pending Approval, Active, Inactive. |
| `created_at` | `timestamptz` not null | Account creation date/time. |
| `approved_by` | `uuid` nullable | References approving Admin. |
| `approved_at` | `timestamptz` nullable | Approval time. |
| `updated_at` | `timestamptz` not null | Last account update. |

### `schedules`

Stores the daily office schedule and field sync state.

| Column | Suggested Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | Schedule identifier. |
| `schedule_date` | `date` not null | Scheduled service date. |
| `requested_time` | `time` not null | Requested time. |
| `schedule_type` | `varchar(60)` not null | Delivery, Customer Self-Collection, Collection at Vendor Place, Technical, Onsite. |
| `ps_no` | `varchar(60)` not null | PS reference number; may repeat for carry-forward continuation. |
| `company_name` | `varchar(255)` not null | Customer/company name. |
| `products_items` | `text` not null | Products or service description. |
| `location` | `text` not null | Job location. |
| `assigned_role` | `varchar(40)` not null | Driver, Technician, Engineer, Warehouse. |
| `assigned_person_id` | `uuid` nullable | Assigned staff identity when available. |
| `assigned_person_name` | `varchar(150)` not null | Snapshot/display name. |
| `input_by_user_id` | `uuid` not null | Office user who entered the schedule. |
| `status` | `varchar(40)` not null | Pending, In Progress, Completed, Carried Forward, Cancelled. |
| `completion_remarks` | `text` nullable | Operational/status remarks. |
| `field_sync_status` | `varchar(50)` not null | Not Sent, Sent to Field Platform, Accepted, In Progress, Completed, Issue Reported, Carried Forward. |
| `field_updated_by` | `varchar(150)` nullable | Field user display value or related user identifier. |
| `field_updated_at` | `timestamptz` nullable | Last field update time. |
| `carried_forward_from_id` | `uuid` nullable | Self-reference to original schedule record. |
| `created_by` | `uuid` not null | Audit owner. |
| `created_role` | `varchar(40)` not null | Creating user's role at creation time. |
| `created_at` | `timestamptz` not null | Creation time. |
| `last_updated_by` | `uuid` not null | Latest modifying user. |
| `last_updated_at` | `timestamptz` not null | Latest modification time. |

### `notifications`

| Column | Suggested Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | Notification identifier. |
| `user_id` | `uuid` nullable | Recipient; nullable only for role/global delivery patterns. |
| `role_target` | `varchar(40)` nullable | Optional notification target role. |
| `title` | `varchar(160)` not null | Notification title. |
| `message` | `text` not null | Notification details. |
| `type` | `varchar(50)` not null | Schedule created, status update, pending approval, sync pending, etc. |
| `schedule_id` | `uuid` nullable | Related schedule when applicable. |
| `is_read` | `boolean` not null default false | Read state. |
| `created_at` | `timestamptz` not null | Created date/time. |
| `read_at` | `timestamptz` nullable | Read date/time. |

### `activity_logs`

| Column | Suggested Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | Log identifier. |
| `actor_user_id` | `uuid` nullable | User responsible for action; nullable for system events. |
| `actor_role` | `varchar(40)` nullable | Role when action occurred. |
| `action` | `varchar(100)` not null | Example: `SCHEDULE_CREATED`, `USER_APPROVED`. |
| `entity_type` | `varchar(60)` not null | Example: `schedule`, `user`, `role_permission`. |
| `entity_id` | `uuid` nullable | Related record. |
| `message` | `text` nullable | Human-readable summary. |
| `before_data` | `jsonb` nullable | Optional snapshot before update. |
| `after_data` | `jsonb` nullable | Optional snapshot after update. |
| `created_at` | `timestamptz` not null | Audit time. |

### `role_permissions`

| Column | Suggested Type | Notes |
| --- | --- | --- |
| `id` | `uuid` primary key | Permission record identifier. |
| `role` | `varchar(40)` not null | Sales, Warehouse, Management, Admin. |
| `permission_key` | `varchar(80)` not null | Example: `view_own_report`, `view_all_reports`. |
| `is_allowed` | `boolean` not null | Enabled/disabled setting. |
| `updated_by` | `uuid` nullable | Admin who changed permission. |
| `updated_at` | `timestamptz` not null | Latest update time. |
|  |  | Unique constraint suggested on (`role`, `permission_key`). |

### Recommended Additional Tables

| Table | Purpose |
| --- | --- |
| `user_permission_overrides` | Stores additional user-specific permission access configured by Admin. |
| `schedule_status_history` | Stores each schedule status change and remark without overwriting history. |
| `field_sync_events` | Tracks sent payloads, retries, accepted field updates, and sync failures. |
| `schedule_types` | Allows Admin-managed schedule-type options. |
| `schedule_statuses` | Allows Admin-managed status options. |
| `system_settings` | Stores company profile, working hours, logo, and system configuration values. |
| `testing_checklist_results` | Optional storage for Admin testing checklist outcomes in later environments. |
| `refresh_tokens` or `sessions` | Supports secure authenticated login lifecycle. |

## 4. Suggested API Routes

All production routes should be namespaced, for example `/api/v1`.

### Authentication

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Validate username/password and return authenticated session/token. | Public |
| `POST` | `/api/v1/auth/signup` | Register office user as Pending Approval. | Public |
| `POST` | `/api/v1/auth/logout` | End authenticated session or invalidate refresh token. | Authenticated |
| `GET` | `/api/v1/auth/me` | Return current user and permission context. | Authenticated |

The short-form examples `POST /login` and `POST /signup` map to these versioned routes.

### Schedules

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/api/v1/schedules` | Query schedules by date, search, type, status, assignment, and pagination. | Office roles according to scope |
| `GET` | `/api/v1/schedules/:id` | View schedule details. | Authorized office users |
| `POST` | `/api/v1/schedules` | Create a schedule. | Sales, Warehouse, Admin if granted |
| `PUT` | `/api/v1/schedules/:id` | Edit schedule operational fields. | Authorized roles |
| `PATCH` | `/api/v1/schedules/:id/status` | Update status with required remarks. | Warehouse/Admin or permitted role |
| `POST` | `/api/v1/schedules/:id/carry-forward` | Mark original carried forward and create linked continuation. | Authorized roles |
| `POST` | `/api/v1/schedules/:id/send-to-field` | Queue/send assignment to Field Job Platform. | Authorized roles |
| `GET` | `/api/v1/schedules/export.csv` | Export filtered schedules. | Authorized reporting roles |

### Users and Permissions

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users` | List user accounts and approval state. | Admin |
| `PUT` | `/api/v1/users/:id` | Edit a user or update status. | Admin |
| `POST` | `/api/v1/users/:id/approve` | Approve pending signup. | Admin |
| `POST` | `/api/v1/users/:id/reset-password` | Start password reset process. | Admin |
| `DELETE` | `/api/v1/users/:id` | Deactivate or remove user according to retention policy. | Admin |
| `GET` | `/api/v1/role-permissions` | List role permissions. | Admin |
| `PUT` | `/api/v1/role-permissions/:role` | Replace/edit role permissions. | Admin |
| `GET` | `/api/v1/user-permission-overrides` | List individual overrides. | Admin |
| `PUT` | `/api/v1/user-permission-overrides/:userId` | Save individual override. | Admin |
| `DELETE` | `/api/v1/user-permission-overrides/:userId` | Remove override. | Admin |

### Notifications and Audit

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | Load notifications for current user. | Authenticated |
| `PATCH` | `/api/v1/notifications/:id/read` | Mark a notification read. | Notification recipient |
| `DELETE` | `/api/v1/notifications` | Clear current user's notifications. | Authenticated |
| `GET` | `/api/v1/activity-logs` | View audit entries with filtering. | Admin/authorized Management |

### Field Job Platform Integration

| Method | Route | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/api/v1/field/jobs` | Return assigned field jobs for authenticated field user. | Field platform roles |
| `GET` | `/api/v1/field/jobs/:id` | Return field job detail. | Assigned/authorized field user |
| `PATCH` | `/api/v1/field/jobs/:id/status` | Save field status and remarks; synchronize office schedule status. | Assigned/authorized field user |
| `POST` | `/api/v1/field/jobs/:id/accept` | Accept field assignment. | Assigned field user |
| `GET` | `/api/v1/field/sync-events` | Inspect sync state and failures. | Admin/system support |

## 5. Future Sync Logic for Field Job Platform

### Assignment Flow

1. Sales or Warehouse creates a schedule in the office frontend.
2. Backend validates required fields and stores the schedule with `field_sync_status = 'Not Sent'`.
3. An authorized office user selects **Send to Field Platform**.
4. Backend verifies an applicable field assignment and records a sync event.
5. Schedule changes to `field_sync_status = 'Sent to Field Platform'`.
6. Field Job Platform fetches or receives the new assignment.
7. When the assigned field user accepts it, backend changes sync status to `Accepted`.

### Field Status Update Flow

1. Driver, Technician, or Engineer submits a status update through Platform 2.
2. Backend confirms the field user may update that assigned job.
3. Backend writes a status-history entry and updates the schedule field-sync values.
4. If mapping applies, the office schedule `status` is also updated, for example to `In Progress` or `Completed`.
5. Backend creates an office notification and activity log.
6. The office dashboard receives updated values on its next refresh or through later real-time updates.

### Carry Forward Flow

1. If a job cannot be completed, an authorized update requires carry-forward remarks.
2. Backend marks the original schedule `Carried Forward`.
3. Within one database transaction, backend creates a new schedule linked by `carried_forward_from_id`.
4. The new schedule begins as `Pending` or `In Progress`, depending on the workflow choice.
5. Field sync history and office notifications record both records.

### Reliability and Audit Recommendations

- Use database transactions for carry forward and status synchronization.
- Store each external sync attempt in `field_sync_events`.
- Make incoming status updates idempotent using an event identifier.
- Retry temporary sync failures without creating duplicate schedules or status records.
- Record who changed each schedule, from which platform, and when.

## 6. User Authentication Flow

### Sign Up and Approval

1. New office user submits username, password, and requested role from the sign-up form.
2. Backend validates the requested role as Sales, Warehouse, or Management.
3. Backend hashes the password and creates the account with status `Pending Approval`.
4. Admin sees the pending account in User Management.
5. Admin approves or rejects/deactivates the account.
6. Only an `Active` approved account can successfully authenticate.

Admin creation should be handled through a protected seed or administrator provisioning process rather than public sign-up.

### Login

1. User submits username and password.
2. Backend verifies credentials against the stored password hash.
3. Backend refuses login for Pending Approval or Inactive users.
4. Backend returns an authenticated session cookie or short-lived access token with a secure renewal strategy.
5. Frontend retrieves the authenticated user's role and permissions from `/auth/me`.
6. API authorization remains enforced by the backend even if frontend navigation is hidden.

### Security Planning Notes

- Hash passwords using a suitable password hashing library such as Argon2 or bcrypt.
- Use HTTPS in deployed environments.
- Prefer HTTP-only secure cookies for browser session handling where feasible.
- Add rate limiting for login and password-reset endpoints.
- Log account approvals, status changes, and permission updates.

## 7. Role Permission Logic

Driver, Technician, and Engineer are intended for the separate Field Job Platform, not the office dashboard.

### Office Role Baseline

| Capability | Sales | Warehouse | Management | Admin |
| --- | --- | --- | --- | --- |
| Dashboard access | Yes | Yes | Yes | Yes |
| Add schedule | Yes | Yes | No by default | Full access |
| View own report | Yes | Yes | Yes | Full access |
| View all reports | No | Yes | Yes | Full access |
| View daily schedule | Own submitted schedules | All operational schedules | All schedules | All schedules |
| Schedule arrangement | No | Yes | No by default | Full access |
| Edit schedule | Own/permitted records only | Yes, subject to workflow | No by default | Full access |
| Update status | No by default | Yes | No by default | Full access |
| User Management | No | No | No | Yes |
| System Settings | No | No | No | Yes |
| Testing Checklist | No | No | No | Yes |

### Permission Enforcement

- Store baseline permissions in `role_permissions`.
- Store exceptional additional rights in `user_permission_overrides`.
- Build an effective permission set at authentication or request time.
- Require middleware authorization for every protected API route.
- Apply record-level restrictions, especially for Sales users viewing only their submitted schedules.
- Ensure Admin operations create activity log entries.

## 8. localStorage Migration Plan to PostgreSQL

### Current Browser Collections

The frontend demonstration currently stores records in `localStorage`, including:

| Current Collection | Future Database Destination |
| --- | --- |
| `users` | `users` |
| `schedules` | `schedules` and optionally `schedule_status_history` |
| `notifications` | `notifications` |
| `activityLogs` | `activity_logs` |
| `rolePermissions` | `role_permissions` |
| `userOverrides` | `user_permission_overrides` |
| `testingChecklist` | Optional `testing_checklist_results` |
| Schedule/status settings | `schedule_types`, `schedule_statuses`, or `system_settings` |
| UI filter/date state | Keep client-side; do not require production database migration unless user preferences are needed |

### Recommended Migration Stages

1. Finalize PostgreSQL schema, permitted enum/reference values, and ID strategy.
2. Create backend migrations and seed baseline role-permission and system-setting data.
3. Add API endpoints while the existing frontend continues using demo data during development.
4. Replace frontend direct `localStorage` reads/writes with API service calls.
5. Optionally create an Admin-only one-time demo import tool that reads exported localStorage JSON and posts validated records to a migration endpoint.
6. Transform existing string IDs and timestamps into PostgreSQL-compatible records.
7. Validate referential links, especially carry-forward schedule relationships and user audit references.
8. Verify migrated data using dashboard totals, schedule detail views, notifications, permissions, and audit checks.
9. Retain only non-sensitive client preferences locally after production cutover.
10. Remove or disable demo reset/import functionality in production environments.

### Migration Validation Rules

- Never migrate plain-text demo passwords into production; accounts must set secure passwords through an approved process.
- Reject invalid office roles or field roles assigned to the wrong platform.
- Validate schedule type, schedule status, and field sync status values.
- Preserve `carried_forward_from_id` relationships after ID conversion.
- Translate audit display names to user IDs where possible while preserving readable snapshots.
- Back up imported source data before executing production migration.

## Implementation Boundary

No backend code, API server, database schema migration, or authentication service is implemented yet. This plan is intended to guide the next implementation phase once backend development begins.
