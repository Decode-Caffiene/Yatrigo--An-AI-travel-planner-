from datetime import datetime


def calculate_trip_days(start_date: str, end_date: str):
    start = datetime.fromisoformat(start_date)
    end = datetime.fromisoformat(end_date)

    return (end - start).days + 1


def format_city_route(cities):
    return "\n".join(f"- {c['city']}: {c['days']} day(s)" for c in cities)


def build_rag_prompt(request, context, cities, trip_days):

    return f"""
You are an expert AI Travel Planner.

Your job is NOT to summarize travel documents.

Your job is to design an amazing trip using the travel documents only as reference.

---------------------------------------------------
Traveler Information
---------------------------------------------------

Destination:
{request.destination}

Budget:
{request.budget} USD

Travelers:
{request.travelers}

Start Date:
{request.startDate}

End Date:
{request.endDate}

Trip Length:
{trip_days} days

Interests:
{", ".join(request.interests)}

---------------------------------------------------
City Route (follow this breakdown exactly)
---------------------------------------------------

{format_city_route(cities)}

---------------------------------------------------
Travel Guide
---------------------------------------------------

{context}

---------------------------------------------------
Instructions
---------------------------------------------------

Use the travel guide ONLY as factual knowledge.

If the travel guide mentions a city,
build the itinerary around that city.

If the travel guide mentions restaurants,
include them.

If the travel guide mentions famous temples,
include them.

If the travel guide mentions local food,
include them.

If the travel guide mentions transport,
use it.

Never invent places when relevant places exist in the travel guide.

If information is missing,
use general travel knowledge ONLY to fill small gaps.

Do NOT write:

"Not mentioned in travel documents."

Instead choose the best nearby destination.

Distribute the budget realistically.

The itinerary MUST contain exactly {trip_days} day entries, numbered 1 to {trip_days}.

Each day's "city" field MUST match the City Route above, spending the
listed number of days in each city before moving to the next one.

Each day should include:

Morning

Afternoon

Evening

Each activity must have:

time

title

description

estimatedCost

The output MUST be valid JSON only.

Return exactly this structure:

{{
  "summary": "...",
  "totalEstimatedBudget": number,
  "currency": "USD",
  "travelTips":[...],
  "days":[
    {{
      "day":1,
      "city":"",
      "theme":"",
      "activities":[]
    }}
  ]
}}
"""