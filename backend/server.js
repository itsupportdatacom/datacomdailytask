"use strict";

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const { pool, testConnection } = require("./db");
const { registerRoutes } = require("./routes");

const app = express();
const port = Number(process.env.PORT) || 5001;
const frontendPath = path.join(__dirname, "..");

async function ensureScheduleWorkflowSchema() {
  if (!process.env.DATABASE_URL) {
    return;
  }
  await pool.query(`
    ALTER TABLE schedules
      ALTER COLUMN schedule_date TYPE TEXT USING schedule_date::text,
      ALTER COLUMN requested_time TYPE TEXT USING requested_time::text,
      ALTER COLUMN assigned_role DROP NOT NULL,
      ALTER COLUMN assigned_person DROP NOT NULL
  `);
  await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS pic VARCHAR(150) NOT NULL DEFAULT '-'");
  await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS contact_number VARCHAR(80) NOT NULL DEFAULT '-'");
  await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'Normal'");
  await pool.query("ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_schedule_type_check");
  await pool.query("ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_assigned_role_check");
  await pool.query("ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_priority_check");
  await pool.query("ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_status_check");
  await pool.query(`
    UPDATE schedules
       SET schedule_type = CASE schedule_type
         WHEN 'Technical' THEN 'Technician Onsite'
         WHEN 'Onsite' THEN 'Engineer Onsite'
         WHEN 'Delivery + Onsite' THEN 'Delivery + Technician Onsite'
         ELSE schedule_type
       END
  `);
  await pool.query("UPDATE schedules SET assigned_role = 'All Team' WHERE assigned_role = 'Warehouse'");
  await pool.query(`
    UPDATE schedules
       SET priority = CASE priority
         WHEN 'Low' THEN 'Normal'
         WHEN 'High' THEN 'Urgent'
         ELSE priority
       END
  `);
  await pool.query("ALTER TABLE schedules ALTER COLUMN status SET DEFAULT 'Submitted'");
  await pool.query(`
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_schedule_type_check
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
      ))
  `);
  await pool.query(`
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_assigned_role_check
      CHECK (assigned_role IN (
        'Driver',
        'Technician',
        'Engineer',
        'All Team'
      ))
  `);
  await pool.query(`
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_priority_check
      CHECK (priority IN (
        'Normal',
        'Urgent',
        'Critical'
      ))
  `);
  await pool.query(`
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_status_check
      CHECK (status IN (
        'Submitted',
        'Pending',
        'Ready to Ship',
        'In Progress',
        'Completed',
        'Carried Forward',
        'Cancelled'
      ))
  `);
}

app.use(cors());
app.use(express.json());

app.get("/api/health", (request, response) => {
  response.json({
    message: "Datacom Daily Schedule System backend is running."
  });
});

app.get("/api/test", (request, response) => {
  response.json({
    message: "API test route is working."
  });
});

app.get("/api/db-test", async (request, response) => {
  try {
    await testConnection();
    response.json({
      message: "Database connected successfully"
    });
  } catch (error) {
    console.error("Database connection test failed:", error.message);
    response.status(500).json({
      message: "Database connection failed"
    });
  }
});

app.get("/api/tables", async (request, response) => {
  const expectedTables = [
    "users",
    "schedules",
    "notifications",
    "activity_logs",
    "role_permissions"
  ];
  try {
    const result = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [expectedTables]
    );
    response.json({
      tables: result.rows.map((row) => row.table_name)
    });
  } catch (error) {
    console.error("Table verification failed:", error.message);
    response.status(500).json({
      message: "Unable to retrieve database tables"
    });
  }
});

async function startServer() {
  await ensureScheduleWorkflowSchema();
  registerRoutes(app, pool);

  app.use(express.static(frontendPath));

  app.use((error, request, response, next) => {
    console.error("Request failed:", error.message);
    response.status(500).json({ message: "Unable to complete the request." });
  });

  app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Unable to start backend server:", error.message);
  process.exit(1);
});
