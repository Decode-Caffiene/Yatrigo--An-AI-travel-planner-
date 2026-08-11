from services.vector_store import vector_store
from services.reranker import rerank
from services.query_builder import build_search_queries


def retrieve_context(destination, interests, cities=None, country=None):

    city_names = [c["city"] for c in cities] if cities else [destination]

    # Build multiple search queries per city, so multi-city trips get
    # context for every city instead of just the destination as a whole
    queries = []

    for city in city_names:
        queries.extend(
            build_search_queries(
                destination=city,
                interests=interests,
            )
        )

    queries = list(dict.fromkeys(queries))

    all_docs = []

    # Retrieve documents for each query
    for query in queries:

        search_kwargs = {
            "k": 4,
            "fetch_k": 20,
            "lambda_mult": 0.8,
        }

        if country:
            search_kwargs["filter"] = {
                "country": country
            }

        retriever = vector_store.as_retriever(
            search_type="mmr",
            search_kwargs=search_kwargs,
        )

        docs = retriever.invoke(query)

        all_docs.extend(docs)

    # Remove duplicates
    unique_docs = []
    seen = set()

    for doc in all_docs:

        key = (
            doc.metadata.get("source"),
            doc.metadata.get("page"),
            doc.page_content[:200],
        )

        if key not in seen:
            seen.add(key)
            unique_docs.append(doc)

    # Combine queries for reranking
    combined_query = f"{destination} " + " ".join(city_names) + " " + " ".join(queries)

    # Scale how much context we keep with how many cities the trip covers
    top_k = min(20, max(8, len(city_names) * 5))

    best_docs = rerank(
        query=combined_query,
        docs=unique_docs,
        top_k=top_k,
    )

    # Build context
    context = "\n\n".join(
        f"""
====================
SOURCE

Country : {doc.metadata.get('country')}
Page : {doc.metadata.get('page') + 1}

Content:
{doc.page_content}
"""
        for doc in best_docs
    )

    return context, best_docs