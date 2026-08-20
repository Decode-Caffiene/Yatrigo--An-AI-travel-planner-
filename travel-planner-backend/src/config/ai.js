export const AI_CONFIG = {
  provider: "groq",

  model:
    process.env.GROQ_MODEL,

  // Smaller sibling of `model` (confirmed available on this account's Groq
  // catalog) for tasks that don't need heavy reasoning or broad real-world
  // knowledge recall — a plain translation, looking up one already-known
  // fact, or rating restaurants Foursquare already gave us real names for.
  // Cuts both latency and today's shared token budget for those calls.
  // Tasks that generate real-world facts from scratch (event dates, hotel/
  // restaurant names, destination guides) stay on the full model — those
  // are exactly where a weaker model is most likely to regress quality.
  lightModel: process.env.GROQ_LIGHT_MODEL || "openai/gpt-oss-20b",

  temperature: 0.6,

  // Groq's rate limiter reserves prompt + maxTokens against the account's
  // tokens-per-minute budget, so keep this close to what a chunk actually
  // needs rather than padding it — oversized values burn through TPM fast.
  maxTokens: 3000,

  // Max days requested from the AI per completion. Asking for an entire
  // long trip (e.g. 73 days) in one JSON response either gets truncated or
  // the model silently returns a small sample instead of the full itinerary.
  chunkSize: 5,
};
