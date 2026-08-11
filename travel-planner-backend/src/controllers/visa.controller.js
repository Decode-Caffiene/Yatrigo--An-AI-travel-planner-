import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { getVisaRequirement } from "../services/visa.service.js";

export const requirement = asyncHandler(async (req, res) => {
  const { passportCountry, destinationCountry } = req.query;

  if (!passportCountry || !destinationCountry) {
    throw new AppError("passportCountry and destinationCountry are required.", 400);
  }

  const result = getVisaRequirement(passportCountry, destinationCountry);

  res.status(200).json({
    success: true,
    ...result,
  });
});
