import axios from "axios";

import AppError from "../utils/AppError.js";

const BASE_URL = "https://open.er-api.com/v6/latest";

export const getLatestRates = async (base) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/${base}`);

    if (data.result !== "success") {
      throw new Error(data["error-type"] || "Unknown error");
    }

    return {
      base: data.base_code,
      lastUpdated: data.time_last_update_utc,
      rates: data.rates,
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(`Could not fetch exchange rates for ${base}.`, 502);
  }
};

export const convertCurrency = async (amount, from, to) => {
  const { rates, lastUpdated } = await getLatestRates(from);

  const rate = rates[to];

  if (!rate) {
    throw new AppError(`Unsupported currency code: ${to}`, 400);
  }

  return {
    amount,
    from,
    to,
    rate,
    convertedAmount: Number((amount * rate).toFixed(2)),
    lastUpdated,
  };
};
