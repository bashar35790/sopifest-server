import { Request, Response, NextFunction } from "express";
import * as ProductService from "../services/product.service";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ProductService.getProducts(req.query as any);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
