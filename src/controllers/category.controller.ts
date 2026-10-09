import { Request, Response, NextFunction } from "express";
import * as CategoryService from "../services/category.service";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({
      status: "success",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await CategoryService.getCategories();
    res.status(200).json({
      status: "success",
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await CategoryService.getCategoryById(req.params.id);
    res.status(200).json({
      status: "success",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      status: "success",
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
