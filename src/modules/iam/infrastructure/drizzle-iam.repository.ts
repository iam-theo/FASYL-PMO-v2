import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../shared/database/index.ts";
import { users, passwords, refreshTokens, deviceSessions, loginHistory, securityAuditLogs, passwordHistory, passwordResetTokens } from "../../../db/schema.ts";

export class DrizzleIamRepository {
  async createUser(userData: any, passwordHash: string) {
    return await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values(userData).returning();
      await tx.insert(passwords).values({
        userId: user.id,
        hash: passwordHash,
        mustChange: true,
      });
      return user;
    });
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async findUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(limit: number = 50, offset: number = 0) {
    return await db.select().from(users).limit(limit).offset(offset);
  }

  async updateUser(id: string, data: any) {
    const [user] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async softDeleteUser(id: string) {
    await db.update(users).set({ isActive: false, deletedAt: new Date() }).where(eq(users.id, id));
  }

  async getPasswordForUser(userId: string) {
    const [pwd] = await db.select().from(passwords).where(eq(passwords.userId, userId));
    return pwd;
  }

  async updatePassword(userId: string, hash: string, mustChange: boolean = false) {
    await db.update(passwords).set({ hash, mustChange, updatedAt: new Date() }).where(eq(passwords.userId, userId));
    await db.insert(passwordHistory).values({ userId, hash });
  }

  async savePasswordResetToken(userId: string, hashedToken: string, expiresAt: Date) {
    const [token] = await db.insert(passwordResetTokens).values({
      userId,
      hashedToken,
      expiresAt,
    }).returning();
    return token;
  }

  async findPasswordResetTokenByHash(hashedToken: string) {
    const [token] = await db.select().from(passwordResetTokens).where(
      and(
        eq(passwordResetTokens.hashedToken, hashedToken),
        eq(passwordResetTokens.isUsed, false)
      )
    );
    return token;
  }

  async markPasswordResetTokenUsed(id: string) {
    await db.update(passwordResetTokens).set({ isUsed: true }).where(eq(passwordResetTokens.id, id));
  }

  async getPasswordHistory(userId: string, limit: number = 5) {
    return await db.select().from(passwordHistory).where(eq(passwordHistory.userId, userId)).orderBy(sql`${passwordHistory.createdAt} DESC`).limit(limit);
  }

  async getUserSessions(userId: string) {
    return await db.select().from(deviceSessions).where(
      and(
        eq(deviceSessions.userId, userId),
        eq(deviceSessions.isActive, true)
      )
    );
  }

  async terminateAllSessions(userId: string) {
    await db.update(deviceSessions).set({ isActive: false }).where(eq(deviceSessions.userId, userId));
    await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.userId, userId));
  }

  async saveRefreshToken(userId: string, hashedToken: string, deviceInfo: string, ipAddress: string, expiresAt: Date) {
    const [token] = await db.insert(refreshTokens).values({
      userId,
      hashedToken,
      deviceInfo,
      ipAddress,
      expiresAt,
    }).returning();
    return token;
  }

  async findRefreshTokenByHash(hashedToken: string) {
    const [token] = await db.select().from(refreshTokens).where(
      and(
        eq(refreshTokens.hashedToken, hashedToken),
        eq(refreshTokens.isRevoked, false)
      )
    );
    return token;
  }

  async revokeRefreshToken(id: string) {
    await db.update(refreshTokens).set({ isRevoked: true }).where(eq(refreshTokens.id, id));
  }

  async saveDeviceSession(data: any) {
    const [session] = await db.insert(deviceSessions).values(data).returning();
    return session;
  }

  async invalidateSession(id: string) {
    await db.update(deviceSessions).set({ isActive: false }).where(eq(deviceSessions.id, id));
  }

  async logSecurityAudit(data: any) {
    await db.insert(securityAuditLogs).values(data);
  }
}
