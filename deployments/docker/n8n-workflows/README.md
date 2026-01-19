# AI Agent с Hybrid Search и Reranking

## Архитектура

```
┌─────────────┐     ┌───────────┐     ┌──────────────────────┐
│  OpenWebUI  │────▶│  Webhook  │────▶│      AI Agent        │
└─────────────┘     └───────────┘     │                      │
                                      │  ┌────────────────┐  │
                                      │  │ Ollama Chat    │  │
                                      │  │ Model          │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │ Postgres Chat  │  │
                                      │  │ Memory         │  │
                                      │  └────────────────┘  │
                                      │  ┌────────────────┐  │
                                      │  │ Hybrid Search  │──┼──▶ LlamaIndex API
                                      │  │ Tool (HTTP)    │◀─┼──  /hybrid-query
                                      │  └────────────────┘  │
                                      └──────────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────────┐
                                      │ Respond to Webhook   │
                                      └──────────────────────┘
```

## Как работает Hybrid Search Tool

1. **AI Agent получает вопрос** от пользователя
2. **Вызывает HTTP Tool** с запросом к LlamaIndex API
3. **LlamaIndex выполняет**:
   - Генерацию embedding через Ollama
   - Гибридный поиск в Supabase (keyword + semantic)
   - BGE reranking результатов
4. **Возвращает top-k документов** агенту
5. **AI Agent формирует ответ** на основе контекста

## Импорт workflow

### Способ 1: Через UI
1. Откройте n8n: `https://n8n.yourdomain.ru`
2. Создайте новый workflow
3. Нажмите `...` → `Import from file`
4. Выберите `ai-agent-hybrid-search.json`

### Способ 2: Через API
```bash
curl -X POST "https://n8n.yourdomain.ru/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d @ai-agent-hybrid-search.json
```

## Настройка после импорта

### 1. Credentials — Ollama
- Name: `Ollama`
- Base URL: `http://ollama:11434`

### 2. Credentials — Postgres
- Host: `postgres` (или ваш хост из .env)
- Database: `postgres`
- User: `postgres`
- Password: из вашего .env

### 3. Ollama Chat Model
- Model: `qwen3:30b-a3b` (или другая модель)
- Temperature: 0.7

### 4. Webhook URL
После активации workflow, URL будет:
```
https://n8n.yourdomain.ru/webhook/ai-agent
```

## Интеграция с OpenWebUI

### Вариант 1: Через Pipeline (рекомендуется)

Создайте pipeline в OpenWebUI, который отправляет запросы к n8n:

```python
# В файле pipelines/n8n_agent_pipeline.py
import requests

class Pipeline:
    def __init__(self):
        self.n8n_webhook_url = "http://n8n:5678/webhook/ai-agent"
    
    def pipe(self, user_message: str, model_id: str, messages: list, body: dict):
        response = requests.post(
            self.n8n_webhook_url,
            json={
                "chatInput": user_message,
                "sessionId": body.get("session_id", "default")
            }
        )
        return response.text
```

### Вариант 2: Через Function в OpenWebUI

В Settings → Functions создайте новую функцию:

```python
async def query_knowledge_base(query: str) -> str:
    """
    Search the knowledge base for relevant information.
    """
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "http://n8n:5678/webhook/ai-agent",
            json={"chatInput": query, "sessionId": "openwebui"}
        ) as resp:
            return await resp.text()
```

## Тестирование

### Через curl:
```bash
curl -X POST "https://n8n.yourdomain.ru/webhook/ai-agent" \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "Расскажи про настройку hybrid search"}'
```

### Ожидаемый ответ:
```json
{
  "output": "На основе документации, hybrid search настраивается следующим образом..."
}
```

## Troubleshooting

### Ошибка "fetch failed"
- Проверьте URL Ollama: должен быть `http://ollama:11434`
- Проверьте, что контейнер ollama запущен

### Ошибка "Supabase client not initialized"
- Проверьте переменную `SUPABASE_SERVICE_KEY` в docker-compose
- Убедитесь, что llamaindex контейнер перезапущен

### Tool не вызывается
- Проверьте System Prompt — должен явно указывать на использование инструмента
- Убедитесь, что модель поддерживает function calling (qwen3, llama3.1+)

### Медленный ответ
- Reranking занимает 2-5 секунд (модель BGE ~560MB)
- Первый запрос будет медленнее (загрузка моделей)
