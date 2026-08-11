import axios from "axios";

import AppError from "../utils/AppError.js";

const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

const rapidApiHeaders = () => ({
  "X-RapidAPI-Key": process.env.BOOKING_API_KEY,
  "X-RapidAPI-Host": RAPIDAPI_HOST,
});

const resolveDestination = async (destination) => {
  const { data } = await axios.get(`${BASE_URL}/api/v1/hotels/searchDestination`, {
    params: { query: destination },
    headers: rapidApiHeaders(),
  });

  const match = data.data?.[0];

  if (!match) {
    throw new AppError(`Could not find a Booking.com destination for "${destination}".`, 404);
  }

  return { destId: match.dest_id, searchType: match.search_type };
};

/**
 * Real Booking.com inventory and live pricing via RapidAPI's booking-com15
 * wrapper (this account is subscribed to that specific host — RapidAPI
 * hosts several similarly-named Booking.com APIs on different hosts, and a
 * key only works for the one(s) actually subscribed to).
 */
export const searchHotels = async (destination, checkInDate, checkOutDate, adults = 1) => {
  if (!process.env.BOOKING_API_KEY) {
    throw new AppError("BOOKING_API_KEY is not configured.", 500);
  }

  const { destId, searchType } = await resolveDestination(destination);

  try {
    const { data } = await axios.get(`${BASE_URL}/api/v1/hotels/searchHotels`, {
      params: {
        dest_id: destId,
        search_type: searchType,
        arrival_date: checkInDate,
        departure_date: checkOutDate,
        adults,
        room_qty: 1,
        page_number: 1,
        currency_code: "USD",
      },
      headers: rapidApiHeaders(),
    });

    const hotels = data.data?.hotels || [];

    return hotels.map((entry) => ({
      hotelName: entry.property?.name,
      rating: entry.property?.reviewScore ?? null,
      reviewCount: entry.property?.reviewCount ?? null,
      stars: entry.property?.propertyClass ?? null,
      price: entry.property?.priceBreakdown?.grossPrice?.value != null
        ? Number(entry.property.priceBreakdown.grossPrice.value.toFixed(2))
        : null,
      currency: entry.property?.priceBreakdown?.grossPrice?.currency ?? "USD",
      checkInDate: entry.property?.checkinDate,
      checkOutDate: entry.property?.checkoutDate,
      photoUrl: entry.property?.photoUrls?.[0] ?? null,
    }));
  } catch (error) {
    console.error(error.response?.data || error.message);

    throw new AppError(`Could not fetch hotel offers for "${destination}".`, 502);
  }
};
