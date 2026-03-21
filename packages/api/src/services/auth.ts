import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from "@get-down/shared";
import * as authRepository from "../repository/auth.js";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "../errors.js";

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

export async function registerPartner(input: RegisterRequest): Promise<AuthResponse> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new BadRequestError("Email is required");
  }

  validatePassword(input.password);

  const existing = await authRepository.findAuthPersonByEmail(email);
  if (existing) {
    throw new ConflictError("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const created = await authRepository.createPartnerUser({
    firstName: input.firstName.trim(),
    lastName: input.lastName?.trim(),
    email,
    passwordHash,
  });

  return createAuthResponse(toAuthUser(created));
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const email = input.email.trim().toLowerCase();
  const user = await authRepository.findAuthPersonByEmail(email);

  if (!user || !user.password_hash || !user.is_active || !user.is_partner || !user.account_id) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid credentials");
  }

  return createAuthResponse(toAuthUser(user));
}

export async function getUserById(id: number): Promise<AuthUser> {
  const user = await authRepository.findAuthPersonById(id);
  if (!user || !user.is_active) {
    throw new NotFoundError("User not found");
  }

  return toAuthUser(user);
}

function toAuthUser(row: {
  id: number;
  first_name: string;
  last_name: string | null;
  display_name: string | null;
  email: string;
  is_partner: boolean;
  is_active: boolean;
  account_id: number | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name ?? undefined,
    displayName: row.display_name ?? undefined,
    isPartner: row.is_partner,
    accountId: row.account_id ?? undefined,
  };
}

function createAuthResponse(user: AuthUser): AuthResponse {
  const token = jwt.sign(user, SECRET_KEY, { expiresIn: "8h" });
  return { token, user };
}

function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new BadRequestError("Password must be at least 8 characters long");
  }
}