import type { NextFunction, Request, Response } from "express";
import type { AuthService } from "../services/authService.js";
import type { UserRole } from "../types/user.js";
import { AppError } from "../utils/errors.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const createRequireAuth =
  (authService: AuthService) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next(new AppError("Authentication required.", 401));
      return;
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) {
      next(new AppError("Authentication required.", 401));
      return;
    }
    try {
      const payload = authService.verifyToken(token);
      request.auth = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role
      };
      next();
    } catch (error) {
      next(error);
    }
  };
