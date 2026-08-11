export const AI_CONFIG = {
  provider: "groq",

  model:
    process.env.GROQ_MODEL,

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
