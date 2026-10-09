import { prisma } from "../config/prisma";
import { RegisterInput, LoginInput } from "../validations/auth.validation";
import { hashPassword, comparePassword } from "../utils/password";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { AppError } from "../utils/appError";

export const registerUser = async (data: RegisterInput) => {
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
    }
  });

  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Note: Depending on the task, we might need to store the refresh token in the DB for rotation
  // But for now, we just return it to the controller.

  return { user, accessToken, refreshToken };
};

export const loginUser = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await comparePassword(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("Invalid email or password", 401);
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

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
    }
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};
