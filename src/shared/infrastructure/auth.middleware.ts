import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.ts";

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("No token provided"));
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || token === "null" || token === "undefined" || token.trim() === "") {
    return next(new UnauthorizedError("No token provided"));
  }
  try {
    const accessSecret = process.env.JWT_ACCESS_SECRET || "default_access_secret_2026";
    const decodedToken = jwt.verify(token, accessSecret) as any;
    if (decodedToken && typeof decodedToken === "object") {
      if (decodedToken.uid && !decodedToken.id) {
        decodedToken.id = decodedToken.uid;
      } else if (decodedToken.id && !decodedToken.uid) {
        decodedToken.uid = decodedToken.id;
      }
    }
    req.user = decodedToken;
    next();
  } catch (error) {
    return next(new UnauthorizedError("Invalid token"));
  }
};
