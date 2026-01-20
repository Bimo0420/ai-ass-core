# Архитектура AI-assistant

## Содержание

- [Обзор архитектуры](#обзор-архитектуры)
- [Уровни системы](#уровни-системы)
- [Компоненты и их взаимодействие](#компоненты-и-их-взаимодействие)
- [Потоки данных](#потоки-данных)
- [Технологический стек](#технологический-стек)
- [Сетевая архитектура](#сетевая-архитектура)
- [Масштабируемость](#масштабируемость)

---

## Обзор архитектуры

AI-assistant построен по принципу **микросервисной архитектуры** с использованием Docker контейнеров. Все сервисы объединены в единую Docker-сеть `ai-network` и взаимодействуют через внутренние DNS-имена.

### Архитектурные принципы

1. **Stateless сервисы** — все сервисы не хранят состояние, данные персистятся в PostgreSQL/Redis
2. **Infrastructure as Code** — вся конфигурация храниться в Git
3. **Self-hosted** — все компоненты работают локально без внешних зависимостей
4. **GPU-first** — оптимизация для GPU inference с fallback на CPU

---

## Уровни системы

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Open WebUI   │  │ n8n UI       │  │ Supabase     │  │ Grafana      │     │
│  │ (Chat)       │  │ (Workflow)   │  │ Studio       │  │ (Monitoring) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                              GATEWAY LAYER                                   │
│                    ┌──────────────────────────────┐                         │
│                    │          TRAEFIK              │                         │
│                    │   (Reverse Proxy + SSL +      │                         │
│                    │    Load Balancing + Routing)  │                         │
│                    └──────────────────────────────┘                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                             SERVICE LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ LlamaIndex   │  │ n8n Worker   │  │ Supabase     │  │ Docling      │     │
│  │ API (RAG)    │  │              │  │ Services     │  │ (Parser)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │ Pipelines    │  │ Langfuse     │  │ Langfuse     │                       │
│  │ (OpenWebUI)  │  │ (Tracing)    │  │ Worker       │                       │
│  └──────────────┘  └──────────────┘  └──────────────┘                       │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                            AI/ML LAYER                                       │
│                    ┌──────────────────────────────┐                         │
│                    │           OLLAMA              │                         │
│                    │   (LLM Inference Engine)      │                         │
│                    │   ┌────────┐  ┌────────┐     │                         │
│                    │   │ Qwen3  │  │ Llama3 │     │                         │
│                    │   └────────┘  └────────┘     │                         │
│                    │   ┌────────────────────┐     │                         │
│                    │   │ nomic-embed-text   │     │                         │
│                    │   │   (Embeddings)      │     │                         │
│                    │   └────────────────────┘     │                         │
│                    └──────────────────────────────┘                         │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────────┐
│                             DATA LAYER                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis        │  │ ClickHouse   │  │ MinIO        │     │
│  │ + pgvector   │  │ (Queue/Cache)│  │ (Analytics)  │  │ (S3 Storage) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Компоненты и их взаимодействие

### 🤖 AI/ML компоненты

#### Ollama
- **Назначение**: Локальный inference engine для LLM и embedding моделей
- **GPU поддержка**: NVIDIA CUDA через nvidia-container-toolkit
- **Модели**:
  - LLM: `gpt-oss:20b`, `llama3:8b`
  - Embeddings: `nomic-embed-text` (768 dim)
- **API**: OpenAI-совместимый REST API
- **Keep Alive**: 24 часа для быстрого отклика

#### LlamaIndex API
- **Назначение**: RAG pipeline с hybrid search и reranking
- **Функции**:
  - Индексация документов в pgvector
  - Hybrid search (semantic + full-text)
  - BGE-reranker для улучшения качества
- **Интеграции**: Ollama (embeddings), PostgreSQL (vectors), Supabase (API)

#### Docling
- **Назначение**: Универсальный парсер документов
- **Форматы**: PDF, DOCX, XLSX, PPTX, изображения
- **OCR**: Встроенная поддержка для отсканированных документов

### 📊 Storage компоненты

#### PostgreSQL + pgvector
- **База данных**: Supabase PostgreSQL 15.6
- **Векторное расширение**: pgvector для хранения embeddings
- **Индексы**: HNSW для ANN-поиска, GIN для FTS
- **Схемы**:
  - `public` — основные данные
  - `auth` — Supabase Auth
  - `n8n` — n8n workflow данные

#### Redis
- **Очереди**: Bull queues для n8n workers
- **Кэш**: Session cache для Langfuse
- **Pub/Sub**: Real-time обновления

#### ClickHouse
- **Назначение**: Аналитическая БД для Langfuse
- **Оптимизация**: Быстрая агрегация trace-данных

#### MinIO
- **Назначение**: S3-совместимое хранилище
- **Использование**: Langfuse event storage

### 🔄 Automation компоненты

#### n8n
- **Назначение**: Low-code автоматизация workflow
- **Режим**: Queue mode с Redis
- **Интеграции**: HTTP nodes для всех внутренних сервисов
- **Tracing**: Интеграция с Langfuse

#### n8n Worker
- **Назначение**: Выполнение тяжелых workflow
- **Масштабирование**: Можно запустить несколько workers

### 🖥️ UI компоненты

#### Open WebUI
- **Назначение**: Chat-интерфейс для взаимодействия с LLM
- **Функции**: RAG, мультимодальность, history
- **Pipelines**: Интеграция с filter pipelines для трейсинга

#### Supabase Studio
- **Назначение**: Администрирование PostgreSQL
- **Функции**: SQL editor, table viewer, auth management

### 📈 Monitoring компоненты

#### Langfuse
- **Назначение**: LLM observability и трейсинг
- **Функции**: Traces, spans, metrics, cost tracking
- **Зависимости**: PostgreSQL, ClickHouse, Redis, MinIO

#### Prometheus
- **Назначение**: Сбор и хранение метрик
- **Targets**: n8n, node-exporter
- **Конфигурация**: `apps/prometheus/prometheus.yml`

#### Grafana
- **Назначение**: Визуализация метрик
- **Dashboards**: System, n8n, Docker
- **Datasources**: Prometheus, PostgreSQL

---

## Потоки данных

### 1. Chat Flow (пользовательский запрос)

```
User ──► Open WebUI ──► Pipelines ──► Ollama ──► Response
              │              │
              │              └──► Langfuse (tracing)
              │
              └──► LlamaIndex (если RAG включен)
                        │
                        ├──► Ollama (embedding)
                        ├──► PostgreSQL (vector search)
                        └──► BGE Reranker
```

### 2. Document Indexing Flow

```
Document ──► Docling ──► Parsed Text ──► LlamaIndex API
                                              │
                                              ├──► Ollama (embedding)
                                              └──► PostgreSQL (pgvector)
```

### 3. n8n Workflow Execution

```
Trigger ──► n8n ──► Redis Queue ──► n8n Worker
              │                          │
              │                          ├──► Ollama (LLM)
              │                          ├──► LlamaIndex (RAG)
              │                          └──► External APIs
              │
              └──► Langfuse (tracing)
```

### 4. Hybrid Search Flow

```
Query ──► LlamaIndex API
              │
              ├──► Ollama → query embedding
              │
              └──► Supabase RPC (hybrid_search)
                        │
                        ├──► FTS (ts_rank_cd)
                        └──► Vector (cosine similarity)
                                    │
                                    └──► RRF Fusion ──► BGE Reranking ──► Results
```

---

## Технологический стек

### Обоснование выбора технологий

| Технология | Альтернативы | Почему выбрана |
|------------|--------------|----------------|
| **Ollama** | vLLM, llama.cpp | Простота развертывания, OpenAI API, модели из registry |
| **LlamaIndex** | LangChain | Специализация на RAG, лучшая абстракция для retrieval |
| **n8n** | Airflow, Prefect | Low-code UI, self-hosted, open-source |
| **PostgreSQL** | Milvus, Pinecone | Unified storage (data + vectors), pgvector, Supabase |
| **Supabase** | Firebase | Self-hosted, PostgreSQL-based, Auth + Storage |
| **Langfuse** | Weights & Biases | Специализация на LLM, self-hosted, open-source |
| **Traefik** | Nginx, Caddy | Динамическая конфигурация из Docker labels |
| **Docker** | Kubernetes | Простота для single-node, достаточно для большинства use-cases |

### Версии компонентов

| Компонент | Версия | Примечания |
|-----------|--------|------------|
| PostgreSQL | 15.6 | Supabase PostgreSQL с расширениями |
| Redis | 7-alpine | Легковесный образ |
| Traefik | 3.6 | Актуальная стабильная версия |
| Prometheus | 2.52.0 | LTS версия |
| Grafana | 11.0.0 | Актуальная стабильная версия |
| ClickHouse | 24.3 | Для Langfuse analytics |

---

## Сетевая архитектура

### Docker Network

```yaml
networks:
  ai-network:
    name: ai-network
    driver: bridge
```

Все контейнеры подключены к единой bridge-сети `ai-network`, что обеспечивает:
- DNS-резолвинг по имени контейнера
- Изоляцию от внешней сети
- Внутренняя коммуникация без expose портов

### Внешний доступ

```
Internet ──► 80/443 ──► Traefik ──► Internal Services
                          │
                          ├──► openwebui.domain.com → openwebui:8080
                          ├──► n8n.domain.com → n8n:5678
                          ├──► grafana.domain.com → grafana:3000
                          ├──► langfuse.domain.com → langfuse:3000
                          └──► ...
```

### SSL/TLS

- **Provider**: Let's Encrypt через Traefik
- **Challenge**: HTTP-01 (автоматический)
- **Renewal**: Автоматический через ACME
- **Storage**: Docker volume `traefik-acme`

---

## Масштабируемость

### Горизонтальное масштабирование

| Компонент | Масштабируемость | Метод |
|-----------|-----------------|-------|
| n8n Worker | ✅ Да | Добавить `--scale n8n-worker=N` |
| LlamaIndex | ✅ Да | Load balancing через Traefik |
| Ollama | ⚠️ Ограничено | GPU partitioning / Multi-instance |
| PostgreSQL | ⚠️ Ограничено | Read replicas через Supabase |

### Вертикальное масштабирование

- **GPU**: Использование мощных GPU (RTX 4090, A100) для больших моделей
- **RAM**: Увеличение для моделей 30B+
- **Storage**: NVMe SSD для низкой latency

### Production рекомендации

1. **Минимум 2 n8n workers** для fault tolerance
2. **Redis Sentinel** для HA очередей
3. **PostgreSQL backup** ежедневно
4. **Мониторинг** с алертами в Grafana
5. **Log aggregation** через Loki (опционально)

---

## Диаграмма зависимостей сервисов

```
traefik ─────────────────────────────────────────────────────────────────┐
    │                                                                     │
    └──► [all services with traefik labels]                              │
                                                                          │
postgres ◄──────────────────────────────────────────────────────────────┐│
    │                                                                   ││
    ├──► n8n, n8n-worker                                               ││
    ├──► langfuse, langfuse-worker                                     ││
    ├──► supabase-auth, supabase-rest, supabase-storage, supabase-meta ││
    └──► llamaindex                                                    ││
                                                                        ││
redis ◄────────────────────────────────────────────────────────────────┐││
    │                                                                  │││
    ├──► n8n, n8n-worker (Bull queues)                                │││
    └──► langfuse, langfuse-worker (cache)                            │││
                                                                       │││
ollama ◄──────────────────────────────────────────────────────────────┐│││
    │                                                                 ││││
    ├──► openwebui                                                    ││││
    ├──► llamaindex (embeddings)                                      ││││
    └──► n8n (LLM nodes)                                              ││││
                                                                      ││││
langfuse-clickhouse ◄─────────────────────────────────────────────────┤│││
    │                                                                 ││││
    └──► langfuse, langfuse-worker                                    ││││
                                                                      ││││
langfuse-minio ◄──────────────────────────────────────────────────────┤│││
    │                                                                 ││││
    └──► langfuse, langfuse-worker                                    ││││
                                                                      ││││
pipelines ◄───────────────────────────────────────────────────────────┘│││
    │                                                                  │││
    └──► openwebui                                                     │││
                                                                       │││
supabase-kong ◄────────────────────────────────────────────────────────┘││
    │                                                                   ││
    └──► supabase-auth, supabase-rest, supabase-storage                ││
                                                                        ││
prometheus ◄────────────────────────────────────────────────────────────┘│
    │                                                                    │
    └──► grafana                                                         │
                                                                         │
node-exporter ◄──────────────────────────────────────────────────────────┘
    │
    └──► prometheus
```

---

## Следующие шаги

- [INSTALLATION.md](./INSTALLATION.md) — Установка и настройка
- [CONFIGURATION.md](./CONFIGURATION.md) — Конфигурационные параметры
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
