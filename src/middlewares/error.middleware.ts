import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/appError";
import { env } from "../config/env";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(
    new AppError(
      `Cannot find ${req.method} ${req.originalUrl} on this server`,
      404
    )
  );
};

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let status = err.status || "error";
  let errors = err.errors;

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    statusCode = 400;
    status = "fail";
    message = "Validation Error";
    errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = 409;
      status = "fail";
      const target = Array.isArray(err.meta?.target)
        ? err.meta.target.join(", ")
        : "Field";
      message = `Duplicate value error: ${target} already exists`;
    } else if (err.code === "P2025") {
      statusCode = 404;
      status = "fail";
      message = "Record not found";
    }
  }

  // Handle Invalid JSON Syntax
  if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    status = "fail";
    message = "Malformed JSON payload";
  }

  const responsePayload: Record<string, any> = {
    status,
    message,
  };

  if (errors) {
    responsePayload.errors = errors;
  }

  if (env.NODE_ENV === "development") {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};
