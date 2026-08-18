import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { UserRepository } from "../repositories/userRepository.js";
import type {
  AuthTokenPayload,
  PublicUser,
  UserRole
} from "../types/user.js";
import { toPublicUser } from "../types/user.js";
import { AppError } from "../utils/errors.js";

const SALT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: PublicUser;
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.users.create({
      name: input.name.trim(),
      email: input.email.trim(),
      passwordHash
    });
    return this.buildAuthResult(user.id, user.email, user.role, toPublicUser(user));
  }

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email.trim());
    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }
    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError("Invalid email or password.", 401);
    }
    return this.buildAuthResult(user.id, user.email, user.role, toPublicUser(user));
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppError("User not found.", 401);
    }
    return toPublicUser(user);
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as AuthTokenPayload;
      if (!payload.sub || !payload.email || !payload.role) {
        throw new AppError("Invalid authentication token.", 401);
      }
      return payload;
    } catch {
      throw new AppError("Invalid or expired authentication token.", 401);
    }
  }

  private buildAuthResult(
    userId: string,
    email: string,
    role: UserRole,
    user: PublicUser
  ): AuthResult {
    const payload: AuthTokenPayload = { sub: userId, email, role };
    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    });
    return { token, user };
  }
}
