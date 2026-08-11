import json

from services.llm_client import client, MODEL


def generate_cities(destination: str, trip_days: int, interests: list[str]) -> list[dict]:
    """
    Ask the LLM to break the destination down into a realistic
    city-by-city route with a day allocation that sums to trip_days.
    """

    prompt = f"""
You are a travel route planning expert.

Break down a {trip_days}-day trip to {destination} into a realistic
city-by-city route.

Traveler interests: {", ".join(interests) if interests else "general sightseeing"}

Rules:
- If {destination} is a single city, return just that one city with all {trip_days} days.
- If {destination} is a country or region, choose 1-4 well-connected cities that suit the interests.
- The "days" values must sum to exactly {trip_days}.
- Order the cities in a sensible travel sequence that minimizes backtracking.

Return ONLY valid JSON in this exact structure:

{{
  "cities": [
    {{"city": "...", "days": number}}
  ]
}}
"""

    response = client.chat.completions.create(
        model=MODEL,
        temperature=0.3,
        response_format={
            "type": "json_object"
        },
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an expert travel route planner. "
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

    print("\n========== CITY GENERATOR RESPONSE ==========")
    print(content)
    print("===============================================\n")

    cities = []

    try:
        data = json.loads(content)
        cities = [
            c for c in data.get("cities", [])
            if c.get("city") and isinstance(c.get("days"), (int, float)) and c["days"] > 0
        ]
    except json.JSONDecodeError:
        cities = []

    if not cities:
        cities = [{"city": destination, "days": trip_days}]

    return _normalize_city_days(cities, trip_days)


def _normalize_city_days(cities: list[dict], trip_days: int) -> list[dict]:
    """
    Force the day allocation to sum to exactly trip_days by adjusting
    the last city, since the LLM's totals aren't guaranteed to add up.
    """

    for city in cities:
        city["days"] = int(city["days"])

    total = sum(c["days"] for c in cities)
    cities[-1]["days"] += trip_days - total
    cities[-1]["days"] = max(1, cities[-1]["days"])

    return cities
