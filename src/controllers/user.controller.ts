import { Request, Response, NextFunction } from "express";
import * as UserService from "../services/user.service";

export const getWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await UserService.getWishlist(req.user!.userId);
    res.status(200).json({
      status: "success",
      data: {
        products,
        count: products.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await UserService.toggleWishlist(
      req.user!.userId,
      req.params.productId as string
    );
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const syncCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await UserService.syncCart(req.body);
    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
