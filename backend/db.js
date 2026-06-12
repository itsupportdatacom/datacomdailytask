"use strict";

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString
});

async function testConnection() {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  testConnection
};
