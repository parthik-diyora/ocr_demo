import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { config } from "../config.js";
import type { UserRecord, UserRole } from "../types/user.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export class PostgresUserRepository implements UserRepository {
  private readonly pool = new Pool({ connectionString: config.DATABASE_URL });

  async create(input: CreateUserInput): Promise<UserRecord> {
    try {
      const result = await this.pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [input.name, input.email.toLowerCase(), input.passwordHash, input.role ?? "user"]
      );
      return mapRow(result.rows[0]);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("An account with this email already exists.", 409);
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    return result.rowCount ? mapRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.pool.query("SELECT * FROM users WHERE id = $1", [
      id
    ]);
    return result.rowCount ? mapRow(result.rows[0]) : null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(input: CreateUserInput): Promise<UserRecord> {
    const email = input.email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === email) {
        throw new AppError("An account with this email already exists.", 409);
      }
    }
    const now = new Date().toISOString();
    const record: UserRecord = {
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash: input.passwordHash,
      role: input.role ?? "user",
      createdAt: now,
      updatedAt: now
    };
    this.users.set(record.id, record);
    logger.warn("Using in-memory user storage; accounts will be lost on restart.");
    return record;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }
}

const mapRow = (row: Record<string, unknown>): UserRecord => ({
  id: String(row.id),
  name: String(row.name),
  email: String(row.email),
  passwordHash: String(row.password_hash),
  role: (row.role as UserRole) ?? "user",
  createdAt: new Date(String(row.created_at)).toISOString(),
  updatedAt: new Date(String(row.updated_at)).toISOString()
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";
