
import os
import psycopg2
from llama_index.embeddings.ollama import OllamaEmbedding

# Config
DB_NAME = os.getenv("POSTGRES_DB", "postgres")
DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "password")
DB_HOST = os.getenv("POSTGRES_HOST", "postgres")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")

def test_search():
    print("--- Testing Connectivity & Search ---")
    
    # 1. Generate Embedding
    print(f"Generating embedding for query 'фундамент' using Ollama at {OLLAMA_URL}...")
    try:
        embed_model = OllamaEmbedding(model_name="nomic-embed-text", base_url=OLLAMA_URL)
        query_vector = embed_model.get_query_embedding("фундамент")
        print(f"Vector generated. Length: {len(query_vector)}")
    except Exception as e:
        print(f"FATAL: Could not generate embedding. {e}")
        return

    # 2. Connect to DB
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST, port=DB_PORT
        )
        cur = conn.cursor()
    except Exception as e:
        print(f"FATAL: DB Connection failed. {e}")
        return

    # 3. Perform Vector Search (Cosine Distance <=> is standard for Nomic)
    # Note: pgvector uses <=> for cosine distance. 
    # But usually <-> (L2) is used if vectors are not normalized. 
    # Let's try matching exactly what Supabase likely does.
    
    print("\nExecuting SQL Search (Cosine Distance <=>)...")
    sql = """
    SELECT id, content, embedding <=> %s::vector AS distance
    FROM documents
    ORDER BY distance ASC
    LIMIT 3;
    """
    
    cur.execute(sql, (query_vector,))
    rows = cur.fetchall()
    
    print(f"\nFound {len(rows)} results:")
    for row in rows:
        _id, text, distance = row
        print(f"ID: {_id} | Dist: {distance:.4f} | Text: {text[:100]}...")

    cur.close()
    conn.close()

if __name__ == "__main__":
    test_search()
