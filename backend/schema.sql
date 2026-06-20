BEGIN;

CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(40) NOT NULL
    CHECK (role IN ('Sales', 'Warehouse', 'Management', 'Admin')),
  status VARCHAR(30) NOT NULL DEFAULT 'Pending Approval'
    CHECK (status IN ('Pending Approval', 'Active', 'Inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schedules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  schedule_date TEXT NOT NULL,
  requested_time TEXT NOT NULL,
  schedule_type VARCHAR(60) NOT NULL
    CHECK (schedule_type IN (
      'Delivery',
      'Customer Self-Collection',
      'Collection at Vendor Place',
      'Engineer Onsite',
      'Technician Onsite',
      'Engineer Remote',
      'Delivery + Technician Onsite',
      'Delivery + Engineer Onsite',
      'Delivery + All Involved',
      'Site Survey',
      'Lazada Dropoff',
      'Shopee Dropoff'
    )),
  ps_no VARCHAR(60) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  products_items TEXT NOT NULL,
  location TEXT NOT NULL,
  pic VARCHAR(150) NOT NULL DEFAULT '-',
  contact_number VARCHAR(80) NOT NULL DEFAULT '-',
  assigned_role VARCHAR(40)
    CHECK (assigned_role IN ('Driver', 'Technician', 'Engineer', 'All Team')),
  assigned_person VARCHAR(150),
  input_by BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(40) NOT NULL DEFAULT 'Submitted'
    CHECK (status IN ('Submitted', 'Pending', 'Ready to Ship', 'In Progress', 'Completed', 'Carried Forward', 'Cancelled')),
  priority VARCHAR(20) NOT NULL DEFAULT 'Normal'
    CHECK (priority IN ('Normal', 'Urgent', 'Critical')),
  remarks TEXT,
  field_sync_status VARCHAR(50) NOT NULL DEFAULT 'Not Sent'
    CHECK (field_sync_status IN (
      'Not Sent',
      'Sent to Field Platform',
      'Accepted',
      'In Progress',
      'Completed',
      'Issue Reported',
      'Carried Forward'
    )),
  created_by BIGINT NOT NULL REFERENCES users(id),
  updated_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_name VARCHAR(80) NOT NULL,
  record_id BIGINT,
  action VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role VARCHAR(40) NOT NULL
    CHECK (role IN ('Sales', 'Warehouse', 'Management', 'Admin')),
  permission_name VARCHAR(100) NOT NULL,
  is_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_role_permission UNIQUE (role, permission_name)
);

CREATE INDEX idx_users_status_role
  ON users (status, role);

CREATE INDEX idx_schedules_date_time
  ON schedules (schedule_date, requested_time);

CREATE INDEX idx_schedules_status_date
  ON schedules (status, schedule_date);

CREATE INDEX idx_schedules_type_date
  ON schedules (schedule_type, schedule_date);

CREATE INDEX idx_schedules_ps_no
  ON schedules (ps_no);

CREATE INDEX idx_schedules_input_by_date
  ON schedules (input_by, schedule_date);

CREATE INDEX idx_schedules_field_sync_status
  ON schedules (field_sync_status);

CREATE INDEX idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX idx_activity_logs_module_record
  ON activity_logs (module_name, record_id);

CREATE INDEX idx_activity_logs_created_at
  ON activity_logs (created_at DESC);

COMMIT;
