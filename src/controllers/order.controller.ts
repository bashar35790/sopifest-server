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

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await OrderService.getMyOrders(req.user!.userId, req.query as any);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await OrderService.getOrderById(
      req.user!.userId,
      req.params.id as string
    );
    res.status(200).json({
      status: "success",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
