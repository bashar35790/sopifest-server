import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { AppError } from "../utils/appError";

const getRequestMeta = (req: Request) => ({
  userAgent: req.headers["user-agent"],
  ipAddress: req.ip || req.socket.remoteAddress,
});

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const meta = getRequestMeta(req);
    const { user, accessToken, refreshToken } = await authService.registerUser(req.body, meta);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      status: "success",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const meta = getRequestMeta(req);
    const { user, accessToken, refreshToken } = await authService.loginUser(req.body, meta);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: "success",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      throw new AppError("Refresh token required", 401);
    }

    const meta = getRequestMeta(req);
    const { accessToken, refreshToken: newRefreshToken } = await authService.rotateRefreshToken(
      refreshToken,
      meta
    );

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: "success",
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    await authService.logoutUser(refreshToken);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getUserById(userId);

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};
