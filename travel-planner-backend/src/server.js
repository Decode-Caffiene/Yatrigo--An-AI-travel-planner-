import "./config/env.js";
import http from "http";
import app from "./app.js";

import connectDB from "./config/database.js";
import { initSocket } from "./socket.js";
import { sendUpcomingTripReminders } from "./services/trip.service.js";

const PORT=process.env.PORT || 5000;
const TRIP_REMINDER_INTERVAL_MS = 30 * 60 * 1000;

connectDB();

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT,()=>{
    console.log(`server is running on ${PORT}`);
});

// Scans for trips starting within 24h and haven't been reminded about yet.
// Runs on a timer rather than per-request since it's time-based, not
// triggered by any user action.
setInterval(() => {
  sendUpcomingTripReminders().catch((err) =>
    console.error("Trip reminder scan failed:", err.message)
  );
}, TRIP_REMINDER_INTERVAL_MS);
