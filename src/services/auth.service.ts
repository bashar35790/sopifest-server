import crypto from "crypto";
import { prisma } from "../config/prisma";
import { RegisterInput, LoginInput } from "../validations/auth.validation";
import { hashPassword, comparePassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AppError } from "../utils/appError";

export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export const registerUser = async (data: RegisterInput, meta?: RequestMeta) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
    },
  });

  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  return { user, accessToken, refreshToken };
};

export const loginUser = async (data: LoginInput, meta?: RequestMeta) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.isActive || user.isBanned) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await comparePassword(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
    accessToken,
    refreshToken,
  };
};

export const rotateRefreshToken = async (oldRefreshToken: string, meta?: RequestMeta) => {
  let decoded: { userId: string; role: string };
  try {
    decoded = verifyRefreshToken(oldRefreshToken);
  } catch (error) {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokenHash = hashToken(oldRefreshToken);
  const tokenDoc = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  // Reuse detection: if token is already revoked, revoke all tokens for this user for security
  if (!tokenDoc || tokenDoc.revoked) {
    if (tokenDoc?.userId) {
      await prisma.refreshToken.updateMany({
        where: { userId: tokenDoc.userId },
        data: { revoked: true },
      });
    }
    throw new AppError("Invalid refresh token", 401);
  }

  if (tokenDoc.expiresAt < new Date()) {
    throw new AppError("Refresh token has expired", 401);
  }

  if (!tokenDoc.user || !tokenDoc.user.isActive || tokenDoc.user.isBanned) {
    throw new AppError("User account is inactive or banned", 403);
  }

  // Revoke old refresh token
  await prisma.refreshToken.update({
    where: { id: tokenDoc.id },
    data: { revoked: true },
  });

  // Issue new access & refresh tokens
  const payload = { userId: tokenDoc.user.id, role: tokenDoc.user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: newTokenHash,
      userId: tokenDoc.user.id,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUser = async (refreshToken?: string) => {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revoked: true },
    });
  }
};

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
