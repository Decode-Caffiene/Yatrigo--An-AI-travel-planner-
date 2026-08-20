import axios from "axios";

import groq from "./groq.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Every AI feature shares one Groq account's daily token quota, so a busy
// day can exhaust it for the whole app at once (see hotel/restaurant/event
// generation all failing together). These are free-tier models on a
// different provider/quota entirely, used only when Groq itself is out —
// not swapped in as primaries, so this never adds cost.
//
// A single free model's response time was measured at 11-363 seconds for
// the same kind of request across different runs — wildly variable, since
// it's shared free capacity with no guaranteed throughput per model. Racing
// several different models/providers at once (whichever responds first
// wins) hedges against any one of them being congested at a given moment;
// all four were verified in testing to return fast (3-8s), valid JSON for
// this app's kind of prompt.
const OPENROUTER_FALLBACK_MODELS = [
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
];
// Kept short so a slow moment fails fast rather than compounding with the
// caller's own retry logic (see FALLBACK_TIMEOUT_MARKER below for how that
// compounding is avoided).
const OPENROUTER_TIMEOUT_MS = 15_000;

// Attached to the error thrown when the OpenRouter fallback itself times
// out, so callers with a "retry once on failure" wrapper (added to recover
// from Groq occasionally emitting malformed JSON — a cheap, fast retry
// against Groq) can tell the difference and skip retrying *this* class of
// failure. Retrying a call that already spent the full timeout on a slow
// free-tier fallback just doubles the wait for very little extra chance of
// success — measured this doubling a 220s hang into 363s during testing.
export const FALLBACK_TIMEOUT_MARKER = "openrouter-fallback-timeout";

const isQuotaError = (error) => error?.status === 429 || error?.response?.status === 429;

// axios's own `timeout` option measured as unreliable in testing here — a
// call that should have aborted at 25s instead ran for 220s and 363s in two
// separate runs (likely the free-tier response trickles data slowly enough
// to keep resetting whatever axios/Node considers "the socket is idle").
// AbortController + a hard Promise.race is a second, independent mechanism
// that forcibly tears down the request at the deadline regardless of what
// the HTTP layer thinks is going on.
const requestFromModel = async (model, { temperature, max_completion_tokens, max_tokens, messages }) => {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  const request = axios.post(
    OPENROUTER_URL,
    {
      model,
      temperature,
      max_tokens: max_completion_tokens || max_tokens,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: OPENROUTER_TIMEOUT_MS,
      signal: controller.signal,
    }
  );

  const timeoutGuard = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`${model} timed out after ${OPENROUTER_TIMEOUT_MS}ms`)),
      OPENROUTER_TIMEOUT_MS + 1000
    );
  });

  try {
    const { data } = await Promise.race([request, timeoutGuard]);

    // A 200 with empty/missing content is as useless as a real failure —
    // don't let it "win" the race over a slower model that actually
    // answered (Promise.any only cares about fulfilled vs rejected).
    if (!data?.choices?.[0]?.message?.content?.trim()) {
      throw new Error(`${model} returned empty content`);
    }

    return data;
  } finally {
    clearTimeout(abortTimer);
  }
};

// Fires the same request at several different free models/providers at
// once and returns whichever answers first — hedges against any single
// one being congested. Only fails (and only then spends the full timeout)
// if every candidate fails.
//
// Each racer has its own AbortController-based timeout, but that alone
// wasn't fully reliable in testing (a Cairo run took 35.7s despite every
// racer supposedly capped at 15s — Promise.any waits for the first
// *fulfillment*, so one straggler whose abort didn't actually cut the
// connection in time can hold up the whole race past its nominal ceiling,
// the same failure mode axios's own `timeout` option had earlier). This
// outer race is a second, fully independent backstop: a bare setTimeout
// with no dependency on axios/AbortController/network behavior at all, so
// it can't be defeated by however a given response happens to stream in.
const callOpenRouter = async (params) => {
  const hardDeadline = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`OpenRouter fallback exceeded hard deadline of ${OPENROUTER_TIMEOUT_MS + 5000}ms`)),
      OPENROUTER_TIMEOUT_MS + 5000
    );
  });

  try {
    return await Promise.race([
      Promise.any(OPENROUTER_FALLBACK_MODELS.map((model) => requestFromModel(model, params))),
      hardDeadline,
    ]);
  } catch (aggregateError) {
    // Any failure here means a full fallback attempt (racing every
    // candidate) has already been spent — tag it so callers know retrying
    // won't be cheap.
    const error = new Error("All OpenRouter fallback models failed or timed out.");
    error.cause = aggregateError;
    error.fallbackAlreadyAttempted = FALLBACK_TIMEOUT_MARKER;
    throw error;
  }
};

/**
 * True when `error` came from a spent OpenRouter fallback attempt — callers
 * with a "retry once" wrapper around createChatCompletion should check this
 * and skip the retry rather than spending a second full fallback timeout.
 */
export const wasFallbackAlreadyAttempted = (error) =>
  error?.fallbackAlreadyAttempted === FALLBACK_TIMEOUT_MARKER;

/**
 * Drop-in replacement for groq.chat.completions.create(...) — same params,
 * same `{ choices: [{ message: { content } }] }` response shape — that
 * automatically retries through a free OpenRouter model when Groq's shared
 * quota is exhausted (429), instead of every AI feature in the app failing
 * at once until that one account's daily limit resets. Falls through to the
 * original Groq error if OPENROUTER_API_KEY isn't configured, or if the
 * fallback call itself fails.
 */
export const createChatCompletion = async (params) => {
  try {
    return await groq.chat.completions.create(params);
  } catch (error) {
    if (!isQuotaError(error) || !process.env.OPENROUTER_API_KEY) {
      throw error;
    }

    console.warn("Groq quota exhausted — falling back to OpenRouter:", error.message);
    return callOpenRouter(params);
  }
};
