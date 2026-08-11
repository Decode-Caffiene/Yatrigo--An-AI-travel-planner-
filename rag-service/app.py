from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

from services.city_generator import generate_cities
from services.retriever import retrieve_context
from services.llm import generate_answer
from services.validator import validate_itinerary
from utils.prompt import build_rag_prompt, calculate_trip_days

MAX_GENERATION_ATTEMPTS = 3

app = FastAPI(
    title="Travel Planner RAG API",
    version="1.0.0",
)


class ItineraryRequest(BaseModel):
    destination: str
    budget: float
    travelers: int
    startDate: str
    endDate: str
    interests: List[str]


@app.post("/generate-itinerary")
def generate_itinerary(request: ItineraryRequest):

    trip_days = calculate_trip_days(request.startDate, request.endDate)

    # City generator: break the destination into a city-by-city route
    cities = generate_cities(
        destination=request.destination,
        trip_days=trip_days,
        interests=request.interests,
    )

    # Retriever: pull context for every city on the route
    context, docs = retrieve_context(
        destination=request.destination,
        interests=request.interests,
        cities=cities,
        country=request.destination,
    )

    # Build prompt
    prompt = build_rag_prompt(
        request=request,
        context=context,
        cities=cities,
        trip_days=trip_days,
    )

    # Trip planner (LLM) + validator, with retries on schema errors
    itinerary = None
    errors = []

    for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):

        active_prompt = prompt

        if errors:
            active_prompt += (
                "\n\nYour previous response had these problems. Fix them "
                "and return the corrected JSON only:\n- " + "\n- ".join(errors)
            )

        print(f"\n===== Generation attempt {attempt}/{MAX_GENERATION_ATTEMPTS} =====")

        try:
            itinerary = generate_answer(active_prompt)
        except ValueError:
            errors = ["Response was not valid JSON."]
            continue

        errors = validate_itinerary(itinerary, trip_days=trip_days)

        if not errors:
            break

    if errors:
        print("\n===== Itinerary validation warnings (using best effort result) =====")
        print(errors)

    # No ingested travel guide covers this destination, so the itinerary
    # came from the LLM's general knowledge rather than retrieved sources.
    # Surface that explicitly instead of silently returning it as if grounded.
    grounded = len(docs) > 0

    return {
        "success": True,
        "itinerary": itinerary,
        "cities": cities,
        "validationWarnings": errors,
        "grounded": grounded,
        "sources": [
            {
                "country": doc.metadata.get("country"),
                "page": doc.metadata.get("page", 0) + 1,
                "source": doc.metadata.get("source"),
            }
            for doc in docs
        ],
    }