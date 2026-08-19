import groq from "../utils/groq.js";
import { AI_CONFIG } from "../config/ai.js";
import AppError from "../utils/AppError.js";
import { cached } from "../utils/cache.js";
import { getWikipediaSummary } from "../utils/wikipedia.js";

const GLOBAL_EVENTS_TTL_MS = 60 * 60 * 1000; // 1 hour
const GLOBAL_EVENTS_COUNT = 15;
const EVENT_DETAILS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

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
      // Reasoning models (e.g. gpt-oss) spend part of the output budget on
      // hidden reasoning before writing the final JSON, so the default
      // limit can truncate the response mid-string without this.
      max_completion_tokens: 2000,
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
      country: null,
      category: event.category || null,
      url: null,
    }));
  } catch (error) {
    console.error(error.message);

    throw new AppError(`Could not generate events for "${destination}".`, 502);
  }
};

const generateGlobalUpcomingEventsUncached = async () => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.5,
      // Reasoning models (e.g. gpt-oss) spend part of the output budget on
      // hidden reasoning before writing the final JSON, so the default
      // limit truncates a 15-item response mid-string without this.
      max_completion_tokens: 4000,
      messages: [
        {
          role: "system",
          content:
            "You are a global travel events assistant. Return notable upcoming " +
            "or recurring events, festivals, and seasonal attractions happening " +
            "across many different countries around the world — spread across " +
            "as many continents and regions as possible, and don't repeat the " +
            "same country more than twice. Prefer well-known annual events whose " +
            "typical dates you're confident about over obscure or one-off listings. " +
            "Respond with ONLY a raw JSON array (no markdown fences, no commentary) " +
            `of exactly ${GLOBAL_EVENTS_COUNT} items, where each item has exactly ` +
            'these fields: "name" (string), "date" (string, YYYY-MM-DD, your best ' +
            'estimate of the next occurrence on or after today), "time" (string or ' +
            'null), "venue" (string or null, a city/area name), "country" (string), ' +
            '"category" (string, e.g. "Festival", "Cultural", "Music", "Sports", ' +
            '"Seasonal"), "url" (always null).',
        },
        {
          role: "user",
          content: `Today's date: ${today}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array.");
    }

    return parsed
      .map((event) => ({
        name: String(event.name || "Untitled event"),
        date: event.date || null,
        time: event.time || null,
        venue: event.venue || null,
        country: event.country || null,
        category: event.category || null,
        url: null,
      }))
      // The model's date estimates aren't perfectly reliable — drop anything
      // undated or dated in the past, then sort chronologically so "load
      // more" reveals events in real calendar order rather than model order.
      .filter((event) => event.date && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error(error.message);

    throw new AppError("Could not generate global upcoming events.", 502);
  }
};

// Cached globally (not per-user, not per-destination) since this list
// doesn't need to be regenerated on every page load.
export const generateGlobalUpcomingEvents = () =>
  cached("global-upcoming-events", GLOBAL_EVENTS_TTL_MS, generateGlobalUpcomingEventsUncached);

/**
 * Real (Wikipedia-sourced, not AI-generated) background on a specific
 * event, for the event detail page. `context` (e.g. the event's country)
 * disambiguates generic-sounding event names when the direct lookup misses.
 */
const getEventDetailsUncached = async (name, context) => {
  const direct = await getWikipediaSummary(name);
  if (direct) return { found: true, ...direct };

  if (context) {
    const withContext = await getWikipediaSummary(`${name} ${context}`);
    if (withContext) return { found: true, ...withContext };
  }

  return { found: false, title: name, extract: null, imageUrl: null, wikipediaUrl: null };
};

export const getEventDetails = (name, context) =>
  cached(
    `event-details:${name.toLowerCase()}:${(context || "").toLowerCase()}`,
    EVENT_DETAILS_TTL_MS,
    () => getEventDetailsUncached(name, context)
  );
