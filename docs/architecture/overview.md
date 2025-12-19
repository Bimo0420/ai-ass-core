# Архитектура AI Stack

Этот документ описывает архитектуру системы, взаимодействие компонентов и принципы проектирования.

---

## 1. Общая схема

```

┌─────────────────────────────────────────────────────────────┐
│                      Internet / User                         │
└────────────────────────┬────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare (DNS + WAF)                    │
│                  - DNS Management                            │
│                  - DDoS Protection                           │
│                  - SSL Proxy (optional)                      │
└────────────────────────┬────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────────────┐
│                      Traefik (Port 80, 443)                  │
│                  - Reverse Proxy                             │
│                  - SSL/TLS Termination (Let's Encrypt)       │
│                  - Load Balancing                            │
│                  - Middlewares (Auth, CORS, etc)             │
└────────────────────────┬────────────────────────────────────┘
│
┌────────────────┼────────────────┐
│                │                │
▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     n8n      │  │  Open WebUI  │  │   Langfuse   │
│  :5678       │  │  :8080       │  │  :3000       │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
│                 │                 │
└────────┬────────┴────────┬────────┘
│                 │
┌───────▼─────────────────▼────────┐
│                                   │
┌───────▼────────┐  ┌────────────────┐  ┌──▼──────────┐
│    Ollama      │  │   PostgreSQL   │  │    Redis    │
│    :11434      │  │   :5432        │  │   :6379     │
└────────────────┘  └────────────────┘  └─────────────┘
│                 │
└────────┬────────┘
│
┌────────▼─────────────┐
│                      │
┌───────▼────────┐  ┌──────────▼──────┐
│   Supabase     │  │   LlamaIndex    │
│   Vector DB    │  │   RAG Service   │
│   :8000        │  │   :8000         │
└────────────────┘  └─────────────────┘
│
┌───────▼────────────────────────────┐
│      Monitoring \& Observability    │
│  - Grafana :3000                   │
│  - Prometheus :9090                │
│  - Node Exporter :9100             │
│  - cAdvisor :8080                  │
└────────────────────────────────────┘

```

---

## 2. Слои архитектуры

### 2.1. Уровень входа (Entry Layer)

**Cloudflare**
- DNS управление
- WAF (Web Application Firewall)
- DDoS Protection
- Rate Limiting
- Опционально: SSL/TLS Proxy

**Traefik**
- Reverse proxy для всех сервисов
- Автоматическое получение SSL сертификатов (Let's Encrypt)
- Маршрутизация на основе Host/Path
- Middlewares: BasicAuth, Headers, CORS
- Load balancing между репликами

### 2.2. Уровень приложений (Application Layer)

**n8n (Workflow Automation)**
- Оркестрация бизнес-процессов
- Интеграция с внешними API
- Триггеры и scheduled jobs
- Webhook endpoints
- Подключение к Ollama, Supabase, PostgreSQL

**Open WebUI (Chat Interface)**
- Веб-интерфейс для взаимодействия с LLM
- Поддержка множества моделей
- История чатов
- RAG интеграция
- Управление промптами

**LlamaIndex (RAG Service)**
- Индексация документов
- Vector embeddings
- Semantic search
- Query engine
- Интеграция с Supabase Vector DB

**Docling (Document Processing)**
- Парсинг PDF, DOCX, и других форматов
- Извлечение текста и метаданных
- Конвертация в markdown
- API для обработки документов

### 2.3. Уровень AI/ML (AI Layer)

**Ollama**
- Хостинг локальных LLM моделей
- Inference API (OpenAI-compatible)
- Управление моделями (pull, list, delete)
- Поддержка CPU и GPU
- Streaming responses

**Модели:**
- Text generation: llama3.2, mistral, gemma2
- Embeddings: nomic-embed-text, mxbai-embed-large
- Code: codellama, deepseek-coder
- Multimodal: llava, bakllava

### 2.4. Уровень данных (Data Layer)

**PostgreSQL**
- Основная реляционная БД
- Хранение:
  - n8n workflows и executions
  - Open WebUI пользователи и чаты
  - Langfuse traces (опционально)
  - Metadata

**Redis**
- Кэш для n8n
- Session storage
- Queue для асинхронных задач
- Rate limiting

**Supabase (PostgreSQL + pgvector)**
- Векторная база данных
- Хранение embeddings
- Semantic search
- Auth & Storage
- Real-time subscriptions

**MinIO (S3-compatible Storage)**
- Хранение файлов и документов
- Бэкапы
- User uploads
- Model artifacts

**ClickHouse (Analytical DB)**
- Хранение Langfuse traces
- Аналитика LLM запросов
- Time-series данные
- Aggregations

### 2.5. Уровень мониторинга (Observability Layer)

**Prometheus**
- Сбор метрик со всех сервисов
- Time-series database
- Alerting rules
- Targets: node-exporter, cAdvisor, приложения

**Grafana**
- Визуализация метрик
- Дашборды
- Алерты и уведомления
- Интеграция с Prometheus

**Langfuse**
- LLM трейсинг и observability
- Prompt management
- Token usage tracking
- Cost analytics
- Performance monitoring

**Node Exporter**
- Метрики хост-системы (CPU, RAM, Disk, Network)

**cAdvisor**
- Метрики Docker контейнеров
- Resource usage per container

---

## 3. Сетевая архитектура

### 3.1. Docker Networks

```

┌──────────────────────────────────────────┐
│          ai-network (bridge)             │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │ traefik  │  │   n8n    │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ postgres │  │  ollama  │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │  redis   │  │ openwebui│             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│      monitoring-network (bridge)         │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │prometheus│  │ grafana  │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ node-exp │  │ cadvisor │             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│       supabase-network (bridge)          │
│                                          │
│  ┌──────────┐  ┌──────────┐             │
│  │supabase  │  │   kong   │             │
│  │-postgres │  │          │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │  studio  │  │  rest-api│             │
│  └──────────┘  └──────────┘             │
└──────────────────────────────────────────┘

```

### 3.2. Взаимодействие между сервисами

**n8n → Ollama**
```

n8n (HTTP client) → http://ollama:11434/api/generate

```

**Open WebUI → Ollama**
```

openwebui → http://ollama:11434/v1/chat/completions

```

**LlamaIndex → Supabase**
```

llamaindex → postgresql://supabase-postgres:5432/postgres

```

**n8n → PostgreSQL**
```

n8n → postgresql://postgres:5432/n8n

```

**Grafana → Prometheus**
```

grafana → http://prometheus:9090

```

**Langfuse → ClickHouse**
```

langfuse → clickhouse://clickhouse:8123

```

---

## 4. Хранение данных (Volumes)

```

ai-ass-core_postgres-data       → /var/lib/postgresql/data
ai-ass-core_ollama-data         → /root/.ollama
ai-ass-core_n8n-data            → /home/node/.n8n
ai-ass-core_openwebui-data      → /app/backend/data
ai-ass-core_redis-data          → /data
ai-ass-core_grafana-data        → /var/lib/grafana
ai-ass-core_prometheus-data     → /prometheus
ai-ass-core_supabase-db-data    → /var/lib/postgresql/data
ai-ass-core_minio-data          → /data
ai-ass-core_traefik-acme        → /letsencrypt

```

**Персистентность:**
- Все критические данные хранятся в Named Volumes
- Volumes переживают пересоздание контейнеров
- Рекомендуется регулярное резервное копирование

---

## 5. Потоки данных

### 5.1. Пользовательский запрос через Open WebUI

```

User (Browser)
↓ HTTPS
Cloudflare
↓
Traefik (SSL termination)
↓ HTTP
Open WebUI
↓ HTTP
Ollama (LLM inference)
↓
Response → Open WebUI → Traefik → User
↓ (async)
Langfuse (trace logging)

```

### 5.2. RAG workflow в n8n

```

Trigger (Webhook/Schedule)
↓
n8n Workflow
├→ LlamaIndex (document processing)
│   ├→ Docling (parse document)
│   ├→ Ollama (embeddings: nomic-embed-text)
│   └→ Supabase (store vectors)
│
├→ Query processing
│   ├→ Supabase (vector search)
│   └→ Ollama (LLM generation: llama3.2)
│
└→ Response
└→ Langfuse (log trace)

```

### 5.3. Мониторинг

```

All Services (expose :9090/metrics or similar)
↓
Prometheus (scrape every 15s)
↓
Grafana (query \& visualize)
↓
User (view dashboards)

Parallel:
LLM Requests
↓
Langfuse SDK
↓
Langfuse API
↓
ClickHouse (store traces)
↓
Langfuse UI (analytics)

```

---

## 6. Принципы проектирования

### 6.1. Модульность

- Каждый сервис — отдельный контейнер
- Compose файлы разбиты по функциональности:
  - `base` — инфраструктура
  - `cpu/gpu` — приложения
  - `monitoring` — наблюдаемость

### 6.2. Масштабируемость

- Traefik поддерживает load balancing
- PostgreSQL может быть заменена на managed (AWS RDS, Supabase Cloud)
- Ollama можно реплицировать на несколько инстансов
- Stateless сервисы (n8n workers, API services) легко масштабируются горизонтально

### 6.3. Отказоустойчивость

- Volumes для персистентности
- Health checks в Docker Compose
- Restart policies: `unless-stopped` или `always`
- Резервное копирование критических данных

### 6.4. Безопасность

- SSL/TLS на уровне Traefik
- Внутренняя коммуникация через Docker networks (без публичного доступа)
- Secrets в `.env` (не коммитятся)
- Cloudflare WAF для защиты от атак
- Регулярные обновления образов

### 6.5. Наблюдаемость

- Централизованные логи (docker logs)
- Метрики в Prometheus
- Визуализация в Grafana
- LLM трейсинг в Langfuse
- Health check endpoints

---

## 7. Конфигурационные файлы

### 7.1. Traefik

**Местоположение:** `configs/base/traefik/traefik.yml`

**Ключевые секции:**
- `entryPoints` — порты 80, 443
- `certificatesResolvers` — Let's Encrypt + Cloudflare DNS
- `providers.docker` — автоматическое обнаружение сервисов
- `api.dashboard` — панель управления

### 7.2. Prometheus

**Местоположение:** `configs/base/prometheus/prometheus.yml`

**Ключевые секции:**
- `global.scrape_interval` — интервал сбора метрик
- `scrape_configs` — список targets
  - node-exporter, cAdvisor, приложения

### 7.3. Supabase

**Местоположение:** `configs/base/supabase/kong.yml`

**Ключевые секции:**
- API gateway конфигурация
- Rate limiting
- Auth routes

---

## 8. Зависимости сервисов

```

traefik
└── (no dependencies)

postgres
└── (no dependencies)

redis
└── (no dependencies)

ollama
└── (no dependencies, но может требовать GPU)

n8n
├── postgres
└── redis

openwebui
├── ollama
└── postgres (optional)

langfuse
├── postgres (or clickhouse)
└── redis (optional)

grafana
└── prometheus

prometheus
├── node-exporter
└── cadvisor

llamaindex
├── ollama
└── supabase (postgres)

docling
└── (no dependencies)

```

**Порядок запуска:**
1. Базовые: postgres, redis, traefik
2. LLM: ollama
3. Приложения: n8n, openwebui, llamaindex, docling
4. Мониторинг: prometheus, grafana, langfuse

---

## 9. Масштабирование

### 9.1. Вертикальное

- Увеличение CPU/RAM/Disk сервера
- Подходит для начальных стадий
- Простота управления

### 9.2. Горизонтальное

**Stateless сервисы (легко):**
- Ollama (с shared model storage)
- n8n workers (с shared Redis queue)
- API сервисы (llamaindex, docling)

**Stateful сервисы (сложнее):**
- PostgreSQL → managed DB или replication
- Redis → Redis Cluster
- MinIO → distributed mode

**Load Balancing:**
- Traefik поддерживает round-robin, weighted
- Для горизонтального масштабирования Ollama:
```

ollama:
deploy:
replicas: 3

```

---

## 10. Миграция и эволюция

### 10.1. Миграция на Kubernetes

Для продакшн-нагрузки можно перенести на K8s:
- Helm charts для каждого сервиса
- Persistent Volumes (PV/PVC)
- Ingress вместо Traefik (или Traefik Ingress Controller)
- HorizontalPodAutoscaler для автомасштабирования

### 10.2. Гибридное облако

- Управляемые сервисы:
- AWS RDS / Aurora для PostgreSQL
- Supabase Cloud для векторной БД
- Cloudflare R2 / AWS S3 для хранилища
- Self-hosted:
- Ollama (для контроля над моделями)
- n8n (для кастомной логики)
- LlamaIndex (для RAG)

---

## 11. Ограничения текущей архитектуры

- **Монолитный хост:** все сервисы на одном сервере
- **Single point of failure:** падение сервера = недоступность всех сервисов
- **Ограниченная масштабируемость:** вертикальное масштабирование ограничено железом
- **Нет HA (High Availability):** требуется ручное восстановление при сбое

**Рекомендации для production:**
- Реплицирование критических сервисов
- Managed databases
- Load balancer перед несколькими инстансами
- Мониторинг и автоматические алерты
- Disaster recovery план

---

## 12. Дополнительные ресурсы

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
- [Ollama Architecture](https://github.com/ollama/ollama/blob/main/docs/architecture.md)
- [LlamaIndex Architecture](https://docs.llamaindex.ai/en/stable/getting_started/concepts.html)
- [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture)
```