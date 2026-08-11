import json

from services.llm_client import client, MODEL


def generate_answer(prompt: str) -> dict:
    """
    Generate an itinerary using Groq and return it as a Python dictionary.
    """

    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.4,
        response_format={
            "type": "json_object"
        },
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert travel planner. "
                    "Always return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
    )

    content = response.choices[0].message.content

    print("\n========== RAW LLM RESPONSE ==========")
    print(content)
    print("======================================\n")

    try:
        return json.loads(content)

    except json.JSONDecodeError:
        raise ValueError("Groq returned invalid JSON.")
