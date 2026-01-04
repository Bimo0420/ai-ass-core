from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from llama_index.core import (
    VectorStoreIndex, 
    SimpleDirectoryReader,
    Settings,
    StorageContext
)
from llama_index.llms.ollama import Ollama
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

# Настройка LLM
llm = Ollama(
    model="llama3.1:8b",
    base_url=OLLAMA_URL,
    request_timeout=120.0
)

# Настройка локальных embeddings через Ollama
embed_model = OllamaEmbedding(
    model_name="nomic-embed-text",
    base_url=OLLAMA_URL,
)

Settings.llm = llm
Settings.embed_model = embed_model
Settings.chunk_size = 512

# ✅ Инициализация vector store
vector_store = PGVectorStore.from_params(
    database=os.getenv("POSTGRES_DB", "postgres"),
    host=os.getenv("POSTGRES_HOST", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "password"),
    port=int(os.getenv("POSTGRES_PORT", "5432")),
    user=os.getenv("POSTGRES_USER", "postgres"),
    table_name="llamaindex_vectors",
    embed_dim=768
)

storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Глобальная переменная для индекса
index = None

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3

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
        # Используем /tmp для временных файлов (всегда доступен для записи)
        temp_dir = "/tmp"
        
        # Сохранение файла
        file_path = f"{temp_dir}/{file.filename}"
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
        # Создаём временный файл в /tmp
        file_path = f"/tmp/{request.filename}"
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
        
@app.post("/query")
async def query_documents(request: QueryRequest):
    """Поиск по индексированным документам"""
    try:
        query_engine = index.as_query_engine(
            similarity_top_k=request.top_k
        )
        response = query_engine.query(request.query)
        
        # Извлечение источников
        sources = []
        for node in response.source_nodes:
            sources.append({
                "text": node.node.text[:200],
                "score": node.score,
                "metadata": node.node.metadata
            })
        
        return {
            "response": str(response),
            "sources": sources,
            "query": request.query
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
