# Руководство разработчика ai-ass-core

## Содержание

- [Структура проекта](#структура-проекта)
- [Локальная разработка](#локальная-разработка)
- [Makefile команды](#makefile-команды)
- [Разработка компонентов](#разработка-компонентов)
- [Стандарты кодирования](#стандарты-кодирования)
- [Тестирование](#тестирование)
- [CI/CD](#cicd)
- [Contributing Guidelines](#contributing-guidelines)

---

## Структура проекта

```
ai-ass-core/
├── .env.example              # Шаблон переменных окружения
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── lint.yml          # Линтинг кода
│       ├── test.yml          # Тесты
│       └── release.yml       # Release automation
├── .gitignore                # Git ignore rules
├── Makefile                  # Команды управления
├── agents.md                 # Директивы для AI-агентов
│
├── apps/                     # Приложения
│   ├── docling/              # Конфигурация Docling
│   ├── llamaindex/           # LlamaIndex RAG API
│   │   ├── Dockerfile        # Docker образ (CPU)
│   │   ├── Dockerfile.gpu    # Docker образ (GPU)
│   │   ├── main.py           # FastAPI приложение
│   │   ├── requirements.txt  # Python зависимости
│   │   ├── src/              # Исходный код модулей
│   │   └── tests/            # Unit тесты
│   ├── pipelines/            # OpenWebUI pipelines
│   └── prometheus/           # Prometheus конфигурация
│       └── prometheus.yml
│
├── configs/                  # Конфигурации по окружениям
│   ├── base/                 # Базовые конфигурации
│   │   ├── prometheus/
│   │   ├── supabase/
│   │   └── traefik/
│   ├── development/          # Dev overrides
│   ├── staging/              # Staging overrides
│   └── production/           # Production overrides
│
├── deployments/              # Deployment конфигурации
│   ├── ansible/              # Ansible playbooks
│   ├── docker/               # Docker Compose файлы
│   │   ├── docker-compose.base.yml       # Базовые сервисы
│   │   ├── docker-compose.cpu.yml        # LLM сервисы (CPU)
│   │   ├── docker-compose.gpu.yml        # GPU override для Ollama
│   │   ├── docker-compose.monitoring.yml # Мониторинг
│   │   ├── llamaindex/       # LlamaIndex data и конфиги
│   │   ├── modelfiles/       # Ollama custom modelfiles
│   │   ├── n8n-workflows/    # Готовые n8n workflows
│   │   ├── pipelines/        # OpenWebUI pipelines
│   │   ├── supabase/         # Supabase конфигурации
│   │   │   ├── kong.yml      # API Gateway config
│   │   │   ├── migrations/   # SQL миграции
│   │   │   └── HYBRID_SEARCH_SETUP.md
│   │   └── traefik/          # Traefik конфигурации
│   └── kubernetes/           # K8s manifests (WIP)
│
├── docs/                     # Документация
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── INSTALLATION.md
│   ├── DEVELOPMENT.md
│   ├── CONFIGURATION.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── scripts/                  # Скрипты автоматизации
│   ├── backup/               # Backup/restore скрипты
│   │   ├── backup.sh
│   │   └── restore.sh
│   ├── setup/                # Setup скрипты
│   └── utils/                # Утилиты
│
├── tests/                    # Integration тесты
│
└── volumes/                  # Локальные volume данные (gitignored)
```

---

## Локальная разработка

### Подготовка окружения

```bash
# 1. Клонирование репозитория
git clone https://github.com/Bimo0420/ai-ass-core.git
cd ai-ass-core

# 2. Создание .env для разработки
cp .env.example .env
# Отредактируйте .env, установив DOMAIN=localhost

# 3. Настройка Python окружения (для LlamaIndex разработки)
cd apps/llamaindex
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Если есть
```

### Запуск в режиме разработки

```bash
# Запуск только базовых сервисов (без мониторинга)
make up-base

# Запуск LlamaIndex API локально (не в Docker)
cd apps/llamaindex
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Hot Reload для LlamaIndex

Docker-compose монтирует `main.py` как volume, что позволяет видеть изменения без пересборки:

```yaml
# docker-compose.cpu.yml
volumes:
  - ../../apps/llamaindex/main.py:/app/main.py
```

Для полного hot-reload измените command в docker-compose:

```yaml
command: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Разработка n8n Workflows

1. Откройте n8n UI: `http://localhost:5678`
2. Создайте/отредактируйте workflow
3. Экспортируйте в JSON
4. Сохраните в `deployments/docker/n8n-workflows/`

### Разработка OpenWebUI Pipelines

```bash
# Pipelines монтируются как volume
# Редактируйте файлы в deployments/docker/pipelines/

# Перезапуск для применения изменений
docker restart openwebui-pipelines
```

---

## Makefile команды

### Основные команды

```makefile
# Показать все команды
make help

# Запуск/Остановка
make up              # Запуск GPU стека
make up-cpu          # Запуск CPU стека
make up-base         # Только базовые сервисы
make up-monitoring   # Только мониторинг
make down            # Остановить все
make down-volumes    # Остановить + удалить volumes

# Управление
make restart         # Перезапуск
make logs            # Логи всех сервисов
make ps              # Статус контейнеров
make pull            # Обновить образы

# Данные
make backup          # Создать backup
make restore         # Восстановить из backup

# Обслуживание
make clean           # Очистить Docker ресурсы
make health          # Health check

# Сборка
make build-cpu       # Собрать образы (CPU)
make build-gpu       # Собрать образы (GPU)
```

### Переменные Makefile

```makefile
# Базовый compose
COMPOSE_BASE := docker compose -f deployments/docker/docker-compose.base.yml

# Мониторинг
COMPOSE_MONITORING := -f deployments/docker/docker-compose.monitoring.yml

# CPU стек
COMPOSE_CPU := $(COMPOSE_BASE) -f deployments/docker/docker-compose.cpu.yml $(COMPOSE_MONITORING)

# GPU стек (по умолчанию)
COMPOSE_GPU := $(COMPOSE_BASE) -f deployments/docker/docker-compose.cpu.yml \
               -f deployments/docker/docker-compose.gpu.yml $(COMPOSE_MONITORING)
```

---

## Разработка компонентов

### LlamaIndex API

#### Архитектура

```
apps/llamaindex/
├── main.py           # FastAPI app с эндпоинтами
├── src/
│   ├── __init__.py
│   ├── config.py     # Конфигурация
│   ├── embeddings.py # Embedding модели
│   ├── indexing.py   # Индексация документов
│   └── search.py     # Поиск и reranking
└── tests/
    └── test_api.py
```

#### Добавление нового endpoint

```python
# main.py

from pydantic import BaseModel

class NewRequest(BaseModel):
    query: str
    options: dict = {}

class NewResponse(BaseModel):
    result: str
    metadata: dict

@app.post("/new-endpoint", response_model=NewResponse)
async def new_endpoint(request: NewRequest):
    """
    Описание нового endpoint.
    
    - **query**: Текстовый запрос
    - **options**: Дополнительные параметры
    """
    # Логика обработки
    result = process_query(request.query, request.options)
    
    return NewResponse(
        result=result,
        metadata={"processed": True}
    )
```

#### Тестирование локально

```bash
# Запуск тестов
cd apps/llamaindex
pytest tests/ -v

# Тестирование API
curl -X POST http://localhost:8000/index-text \
  -H "Content-Type: application/json" \
  -d '{"content": "Test document", "filename": "test.md"}'

# Тест hybrid search
curl -X POST http://localhost:8000/hybrid-query \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "top_k": 5}'
```

### Добавление нового сервиса

1. **Создайте директорию в apps/**:
```bash
mkdir -p apps/new-service
```

2. **Добавьте в docker-compose.cpu.yml**:
```yaml
new-service:
  build:
    context: ../../apps/new-service
    dockerfile: Dockerfile
  container_name: new-service
  restart: unless-stopped
  networks:
    - ai-network
  environment:
    - SERVICE_CONFIG=${SERVICE_CONFIG}
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.new-service.rule=Host(`new-service.${DOMAIN}`)"
    - "traefik.http.routers.new-service.entrypoints=websecure"
    - "traefik.http.routers.new-service.tls.certresolver=letsencrypt"
    - "traefik.http.services.new-service.loadbalancer.server.port=8080"
```

3. **Создайте Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8080
CMD ["python", "main.py"]
```

---

## Стандарты кодирования

### Python

#### Обязательные инструменты

```bash
# Установка dev-зависимостей
pip install ruff mypy black pytest pytest-asyncio

# Линтинг
ruff check .

# Форматирование
black .

# Type checking
mypy . --ignore-missing-imports
```

#### Правила форматирования

```python
# ✅ Правильно
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Модель запроса для поиска."""
    
    query: str = Field(..., description="Текст поискового запроса")
    top_k: int = Field(default=5, ge=1, le=100, description="Количество результатов")


async def search_documents(request: QueryRequest) -> list[dict]:
    """
    Поиск документов по запросу.
    
    Args:
        request: Параметры поискового запроса
        
    Returns:
        Список найденных документов с метаданными
        
    Raises:
        HTTPException: При ошибке поиска
    """
    try:
        results = await perform_search(request.query, request.top_k)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### Type Hints

```python
# ✅ Правильно - все функции с type hints
def get_embedding(text: str) -> list[float]:
    ...

async def index_document(
    content: str,
    metadata: dict[str, Any] | None = None
) -> IndexResult:
    ...

# ❌ Неправильно - без type hints
def get_embedding(text):
    ...
```

### Docker

#### Dockerfile Best Practices

```dockerfile
# ✅ Правильно
# 1. Используем slim образы
FROM python:3.11-slim

# 2. Метаданные
LABEL maintainer="team@example.com"
LABEL version="1.0"

# 3. ENV переменные
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 4. Рабочая директория
WORKDIR /app

# 5. Сначала зависимости (для кэширования)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Потом код
COPY . .

# 7. Non-root пользователь
RUN useradd -m -u 1000 appuser
USER appuser

# 8. Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 9. Порт и команда
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Git Commits

```bash
# Формат: conventional commits
feat: добавлен hybrid search endpoint
fix: исправлена ошибка reranking для пустых результатов
docs: обновлена документация API
refactor: вынесена логика embedding в отдельный модуль
test: добавлены тесты для index-text endpoint
chore: обновлены зависимости
```

---

## Тестирование

### Структура тестов

```
tests/
├── unit/                    # Unit тесты
│   ├── test_embeddings.py
│   └── test_search.py
├── integration/             # Integration тесты
│   ├── test_api.py
│   └── test_database.py
└── e2e/                     # End-to-end тесты
    └── test_full_pipeline.py
```

### Запуск тестов

```bash
# Все тесты
pytest tests/ -v

# Только unit тесты
pytest tests/unit/ -v

# С coverage
pytest tests/ --cov=apps/llamaindex --cov-report=html

# Конкретный тест
pytest tests/unit/test_search.py::test_hybrid_search -v
```

### Пример теста

```python
# tests/unit/test_search.py
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    """Тест health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_index_text(client):
    """Тест индексации текста."""
    response = client.post(
        "/index-text",
        json={"content": "Test document content", "filename": "test.md"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"
```

---

## CI/CD

### GitHub Actions Workflows

#### Lint (`.github/workflows/lint.yml`)

```yaml
name: Lint

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          pip install ruff black mypy
          
      - name: Run ruff
        run: ruff check .
        
      - name: Run black
        run: black --check .
        
      - name: Run mypy
        run: mypy apps/llamaindex --ignore-missing-imports
```

#### Test (`.github/workflows/test.yml`)

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:15.6.1.117
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          
      - name: Install dependencies
        run: |
          cd apps/llamaindex
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov
          
      - name: Run tests
        run: |
          cd apps/llamaindex
          pytest tests/ -v --cov=. --cov-report=xml
```

---

## Contributing Guidelines

### Процесс внесения изменений

1. **Fork репозитория**
2. **Создайте feature branch**:
   ```bash
   git checkout -b feature/new-feature
   ```
3. **Внесите изменения** с соблюдением стандартов кодирования
4. **Напишите тесты** для новой функциональности
5. **Запустите линтеры и тесты**:
   ```bash
   ruff check .
   black .
   pytest tests/ -v
   ```
6. **Commit с conventional commits**:
   ```bash
   git commit -m "feat: добавлена новая функция X"
   ```
7. **Push и создайте Pull Request**

### Checklist для Pull Request

- [ ] Код соответствует стандартам (ruff, black, mypy)
- [ ] Добавлены/обновлены тесты
- [ ] Тесты проходят локально
- [ ] Обновлена документация (если необходимо)
- [ ] Commit messages в формате conventional commits
- [ ] PR имеет понятное описание изменений

### Код ревью

- Минимум 1 approve для merge
- CI должен быть зелёным
- Не merge с конфликтами

---

## Следующие шаги

- [CONFIGURATION.md](./CONFIGURATION.md) — Детальная настройка
- [API.md](./API.md) — API документация
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
