import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"

import authRoutes from "./routes/auth.routes.js"
import tripRoutes from "./routes/trip.routes.js"
import weatherRoutes from "./routes/weather.routes.js"
import currencyRoutes from "./routes/currency.routes.js"
import mapsRoutes from "./routes/maps.routes.js"
import flightRoutes from "./routes/flight.routes.js"
import hotelRoutes from "./routes/hotel.routes.js"
import eventRoutes from "./routes/event.routes.js"
import restaurantRoutes from "./routes/restaurant.routes.js"
import transitRoutes from "./routes/transit.routes.js"
import visaRoutes from "./routes/visa.routes.js"
import translateRoutes from "./routes/translate.routes.js"
import communityRoutes from "./routes/community.routes.js"
import userRoutes from "./routes/user.routes.js"
import uploadRoutes from "./routes/upload.routes.js"
import destinationRoutes from "./routes/destination.routes.js"
import errorHandler from "./middleware/error.middleware.js";
import {protect} from "./middleware/auth.middleware.js"


const app=express()

app.use(express.json())
app.use(cors())
app.use(helmet())
app.use(morgan("dev"))

app.get("/",(req,res)=>{
    res.status(200).json({
        success:true,
        message:"Travel Planner Api is running"
    });
});
app.get("/api/profile", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});
app.use("/api/auth",authRoutes);
app.use("/api/trips",tripRoutes);
app.use("/api/weather",weatherRoutes);
app.use("/api/currency",currencyRoutes);
app.use("/api/maps",mapsRoutes);
app.use("/api/flights",flightRoutes);
app.use("/api/hotels",hotelRoutes);
app.use("/api/events",eventRoutes);
app.use("/api/restaurants",restaurantRoutes);
app.use("/api/transit",transitRoutes);
app.use("/api/visa",visaRoutes);
app.use("/api/translate",translateRoutes);
app.use("/api/community",communityRoutes);
app.use("/api/users",userRoutes);
app.use("/api/uploads",uploadRoutes);
app.use("/api/destinations",destinationRoutes);
app.use(errorHandler);
export default app;