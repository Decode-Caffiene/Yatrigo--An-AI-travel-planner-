from services.retriever import retrieve_context

query = "Best places to visit in Nepal"

context, docs = retrieve_context(
    query=query,
    country="Nepal",
)

print("=" * 80)
print("CONTEXT")
print("=" * 80)

print(context)

print("\n")

print("=" * 80)
print("DOCUMENTS")
print("=" * 80)

for doc in docs:
    print(doc.metadata)