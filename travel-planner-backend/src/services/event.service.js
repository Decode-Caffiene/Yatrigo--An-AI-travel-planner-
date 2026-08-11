import groq from "../utils/groq.js";
import { AI_CONFIG } from "../config/ai.js";
import AppError from "../utils/AppError.js";

/**
 * AI-generated upcoming events for a destination, using the same Groq LLM
 * already powering itinerary generation and translation. Not live/verified
 * data — the model reasons from training knowledge, so this favors
 * well-known recurring festivals/events over one-off listings, which it
 * can reason about more reliably than obscure or brand-new events.
 */
export const generateAIEvents = async (destination) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a travel events assistant. Given a destination and today's date, " +
            "return the 3 to 5 most notable upcoming or recurring events, festivals, " +
            "or seasonal attractions there. Prefer well-known annual events whose " +
            "typical dates you're confident about over obscure or one-off listings. " +
            "Respond with ONLY a raw JSON array (no markdown fences, no commentary), " +
            "where each item has exactly these fields: " +
            '"name" (string), "date" (string, YYYY-MM-DD, your best estimate of the ' +
            'next occurrence on or after today), "time" (string or null), ' +
            '"venue" (string or null, a city/area name), "category" (string, e.g. ' +
            '"Festival", "Cultural", "Music", "Sports", "Seasonal"), "url" (always null).',
        },
        {
          role: "user",
          content: `Destination: ${destination}\nToday's date: ${today}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array.");
    }

    return parsed.map((event) => ({
      name: String(event.name || "Untitled event"),
      date: event.date || null,
      time: event.time || null,
      venue: event.venue || null,
      category: event.category || null,
      url: null,
    }));
  } catch (error) {
    console.error(error.message);

    throw new AppError(`Could not generate events for "${destination}".`, 502);
  }
};
