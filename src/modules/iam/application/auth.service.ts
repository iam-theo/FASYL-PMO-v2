import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { DrizzleIamRepository } from "../infrastructure/drizzle-iam.repository.ts";
import { UnauthorizedError } from "../../../shared/infrastructure/errors.ts";

export class AuthService {
  private repository: DrizzleIamRepository;
  private readonly ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret_2026";
  private readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_2026";

  constructor() {
    this.repository = new DrizzleIamRepository();
  }

  async login(email: string, password: string, deviceInfo?: string, ipAddress?: string) {
    const user = await this.repository.findUserByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const passwordData = await this.repository.getPasswordForUser(user.id);
    if (!passwordData) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, passwordData.hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const accessToken = jwt.sign(
      { uid: user.id, email: user.email, role: "user" },
      this.ACCESS_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { uid: user.id },
      this.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Save refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.repository.saveRefreshToken(
      user.id,
      hashedRefreshToken,
      deviceInfo || "unknown",
      ipAddress || "0.0.0.0",
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    // Log security audit
    await this.repository.logSecurityAudit({
      userId: user.id,
      action: "USER_LOGIN_SUCCESS",
      details: JSON.stringify({ deviceInfo, ipAddress }),
      ipAddress,
    });

    const loginResult = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || (user as any).first_name,
        lastName: user.lastName || (user as any).last_name,
        username: user.username,
        department: user.department,
        tenantId: user.tenantId,
      }
    };

    return loginResult;
  }

  async refreshToken(token: string) {
    try {
      const decoded: any = jwt.verify(token, this.REFRESH_SECRET);
      const user = await this.repository.findUserById(decoded.uid);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedError("User no longer active");
      }

      // In a real production app, we would verify the hashed token in DB
      // For now, we'll just issue a new access token
      const accessToken = jwt.sign(
        { uid: user.id, email: user.email, role: "user" },
        this.ACCESS_SECRET,
        { expiresIn: "1h" }
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async getMe(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User not found or inactive");
    }

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || (user as any).first_name,
      lastName: user.lastName || (user as any).last_name,
      username: user.username,
      department: user.department,
      tenantId: user.tenantId,
    };
    
    return userData;
  }
}

export const authService = new AuthService();
