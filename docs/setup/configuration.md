# Конфигурация

Этот документ описывает основные параметры конфигурации стека, переменные окружения и ссылки на сервисы.

## 1. Файл `.env`

Все чувствительные данные и настройки находятся в `.env`. Никогда не коммитьте `.env` в репозиторий.

Создание:

```

cp .env.example .env
nano .env

```

---

## 2. Основные категории переменных

### 2.1. Домен и SSL

```


# Основной домен

DOMAIN=your-domain.com

# Email для Let's Encrypt

ACME_EMAIL=you@example.com

```

Используется Traefik для автоматического получения SSL сертификатов.

### 2.2. Cloudflare

```

CF_API_EMAIL=you@example.com
CF_DNS_API_TOKEN=your-cloudflare-dns-token

```

Токен должен иметь права на управление DNS для нужной зоны.

---

## 3. База данных (PostgreSQL)

```

POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-password
POSTGRES_DB=postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

```

Эти переменные используются:
- n8n
- Supabase
- Langfuse (через ClickHouse/Postgres, если требуется)
- другие сервисы, которым нужна БД

---

## 4. Секреты и ключи

Генерируются автоматически скриптом или `make env-generate`:

```

N8N_ENCRYPTION_KEY=...
WEBUI_SECRET_KEY=...
JWT_SECRET=...
NEXTAUTH_SECRET=...
SALT=...

```

Рекомендация:
- Минимум 32 байта (hex)
- Не менять после запуска продакшн-окружения без необходимости

---

## 5. Supabase / MinIO / Langfuse / Grafana

Примеры (ключи могут отличаться от актуальных в `.env.example`):

```


# Supabase

SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...

# MinIO

MINIO_ROOT_USER=minio-admin
MINIO_ROOT_PASSWORD=very-strong-password

# Grafana

GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=very-strong-password

# Langfuse

LANGFUSE_INIT_USER_EMAIL=\${ACME_EMAIL}
LANGFUSE_INIT_USER_PASSWORD=strong-password
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...

```

---

## 6. URL сервисов

После запуска, сервисы доступны по:

| Сервис | URL |
|--------|-----|
| n8n | `https://n8n.${DOMAIN}` |
| Open WebUI | `https://openwebui.${DOMAIN}` |
| Grafana | `https://grafana.${DOMAIN}` |
| Prometheus | `https://prometheus.${DOMAIN}` |
| Langfuse | `https://langfuse.${DOMAIN}` |
| Supabase Studio | `https://studio.${DOMAIN}` |
| Supabase API | `https://supabase.${DOMAIN}` |
| MinIO Console | `https://minio.${DOMAIN}` |
| Traefik Dashboard | `https://traefik.${DOMAIN}` |
| LlamaIndex API | `https://llamaindex.${DOMAIN}` |
| Docling | `https://docling.${DOMAIN}` |
| Ollama API | `https://ollama.${DOMAIN}` |

---

## 7. Учётные данные по умолчанию

Зависят от переменных в `.env`:

- **Grafana**
  - User: `GF_SECURITY_ADMIN_USER`
  - Password: `GF_SECURITY_ADMIN_PASSWORD`

- **Langfuse**
  - Email: `LANGFUSE_INIT_USER_EMAIL` (по умолчанию `ACME_EMAIL`)
  - Password: `LANGFUSE_INIT_USER_PASSWORD`

- **MinIO**
  - User: `MINIO_ROOT_USER`
  - Password: `MINIO_ROOT_PASSWORD`

- **n8n / Open WebUI**
  - Обычно создают учётку при первом входе (см. конкретный образ/конфиг).

---

## 8. Модульная архитектура Docker Compose

В проекте могут использоваться файлы:

- `docker-compose.base.yml` – базовая инфраструктура (Traefik, PostgreSQL, Redis)
- `docker-compose.cpu.yml` – приложения и LLM для CPU
- `docker-compose.gpu.yml` – приложения и LLM с поддержкой GPU
- `docker-compose.monitoring.yml` – мониторинг и трейсинг

Пример комбинирования:

```

docker compose \
-f docker-compose.base.yml \
-f docker-compose.cpu.yml \
-f docker-compose.monitoring.yml up -d

```

---

## 9. Дополнительные конфиги

- `configs/base/traefik/traefik.yml` – маршрутизация, middlewares, TLS
- `configs/base/prometheus/prometheus.yml` – scrape targets
- `configs/base/supabase/kong.yml` – маршрутизация Supabase

Подробно см.:
- [architecture/overview.md](../architecture/overview.md)
- [operations/monitoring.md](../operations/monitoring.md)