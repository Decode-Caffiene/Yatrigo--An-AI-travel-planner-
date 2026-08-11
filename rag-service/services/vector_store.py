from langchain_chroma import Chroma

from services.embedding import embedding_model

vector_store = Chroma(
    collection_name="travel_guides",
    persist_directory="chroma_db",
    embedding_function=embedding_model,
)