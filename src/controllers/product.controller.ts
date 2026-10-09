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

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.getProductBySlug(req.params.slug as string);
    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductByIdAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.getProductByIdAdmin(req.params.id as string);
    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({
      status: "success",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.updateProduct(req.params.id as string, req.body);
    res.status(200).json({
      status: "success",
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ProductService.deleteProduct(req.params.id as string);
    res.status(200).json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

