import axios from "axios";

import AppError from "./AppError.js";

const AUTH_URL =
  "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
export const OPENSKY_BASE_URL = "https://opensky-network.org/api";

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * OpenSky's authenticated endpoints use OAuth2 client-credentials, same
 * shape as Amadeus — a client_id/client_secret pair from the account's API
 * Client settings, not a single API key.
 */
export const getOpenSkyToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!process.env.OPENSKY_CLIENT_ID || !process.env.OPENSKY_CLIENT_SECRET) {
    throw new AppError(
      "OPENSKY_CLIENT_ID and OPENSKY_CLIENT_SECRET are not configured.",
      500
    );
  }

  try {
    const { data } = await axios.post(
      AUTH_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.OPENSKY_CLIENT_ID,
        client_secret: process.env.OPENSKY_CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return cachedToken;
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError("Could not authenticate with OpenSky.", 502);
  }
};
