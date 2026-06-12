# Datacom Daily Schedule System - Project Structure

## Project Overview

The Datacom Daily Schedule System is currently a frontend-only office operations application for creating, reviewing, assigning, and tracking daily schedule jobs.

## Current Frontend Modules

| Module | Purpose |
| --- | --- |
| Login / Sign Up | Provides login for approved users and sign-up registration with pending approval workflow. |
| Dashboard | Displays daily operational summary cards and an upcoming schedule preview. |
| Daily Schedule | Shows full schedule records, operational details, status handling, carry forward workflow, printing, and export controls. |
| Add Schedule | Allows office users to create schedule records with assisted entry, validation, assignment, and default status behavior. |
| User Management | Allows Admin to review users, approve pending registrations, update access status, edit users, reset passwords, and delete demo users. |
| Role Settings | Shows and edits role permission settings and user permission overrides. |
| System Settings | Contains company, schedule type, status, working hours, maintenance, and demo data reset settings. |
| Notifications | Displays operational notifications, unread status, and mark-read/clear actions. |
| Timeline View | Displays daily schedules as ordered timeline cards with schedule details access. |
| Testing Checklist | Allows Admin to record frontend feature test status and remarks. |

## Confirmed Office Roles

This system is intended for office users only.

| Role | General Access Purpose |
| --- | --- |
| Sales | Create schedules and review schedules or reporting relevant to their submissions. |
| Warehouse | Arrange and monitor operational schedules, including status activity and reporting access. |
| Management | Review daily schedules, reports, and operational summaries. |
| Admin | Manage users, permissions, system settings, testing records, and full administrative access. |

## Future Platform 2

**Field Job Platform** is planned as a separate application for:

- Driver
- Technician
- Engineer

Field personnel will not use the office Daily Schedule System dashboard. The planned workflow is:

1. An office user creates and assigns a schedule job in the Daily Schedule System.
2. The job is sent or synchronized to the Field Job Platform.
3. The assigned Driver, Technician, or Engineer views and updates the field job in Platform 2.
4. Field status updates synchronize back to the Daily Schedule System for office monitoring.

## Future Architecture

The planned production architecture is:

```text
Office Daily Schedule System Frontend
                 |
                 | 
            Shared Backend
                 |
            Shared Database
                 |
                 |
      Field Job Platform Frontend
```

In summary: **two frontends, one backend, one database**.

## Current Implementation Status

| Area | Current Status |
| --- | --- |
| Application stage | Frontend only |
| Data storage | Browser `localStorage` demo data |
| Backend services | Not implemented yet |
| Database | Not implemented yet |
| Platform integration | Placeholder workflow only; Field Job Platform synchronization is planned for a future backend implementation |

## Current Frontend Files

| File | Responsibility |
| --- | --- |
| `index.html` | Login and sign-up page markup |
| `style.css` | Login and sign-up page styling |
| `main.js` | Login, sign-up, session, and user demo data behavior |
| `dashboard.html` | Dashboard and operational/admin section markup |
| `dashboard.css` | Dashboard, table, panel, modal, timeline, and admin styling |
| `dashboard.js` | Dashboard behavior, schedule workflows, role simulation, notifications, testing checklist, and centralized localStorage demo data |

