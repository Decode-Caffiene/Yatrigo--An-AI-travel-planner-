import axios from "axios";

const RAG_URL = process.env.RAG_URL || "http://127.0.0.1:8000";

export const generateItinerary = async (trip) => {
    try {
        const response = await axios.post(
            `${RAG_URL}/generate-itinerary`,
            {
                destination: trip.destination,
                budget: trip.budget,
                travelers: trip.travelers,
                startDate: trip.startDate,
                endDate: trip.endDate,
                interests: trip.interests,
            }
        );

        return response.data;
    } catch (error) {
        console.error(error.response?.data);

        throw new Error("RAG service unavailable");
    }
};

export const getTrendingDestinations = async () => {
    try {
        const response = await axios.get(`${RAG_URL}/trending-destinations`);

        return response.data.destinations;
    } catch (error) {
        console.error(error.response?.data);

        throw new Error("RAG service unavailable");
    }
};