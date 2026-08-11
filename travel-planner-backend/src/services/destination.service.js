import groq from "../utils/groq.js";
import { AI_CONFIG } from "../config/ai.js";
import { getWikipediaArticleImage, getWikipediaImage } from "../utils/wikipedia.js";
import { cached } from "../utils/cache.js";
import AppError from "../utils/AppError.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// Groq's SDK throws a RateLimitError with status 429 when the API key's
// token budget (per-minute or per-day) is exhausted — distinguish this from
// a genuine generation failure so the user sees an honest, actionable
// message instead of a generic "something broke".
const rateLimitAwareError = (error, fallbackMessage) => {
  if (error?.status === 429) {
    return new AppError(
      "AI features have hit today's usage limit — please try again in a few minutes.",
      429
    );
  }

  return new AppError(fallbackMessage, 502);
};

/**
 * A broad destination (a country, region, or big city) doesn't have one
 * "correct" photo — but a specific, recognizable landmark does. This asks
 * the model to name the single most iconic landmark for the destination
 * (echoing back the input unchanged if it's already that specific), so the
 * image lookup has something concrete and photogenic to search for instead
 * of whatever a bare country name happens to surface.
 */
export const resolveLandmark = (destination) =>
  cached(`landmark:${destination.toLowerCase()}`, DAY_MS, () => resolveLandmarkUncached(destination));

const resolveLandmarkUncached = async (destination) => {
  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3,
      max_tokens: 30,
      messages: [
        {
          role: "system",
          content:
            "You identify the single most famous, iconic, photogenic landmark, " +
            "monument, or place associated with a travel destination — the one " +
            "thing most people would immediately recognize a photo of. If the " +
            "destination given is already a specific city, town, landmark, or " +
            "attraction (not a country or broad region), return it unchanged. " +
            "Respond with ONLY the name — no explanation, no punctuation, no " +
            "markdown.",
        },
        { role: "user", content: destination },
      ],
    });

    return completion.choices?.[0]?.message?.content?.trim() || destination;
  } catch {
    return destination;
  }
};

/**
 * Real photo for a destination, in descending order of confidence:
 *
 * 1. The destination's own Wikipedia article. For a city this is a curated,
 *    representative shot and beats anything else — going to the landmark
 *    first used to hand back oddly-specific detail shots (New Orleans
 *    resolved to "St Louis Cathedral", whose image is a statue close-up).
 * 2. Its most iconic landmark. This is what rescues countries, whose own
 *    articles lead with a flag that gets filtered out.
 * 3. A Commons filename search on the destination — a keyword lottery, so
 *    strictly a last resort before falling back to a local placeholder.
 */
export const getBestImage = (destination, landmark) =>
  cached(`image:${destination.toLowerCase()}`, DAY_MS, async () => {
    const articleImage = await getWikipediaArticleImage(destination);
    if (articleImage) return articleImage;

    const landmarkImage =
      landmark && landmark !== destination
        ? await getWikipediaImage(landmark)
        : null;

    return landmarkImage || (await getWikipediaImage(destination));
  });

/**
 * AI-generated destination guide, using the same Groq LLM already powering
 * itinerary generation and AI events. Not live/verified data — the model
 * reasons from training knowledge about well-known destinations.
 */
export const generateDestinationGuide = (destination) =>
  cached(`guide:${destination.toLowerCase()}`, DAY_MS, () =>
    generateDestinationGuideUncached(destination)
  );

const generateDestinationGuideUncached = async (destination) => {
  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are a travel guide writer. Given a destination, write a short, " +
            "engaging blog-style guide about it. Respond with ONLY a raw JSON " +
            "object (no markdown fences, no commentary), with exactly these " +
            'fields: "tagline" (string, a short punchy one-liner), "summary" ' +
            "(string, 2-3 short paragraphs separated by \\n\\n introducing the " +
            'destination), "highlights" (array of 4-6 strings, top attractions ' +
            'or experiences), "bestTimeToVisit" (string), "thingsToDo" (array ' +
            'of 4-6 strings, specific activities), "localTips" (array of 3-5 ' +
            'strings, practical traveler tips), "estimatedDailyBudget" (string, ' +
            'e.g. "$80-150/day"), "famousLandmark" (string, the single most ' +
            "iconic, photogenic landmark associated with this destination — " +
            "just the name, e.g. \"Eiffel Tower\" for Paris, or the destination " +
            "itself if it's already a specific landmark).",
        },
        {
          role: "user",
          content: `Destination: ${destination}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const imageUrl = await getBestImage(
      destination,
      String(parsed.famousLandmark || "").trim() || destination
    );

    return {
      destination,
      imageUrl,
      tagline: String(parsed.tagline || ""),
      summary: String(parsed.summary || ""),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
      bestTimeToVisit: String(parsed.bestTimeToVisit || ""),
      thingsToDo: Array.isArray(parsed.thingsToDo) ? parsed.thingsToDo.map(String) : [],
      localTips: Array.isArray(parsed.localTips) ? parsed.localTips.map(String) : [],
      estimatedDailyBudget: String(parsed.estimatedDailyBudget || ""),
    };
  } catch (error) {
    console.error(error.message);

    throw rateLimitAwareError(error, `Could not generate a guide for "${destination}".`);
  }
};

/**
 * "Not sure where to go?" quiz — turns a handful of preference answers into
 * 3 real, varied destination recommendations with a per-traveler reason,
 * using the same Groq model as the rest of the destination features.
 */
export const generateQuizRecommendations = async (answers) => {
  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "You are a travel matchmaker. Given a traveler's quiz answers, " +
            "recommend exactly 3 real, well-known travel destinations (countries " +
            "or cities) that best fit their preferences. Pick a varied set — " +
            "don't recommend 3 near-identical places. Respond with ONLY a raw " +
            'JSON array (no markdown fences, no commentary), where each item ' +
            'has exactly: "destination" (string), "reason" (string, 1-2 ' +
            "sentences explaining why it fits THIS traveler's specific answers), " +
            '"matchTags" (array of 2-3 short strings, e.g. ["Budget-friendly", ' +
            '"Great food", "Adventure"]).',
        },
        {
          role: "user",
          content: `Quiz answers:\n${JSON.stringify(answers, null, 2)}`,
        },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array.");
    }

    return await Promise.all(
      parsed.map(async (item) => {
        const destination = String(item.destination || "Unknown");
        const landmark = await resolveLandmark(destination);
        const imageUrl = await getBestImage(destination, landmark);

        return {
          destination,
          reason: String(item.reason || ""),
          matchTags: Array.isArray(item.matchTags) ? item.matchTags.map(String) : [],
          imageUrl,
        };
      })
    );
  } catch (error) {
    console.error(error.message);

    throw rateLimitAwareError(error, "Could not generate quiz recommendations.");
  }
};

/**
 * "AI Suggestions for You" — the Explore page's homepage teaser. Personalizes
 * from the traveler's own trip history (destinations + interests) when they
 * have any; otherwise falls back to broadly appealing picks for a
 * brand-new account with no signal yet.
 */
export const generateAISuggestions = async ({ visitedOrPlanned = [], interests = [] } = {}) => {
  const profileLine =
    visitedOrPlanned.length > 0
      ? `This traveler has already visited or planned trips to: ${visitedOrPlanned.join(", ")} — do not repeat these. Interests they've shown: ${interests.length > 0 ? interests.join(", ") : "none specified"}.`
      : "This traveler has no trip history yet — suggest broadly popular, exciting destinations for a general travel app homepage.";

  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content:
            "You are a travel recommendation engine for a travel planning app's " +
            "homepage. Suggest exactly 5 diverse, real, appealing travel " +
            "destinations (cities or countries) this traveler would enjoy next " +
            "— vary the region/vibe across the 5, don't cluster them all in one " +
            "part of the world. Respond with ONLY a raw JSON array (no markdown " +
            'fences, no commentary), where each item has exactly: "destination" ' +
            '(string), "blurb" (string, a short punchy phrase, max 6 words, ' +
            'e.g. "Perfect for tech & nightlife"), "icon" (string, a single ' +
            "Material Symbols icon name matching the vibe, e.g. lightbulb, " +
            "landscape, restaurant, beach_access, hiking, nightlife, museum, " +
            "forest, temple_buddhist, ac_unit).",
        },
        { role: "user", content: profileLine },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error("AI response was not a JSON array.");
    }

    return await Promise.all(
      parsed.slice(0, 5).map(async (item) => {
        const destination = String(item.destination || "Unknown");
        const landmark = await resolveLandmark(destination);
        const imageUrl = await getBestImage(destination, landmark);

        return {
          destination,
          blurb: String(item.blurb || ""),
          icon: String(item.icon || "explore"),
          imageUrl,
        };
      })
    );
  } catch (error) {
    console.error(error.message);

    throw rateLimitAwareError(error, "Could not generate AI suggestions.");
  }
};
