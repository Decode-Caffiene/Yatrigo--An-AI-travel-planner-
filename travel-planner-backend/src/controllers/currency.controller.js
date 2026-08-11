import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { convertCurrency, getLatestRates } from "../services/currency.service.js";

export const convert = asyncHandler(async (req, res) => {
  const { amount, from, to } = req.query;

  if (!amount || !from || !to) {
    throw new AppError("amount, from and to are required.", 400);
  }

  const result = await convertCurrency(
    Number(amount),
    from.toUpperCase(),
    to.toUpperCase()
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

export const rates = asyncHandler(async (req, res) => {
  const base = (req.query.base || "USD").toUpperCase();

  const result = await getLatestRates(base);

  res.status(200).json({
    success: true,
    ...result,
  });
});
