import groq from "../utils/groq.js";
import { AI_CONFIG } from "../config/ai.js";
import AppError from "../utils/AppError.js";

/**
 * No new API needed here — the itinerary LLM (Groq) already in this
 * project translates just as well as a dedicated translation API for
 * this use case, so reuse it instead of adding another integration.
 */
export const translateText = async (text, targetLanguage) => {
  try {
    const completion = await groq.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the user's text into the requested language. " +
            "Return ONLY the translated text, with no explanation, quotes, or extra commentary.",
        },
        {
          role: "user",
          content: `Translate the following into ${targetLanguage}:\n\n${text}`,
        },
      ],
    });

    const translated = completion.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      throw new Error("Empty translation response.");
    }

    return translated;
  } catch (error) {
    console.error(error.message);

    throw new AppError("Could not translate the requested text.", 502);
  }
};
