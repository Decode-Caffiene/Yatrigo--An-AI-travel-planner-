from sentence_transformers import CrossEncoder

reranker_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")


def rerank(query: str, docs: list, top_k: int = 8) -> list:
    """
    Re-score retrieved docs against the query with a cross-encoder
    and return the top_k most relevant ones.
    """

    if not docs:
        return []

    pairs = [[query, doc.page_content] for doc in docs]
    scores = reranker_model.predict(pairs)

    scored_docs = sorted(
        zip(docs, scores),
        key=lambda pair: pair[1],
        reverse=True,
    )

    print("\n==============================")
    print("Reranked Documents (top scores)")
    print("==============================")
    for doc, score in scored_docs[:top_k]:
        print(f"{score:.4f} | {doc.metadata.get('country')} p{doc.metadata.get('page')} | {doc.page_content[:80]!r}")

    return [doc for doc, _ in scored_docs[:top_k]]
