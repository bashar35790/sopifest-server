import { Request, Response, NextFunction } from "express";
import * as OrderService from "../services/order.service";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await OrderService.createOrder(req.user!.userId, req.body);
    res.status(201).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
