import { Request, Response, NextFunction } from "express";
import * as InventoryService from "../services/inventory.service";
import * as AnalyticsService from "../services/analytics.service";

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

export const getAnalyticsOverview = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const overview = await AnalyticsService.getAnalyticsOverview();
    res.status(200).json({
      status: "success",
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesChart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const days = (req.query as any)?.days as number | undefined;
    const chart = await AnalyticsService.getSalesChart(days);
    res.status(200).json({
      status: "success",
      data: chart,
    });
  } catch (error) {
    next(error);
  }
};
