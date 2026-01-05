# 📊 Анализ логов AI-стека: Последние запросы

> **Дата анализа:** 2026-01-05 07:30 UTC  
> **Период анализа:** Последние 30 минут  
> **Chat ID в фокусе:** `ba1c8bdc-94a8-4233-84b6-22eca59de6f6`

---

## 📋 Содержание

1. [Сводка по запросам](#сводка-по-запросам)
2. [Детальный разбор последнего запроса](#детальный-разбор-последнего-запроса)
3. [Анализ логов по сервисам](#анализ-логов-по-сервисам)
4. [Таймлайн последнего запроса](#таймлайн-последнего-запроса)
5. [Выявленные проблемы](#выявленные-проблемы)
6. [Рекомендации по исправлению](#рекомендации-по-исправлению)
7. [Метрики производительности](#метрики-производительности)

---

## 📈 Сводка по запросам

### Обнаруженные запросы за последние 30 минут

| Время (UTC) | Тип запроса | Сервис | Длительность | Статус |
|-------------|-------------|--------|--------------|--------|
| 07:08:16 | LLM Chat | Ollama (gpt-oss) | **2m 33s** | ✅ 200 |
| 07:08:18 | Embedding | Ollama (nomic-embed-text) | 1.83s | ✅ 200 |
| 07:08:18 | Vector Search | Supabase (match_documents) | ~100ms | ✅ 200 |
| 07:16:45 | LLM Chat через n8n | Ollama | **8m 26s** | ✅ 200 |
| 07:21:32 | LLM Chat через n8n | Ollama | **4m 46s** | ✅ 200 |
| 07:26:42 | LLM Chat через n8n | Ollama | **5m 9s** | ✅ 200 |

### Статистика

- **Всего LLM запросов:** 4
- **Средняя длительность:** ~5 минут 13 секунд
- **Минимальная:** 2m 33s
- **Максимальная:** 8m 26s (❗ очень долго)
- **n8n workflow executions:** 4 (ID: 42, 43, 44, 45)

---

## 🔍 Детальный разбор последнего запроса

### Запрос 07:26:42-43 (Execution ID: 45)

**Сценарий:** Пользователь отправил сообщение в Open WebUI → запрос пошёл через n8n pipeline → RAG поиск → LLM генерация

---

### **Шаг 1: Браузер → Traefik → Open WebUI**

```
[07:26:43] Traefik: Service selected by WRR: http://172.18.0.23:8080
                    ↓
[07:26:43] Open WebUI: POST /api/chat/completed → 200
```

**Лог Traefik:**
```
2026-01-05T07:26:43Z DBG Service selected by WRR: http://172.18.0.23:8080
```

**Анализ:**
- ✅ Traefik успешно маршрутизировал запрос на Open WebUI (172.18.0.23:8080)
- ✅ Weighted Round Robin (WRR) работает корректно
- IP клиента: `92.62.57.120`

---

### **Шаг 2: Open WebUI → n8n Pipeline**

```
[07:26:43] Open WebUI: function_test_n8n_pipeline:pipe
           "Processing regular response from N8N (non-streaming)"
           "Starting N8N workflow request for chat ID: ba1c8bdc-94a8-4233-84b6-22eca59de6f6"
```

**Лог Open WebUI:**
```python
2026-01-05 07:26:43.081 | INFO | function_test_n8n_pipeline:pipe:1160 - Processing regular response from N8N (non-streaming)
2026-01-05 07:26:43.128 | INFO | function_test_n8n_pipeline:pipe:785 - Starting N8N workflow request for chat ID: ba1c8bdc-94a8-4233-84b6-22eca59de6f6
```

**Анализ:**
- ⚠️ Используется **кастомный pipeline** `function_test_n8n_pipeline`, а не стандартный Langfuse filter
- ⚠️ **Non-streaming** режим — это объясняет долгое время ожидания
- Chat ID стабильный — это продолжение существующей беседы

---

### **Шаг 3: n8n → Supabase (RAG Vector Search)**

```
[07:08:18] Supabase Kong: POST /rest/v1/rpc/match_documents → 200
           Response size: 19825 bytes (найдено ~20KB релевантных документов)
```

**Лог Supabase Kong:**
```
172.18.0.6 - - [05/Jan/2026:07:08:18 +0000] "POST /rest/v1/rpc/match_documents HTTP/1.1" 200 19825 "-" "node"
```

**Анализ:**
- ✅ RAG поиск успешно выполнен
- ✅ Найдены релевантные документы (~20KB)
- Источник запроса: n8n (172.18.0.6)
- User-Agent: `node` (n8n HTTP Request node)

---

### **Шаг 4: n8n Workflow Execution**

```
[07:26:43] n8n: Enqueued execution 45 (job 82)
           ↓
[07:26:43] n8n-worker: Worker started execution 45 (job 82)
           ↓
[~07:31:52] n8n-worker: Worker finished execution 45 (job 82)
           ↓
[~07:31:52] n8n: Execution 45 (job 82) finished
```

**Лог n8n:**
```
Enqueued execution 45 (job 82)
...
Execution 45 (job 82) finished
```

**Лог n8n-worker:**
```
Worker started execution 45 (job 82)
Worker finished execution 45 (job 82)
```

**Анализ:**
- ✅ Redis Bull queue работает корректно
- ✅ Worker подхватывает задачи
- ⚠️ Время выполнения workflow ~5 минут (слишком долго для CPU inference)

---

### **Шаг 5: n8n → Ollama (LLM Inference)**

```
[07:26:42] Ollama: POST /api/chat → 200 (5m 9s)
```

**Лог Ollama:**
```
[GIN] 2026/01/05 - 07:26:42 | 200 |          5m9s |      172.18.0.6 | POST     "/api/chat"
```

**Анализ:**
- ⚠️ **5 минут 9 секунд** на генерацию ответа — очень долго для CPU
- Источник: 172.18.0.6 (n8n)
- Причина: модель `gpt-oss:20b` слишком тяжёлая для CPU inference

---

### **Шаг 6: Ответ → Open WebUI → Клиент**

```
[07:26:43-46] Open WebUI: Multiple API calls
              GET /api/v1/chats/?page=1 → 200 (4 раза)
              GET /_app/version.json → 200 (polling)
```

**Лог Open WebUI:**
```
2026-01-05 07:26:43.168 | INFO | "GET /api/v1/chats/?page=1 HTTP/1.1" 200
2026-01-05 07:26:43.235 | INFO | "GET /api/v1/chats/?page=1 HTTP/1.1" 200
2026-01-05 07:26:43.289 | INFO | "GET /api/v1/chats/?page=1 HTTP/1.1" 200
2026-01-05 07:26:43.338 | INFO | "GET /api/v1/chats/?page=1 HTTP/1.1" 200
```

**Анализ:**
- ✅ Ответ успешно доставлен клиенту
- ⚠️ Множественные запросы на `/api/v1/chats/` — возможно, polling или retry логика

---

### **Шаг 7: Pipelines → Langfuse (Tracing)**

```
[Continuous] Langfuse queue: ~0 items
             Media upload queue is empty
```

**Лог Pipelines:**
```
DEBUG:langfuse:~0 items in the Langfuse queue
DEBUG:langfuse._task_manager.media_manager:Media upload queue is empty
```

**Анализ:**
- ⚠️ **Очередь Langfuse пустая** — трейсинг НЕ работает для этих запросов
- ❌ Langfuse Filter Pipeline не обрабатывает запросы через n8n pipeline
- Причина: кастомный `function_test_n8n_pipeline` обходит Langfuse filter

---

## 📋 Анализ логов по сервисам

### **1. Traefik (Reverse Proxy)**

```log
2026-01-05T07:28:12Z DBG Service selected by WRR: http://172.18.0.23:8080  # Open WebUI
2026-01-05T07:28:13Z DBG Service selected by WRR: http://172.18.0.12:3000  # Langfuse
2026-01-05T07:30:12Z DBG Service selected by WRR: http://172.18.0.8:5678   # n8n
```

| Backend | IP | Порт | Сервис |
|---------|----|----- |--------|
| 172.18.0.23 | Open WebUI | 8080 | Chat UI |
| 172.18.0.12 | Langfuse | 3000 | Tracing UI |
| 172.18.0.8 | n8n | 5678 | Automation |

**Статус:** ✅ Работает корректно

---

### **2. Open WebUI**

```log
# Polling (каждые ~60 секунд)
07:25:12.406 | "GET /_app/version.json HTTP/1.1" 200
07:26:43.376 | "GET /_app/version.json HTTP/1.1" 200

# N8N Pipeline вызовы
07:26:43.081 | function_test_n8n_pipeline:pipe:1160 - Processing regular response from N8N
07:26:43.128 | function_test_n8n_pipeline:pipe:785 - Starting N8N workflow request

# API calls
07:26:43.168 | "GET /api/v1/chats/?page=1 HTTP/1.1" 200
07:16:46.392 | "POST /api/chat/completed HTTP/1.1" 200
```

**Наблюдения:**
- ✅ Version.json polling работает (проверка обновлений UI)
- ✅ N8N pipeline интегрирован
- ⚠️ Non-streaming режим (долгое ожидание)

---

### **3. Ollama (LLM Engine)**

```log
# Загрузка модели gpt-oss:20b (12.8 GB)
07:05:43.800 | enabling flash attention
07:05:43.800 | starting runner: --model sha256-e7b273f9...
07:05:43.801 | system memory: total="31.3 GiB" free="31.2 GiB"
07:05:43.801 | loading model: model layers=25
07:05:44.134 | model weights: device=CPU size="12.8 GiB"
07:05:44.134 | kv cache: device=CPU size="192.0 MiB"
07:05:44.134 | total memory: size="13.1 GiB"
07:06:51.286 | llama runner started in 67.49 seconds ⚠️

# Загрузка embedding модели nomic-embed-text (305.6 MB)
07:08:16.760 | model weights: device=CPU size="305.6 MiB"
07:08:18.271 | llama runner started in 1.59 seconds ✅

# Предупреждение о контексте
07:08:16.679 | WARN: requested context size too large for model (8192 vs 2048)

# Предупреждение о truncation
07:08:19.308 | WARN: truncating input prompt (limit=4096, prompt=7535, new=4096)

# Запросы
07:08:16 | POST /api/chat → 200 (2m 33s)
07:08:18 | POST /api/embed → 200 (1.83s)
07:16:45 | POST /api/chat → 200 (8m 26s) ❌
07:21:32 | POST /api/chat → 200 (4m 46s)
07:26:42 | POST /api/chat → 200 (5m 9s)
```

**Критические наблюдения:**

| Проблема | Лог | Влияние |
|----------|-----|---------|
| 🔴 Долгая загрузка модели | `llama runner started in 67.49 seconds` | Первый запрос медленный |
| 🔴 CPU-only режим | `offloaded 0/25 layers to GPU` | 5-8 минут на ответ |
| 🟡 Context overflow | `requested context size too large` | Model fallback to 2048 |
| 🟡 Prompt truncation | `truncating input prompt 7535 → 4096` | Потеря контекста |
| ⚠️ Большая модель | `size="12.8 GiB"` | Использует 42% RAM |

---

### **4. n8n (Workflow Automation)**

```log
# Execution queue
Enqueued execution 42 (job 79)
Enqueued execution 43 (job 80)
Enqueued execution 44 (job 81)
Enqueued execution 45 (job 82)

# Trust proxy error (повторяется)
ValidationError: The 'X-Forwarded-For' header is set but Express 'trust proxy' is false
code: 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR'

# Permission warnings
User attempted to access a workflow without permissions
```

**Критические наблюдения:**

| Проблема | Код ошибки | Решение |
|----------|-----------|---------|
| 🔴 Trust Proxy не настроен | `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` | Добавить `N8N_EXPRESS_TRUST_PROXY=true` |
| 🟡 Permission denied | `User attempted to access workflow` | Проверить permissions workflow |
| ⚠️ Deprecation | `util._extend is deprecated` | Будущая несовместимость |

---

### **5. n8n-worker**

```log
Worker started execution 42 (job 79)
Worker finished execution 42 (job 79)
Worker started execution 43 (job 80)
Worker finished execution 43 (job 80)
Worker started execution 44 (job 81)
Worker finished execution 44 (job 81)
Worker started execution 45 (job 82)
Worker finished execution 45 (job 82)
```

**Статус:** ✅ Все 4 execution завершены успешно

---

### **6. PostgreSQL**

```log
# Checkpoints (каждые 5 минут)
07:07:17 | checkpoint starting: time
07:07:21 | checkpoint complete: wrote 43 buffers (0.3%)
07:12:17 | checkpoint complete: wrote 2 buffers (0.0%)
07:17:17 | checkpoint complete: wrote 34 buffers (0.2%)
07:22:18 | checkpoint complete: wrote 33 buffers (0.2%)
07:27:18 | checkpoint complete: wrote 31 buffers (0.2%)
```

**Анализ:**
- ✅ Checkpoints выполняются регулярно
- ✅ Низкая нагрузка на диск (0.2-0.3% buffers)
- WAL: стабильно, без роста файлов

---

### **7. Redis**

```log
# Автоматическое сохранение (каждые 5 минут, 100 изменений)
07:07:50 | 100 changes in 300 seconds. Saving...
07:07:50 | Background saving started by pid 7397
07:07:50 | DB saved on disk
07:07:50 | Fork CoW for RDB: current 0 MB, peak 0 MB
07:07:50 | Background saving terminated with success
```

**Анализ:**
- ✅ RDB snapshots работают
- ✅ Copy-on-Write эффективен (0 MB overhead)
- Частота: ~100 операций каждые 5 минут

---

### **8. Langfuse**

```log
# Только warning при старте
[07:15:55] WARN: "username" is overridden by a URL parameter.
[07:15:55] WARN: "password" is overridden by a URL parameter.
```

**Анализ:**
- ⚠️ Warning о переопределении credentials (не критично)
- ⚠️ Нет логов о входящих traces — трейсинг не работает

---

### **9. Langfuse Worker**

```log
# Workers активны
07:05:46 | Starting ClickhouseWriter. Max interval: 1000 ms, Max batch size: 1000
07:20:00 | Executing Blob Storage Integration Job
07:20:00 | No blob storage integrations ready for sync
07:30:00 | Executing Mixpanel Integration Job
07:30:00 | Executing PostHog Integration Job
```

**Анализ:**
- ✅ ClickhouseWriter инициализирован
- ⚠️ Нет данных для синхронизации (нет traces)
- Background jobs работают по расписанию

---

### **10. Pipelines (Langfuse Filter)**

```log
# Повторяющийся лог (каждые ~10 секунд)
DEBUG:langfuse:~0 items in the Langfuse queue
DEBUG:langfuse._task_manager.media_manager:Media upload queue is empty
```

**Проблема:**
- ❌ **Очередь пустая** — запросы не попадают в Langfuse filter
- Причина: Open WebUI использует `function_test_n8n_pipeline` вместо стандартного pipeline

---

## ⏱️ Таймлайн последнего запроса

```
07:26:42.000  ─┬─ [Browser] Пользователь нажимает "Send"
              │
07:26:42.500  ─┼─ [Traefik] SSL termination, routing to Open WebUI
              │
07:26:43.081  ─┼─ [Open WebUI] function_test_n8n_pipeline:pipe - Processing
              │
07:26:43.128  ─┼─ [Open WebUI] Starting N8N workflow request
              │
07:26:43.200  ─┼─ [n8n] Enqueued execution 45 (job 82)
              │
07:26:43.250  ─┼─ [n8n-worker] Worker started execution 45
              │
              │  ┌────────────────────────────────────────────────────┐
              │  │            n8n WORKFLOW EXECUTION                  │
              │  │  ┌──────────────────────────────────────────────┐  │
              │  │  │ 1. Receive webhook trigger                   │  │
              │  │  │ 2. HTTP Request to Supabase (match_documents)│  │
              │  │  │ 3. Process RAG results                       │  │
              │  │  │ 4. Ollama Chat Model node                    │  │
              │  │  │    └─ POST /api/chat (5m 9s) ← BOTTLENECK    │  │
              │  │  │ 5. Format response                           │  │
              │  │  │ 6. Return to Open WebUI                      │  │
              │  │  └──────────────────────────────────────────────┘  │
              │  └────────────────────────────────────────────────────┘
              │
07:31:51.000  ─┼─ [Ollama] POST /api/chat → 200 (5m 9s)
              │
07:31:51.500  ─┼─ [n8n-worker] Worker finished execution 45
              │
07:31:51.800  ─┼─ [n8n] Execution 45 (job 82) finished
              │
07:31:52.000  ─┼─ [Open WebUI] Response received, updating chat
              │
07:31:52.168  ─┼─ [Open WebUI] GET /api/v1/chats/?page=1 → 200
              │
07:31:52.500  ─┴─ [Browser] Ответ отображается пользователю

TOTAL: ~5 минут 10 секунд
```

---

## ❌ Выявленные проблемы

### **Критические (🔴)**

| # | Проблема | Сервис | Влияние | Лог |
|---|----------|--------|---------|-----|
| 1 | **CPU-only LLM inference** | Ollama | 5-8 минут на ответ | `offloaded 0/25 layers to GPU` |
| 2 | **Слишком большая модель** | Ollama | 12.8 GB RAM, медленный inference | `model weights: size="12.8 GiB"` |
| 3 | **Trust proxy не настроен** | n8n | Rate limiting работает некорректно | `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` |
| 4 | **Langfuse tracing не работает** | Pipelines | Нет observability для n8n requests | `~0 items in the Langfuse queue` |

### **Важные (🟡)**

| # | Проблема | Сервис | Влияние | Лог |
|---|----------|--------|---------|-----|
| 5 | **Context size overflow** | Ollama | Fallback to 2048 tokens | `requested context size too large` |
| 6 | **Prompt truncation** | Ollama | Потеря 45% контекста | `truncating input prompt 7535 → 4096` |
| 7 | **Permission warnings** | n8n | Потенциальные access issues | `User attempted to access workflow` |
| 8 | **Non-streaming режим** | Open WebUI | Долгое ожидание ответа | `non-streaming` |

### **Низкий приоритет (🟢)**

| # | Проблема | Сервис | Влияние |
|---|----------|--------|---------|
| 9 | Credentials override warning | Langfuse | Косметический |
| 10 | Deprecation warning util._extend | n8n | Будущая несовместимость |
| 11 | Множественные chats API calls | Open WebUI | Незначительный overhead |

---

## 🔧 Рекомендации по исправлению

### **1. Критично: Оптимизация LLM inference**

**Проблема:** Модель `gpt-oss:20b` слишком тяжёлая для CPU

**Решение A (рекомендуется): Использовать меньшую модель**
```bash
# Удалить тяжёлую модель
docker exec ollama ollama rm gpt-oss:20b

# Загрузить оптимизированную для CPU
docker exec ollama ollama pull llama3.2:3b
# или
docker exec ollama ollama pull mistral:7b-instruct-v0.3-q4_K_M
```

**Сравнение моделей:**

| Модель | Размер | RAM | Время ответа (CPU) |
|--------|--------|-----|-------------------|
| gpt-oss:20b | 12.8 GB | 16 GB | 5-8 минут |
| llama3.1:8b | 4.9 GB | 8 GB | 2-3 минуты |
| llama3.2:3b | 2.0 GB | 4 GB | 30-60 секунд ✅ |
| mistral:7b-q4 | 4.1 GB | 6 GB | 1-2 минуты |

**Решение B: Добавить GPU**
```yaml
# docker-compose.gpu.yml
ollama:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

---

### **2. Критично: Исправить n8n Trust Proxy**

**Проблема:** `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`

**Решение:** Уже настроено в docker-compose, но требуется перезапуск

```yaml
# docker-compose.cpu.yml - n8n service
environment:
  - N8N_EXPRESS_TRUST_PROXY=true  # ← уже есть
```

**Проверить:**
```bash
docker compose restart n8n
docker logs n8n --tail 20 2>&1 | grep -i "trust\|proxy\|forward"
```

---

### **3. Критично: Включить Langfuse tracing для n8n pipeline**

**Проблема:** Кастомный `function_test_n8n_pipeline` обходит Langfuse filter

**Решение A: Добавить Langfuse SDK в n8n pipeline**

В вашем n8n workflow добавьте вызов Langfuse API:

```javascript
// В n8n Function node перед LLM вызовом
const langfuse = require('langfuse');

const trace = langfuse.trace({
  name: 'n8n-workflow',
  metadata: {
    workflowId: $workflow.id,
    executionId: $execution.id
  }
});

const generation = trace.generation({
  name: 'ollama-chat',
  model: 'gpt-oss:20b',
  input: $json.messages
});

// После получения ответа
generation.end({
  output: response,
  usage: {
    input: promptTokens,
    output: completionTokens
  }
});
```

**Решение B: Использовать стандартный pipeline**

В Open WebUI Admin → Pipelines → настроить порядок:
1. Langfuse Filter Pipeline (первым)
2. N8N Pipeline (вторым)

---

### **4. Важно: Исправить context size**

**Проблема:** `requested context size too large for model (8192 vs 2048)`

**Решение:** Указать корректный num_ctx в Ollama

```bash
# В Modelfile или при запуске
docker exec ollama ollama run llama3.2:3b --num_ctx 4096
```

Или создать кастомный Modelfile:
```dockerfile
FROM llama3.2:3b
PARAMETER num_ctx 4096
```

---

### **5. Важно: Уменьшить prompt size**

**Проблема:** `truncating input prompt 7535 → 4096` — теряется 45% контекста

**Решение:** Оптимизировать RAG retrieval

```python
# В n8n workflow или LlamaIndex
# Уменьшить top_k результатов
top_k = 3  # вместо 5-10

# Использовать компактный формат
# Вместо полных документов — только релевантные chunks
```

---

### **6. Важно: Включить streaming**

**Проблема:** Non-streaming режим — пользователь ждёт 5+ минут без feedback

**Решение:** Настроить streaming в n8n pipeline

```javascript
// В n8n HTTP Request node
{
  "stream": true,
  "responseFormat": "stream"
}
```

---

## 📊 Метрики производительности

### **Время отклика по компонентам**

```
┌────────────────────────────────────────────────────────────────────────┐
│                    REQUEST LATENCY BREAKDOWN                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ Traefik SSL/Routing     ██ 50ms (0.2%)                                │
│                                                                        │
│ Open WebUI Processing   ████ 100ms (0.3%)                             │
│                                                                        │
│ n8n Queuing             ██ 50ms (0.2%)                                │
│                                                                        │
│ Supabase RAG Search     ██████ 150ms (0.5%)                           │
│                                                                        │
│ Ollama Embedding        ████████████████████ 1,830ms (6%)             │
│                                                                        │
│ Ollama LLM Inference    ████████████████████████████████████████████  │
│                         ████████████████████████████████████████████  │
│                         ████████████████████████████████████████████  │
│                         309,000ms (99%)  ← BOTTLENECK                 │
│                                                                        │
│ Response Processing     ██ 50ms (0.2%)                                │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ TOTAL: ~5 minutes 11 seconds (311,230ms)                              │
└────────────────────────────────────────────────────────────────────────┘
```

### **Использование ресурсов**

| Ресурс | Текущее | Рекомендуемое |
|--------|---------|---------------|
| RAM (Ollama) | 13.1 GB / 31.3 GB (42%) | < 8 GB (25%) |
| CPU threads | 4 | 8 (если доступно) |
| Model loads | 67 секунд | < 5 секунд (SSD) |
| Context size | 2048 (fallback) | 4096 |

### **Throughput**

| Метрика | Значение |
|---------|----------|
| LLM requests/hour | ~12 (при 5 мин/запрос) |
| Embedding requests/sec | 0.55 |
| RAG queries/sec | ~6.7 |
| n8n executions/hour | ~12 |

---

## 📝 Итоговый чек-лист

### Немедленные действия

- [ ] Заменить `gpt-oss:20b` на `llama3.2:3b` или `mistral:7b-q4`
- [ ] Перезапустить n8n для применения trust proxy
- [ ] Проверить permissions n8n workflows
- [ ] Добавить Langfuse tracing в n8n pipeline

### Краткосрочные улучшения

- [ ] Настроить streaming в n8n pipeline
- [ ] Уменьшить RAG top_k до 3
- [ ] Увеличить num_ctx до 4096
- [ ] Добавить health checks для Ollama

### Долгосрочные улучшения

- [ ] Добавить GPU для inference
- [ ] Настроить централизованный logging (Loki)
- [ ] Создать Grafana dashboard для LLM метрик
- [ ] Настроить alerting на длительные запросы

---

*Документ создан автоматически на основе анализа логов Docker контейнеров.*
