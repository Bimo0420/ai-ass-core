# Управление стеком

Этот документ описывает повседневные операции по запуску, остановке и обслуживанию стека.

## 1. Основные команды (Makefile)

Если в проекте есть `Makefile`, доступны сокращения:

```

make help        \# список команд
make up-cpu      \# запуск стека в CPU-режиме
make up-gpu      \# запуск стека с GPU
make down        \# остановка всех сервисов
make restart     \# перезапуск всех сервисов
make ps          \# статус контейнеров
make logs        \# общие логи
make health      \# проверка здоровья сервисов

```

Рекомендуется использовать `make`, чтобы не помнить длинные команды `docker compose`.

---

## 2. Управление через Docker Compose

Если вы хотите работать напрямую с Docker Compose:

### 2.1. Запуск

```


# Базовая инфраструктура

docker compose -f docker-compose.base.yml up -d

# Базовая + приложения (CPU)

docker compose -f docker-compose.base.yml \
-f docker-compose.cpu.yml up -d

# Базовая + приложения + мониторинг

docker compose -f docker-compose.base.yml \
-f docker-compose.cpu.yml \
-f docker-compose.monitoring.yml up -d

```

### 2.2. Остановка

```

docker compose down         \# остановка всех контейнеров
docker compose down -v      \# с удалением volumes (осторожно!)

```

---

## 3. Частичный запуск/перезапуск

### 3.1. Только базовые сервисы

```

make up-base

# или конкретные:

docker compose up -d traefik postgres redis

```

### 3.2. Только приложения

```

make up-apps

# или

docker compose up -d n8n openwebui ollama llamaindex docling

```

### 3.3. Только мониторинг

```

make up-monitoring

# или

docker compose up -d grafana prometheus node-exporter cadvisor langfuse

```

---

## 4. Логи и диагностика

### 4.1. Общие логи

```

make logs

# или

docker compose logs -f

```

### 4.2. Логи конкретного сервиса

```

docker compose logs -f traefik
docker compose logs -f postgres
docker compose logs -f ollama
docker compose logs -f n8n
docker compose logs -f grafana

```

---

## 5. Обновление

### 5.1. Обновление образов

```

make pull

# или

docker compose pull

```

### 5.2. Перезапуск после обновления

```

make down
make up-cpu

# или соответствующий режим

```

---

## 6. Мониторинг ресурсов

### 6.1. Docker

```

docker stats              \# использование CPU/RAM по контейнерам
docker system df -v       \# использование диска

```

### 6.2. Хост

```

htop                      \# системные ресурсы
df -h                     \# дисковое пространство

```

---

## 7. Управление Ollama

```

make ollama-pull          \# загрузить базовые модели
make ollama-list          \# список моделей

# напрямую:

docker exec -it ollama ollama list
docker exec -it ollama ollama pull <model-name>
docker exec -it ollama ollama run llama3.2 "Тест"

```

---

## 8. Рекомендуемый операционный цикл

1. Запуск/перезапуск стека по необходимости (`make up-*`, `make restart`).
2. Регулярная проверка:
   - `make health`
   - Dashboards Grafana
   - Targets в Prometheus
3. Регулярные бэкапы: см. [backup-restore.md](backup-restore.md).
4. Обновление образов и системы раз в N недель.