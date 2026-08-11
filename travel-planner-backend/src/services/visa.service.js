import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

import AppError from "../utils/AppError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Static dataset (ilyankou/passport-index-dataset, MIT licensed) instead
 * of a live API — visa rules change slowly and this data has no ongoing
 * cost or key, but it's a snapshot: re-download the source CSV periodically
 * and always tell travelers to confirm with an official consulate/embassy
 * before relying on it.
 */
const visaMatrix = JSON.parse(
  readFileSync(path.join(__dirname, "../data/visa-requirements.json"), "utf-8")
);

const countryCodes = JSON.parse(
  readFileSync(path.join(__dirname, "../data/country-codes.json"), "utf-8")
);

const resolveCountryCode = (name) => {
  const code = countryCodes[name.trim().toLowerCase()];

  if (!code) {
    throw new AppError(`Unknown country: "${name}".`, 404);
  }

  return code;
};

const describeRequirement = (value) => {
  if (value === "-1") {
    return { requirement: "same country", visaFreeDays: null };
  }

  if (/^\d+$/.test(value)) {
    return { requirement: "visa free", visaFreeDays: Number(value) };
  }

  return { requirement: value, visaFreeDays: null };
};

export const getVisaRequirement = (passportCountry, destinationCountry) => {
  const passportCode = resolveCountryCode(passportCountry);
  const destinationCode = resolveCountryCode(destinationCountry);

  const row = visaMatrix[passportCode];
  const value = row?.[destinationCode];

  if (value === undefined) {
    throw new AppError(
      `No visa data for ${passportCountry} -> ${destinationCountry}.`,
      404
    );
  }

  return {
    passportCountry,
    destinationCountry,
    ...describeRequirement(value),
    disclaimer:
      "Based on a periodically-updated static dataset, not a live government source. Always confirm with the destination's official embassy/consulate before traveling.",
  };
};
