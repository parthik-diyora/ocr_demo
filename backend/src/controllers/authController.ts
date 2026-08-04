import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthService } from "../services/authService.js";
import { AppError } from "../utils/errors.js";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128)
});

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (request: Request, response: Response): Promise<void> => {
    const input = registerSchema.parse(request.body);
    const result = await this.authService.register(input);
    response.status(201).json(result);
  };

  login = async (request: Request, response: Response): Promise<void> => {
    const input = loginSchema.parse(request.body);
    const result = await this.authService.login(input);
    response.json(result);
  };

  me = async (request: Request, response: Response): Promise<void> => {
    if (!request.auth?.userId) {
      throw new AppError("Authentication required.", 401);
    }
    const user = await this.authService.me(request.auth.userId);
    response.json({ user });
  };
}
