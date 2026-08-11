import axios from "axios";

import AppError from "../utils/AppError.js";
import { geocode } from "../utils/geocode.js";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const describeWeatherCode = (code) => WEATHER_CODES[code] || "Unknown";

/**
 * Open-Meteo's free forecast only covers roughly the next 16 days,
 * so trips further out than that won't return daily data.
 */
export const getWeatherForecast = async (destination, startDate, endDate, countryHint) => {
  const location = await geocode(destination, countryHint);

  try {
    const { data } = await axios.get(FORECAST_URL, {
      params: {
        latitude: location.latitude,
        longitude: location.longitude,
        daily: "weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum",
        timezone: "auto",
        start_date: startDate,
        end_date: endDate,
      },
    });

    const days = data.daily.time.map((date, i) => ({
      date,
      condition: describeWeatherCode(data.daily.weathercode[i]),
      maxTempC: data.daily.temperature_2m_max[i],
      minTempC: data.daily.temperature_2m_min[i],
      precipitationMm: data.daily.precipitation_sum[i],
    }));

    return {
      location: `${location.name}, ${location.country}`,
      days,
    };
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(
      "Weather forecast unavailable for the requested dates (forecasts only cover roughly the next 16 days).",
      502
    );
  }
};
