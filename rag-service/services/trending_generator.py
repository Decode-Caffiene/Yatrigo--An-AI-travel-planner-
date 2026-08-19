import json

from services.llm_client import client, MODEL


def generate_trending_destinations(count: int = 5) -> list[dict]:
    """
    Ask the LLM for a short list of destinations that are currently
    trending for travelers, each with a brief reason. This is a knowledge
    task, not a lookup task, so unlike itinerary generation it doesn't go
    through the retriever.
    """

    prompt = f"""
You are a well-traveled global travel trends analyst.

List {count} travel destinations that are trending right now for
travelers, considering current season, upcoming events, and popular
culture. Mix well-known and lesser-known picks. Do not repeat a country
more than once.

Return ONLY valid JSON in this exact structure:

{{
  "destinations": [
    {{"destination": "City, Country", "reason": "short 3-6 word reason"}}
  ]
}}
"""

    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.8,
        response_format={
            "type": "json_object"
        },
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert travel trends analyst. "
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

    print("\n========== TRENDING DESTINATIONS RESPONSE ==========")
    print(content)
    print("======================================================\n")

    try:
        data = json.loads(content)
        destinations = [
            {"destination": d["destination"], "reason": d.get("reason", "")}
            for d in data.get("destinations", [])
            if d.get("destination")
        ]
    except json.JSONDecodeError:
        destinations = []

    return destinations[:count]
