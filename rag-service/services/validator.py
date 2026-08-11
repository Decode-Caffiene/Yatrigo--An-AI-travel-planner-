def validate_itinerary(itinerary: dict, trip_days: int) -> list[str]:
    """
    Check the LLM's itinerary JSON against the expected shape.
    Returns a list of error strings; an empty list means it's valid.
    """

    errors = []

    if not isinstance(itinerary, dict):
        return ["Itinerary is not a JSON object."]

    for field in ["summary", "totalEstimatedBudget", "currency", "travelTips", "days"]:
        if field not in itinerary:
            errors.append(f"Missing top-level field: {field}")

    days = itinerary.get("days")

    if not isinstance(days, list):
        errors.append("'days' must be a list.")
        return errors

    if len(days) != trip_days:
        errors.append(f"Expected {trip_days} day entries, got {len(days)}.")

    for i, day in enumerate(days, start=1):
        if not isinstance(day, dict):
            errors.append(f"Day {i} is not an object.")
            continue

        for field in ["day", "city", "theme", "activities"]:
            if field not in day:
                errors.append(f"Day {i} is missing field: {field}")

        activities = day.get("activities")

        if not isinstance(activities, list) or len(activities) == 0:
            errors.append(f"Day {i} has no activities.")
            continue

        for j, activity in enumerate(activities, start=1):
            if not isinstance(activity, dict):
                errors.append(f"Day {i} activity {j} is not an object.")
                continue

            for field in ["time", "title", "description", "estimatedCost"]:
                if field not in activity:
                    errors.append(f"Day {i} activity {j} is missing field: {field}")

    return errors
