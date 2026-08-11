import mongoose from "mongoose";

// Set either by hand or by picking a result from the real Booking.com
// search — this is the traveler's own record of what they booked, not a
// live/managed reservation.
const hotelSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    checkIn: { type: Date },
    checkOut: { type: Date },
    price: { type: Number, min: 0 },
    currency: { type: String, trim: true },
    confirmationNumber: { type: String, trim: true },
    photoUrl: { type: String, trim: true },
  },
  { _id: false }
);

// Manually entered — there's no bookable-flight API involved, this is just
// the traveler's own record of a ticket they booked elsewhere.
const flightSchema = new mongoose.Schema(
  {
    airline: { type: String, trim: true },
    // 2-letter IATA airline code (e.g. "QR", "EK") — used to look up the
    // airline's real logo, not shown directly.
    airlineCode: { type: String, trim: true, uppercase: true },
    flightNumber: { type: String, trim: true },
    departureAirport: { type: String, trim: true },
    arrivalAirport: { type: String, trim: true },
    departureTime: { type: Date },
    arrivalTime: { type: Date },
    confirmationNumber: { type: String, trim: true },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },
    budget: {
      type: Number,
      min: 0,
      default: 0,
    },
    travelers: {
      type: Number,
      min: 1,
      default: 1,
    },
    interests: [
      {
        type: String,
        trim: true,
      },
    ],

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    hotel: { type: hotelSchema, default: null },
    flight: { type: flightSchema, default: null },

    itinerary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // False when no ingested travel guide covers this destination, so the
    // itinerary came from the LLM's general knowledge rather than
    // retrieved sources.
    itineraryGrounded: {
      type: Boolean,
      default: null,
    },

    status: {
      type: String,
      enum: ["planning", "completed", "cancelled"],
      default: "planning",
    },
  },
  {
    timestamps: true,
  }
);

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;