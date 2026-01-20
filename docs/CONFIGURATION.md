# Конфигурация ai-ass-core

## Содержание

- [Переменные окружения](#переменные-окружения)
- [Конфигурация Traefik](#конфигурация-traefik)
- [Конфигурация Ollama](#конфигурация-ollama)
- [Конфигурация PostgreSQL и pgvector](#конфигурация-postgresql-и-pgvector)
- [Конфигурация n8n](#конфигурация-n8n)
- [Конфигурация Langfuse](#конфигурация-langfuse)
- [Конфигурация Supabase](#конфигурация-supabase)
- [Конфигурация мониторинга](#конфигурация-мониторинга)

---

## Переменные окружения

### Полный список переменных (.env)

```bash
# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          ДОМЕН И SSL                                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Основной домен для всех сервисов
# Сервисы будут доступны как: openwebui.${DOMAIN}, n8n.${DOMAIN}, etc.
DOMAIN=your-domain.com

# Email для Let's Encrypt уведомлений
ACME_EMAIL=admin@your-domain.com

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          CLOUDFLARE (опционально)                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Для DNS challenge (если HTTP challenge недоступен)
CF_API_EMAIL=your-email@example.com
CF_DNS_API_TOKEN=your-cloudflare-dns-api-token

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          POSTGRESQL                                        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

POSTGRES_USER=postgres
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD    # Минимум 16 символов!
POSTGRES_HOST=postgres                          # Имя контейнера
POSTGRES_DB=postgres                            # База данных по умолчанию
POSTGRES_DB_SCHEMA=n8n                          # Схема для n8n
POSTGRES_PORT=5432

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          N8N                                               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Ключ шифрования для credentials (ОБЯЗАТЕЛЬНО!)
# Генерация: openssl rand -hex 32
N8N_ENCRYPTION_KEY=

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          OPEN WEBUI                                        ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Секретный ключ для сессий
# Генерация: openssl rand -hex 32
WEBUI_SECRET_KEY=

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          SUPABASE                                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# JWT секрет для подписи токенов
# Генерация: openssl rand -hex 32
JWT_SECRET=

# Анонимный ключ API (только чтение публичных данных)
# Генерация: см. INSTALLATION.md
ANON_KEY=

# Service role ключ (полный доступ, использовать только на сервере!)
SERVICE_ROLE_KEY=

# OpenAI API ключ для Supabase AI features (опционально)
OPENAI_API_KEY=

# Внутренний URL Supabase Kong
SUPABASE_URL=http://supabase-kong:8000

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          OLLAMA                                            ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# URL Ollama сервера (для других сервисов)
OLLAMA_URL=http://ollama:11434

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          GRAFANA                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          LANGFUSE                                          ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# NextAuth секрет для сессий
# Генерация: openssl rand -hex 32
NEXTAUTH_SECRET=

# Начальный пользователь
LANGFUSE_INIT_USER_NAME=admin
LANGFUSE_INIT_USER_PASSWORD=CHANGE_ME_LANGFUSE_PASSWORD

# Соль для хеширования
# Генерация: openssl rand -hex 16
SALT=

# Ключ шифрования для worker
# Генерация: openssl rand -hex 32
LWORKER_ENCRYPTION_KEY=

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          LANGFUSE CLICKHOUSE                               ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

CLICKHOUSE_URL=http://langfuse-clickhouse:8123
CLICKHOUSE_USER=langfuse_user
CLICKHOUSE_PASSWORD=CHANGE_ME_CLICKHOUSE_PASSWORD

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          LANGFUSE MINIO                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

MINIO_ROOT_USER=langfuse
MINIO_ROOT_PASSWORD=CHANGE_ME_MINIO_PASSWORD

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                          LANGFUSE PIPELINES                                ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

# Получите эти ключи после создания проекта в Langfuse UI
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
```

### Генерация всех секретов (скрипт)

```bash
#!/bin/bash
# scripts/setup/generate-secrets.sh

echo "# Сгенерированные секреты для .env"
echo "# $(date)"
echo ""
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "WEBUI_SECRET_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "SALT=$(openssl rand -hex 16)"
echo "LWORKER_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo ""
echo "# Пароли (измените на более запоминающиеся)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo "GF_SECURITY_ADMIN_PASSWORD=$(openssl rand -base64 16)"
echo "LANGFUSE_INIT_USER_PASSWORD=$(openssl rand -base64 16)"
echo "CLICKHOUSE_PASSWORD=$(openssl rand -base64 16)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -base64 16)"
```

---

## Конфигурация Traefik

### Основные параметры

```yaml
# deployments/docker/docker-compose.base.yml - traefik service
command:
  # Уровень логирования: DEBUG, INFO, WARN, ERROR
  - --log.level=DEBUG
  
  # Dashboard (отключите в production!)
  - --api.dashboard=true
  - --api.insecure=true
  
  # Docker provider
  - --providers.docker=true
  - --providers.docker.exposedbydefault=false
  - --providers.docker.network=ai-network
  
  # File provider для дополнительных конфигов
  - --providers.file.directory=/config
  - --providers.file.watch=true
  
  # Entrypoints
  - --entrypoints.web.address=:80
  - --entrypoints.websecure.address=:443
  
  # Let's Encrypt
  - --certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}
  - --certificatesresolvers.letsencrypt.acme.storage=/acme/acme.json
  - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
```

### Traefik Labels для сервисов

```yaml
# Пример labels для нового сервиса
labels:
  # Включить Traefik routing
  - "traefik.enable=true"
  
  # HTTPS router
  - "traefik.http.routers.myservice.rule=Host(`myservice.${DOMAIN}`)"
  - "traefik.http.routers.myservice.entrypoints=websecure"
  - "traefik.http.routers.myservice.tls.certresolver=letsencrypt"
  - "traefik.http.services.myservice.loadbalancer.server.port=8080"
  
  # HTTP -> HTTPS редирект
  - "traefik.http.routers.myservice-http.rule=Host(`myservice.${DOMAIN}`)"
  - "traefik.http.routers.myservice-http.entrypoints=web"
  - "traefik.http.routers.myservice-http.middlewares=redirect-to-https"
```

### Дополнительные middlewares

```yaml
# deployments/docker/traefik/config/middlewares.yml
http:
  middlewares:
    # Basic Auth
    auth:
      basicAuth:
        users:
          - "admin:$apr1$xxx"  # htpasswd -nb admin password
    
    # Rate limiting
    ratelimit:
      rateLimit:
        average: 100
        burst: 50
    
    # Headers
    secureHeaders:
      headers:
        frameDeny: true
        sslRedirect: true
        browserXssFilter: true
        contentTypeNosniff: true
```

---

## Конфигурация Ollama

### Environment Variables

```yaml
# docker-compose.cpu.yml / docker-compose.gpu.yml
environment:
  # Время жизни модели в памяти (default: 5m)
  - OLLAMA_KEEP_ALIVE=24h
  
  # Bind address
  - OLLAMA_HOST=0.0.0.0
  
  # Максимальное количество параллельных запросов
  - OLLAMA_NUM_PARALLEL=2
  
  # Максимальное количество загруженных моделей
  - OLLAMA_MAX_LOADED_MODELS=2
  
  # Flash attention (экономия VRAM)
  - OLLAMA_FLASH_ATTENTION=1
```

### GPU конфигурация

```yaml
# docker-compose.gpu.yml
ollama:
  runtime: nvidia
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all                    # Все GPU
            # count: 1                    # Один GPU
            # device_ids: ['0', '1']      # Конкретные GPU
            capabilities: [gpu]
```

### Ollama Modelfiles

```dockerfile
# deployments/docker/modelfiles/qwen3-russian.modelfile

FROM qwen3:8b

# Системный промпт для русского языка
SYSTEM """
Ты - AI-ассистент, работающий на русском языке. 
Отвечай чётко, структурированно и по существу.
Используй markdown форматирование для структуры.
"""

# Параметры генерации
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 8192
PARAMETER repeat_penalty 1.1
```

### Создание custom модели

```bash
# Создание модели из modelfile
docker exec ollama ollama create qwen3-russian -f /modelfiles/qwen3-russian.modelfile

# Проверка
docker exec ollama ollama list
```

---

## Конфигурация PostgreSQL и pgvector

### Включение расширений

```sql
-- Выполните в PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
```

### Настройка для векторного поиска

```sql
-- Таблица для LlamaIndex vectors
CREATE TABLE IF NOT EXISTS data_llamaindex_vectors (
    id BIGSERIAL PRIMARY KEY,
    node_id TEXT UNIQUE,
    text TEXT,
    metadata JSONB,
    embedding VECTOR(768)  -- Размерность для nomic-embed-text
);

-- HNSW индекс для быстрого ANN поиска
CREATE INDEX IF NOT EXISTS idx_llamaindex_embedding 
ON data_llamaindex_vectors 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- GIN индекс для метаданных
CREATE INDEX IF NOT EXISTS idx_llamaindex_metadata 
ON data_llamaindex_vectors 
USING GIN (metadata);
```

### PostgreSQL performance tuning

```sql
-- Настройки для векторного поиска (postgresql.conf или ALTER SYSTEM)
ALTER SYSTEM SET shared_buffers = '4GB';
ALTER SYSTEM SET effective_cache_size = '12GB';
ALTER SYSTEM SET maintenance_work_mem = '1GB';
ALTER SYSTEM SET work_mem = '256MB';

-- pgvector specific
ALTER SYSTEM SET hnsw.ef_search = 100;

-- Reload
SELECT pg_reload_conf();
```

---

## Конфигурация n8n

### Environment Variables

```yaml
# docker-compose.cpu.yml
environment:
  # Host и protocol
  - N8N_HOST=n8n.${DOMAIN}
  - N8N_PORT=5678
  - N8N_PROTOCOL=https
  - WEBHOOK_URL=https://n8n.${DOMAIN}/
  
  # Database
  - DB_TYPE=postgresdb
  - DB_POSTGRESDB_HOST=${POSTGRES_HOST}
  - DB_POSTGRESDB_PORT=${POSTGRES_PORT}
  - DB_POSTGRESDB_DATABASE=${POSTGRES_DB}
  - DB_POSTGRESDB_USER=${POSTGRES_USER}
  - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
  - DB_POSTGRESDB_SCHEMA=${POSTGRES_DB_SCHEMA}
  
  # Queue mode
  - EXECUTIONS_MODE=queue
  - QUEUE_BULL_REDIS_HOST=redis
  - QUEUE_BULL_REDIS_ENABLED=true
  
  # Workers
  - N8N_RUNNERS_ENABLED=true
  - OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true
  
  # Metrics
  - N8N_METRICS=true
  - N8N_METRICS_INCLUDE_DEFAULT_METRICS=true
  
  # Community packages
  - N8N_COMMUNITY_PACKAGES_ENABLED=true
  - N8N_UNVERIFIED_PACKAGES_ENABLED=true
  
  # Langfuse Tracing
  - N8N_LANGFUSE_HOST=http://langfuse:3000
  - N8N_LANGFUSE_PUBLIC_KEY=${LANGFUSE_PUBLIC_KEY}
  - N8N_LANGFUSE_SECRET_KEY=${LANGFUSE_SECRET_KEY}
  
  # File access
  - N8N_RESTRICT_FILE_ACCESS_TO=/data/shared;/app/data;/home/node/.n8n-files
```

### n8n Credentials для Ollama

```json
// Settings → Credentials → Add Credential → Ollama API
{
  "baseUrl": "http://ollama:11434"
}
```

### n8n Credentials для LlamaIndex

```json
// HTTP Request node headers
{
  "Content-Type": "application/json"
}
// Base URL: http://llamaindex:8000
```

---

## Конфигурация Langfuse

### Environment Variables

```yaml
# docker-compose.monitoring.yml
environment:
  # Database URLs
  DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/langfuse
  DIRECT_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/langfuse
  
  # Auth
  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
  NEXTAUTH_URL: https://langfuse.${DOMAIN}
  LANGFUSE_HOST: https://langfuse.${DOMAIN}
  
  # Initial setup
  LANGFUSE_INIT_PROJECT_NAME: AI-Agent
  LANGFUSE_INIT_USER_EMAIL: ${ACME_EMAIL}
  LANGFUSE_INIT_USER_NAME: ${LANGFUSE_INIT_USER_NAME}
  LANGFUSE_INIT_USER_PASSWORD: ${LANGFUSE_INIT_USER_PASSWORD}
  
  # ClickHouse
  CLICKHOUSE_URL: http://${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}@langfuse-clickhouse:8123
  CLICKHOUSE_MIGRATION_URL: clickhouse://${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}@langfuse-clickhouse:9000/langfuse
  CLICKHOUSE_CLUSTER_ENABLED: false
  
  # Redis
  REDIS_CONNECTION_STRING: redis://redis:6379
  
  # S3 (MinIO)
  LANGFUSE_S3_EVENT_UPLOAD_ENABLED: true
  LANGFUSE_S3_EVENT_UPLOAD_BUCKET: langfuseevents
  LANGFUSE_S3_EVENT_UPLOAD_ENDPOINT: http://langfuse-minio:9000
  LANGFUSE_S3_EVENT_UPLOAD_REGION: eu-central-1
  LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID: ${MINIO_ROOT_USER}
  LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD}
  LANGFUSE_S3_EVENT_UPLOAD_FORCE_PATH_STYLE: true
  
  # OpenTelemetry
  LANGFUSE_ENABLE_OTEL_INGESTION: true
  
  # Security
  SALT: ${SALT}
```

### Интеграция с Python

```python
# apps/llamaindex/main.py
from langfuse import Langfuse

langfuse = Langfuse(
    public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
    secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
    host=os.getenv("LANGFUSE_HOST", "http://langfuse:3000")
)

# Трейсинг запроса
trace = langfuse.trace(name="hybrid-search", user_id="user-123")

# Span для embedding
span = trace.span(name="generate-embedding")
embedding = embed_model.get_query_embedding(query)
span.end()

# Span для поиска
span = trace.span(name="vector-search")
results = search(embedding)
span.end()

trace.end()
```

---

## Конфигурация Supabase

### Kong API Gateway

```yaml
# deployments/docker/supabase/kong.yml
_format_version: "2.1"
_transform: true

services:
  # Auth service
  - name: auth-v1
    url: http://supabase-auth:9999/
    routes:
      - name: auth-v1-route
        strip_path: true
        paths:
          - /auth/v1/

  # REST API
  - name: rest-v1
    url: http://supabase-rest:3000/
    routes:
      - name: rest-v1-route
        strip_path: true
        paths:
          - /rest/v1/

  # Storage
  - name: storage-v1
    url: http://supabase-storage:5000/
    routes:
      - name: storage-v1-route
        strip_path: true
        paths:
          - /storage/v1/

plugins:
  - name: cors
    config:
      origins:
        - "*"
      methods:
        - GET
        - POST
        - PUT
        - DELETE
        - OPTIONS
      headers:
        - Authorization
        - Content-Type
        - Accept
      credentials: true
```

### Row Level Security (RLS)

```sql
-- Пример RLS для таблицы documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои документы
CREATE POLICY "Users can view own documents" ON documents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Политика: пользователь может создавать документы
CREATE POLICY "Users can insert own documents" ON documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

---

## Конфигурация мониторинга

### Prometheus targets

```yaml
# apps/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['prometheus:9090']

  # n8n metrics
  - job_name: 'n8n'
    metrics_path: /metrics
    static_configs:
      - targets: ['n8n:5678']

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # Traefik metrics (если включены)
  - job_name: 'traefik'
    static_configs:
      - targets: ['traefik:8080']

  # Redis Exporter (опционально)
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Datasources

```yaml
# configs/base/grafana/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: PostgreSQL
    type: postgres
    url: postgres:5432
    database: postgres
    user: ${POSTGRES_USER}
    secureJsonData:
      password: ${POSTGRES_PASSWORD}
    jsonData:
      sslmode: disable
```

### Alerting (Grafana)

```yaml
# configs/base/grafana/alerting/alerts.yml
groups:
  - name: ai-stack
    rules:
      # High CPU usage
      - alert: HighCPU
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"

      # Ollama not responding
      - alert: OllamaDown
        expr: up{job="ollama"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Ollama is down"

      # n8n queue backup
      - alert: N8NQueueHigh
        expr: n8n_queue_size > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "n8n queue is growing"
```

---

## Следующие шаги

- [API.md](./API.md) — API документация
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
