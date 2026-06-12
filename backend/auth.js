"use strict";

const crypto = require("crypto");

const tokenLifetimeMs = 12 * 60 * 60 * 1000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const cost = 16384;
  const blockSize = 8;
  const parallelization = 1;
  const hash = crypto.scryptSync(password, salt, 64, {
    N: cost,
    r: blockSize,
    p: parallelization
  });

  return [
    "scrypt",
    cost,
    blockSize,
    parallelization,
    salt.toString("hex"),
    hash.toString("hex")
  ].join("$");
}

function verifyPassword(password, passwordHash) {
  const parts = String(passwordHash).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return false;
  }

  try {
    const expected = Buffer.from(parts[5], "hex");
    const actual = crypto.scryptSync(password, Buffer.from(parts[4], "hex"), expected.length, {
      N: Number(parts[1]),
      r: Number(parts[2]),
      p: Number(parts[3])
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch (error) {
    return false;
  }
}

function getTokenSecret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return process.env.SESSION_SECRET;
}

function signToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: String(user.id),
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + tokenLifetimeMs
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return user.expiresAt > Date.now() ? user : null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken
};
