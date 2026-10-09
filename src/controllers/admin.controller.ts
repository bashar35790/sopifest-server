import { Request, Response, NextFunction } from "express";
import * as InventoryService from "../services/inventory.service";

export const getLowStock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await InventoryService.getLowStockProducts(req.query as any);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
