"use strict";

const { hashPassword, signToken, verifyPassword, verifyToken } = require("./auth");

const officeRoles = ["Sales", "Warehouse", "Management", "Admin"];
const publicSignupRoles = ["Sales", "Warehouse", "Management"];
const scheduleTypes = [
  "Delivery",
  "Customer Self-Collection",
  "Collection at Vendor Place",
  "Engineer Onsite",
  "Technician Onsite",
  "Engineer Remote",
  "Delivery + Technician Onsite",
  "Delivery + Engineer Onsite",
  "Delivery + All Involved",
  "Site Survey",
  "Lazada Dropoff",
  "Shopee Dropoff"
];
const assignedRoles = ["Driver", "Technician", "Engineer", "All Team"];
const scheduleStatuses = ["Submitted", "Pending", "Ready to Ship", "In Progress", "Completed", "Carried Forward", "Cancelled"];
const priorityOptions = ["Normal", "Urgent", "Critical"];
const anytimeRequestedTime = "Anytime (10am - 5pm)";
const tbaValue = "TBA";
const permissionFields = {
  viewOwnReport: "View Own Report",
  viewAllReports: "View All Reports",
  scheduleArrangement: "Schedule Arrangement",
  updateStatus: "Update Status",
  userManagement: "User Management",
  systemSettings: "System Settings"
};

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function authenticate(pool) {
  return asyncRoute(async (request, response, next) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    const tokenUser = verifyToken(token);
    if (!tokenUser) {
      return response.status(401).json({ message: "Please sign in again." });
    }
    const result = await pool.query(
      "SELECT id, username, role FROM users WHERE id = $1 AND status = 'Active'",
      [tokenUser.id]
    );
    if (!result.rowCount) {
      return response.status(401).json({ message: "Please sign in again." });
    }
    request.user = { ...result.rows[0], id: String(result.rows[0].id) };
    return next();
  });
}

function requireAdmin(request, response, next) {
  if (request.user.role !== "Admin") {
    return response.status(403).json({ message: "Admin access is required." });
  }
  return next();
}

function requireLaunchCleanupAccess(request, response, next) {
  if (!["Admin", "Management"].includes(request.user.role)) {
    return response.status(403).json({ message: "Admin or Management access is required." });
  }
  return next();
}

function requirePermission(pool, permissionName) {
  return asyncRoute(async (request, response, next) => {
    if (!await hasPermission(pool, request.user.role, permissionName)) {
      return response.status(403).json({ message: `${permissionName} permission is required.` });
    }
    return next();
  });
}

function requiredText(value) {
  return typeof value === "string" && value.trim() !== "";
}

async function logActivity(client, moduleName, recordId, action, oldValue, newValue, userId) {
  await client.query(
    `INSERT INTO activity_logs
       (module_name, record_id, action, old_value, new_value, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [moduleName, recordId, action, oldValue || null, newValue || null, userId]
  );
}

async function notifyActiveUsers(client, title, message, audience = "all") {
  const roleFilter = audience === "admin" ? "AND role = 'Admin'" : "";
  await client.query(
    `INSERT INTO notifications (user_id, title, message)
     SELECT id, $1, $2
       FROM users
      WHERE status = 'Active' ${roleFilter}`,
    [title, message]
  );
}

async function hasPermission(pool, role, permissionName) {
  const result = await pool.query(
    `SELECT is_allowed FROM role_permissions
     WHERE role = $1 AND permission_name = $2`,
    [role, permissionName]
  );
  return Boolean(result.rows[0]?.is_allowed);
}

function toUser(row) {
  return {
    id: String(row.id),
    username: row.username,
    role: row.role,
    status: row.status,
    createdDate: row.created_date
  };
}

function toSchedule(row) {
  const requestedTime = String(row.requested_time || "");
  return {
    id: String(row.id),
    date: row.date,
    requestedTime: requestedTime.includes(":") ? requestedTime.slice(0, 5) : requestedTime,
    type: row.schedule_type,
    psNo: row.ps_no,
    companyName: row.company_name,
    products: row.products_items,
    location: row.location,
    pic: row.pic || "-",
    contactNumber: row.contact_number || "-",
    assignedRole: row.assigned_role || "-",
    assignedPerson: row.assigned_person || "-",
    priority: row.priority || "Normal",
    inputBy: row.input_by_name,
    status: row.status,
    remarks: row.remarks || "-",
    fieldSyncStatus: row.field_sync_status,
    fieldUpdatedBy: "-",
    fieldUpdatedAt: "-",
    createdAt: row.created_display,
    lastUpdatedBy: row.updated_by_name,
    lastUpdatedAt: row.updated_display
  };
}

const scheduleSelect = `
  SELECT s.id, s.schedule_date::text AS date, s.requested_time::text AS requested_time,
         s.schedule_type, s.ps_no, s.company_name, s.products_items, s.location,
         s.pic, s.contact_number, s.assigned_role, s.assigned_person, s.priority,
         input_user.username AS input_by_name, s.status, s.remarks, s.field_sync_status, updated_user.username AS updated_by_name,
         to_char(s.created_at AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY, FMHH12:MI AM') AS created_display,
         to_char(s.updated_at AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY, FMHH12:MI AM') AS updated_display
    FROM schedules s
    JOIN users input_user ON input_user.id = s.input_by
    JOIN users updated_user ON updated_user.id = s.updated_by`;

function schedulePayload(body) {
  return {
    date: body.date,
    requestedTime: String(body.requestedTime || "").trim(),
    type: body.type,
    psNo: String(body.psNo || "").trim(),
    companyName: String(body.companyName || "").trim(),
    products: String(body.products || "").trim(),
    location: String(body.location || "").trim(),
    pic: String(body.pic || "").trim(),
    contactNumber: String(body.contactNumber || "").trim(),
    assignedRole: assignedRoles.includes(body.assignedRole) ? body.assignedRole : null,
    assignedPerson: String(body.assignedPerson || "").trim(),
    priority: priorityOptions.includes(body.priority) ? body.priority : "Normal",
    status: body.status || "Submitted",
    remarks: String(body.remarks || "").trim() || null
  };
}

function validSchedule(payload) {
  const hasValidDate = payload.date === tbaValue || /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ""));
  const hasValidTime = [anytimeRequestedTime, tbaValue].includes(payload.requestedTime) || /^\d{2}:\d{2}$/.test(payload.requestedTime);
  return hasValidDate
    && hasValidTime
    && scheduleTypes.includes(payload.type)
    && requiredText(payload.psNo)
    && requiredText(payload.companyName)
    && requiredText(payload.products)
    && requiredText(payload.location)
    && requiredText(payload.pic)
    && requiredText(payload.contactNumber)
    && assignedRoles.includes(payload.assignedRole)
    && priorityOptions.includes(payload.priority)
    && scheduleStatuses.includes(payload.status);
}

function rowToSchedulePayload(row) {
  return {
    date: String(row.schedule_date || ""),
    requestedTime: String(row.requested_time || ""),
    type: row.schedule_type,
    psNo: row.ps_no,
    companyName: row.company_name,
    products: row.products_items,
    location: row.location,
    pic: row.pic || "-",
    contactNumber: row.contact_number || "-",
    assignedRole: row.assigned_role,
    assignedPerson: row.assigned_person || "",
    priority: row.priority || "Normal",
    status: row.status,
    remarks: row.remarks || null
  };
}

function applyScheduleEditPolicy(user, existingRow, payload) {
  if (user.role === "Admin") {
    return payload;
  }
  if (user.role === "Warehouse") {
    if (["Submitted", "Pending", "Ready to Ship", "In Progress", "Carried Forward"].includes(existingRow.status)) {
      return payload;
    }
    return null;
  }
  if (user.role !== "Sales" || String(existingRow.input_by) !== String(user.id)) {
    return null;
  }
  const editableByStatus = {
    Submitted: "all",
    Pending: ["date", "requestedTime", "companyName", "location", "products", "remarks"],
    "In Progress": ["remarks", "contactNumber"],
    "Ready to Ship": ["remarks"],
    "Carried Forward": ["date", "requestedTime", "remarks"],
    Completed: [],
    Cancelled: []
  };
  const allowed = editableByStatus[existingRow.status] || [];
  if (allowed === "all") {
    return payload;
  }
  if (!allowed.length) {
    return null;
  }
  const lockedPayload = rowToSchedulePayload(existingRow);
  allowed.forEach((field) => {
    lockedPayload[field] = payload[field];
  });
  return lockedPayload;
}

function registerRoutes(app, pool) {
  const requireAuth = authenticate(pool);
  const requireUserManagement = requirePermission(pool, "User Management");

  app.post("/api/auth/signup", asyncRoute(async (request, response) => {
    const { username, password, role } = request.body;
    if (!requiredText(username) || !requiredText(password) || !publicSignupRoles.includes(role)) {
      return response.status(400).json({ message: "Provide a username, password, and valid role." });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO users (username, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, username, role, status, created_at::date::text AS created_date`,
        [username.trim(), hashPassword(password), role]
      );
      const newUser = result.rows[0];
      await notifyActiveUsers(client, "User pending approval", `${newUser.username} is waiting for Admin approval. Changed by ${newUser.username}.`, "admin");
      await client.query("COMMIT");
      return response.status(201).json({ user: toUser(newUser) });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") {
        return response.status(409).json({ message: "This username already exists." });
      }
      throw error;
    } finally {
      client.release();
    }
  }));

  app.post("/api/auth/login", asyncRoute(async (request, response) => {
    const { username, password } = request.body;
    if (!requiredText(username) || !requiredText(password)) {
      return response.status(400).json({ message: "Username and password are required." });
    }
    const result = await pool.query(
      `SELECT id, username, password_hash, role, status
       FROM users WHERE lower(username) = lower($1)`,
      [username.trim()]
    );
    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return response.status(401).json({ message: "Incorrect username or password." });
    }
    if (user.status !== "Active") {
      return response.status(403).json({
        message: user.status === "Pending Approval"
          ? "Your account is pending Admin approval."
          : "Your account is inactive. Please contact an Admin."
      });
    }
    return response.json({
      token: signToken(user),
      user: { id: String(user.id), username: user.username, role: user.role, status: user.status }
    });
  }));

  app.get("/api/session", requireAuth, (request, response) => {
    response.json({ user: request.user });
  });

  app.get("/api/assignees", requireAuth, asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT id, username, role
         FROM users
        WHERE status = 'Active'
        ORDER BY username`
    );
    response.json({
      assignees: result.rows.map((row) => ({
        id: String(row.id),
        username: row.username,
        role: row.role
      }))
    });
  }));

  app.get("/api/schedules", requireAuth, asyncRoute(async (request, response) => {
    const parameters = [];
    const canViewAll = await hasPermission(pool, request.user.role, "View All Reports");
    const canViewOwn = await hasPermission(pool, request.user.role, "View Own Report");
    const restriction = canViewAll ? "" : canViewOwn ? " WHERE s.input_by = $1" : " WHERE FALSE";
    if (canViewOwn && !canViewAll) {
      parameters.push(request.user.id);
    }
    const result = await pool.query(`${scheduleSelect}${restriction} ORDER BY s.schedule_date, s.requested_time`, parameters);
    response.json({ schedules: result.rows.map(toSchedule) });
  }));

  app.post("/api/schedules", requireAuth, asyncRoute(async (request, response) => {
    if (!["Sales", "Warehouse", "Admin"].includes(request.user.role)) {
      return response.status(403).json({ message: "Your role cannot add schedules." });
    }
    const payload = schedulePayload(request.body);
    if (request.user.role === "Sales") {
      payload.status = "Submitted";
    }
    if (!validSchedule(payload)) {
      return response.status(400).json({ message: "Complete all required schedule fields." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const insert = await client.query(
        `INSERT INTO schedules
          (schedule_date, requested_time, schedule_type, ps_no, company_name, products_items,
           location, pic, contact_number, assigned_role, assigned_person, priority, input_by, status,
           remarks, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $13, $13)
         RETURNING id`,
        [payload.date, payload.requestedTime, payload.type, payload.psNo, payload.companyName,
          payload.products, payload.location, payload.pic, payload.contactNumber, payload.assignedRole,
          payload.assignedPerson, payload.priority, request.user.id, payload.status, payload.remarks]
      );
      const id = insert.rows[0].id;
      await logActivity(client, "Schedules", id, "Schedule Created", null, payload, request.user.id);
      await notifyActiveUsers(client, "New schedule added", `${payload.psNo} was entered for ${payload.companyName}. Changed by ${request.user.username}.`);
      const record = await client.query(`${scheduleSelect} WHERE s.id = $1`, [id]);
      await client.query("COMMIT");
      return response.status(201).json({ schedule: toSchedule(record.rows[0]) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.put("/api/schedules/:id", requireAuth, asyncRoute(async (request, response) => {
    const canArrange = await hasPermission(pool, request.user.role, "Schedule Arrangement");
    if (request.user.role !== "Sales" && !canArrange) {
      return response.status(403).json({ message: "Your role cannot edit schedules." });
    }
    const payload = schedulePayload({ ...request.body, status: request.body.status || "Submitted" });
    if (!validSchedule(payload)) {
      return response.status(400).json({ message: "Complete all required schedule fields." });
    }
    const existing = await pool.query("SELECT * FROM schedules WHERE id = $1", [request.params.id]);
    if (!existing.rowCount) {
      return response.status(404).json({ message: "Schedule not found or unavailable." });
    }
    const permittedPayload = applyScheduleEditPolicy(request.user, existing.rows[0], payload);
    if (!permittedPayload) {
      return response.status(403).json({ message: "This schedule is read only for your role and current status." });
    }
    const update = await pool.query(
      `UPDATE schedules SET
         schedule_date = $1, requested_time = $2, schedule_type = $3, ps_no = $4,
         company_name = $5, products_items = $6, location = $7, pic = $8, contact_number = $9,
         assigned_role = $10, assigned_person = $11, priority = $12, remarks = $13,
         updated_by = $14, updated_at = CURRENT_TIMESTAMP
       WHERE id = $15 AND ($16 <> 'Sales' OR input_by = $14)
       RETURNING id`,
      [permittedPayload.date, permittedPayload.requestedTime, permittedPayload.type, permittedPayload.psNo, permittedPayload.companyName, permittedPayload.products,
        permittedPayload.location, permittedPayload.pic, permittedPayload.contactNumber, permittedPayload.assignedRole, permittedPayload.assignedPerson, permittedPayload.priority, permittedPayload.remarks,
        request.user.id, request.params.id, request.user.role]
    );
    if (!update.rowCount) {
      return response.status(404).json({ message: "Schedule not found or unavailable." });
    }
    await logActivity(pool, "Schedules", request.params.id, "Schedule Updated", null, permittedPayload, request.user.id);
    await notifyActiveUsers(pool, "Schedule edited", `${permittedPayload.psNo} schedule details were updated. Changed by ${request.user.username}.`);
    const record = await pool.query(`${scheduleSelect} WHERE s.id = $1`, [request.params.id]);
    return response.json({ schedule: toSchedule(record.rows[0]) });
  }));

  app.patch("/api/schedules/:id/status", requireAuth, asyncRoute(async (request, response) => {
    if (!await hasPermission(pool, request.user.role, "Update Status")) {
      return response.status(403).json({ message: "Your role cannot update schedule status." });
    }
    if (!scheduleStatuses.includes(request.body.status) || !requiredText(request.body.remarks)) {
      return response.status(400).json({ message: "Status and remarks are required." });
    }
    const result = await pool.query(
      `UPDATE schedules SET status = $1, remarks = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING id`,
      [request.body.status, request.body.remarks.trim(), request.user.id, request.params.id]
    );
    if (!result.rowCount) {
      return response.status(404).json({ message: "Schedule not found." });
    }
    await logActivity(pool, "Schedules", request.params.id, "Schedule Status Updated", null, request.body, request.user.id);
    const updatedSchedule = await pool.query("SELECT ps_no FROM schedules WHERE id = $1", [request.params.id]);
    await notifyActiveUsers(pool, "Status changed", `${updatedSchedule.rows[0].ps_no} is now ${request.body.status}. Changed by ${request.user.username}.`);
    const record = await pool.query(`${scheduleSelect} WHERE s.id = $1`, [request.params.id]);
    return response.json({ schedule: toSchedule(record.rows[0]) });
  }));

  app.patch("/api/schedules/:id/sync", requireAuth, asyncRoute(async (request, response) => {
    if (!await hasPermission(pool, request.user.role, "Schedule Arrangement")) {
      return response.status(403).json({ message: "Your role cannot send field work." });
    }
    const result = await pool.query(
      `UPDATE schedules SET field_sync_status = 'Sent to Field Platform',
       updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [request.user.id, request.params.id]
    );
    if (!result.rowCount) {
      return response.status(404).json({ message: "Schedule not found." });
    }
    await logActivity(pool, "Schedules", request.params.id, "Field Platform Sync Requested", null, null, request.user.id);
    const syncedSchedule = await pool.query("SELECT ps_no FROM schedules WHERE id = $1", [request.params.id]);
    await notifyActiveUsers(pool, "Field sync status changed", `${syncedSchedule.rows[0].ps_no} was sent to the field platform. Changed by ${request.user.username}.`);
    const record = await pool.query(`${scheduleSelect} WHERE s.id = $1`, [request.params.id]);
    return response.json({ schedule: toSchedule(record.rows[0]) });
  }));

  app.post("/api/schedules/:id/carry-forward", requireAuth, asyncRoute(async (request, response) => {
    if (!await hasPermission(pool, request.user.role, "Schedule Arrangement")) {
      return response.status(403).json({ message: "Your role cannot carry forward schedules." });
    }
    if (!requiredText(request.body.date) || !requiredText(request.body.requestedTime)
        || !requiredText(request.body.reason) || !scheduleStatuses.includes(request.body.status)) {
      return response.status(400).json({ message: "Date, time, reason, and status are required." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT * FROM schedules WHERE id = $1 FOR UPDATE", [request.params.id]);
      const entry = existing.rows[0];
      if (!entry) {
        await client.query("ROLLBACK");
        return response.status(404).json({ message: "Schedule not found." });
      }
      const originalDate = entry.schedule_date instanceof Date
        ? entry.schedule_date.toISOString().slice(0, 10)
        : String(entry.schedule_date);
      if (request.body.date !== tbaValue && originalDate !== tbaValue && request.body.date <= originalDate) {
        await client.query("ROLLBACK");
        return response.status(400).json({ message: "Continuation date must be after the original date." });
      }
      await client.query(
        `UPDATE schedules SET status = 'Carried Forward', field_sync_status = 'Carried Forward',
         remarks = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [`Carry forward reason: ${request.body.reason.trim()}`, request.user.id, request.params.id]
      );
      const inserted = await client.query(
        `INSERT INTO schedules
          (schedule_date, requested_time, schedule_type, ps_no, company_name, products_items, location,
           pic, contact_number, assigned_role, assigned_person, priority, input_by, status, remarks,
           created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
         RETURNING id`,
        [request.body.date, request.body.requestedTime, entry.schedule_type, entry.ps_no, entry.company_name,
          entry.products_items, entry.location, entry.pic, entry.contact_number, entry.assigned_role,
          entry.assigned_person, entry.priority, entry.input_by, request.body.status,
          `Carried forward from ${entry.ps_no}: ${request.body.reason.trim()}`, request.user.id]
      );
      await logActivity(client, "Schedules", entry.id, "Schedule Carried Forward", null, request.body, request.user.id);
      await notifyActiveUsers(client, "Job carried forward", `${entry.ps_no} continues on ${request.body.date}. Changed by ${request.user.username}.`);
      const original = await client.query(`${scheduleSelect} WHERE s.id = $1`, [entry.id]);
      const continuation = await client.query(`${scheduleSelect} WHERE s.id = $1`, [inserted.rows[0].id]);
      await client.query("COMMIT");
      return response.json({
        original: toSchedule(original.rows[0]),
      continuation: toSchedule(continuation.rows[0])
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get("/api/users", requireAuth, requireAdmin, requireUserManagement, asyncRoute(async (request, response) => {
    const result = await pool.query(
      "SELECT id, username, role, status, created_at::date::text AS created_date FROM users ORDER BY created_at"
    );
    response.json({ users: result.rows.map(toUser) });
  }));

  app.patch("/api/users/:id", requireAuth, requireAdmin, requireUserManagement, asyncRoute(async (request, response) => {
    const updates = [];
    const values = [];
    if (requiredText(request.body.username)) {
      values.push(request.body.username.trim());
      updates.push(`username = $${values.length}`);
    }
    if (officeRoles.includes(request.body.role)) {
      values.push(request.body.role);
      updates.push(`role = $${values.length}`);
    }
    if (["Pending Approval", "Active", "Inactive"].includes(request.body.status)) {
      values.push(request.body.status);
      updates.push(`status = $${values.length}`);
    }
    if (!updates.length) {
      return response.status(400).json({ message: "No valid changes supplied." });
    }
    values.push(request.params.id);
    try {
      const result = await pool.query(
        `UPDATE users SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE id = $${values.length}
         RETURNING id, username, role, status, created_at::date::text AS created_date`,
        values
      );
      if (!result.rowCount) {
        return response.status(404).json({ message: "User not found." });
      }
      await logActivity(pool, "Users", request.params.id, "User Updated", null, request.body, request.user.id);
      return response.json({ user: toUser(result.rows[0]) });
    } catch (error) {
      if (error.code === "23505") {
        return response.status(409).json({ message: "This username already exists." });
      }
      throw error;
    }
  }));

  app.delete("/api/users/:id", requireAuth, requireAdmin, requireUserManagement, asyncRoute(async (request, response) => {
    if (String(request.user.id) === String(request.params.id)) {
      return response.status(400).json({ message: "You cannot deactivate your own account." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE users SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING id, username, role, status, created_at::date::text AS created_date`,
        [request.params.id]
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        return response.status(404).json({ message: "User not found." });
      }
      await client.query("DELETE FROM notifications");
      await client.query("DELETE FROM activity_logs");
      await client.query("COMMIT");
      response.json({ user: toUser(result.rows[0]) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get("/api/role-permissions", requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const result = await pool.query("SELECT role, permission_name, is_allowed FROM role_permissions");
    const permissions = officeRoles.map((role) => {
      const output = { role, additional: role === "Admin" ? "Full access to all features" : "" };
      Object.entries(permissionFields).forEach(([field, name]) => {
        const stored = result.rows.find((row) => row.role === role && row.permission_name === name);
        output[field] = Boolean(stored?.is_allowed);
      });
      return output;
    });
    response.json({ permissions });
  }));

  app.put("/api/role-permissions/:role", requireAuth, requireAdmin, asyncRoute(async (request, response) => {
    const role = request.params.role;
    if (!officeRoles.includes(role)) {
      return response.status(404).json({ message: "Role not found." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const [field, permissionName] of Object.entries(permissionFields)) {
        await client.query(
          `INSERT INTO role_permissions (role, permission_name, is_allowed)
           VALUES ($1, $2, $3)
           ON CONFLICT (role, permission_name) DO UPDATE SET
             is_allowed = EXCLUDED.is_allowed, updated_at = CURRENT_TIMESTAMP`,
          [role, permissionName, Boolean(request.body[field])]
        );
      }
      await logActivity(client, "Role Permissions", null, "Role Permissions Updated", null, request.body, request.user.id);
      await client.query("COMMIT");
      return response.json({ message: "Permissions updated." });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.delete("/api/admin/launch-data", requireAuth, requireLaunchCleanupAccess, asyncRoute(async (request, response) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const notifications = await client.query("DELETE FROM notifications");
      const activityLogs = await client.query("DELETE FROM activity_logs");
      const schedules = await client.query("DELETE FROM schedules");
      const users = await client.query("DELETE FROM users WHERE role <> 'Admin'");
      await client.query("COMMIT");
      response.json({
        message: "Launch data cleared.",
        deleted: {
          notifications: notifications.rowCount,
          activityLogs: activityLogs.rowCount,
          schedules: schedules.rowCount,
          users: users.rowCount
        }
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }));

  app.get("/api/notifications", requireAuth, asyncRoute(async (request, response) => {
    const result = await pool.query(
      `SELECT id, title, message, is_read,
       to_char(created_at AT TIME ZONE 'Asia/Singapore', 'DD Mon YYYY, FMHH12:MI AM') AS time
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [request.user.id]
    );
    response.json({
      notifications: result.rows.map((row) => ({
        id: String(row.id), title: row.title, message: row.message, read: row.is_read, time: row.time
      }))
    });
  }));

  app.patch("/api/notifications/:id/read", requireAuth, asyncRoute(async (request, response) => {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2", [request.params.id, request.user.id]);
    response.status(204).send();
  }));

  app.patch("/api/notifications/read-all", requireAuth, asyncRoute(async (request, response) => {
    await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1", [request.user.id]);
    response.status(204).send();
  }));

  app.delete("/api/notifications", requireAuth, asyncRoute(async (request, response) => {
    await pool.query("DELETE FROM notifications WHERE user_id = $1", [request.user.id]);
    response.status(204).send();
  }));
}

module.exports = { registerRoutes };
