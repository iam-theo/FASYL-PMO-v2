import { pgTable, text, timestamp, boolean, integer, uuid, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "INACTIVE", "LOCKED", "PENDING_PASSWORD_RESET"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  phoneNumber: text("phone_number"),
  employeeId: text("employee_id"),
  department: text("department"),
  jobTitle: text("job_title"),
  organization: text("organization"),
  avatar: text("avatar"),
  status: userStatusEnum("status").default("ACTIVE"),
  isActive: boolean("is_active").default(true),
  isLocked: boolean("is_locked").default(false),
  mfaEnabled: boolean("mfa_enabled").default(false),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  tenantId: text("tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const passwords = pgTable("passwords", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  hash: text("hash").notNull(),
  mustChange: boolean("must_change").default(false),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordHistory = pgTable("password_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  deviceInfo: text("device_info"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deviceSessions = pgTable("device_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(),
  browser: text("browser"),
  os: text("os"),
  ipAddress: text("ip_address"),
  deviceName: text("device_name"),
  location: text("location"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginHistory = pgTable("login_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const securityAuditLogs = pgTable("security_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
