from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader

from services.text_splitter import text_splitter
from services.vector_store import vector_store

DATA_DIR = Path("data")

pdf_files = list(DATA_DIR.glob("*.pdf"))

if not pdf_files:
    print("❌ No PDF files found.")
    exit()

documents = []

# -----------------------------
# Load all PDFs
# -----------------------------
for pdf in pdf_files:
    print(f"📄 Loading: {pdf.name}")

    loader = PyPDFLoader(str(pdf))
    docs = loader.load()

    # Add country metadata to every page
    country = pdf.stem.capitalize()

    for doc in docs:
        doc.metadata["country"] = country

    print(f"   Loaded {len(docs)} pages")

    documents.extend(docs)

print(f"\n✅ Total pages loaded: {len(documents)}")

# -----------------------------
# Split into chunks
# -----------------------------
chunks = text_splitter.split_documents(documents)

print(f"✅ Total chunks created: {len(chunks)}")

print("\n========== FIRST CHUNK ==========")
print(chunks[0].page_content[:500])

print("\n========== CHUNK METADATA ==========")
print(chunks[0].metadata)

# -----------------------------
# Store in ChromaDB
# -----------------------------
print("\n💾 Storing embeddings in ChromaDB...")

vector_store.add_documents(chunks)

print("✅ Embeddings stored successfully!")