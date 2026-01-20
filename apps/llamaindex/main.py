from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from llama_index.core import (
    VectorStoreIndex, 
    SimpleDirectoryReader,
    Settings,
    StorageContext
)
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.embeddings.ollama import OllamaEmbedding
from llama_index.vector_stores.postgres import PGVectorStore
import os

app = FastAPI(title="LlamaIndex API")

# Конфигурация из переменных окружения
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")

# ✅ ИСПРАВЛЕНО: используем \ для переноса строки или пишем в одну строку
POSTGRES_URL = os.getenv(
    "POSTGRES_URL",
    (
        f"postgresql://{os.getenv('POSTGRES_USER', 'postgres')}:"
        f"{os.getenv('POSTGRES_PASSWORD', 'password')}"
        f"@{os.getenv('POSTGRES_HOST', 'localhost')}:"
        f"{os.getenv('POSTGRES_PORT', '5432')}/"
        f"{os.getenv('POSTGRES_DB', 'postgres')}"
    )
)

# Настройка локальных embeddings через Ollama
embed_model = OllamaEmbedding(
    model_name="nomic-embed-text",
    base_url=OLLAMA_URL,
)

Settings.embed_model = embed_model
Settings.chunk_size = 512

# Reranker для улучшения качества поиска (особенно для русского языка)
# Модель скачается автоматически при первом запуске (~560MB)
reranker = SentenceTransformerRerank(
    model="BAAI/bge-reranker-v2-m3",  # Мультиязычный reranker
    top_n=3  # Количество лучших результатов после reranking
)

# ✅ КЭШ для reranker моделей с разными top_n
# Избегаем повторной загрузки модели при каждом запросе
_reranker_cache: dict[int, SentenceTransformerRerank] = {3: reranker}

def get_cached_reranker(top_n: int = 3) -> SentenceTransformerRerank:
    """Получить кэшированный reranker с заданным top_n"""
    if top_n not in _reranker_cache:
        _reranker_cache[top_n] = SentenceTransformerRerank(
            model="BAAI/bge-reranker-v2-m3",
            top_n=top_n
        )
    return _reranker_cache[top_n]

# ✅ Инициализация vector store
vector_store = PGVectorStore.from_params(
    database=os.getenv("POSTGRES_DB", "postgres"),
    host=os.getenv("POSTGRES_HOST", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "password"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    user=os.getenv("POSTGRES_USER", "postgres"),
    table_name="data_llamaindex_vectors",
    embed_dim=768
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Глобальная переменная для индекса
index = None



@app.on_event("startup")
async def startup_event():
    """Инициализация индекса при запуске"""
    global index
    try:
        index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            storage_context=storage_context
        )
        print("✅ Index loaded from PostgreSQL")
    except Exception as e:
        print(f"⚠️ Creating new index: {e}")
        index = VectorStoreIndex.from_documents(
            [],
            storage_context=storage_context
        )

@app.get("/")
async def root():
    return {"message": "LlamaIndex API is running", "status": "ok"}

@app.post("/index-document")
async def index_document(file: UploadFile = File(...)):
    """Загрузка и индексация документа"""
    try:
        # Создание директории data если её нет
        os.makedirs("./data", exist_ok=True)
        
        # Сохранение файла
        file_path = f"./data/{file.filename}"
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Загрузка и индексация
        documents = SimpleDirectoryReader(
            input_files=[file_path]
        ).load_data()
        
        # Добавление в индекс
        for doc in documents:
            index.insert(doc)
        
        # Удаление временного файла
        os.remove(file_path)
        
        return {
            "status": "success",
            "filename": file.filename,
            "documents_indexed": len(documents)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

# Добавьте Pydantic модель
class IndexTextRequest(BaseModel):
    content: str
    filename: str = "document.md"

@app.post("/index-text")
async def index_text(request: IndexTextRequest):
    """Индексация текста напрямую без файла"""
    try:
        # Создаём временный файл
        file_path = f"./data/{request.filename}"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        
        # Загрузка и индексация
        documents = SimpleDirectoryReader(
            input_files=[file_path]
        ).load_data()
        
        # Добавление в индекс
        for doc in documents:
            index.insert(doc)
        
        # Удаление временного файла
        os.remove(file_path)
        
        return {
            "status": "success",
            "filename": request.filename,
            "documents_indexed": len(documents),
            "content_length": len(request.content)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        


@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    return {
        "status": "healthy",
        "llm": OLLAMA_URL,
        "vector_store": "postgres"
    }


# ============================================
# HYBRID SEARCH с SUPABASE + RERANKING
# ============================================

from supabase import create_client, Client
from llama_index.core.schema import TextNode, NodeWithScore

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://supabase-kong:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("SERVICE_ROLE_KEY", ""))

# Initialize Supabase client
supabase_client: Client = None

@app.on_event("startup")
async def init_supabase():
    """Initialize Supabase client"""
    global supabase_client
    if SUPABASE_KEY:
        try:
            supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print(f"✅ Supabase client initialized: {SUPABASE_URL}")
        except Exception as e:
            print(f"⚠️ Failed to initialize Supabase: {e}")
    else:
        print("⚠️ SUPABASE_SERVICE_KEY not set, hybrid search disabled")


class HybridQueryRequest(BaseModel):
    query: str
    match_count: int = 40
    top_k: int = 5  # Final results after reranking
    table_name: str = "documents"  # Table with hybrid_search function
    full_text_weight: float = 1.0
    semantic_weight: float = 1.0
    use_reranking: bool = True


class HybridQueryResponse(BaseModel):
    query: str
    results: list
    reranking_used: bool
    total_found: int


@app.post("/hybrid-query", response_model=HybridQueryResponse)
async def hybrid_query(request: HybridQueryRequest):
    """
    Гибридный поиск через Supabase с BGE Reranking.
    
    1. Получает embedding запроса через Ollama
    2. Вызывает hybrid_search RPC в Supabase (keyword + semantic)
    3. Делает reranking через BGE-reranker-v2-m3
    4. Возвращает top_k лучших результатов
    """
    if not supabase_client:
        raise HTTPException(
            status_code=503, 
            detail="Supabase client not initialized. Check SUPABASE_SERVICE_KEY."
        )
    
    try:
        # 1. Генерируем embedding для запроса
        query_embedding = embed_model.get_query_embedding(request.query)
        
        # 2. Вызываем hybrid_search RPC
        response = supabase_client.rpc(
            "hybrid_search_llamaindex",  # Функция в PostgreSQL
            {
                "query_text": request.query,
                "query_embedding": query_embedding,
                "match_count": request.match_count,
                "full_text_weight": request.full_text_weight,
                "semantic_weight": request.semantic_weight
            }
        ).execute()
        
        if not response.data:
            return HybridQueryResponse(
                query=request.query,
                results=[],
                reranking_used=False,
                total_found=0
            )
        
        # 3. Подготовка для reranking
        documents = response.data
        
        if request.use_reranking and len(documents) > 0:
            # Конвертируем в NodeWithScore для reranker
            nodes_with_scores = []
            for doc in documents:
                node = TextNode(
                    text=doc.get("content", ""),
                    metadata=doc.get("metadata", {})
                )
                # Начальный score (будет перезаписан reranker'ом)
                nodes_with_scores.append(NodeWithScore(node=node, score=1.0))
            
            # 4. Применяем BGE reranking (используем кэшированную модель)
            cached_reranker = get_cached_reranker(request.top_k)
            
            # Применяем reranking
            reranked_nodes = cached_reranker.postprocess_nodes(
                nodes_with_scores,
                query_str=request.query
            )
            
            # Формируем результат
            results = []
            for node_with_score in reranked_nodes:
                metadata = node_with_score.node.metadata
                # Remove cryptic IDs and internal hidden fields to prevent the agent from using them
                clean_metadata = {
                    k: v for k, v in metadata.items() 
                    if k not in ["doc_id", "node_id", "ref_doc_id", "document_id"] 
                    and not k.startswith("_")
                }
                
                results.append({
                    "content": node_with_score.node.text,
                    "score": float(node_with_score.score) if node_with_score.score else None,
                    "source": clean_metadata.get("file_name", "Unknown"),
                    "metadata": clean_metadata
                })
            
            return HybridQueryResponse(
                query=request.query,
                results=results,
                reranking_used=True,
                total_found=len(documents)
            )
        else:
            # Без reranking - возвращаем как есть
            results = []
            for doc in documents[:request.top_k]:
                metadata = doc.get("metadata", {})
                clean_metadata = {
                    k: v for k, v in metadata.items() 
                    if k not in ["doc_id", "node_id", "ref_doc_id", "document_id"] 
                    and not k.startswith("_")
                }
                
                results.append({
                    "content": doc.get("content", ""),
                    "score": None,
                    "source": clean_metadata.get("file_name", "Unknown"),
                    "metadata": clean_metadata
                })
            
            return HybridQueryResponse(
                query=request.query,
                results=results,
                reranking_used=False,
                total_found=len(documents)
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid search failed: {str(e)}")


@app.post("/rerank")
async def rerank_documents(query: str, documents: list[dict], top_k: int = 3):
    """
    Отдельный endpoint для reranking любых документов.
    Полезно для интеграции с n8n или другими системами.
    """
    try:
        nodes_with_scores = []
        for doc in documents:
            node = TextNode(
                text=doc.get("content", doc.get("text", "")),
                metadata=doc.get("metadata", {})
            )
            nodes_with_scores.append(NodeWithScore(node=node, score=1.0))
        
        # Используем кэшированный reranker
        cached_reranker = get_cached_reranker(top_k)
        
        reranked_nodes = cached_reranker.postprocess_nodes(
            nodes_with_scores,
            query_str=query
        )
        
        results = []
        for node_with_score in reranked_nodes:
            results.append({
                "content": node_with_score.node.text,
                "score": float(node_with_score.score) if node_with_score.score else None,
                "metadata": node_with_score.node.metadata
            })
        
        return {"query": query, "results": results, "total_reranked": len(results)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reranking failed: {str(e)}")
