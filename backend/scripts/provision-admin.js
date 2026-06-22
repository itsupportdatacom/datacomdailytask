"use strict";

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const { pool } = require("../db");
const { hashPassword } = require("../auth");

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "admin";
const rolePermissions = {
  Sales: ["View Own Report"],
  Warehouse: ["View Own Report", "View All Reports", "Schedule Arrangement", "Update Status"],
  Management: ["View Own Report", "View All Reports"],
  Admin: ["View Own Report", "View All Reports", "Schedule Arrangement", "Update Status", "User Management", "System Settings"]
};

async function provisionAdmin() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured in backend/.env.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM notifications");
    await client.query("DELETE FROM activity_logs");
    await client.query("DELETE FROM schedules");
    await client.query("DELETE FROM users WHERE LOWER(username) <> LOWER($1)", [username]);

    await client.query(
      `INSERT INTO users (username, password_hash, role, status)
       VALUES ($1, $2, 'Admin', 'Active')
       ON CONFLICT (username)
       DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [username, hashPassword(password)]
    );

    for (const [role, permissions] of Object.entries(rolePermissions)) {
      for (const permissionName of permissions) {
        await client.query(
          `INSERT INTO role_permissions (role, permission_name, is_allowed)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (role, permission_name)
         DO UPDATE SET
           is_allowed = TRUE,
           updated_at = CURRENT_TIMESTAMP`,
          [role, permissionName]
        );
      }
    }

    await client.query("COMMIT");
    console.log(`Cleaned launch data and provisioned active Admin user "${username}" with baseline role permissions.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

provisionAdmin().catch((error) => {
  console.error("Unable to provision Admin user:", error.message);
  process.exitCode = 1;
});
