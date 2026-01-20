# API документация ai-ass-core

## Содержание

- [Обзор](#обзор)
- [LlamaIndex API](#llamaindex-api)
- [Ollama API](#ollama-api)
- [Supabase API](#supabase-api)
- [n8n Webhooks](#n8n-webhooks)
- [Аутентификация](#аутентификация)
- [Примеры использования](#примеры-использования)

---

## Обзор

ai-ass-core предоставляет несколько API endpoints:

| API | Base URL | Описание |
|-----|----------|----------|
| **LlamaIndex** | `http://localhost:8000` | RAG, индексация, hybrid search |
| **Ollama** | `http://localhost:11434` | LLM inference, embeddings |
| **Supabase** | `http://localhost:8000` | REST API, Auth, Storage |
| **n8n** | `http://localhost:5678` | Webhook endpoints |

### Production URLs

При настроенном домене:
- LlamaIndex: `https://llamaindex.your-domain.com`
- Ollama: `https://ollama.your-domain.com`
- Supabase: `https://supabase.your-domain.com`
- n8n: `https://n8n.your-domain.com`

---

## LlamaIndex API

### Base URL
```
http://localhost:8000
```

### Endpoints

#### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "llm": "http://ollama:11434",
  "vector_store": "postgres"
}
```

---

#### Индексация документа (файл)

```http
POST /index-document
Content-Type: multipart/form-data
```

**Request:**
```bash
curl -X POST "http://localhost:8000/index-document" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "status": "success",
  "filename": "document.pdf",
  "documents_indexed": 15
}
```

---

#### Индексация текста

```http
POST /index-text
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Текст документа для индексации...",
  "filename": "document.md"
}
```

**Response:**
```json
{
  "status": "success",
  "filename": "document.md",
  "documents_indexed": 3,
  "content_length": 1024
}
```

**cURL пример:**
```bash
curl -X POST "http://localhost:8000/index-text" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Заголовок\n\nТекст документа...",
    "filename": "readme.md"
  }'
```

---

#### Hybrid Search (Гибридный поиск)

```http
POST /hybrid-query
Content-Type: application/json
```

**Request Body:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `query` | string | required | Поисковый запрос |
| `match_count` | int | 40 | Количество кандидатов для reranking |
| `top_k` | int | 5 | Количество финальных результатов |
| `table_name` | string | "documents" | Таблица для поиска |
| `full_text_weight` | float | 1.0 | Вес полнотекстового поиска |
| `semantic_weight` | float | 1.0 | Вес семантического поиска |
| `use_reranking` | bool | true | Использовать BGE reranker |

**Request:**
```json
{
  "query": "как настроить векторный поиск",
  "match_count": 40,
  "top_k": 5,
  "full_text_weight": 1.0,
  "semantic_weight": 1.0,
  "use_reranking": true
}
```

**Response:**
```json
{
  "query": "как настроить векторный поиск",
  "results": [
    {
      "content": "Для настройки векторного поиска необходимо...",
      "score": 0.8542,
      "source": "setup-guide.md",
      "metadata": {
        "file_name": "setup-guide.md",
        "page_number": 5
      }
    },
    {
      "content": "PostgreSQL с расширением pgvector позволяет...",
      "score": 0.7891,
      "source": "architecture.md",
      "metadata": {
        "file_name": "architecture.md"
      }
    }
  ],
  "reranking_used": true,
  "total_found": 23
}
```

**cURL пример:**
```bash
curl -X POST "http://localhost:8000/hybrid-query" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "как работает RAG",
    "top_k": 3
  }'
```

---

#### Reranking (отдельный endpoint)

```http
POST /rerank
Content-Type: application/json
```

**Query Parameters:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| `query` | string | required | Запрос для ранжирования |
| `documents` | array | required | Документы для reranking |
| `top_k` | int | 3 | Количество результатов |

**Request:**
```json
{
  "query": "векторный поиск",
  "documents": [
    {"content": "Статья про машинное обучение..."},
    {"content": "Векторный поиск использует embeddings..."},
    {"content": "PostgreSQL поддерживает pgvector..."}
  ],
  "top_k": 2
}
```

**Response:**
```json
{
  "query": "векторный поиск",
  "results": [
    {
      "content": "Векторный поиск использует embeddings...",
      "score": 0.9234,
      "metadata": {}
    },
    {
      "content": "PostgreSQL поддерживает pgvector...",
      "score": 0.7856,
      "metadata": {}
    }
  ],
  "total_reranked": 2
}
```

---

## Ollama API

### Base URL
```
http://localhost:11434
```

Ollama предоставляет OpenAI-совместимый API.

### Список моделей

```http
GET /api/tags
```

**Response:**
```json
{
  "models": [
    {
      "name": "qwen3:8b",
      "model": "qwen3:8b",
      "size": 4920000000,
      "digest": "abc123...",
      "details": {
        "parameter_size": "8B",
        "quantization_level": "Q4_K_M"
      }
    },
    {
      "name": "nomic-embed-text",
      "model": "nomic-embed-text",
      "size": 274000000
    }
  ]
}
```

---

### Генерация текста (Streaming)

```http
POST /api/generate
Content-Type: application/json
```

**Request:**
```json
{
  "model": "qwen3:8b",
  "prompt": "Объясни, что такое RAG",
  "stream": true,
  "options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_ctx": 4096
  }
}
```

**Response (streaming):**
```json
{"model":"qwen3:8b","response":"R","done":false}
{"model":"qwen3:8b","response":"A","done":false}
{"model":"qwen3:8b","response":"G","done":false}
...
{"model":"qwen3:8b","response":"","done":true,"total_duration":1234567890}
```

---

### Chat (OpenAI-совместимый)

```http
POST /api/chat
Content-Type: application/json
```

**Request:**
```json
{
  "model": "qwen3:8b",
  "messages": [
    {"role": "system", "content": "Ты полезный ассистент."},
    {"role": "user", "content": "Что такое Docker?"}
  ],
  "stream": false,
  "options": {
    "temperature": 0.7
  }
}
```

**Response:**
```json
{
  "model": "qwen3:8b",
  "created_at": "2024-01-20T12:00:00.000Z",
  "message": {
    "role": "assistant",
    "content": "Docker — это платформа для контейнеризации..."
  },
  "done": true,
  "total_duration": 2345678901,
  "eval_count": 150
}
```

---

### Embeddings

```http
POST /api/embed
Content-Type: application/json
```

**Request:**
```json
{
  "model": "nomic-embed-text",
  "input": ["Текст для получения embedding"]
}
```

**Response:**
```json
{
  "model": "nomic-embed-text",
  "embeddings": [
    [0.123, -0.456, 0.789, ...]
  ]
}
```

---

### OpenAI-совместимый API

```http
POST /v1/chat/completions
Content-Type: application/json
```

**Request:**
```json
{
  "model": "qwen3:8b",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "temperature": 0.7,
  "max_tokens": 500
}
```

**Response:**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1705752000,
  "model": "qwen3:8b",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 8,
    "total_tokens": 18
  }
}
```

---

## Supabase API

### Base URL
```
http://localhost:8000  (через Kong)
```

### REST API (PostgREST)

#### Получение данных

```http
GET /rest/v1/documents
Authorization: Bearer ${SUPABASE_ANON_KEY}
apikey: ${SUPABASE_ANON_KEY}
```

**Query Parameters:**

| Параметр | Описание |
|----------|----------|
| `select` | Выбор колонок: `select=id,content,metadata` |
| `order` | Сортировка: `order=created_at.desc` |
| `limit` | Лимит: `limit=10` |
| `offset` | Смещение: `offset=20` |

**Пример:**
```bash
curl "http://localhost:8000/rest/v1/documents?select=id,content&limit=10" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}"
```

---

#### Вставка данных

```http
POST /rest/v1/documents
Authorization: Bearer ${SUPABASE_SERVICE_KEY}
apikey: ${SUPABASE_SERVICE_KEY}
Content-Type: application/json
Prefer: return=representation
```

**Request:**
```json
{
  "content": "Новый документ",
  "metadata": {"source": "api"}
}
```

---

#### RPC (Вызов PostgreSQL функций)

```http
POST /rest/v1/rpc/hybrid_search_llamaindex
Authorization: Bearer ${SUPABASE_SERVICE_KEY}
Content-Type: application/json
```

**Request:**
```json
{
  "query_text": "поисковый запрос",
  "query_embedding": [0.1, 0.2, ...],
  "match_count": 10,
  "full_text_weight": 1.0,
  "semantic_weight": 1.0
}
```

---

### Auth API

#### Регистрация

```http
POST /auth/v1/signup
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

---

#### Авторизация

```http
POST /auth/v1/token?grant_type=password
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "xxx"
}
```

---

### Storage API

#### Upload файла

```http
POST /storage/v1/object/documents/path/to/file.pdf
Authorization: Bearer ${ACCESS_TOKEN}
Content-Type: application/pdf
```

#### Download файла

```http
GET /storage/v1/object/public/documents/path/to/file.pdf
```

---

## n8n Webhooks

### Создание Webhook в n8n

1. Добавьте node **Webhook**
2. Настройте параметры:
   - **HTTP Method**: POST
   - **Path**: `/my-webhook`
   - **Authentication**: None / Header Auth / Basic Auth

### URL Webhook

```
https://n8n.your-domain.com/webhook/my-webhook
```

### Пример вызова

```bash
curl -X POST "https://n8n.your-domain.com/webhook/my-webhook" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from API"}'
```

---

## Аутентификация

### LlamaIndex API

Текущая версия **не требует аутентификации** для внутреннего использования.

Для production рекомендуется добавить:

```python
# main.py
from fastapi import Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

API_KEY = os.getenv("LLAMAINDEX_API_KEY")
api_key_header = APIKeyHeader(name="X-API-Key")

async def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return api_key

@app.post("/hybrid-query", dependencies=[Depends(verify_api_key)])
async def hybrid_query(...):
    ...
```

### Supabase

**Anon Key** — для публичных операций (RLS применяется)
```http
Authorization: Bearer ${SUPABASE_ANON_KEY}
apikey: ${SUPABASE_ANON_KEY}
```

**Service Role Key** — для серверных операций (обходит RLS)
```http
Authorization: Bearer ${SUPABASE_SERVICE_KEY}
apikey: ${SUPABASE_SERVICE_KEY}
```

### Ollama

По умолчанию **без аутентификации**. При внешнем доступе защищается Traefik middleware.

---

## Примеры использования

### Python

```python
import httpx

# LlamaIndex - Hybrid Search
async def search_documents(query: str) -> list:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8000/hybrid-query",
            json={
                "query": query,
                "top_k": 5,
                "use_reranking": True
            }
        )
        return response.json()["results"]


# Ollama - Chat
async def chat_with_llm(message: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "qwen3:8b",
                "messages": [{"role": "user", "content": message}],
                "stream": False
            }
        )
        return response.json()["message"]["content"]


# Supabase - Query
async def get_documents() -> list:
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:8000/rest/v1/documents",
            params={"select": "id,content", "limit": 10},
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
            }
        )
        return response.json()
```

### JavaScript/TypeScript

```typescript
// LlamaIndex
async function hybridSearch(query: string): Promise<SearchResult[]> {
  const response = await fetch('http://localhost:8000/hybrid-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: 5 })
  });
  const data = await response.json();
  return data.results;
}

// Ollama (OpenAI-compatible)
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama'  // Любое значение
});

const completion = await openai.chat.completions.create({
  model: 'qwen3:8b',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://localhost:8000',
  SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('documents')
  .select('id, content')
  .limit(10);
```

### cURL сценарии

```bash
#!/bin/bash
# scripts/test-api.sh

BASE_URL="http://localhost:8000"

# 1. Health check
echo "=== Health Check ==="
curl -s "$BASE_URL/health" | jq

# 2. Index text
echo -e "\n=== Index Text ==="
curl -s -X POST "$BASE_URL/index-text" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test document about AI and machine learning", "filename": "test.md"}' \
  | jq

# 3. Hybrid search
echo -e "\n=== Hybrid Search ==="
curl -s -X POST "$BASE_URL/hybrid-query" \
  -H "Content-Type: application/json" \
  -d '{"query": "machine learning", "top_k": 3}' \
  | jq

# 4. Ollama models
echo -e "\n=== Ollama Models ==="
curl -s "http://localhost:11434/api/tags" | jq '.models[].name'

# 5. Ollama chat
echo -e "\n=== Ollama Chat ==="
curl -s -X POST "http://localhost:11434/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3:8b",
    "messages": [{"role": "user", "content": "Say hello in Russian"}],
    "stream": false
  }' | jq '.message.content'
```

---

## Коды ошибок

### LlamaIndex API

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 400 | Некорректный запрос |
| 500 | Внутренняя ошибка сервера |
| 503 | Supabase client не инициализирован |

### Ollama API

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 404 | Модель не найдена |
| 500 | Ошибка inference |

### Supabase API

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 401 | Unauthorized (неверный ключ) |
| 403 | Forbidden (нет прав, RLS) |
| 404 | Ресурс не найден |
| 409 | Conflict (duplicate key) |

---

## Следующие шаги

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
- [CONFIGURATION.md](./CONFIGURATION.md) — Настройка параметров
