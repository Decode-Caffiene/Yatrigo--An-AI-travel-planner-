def build_search_queries(destination: str, interests: list[str]):

    queries = [
        f"Top tourist attractions in {destination}",
        f"Best places to visit in {destination}",
        f"Local food in {destination}",
        f"Transportation in {destination}",
        f"Culture and traditions in {destination}",
        f"Travel tips for {destination}",
        f"Hidden gems in {destination}",
        f"Best itinerary for {destination}",
    ]

    interest_categories = {
        "food": [
            "local cuisine",
            "street food",
            "traditional restaurants",
            "food markets",
        ],

        "history": [
            "historical sites",
            "museums",
            "heritage places",
        ],

        "culture": [
            "cultural experiences",
            "festivals",
            "local traditions",
        ],

        "nature": [
            "national parks",
            "mountains",
            "lakes",
            "waterfalls",
            "viewpoints",
        ],

        "shopping": [
            "shopping areas",
            "markets",
            "souvenirs",
        ],

        "adventure": [
            "trekking",
            "hiking",
            "rafting",
            "zipline",
        ],

        "wildlife": [
            "wildlife",
            "national parks",
            "safari",
        ],

        "nightlife": [
            "nightlife",
            "bars",
            "clubs",
            "live music",
        ],

        "beaches": [
            "beaches",
            "islands",
            "coastal attractions",
        ],

        "temples": [
            "temples",
            "churches",
            "mosques",
            "religious sites",
            "spiritual places",
        ],

        "architecture": [
            "architecture",
            "landmarks",
            "historic buildings",
        ],

        "photography": [
            "photo spots",
            "scenic viewpoints",
            "sunrise spots",
            "sunset spots",
        ],
    }

    for interest in interests:

        queries.append(f"{interest} in {destination}")

        if interest.lower() in interest_categories:
            for keyword in interest_categories[interest.lower()]:
                queries.append(f"{keyword} in {destination}")

    return list(dict.fromkeys(queries))