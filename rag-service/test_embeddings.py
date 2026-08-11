from services.embedding import embedding_model

text = "Tokyo is the capital city of Japan."

embedding = embedding_model.embed_query(text)

print(f"Embedding length: {len(embedding)}")
print(embedding[:10])