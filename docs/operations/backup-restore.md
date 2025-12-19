# Резервное копирование и восстановление

Этот документ описывает стратегию бэкапов для стека, а также процесс восстановления и миграции на новый сервер.

## 1. Что бекапим

Рекомендуется сохранять:

- SQL дампы всех баз PostgreSQL
- Docker volumes (данные PostgreSQL, n8n, ollama, grafana, и т.д.)
- Конфигурационные файлы (`.env`, `docker-compose.*.yml`, `configs/*`)
- Метаданные (версия проекта, дата бэкапа и др.)

---

## 2. Скрипты бэкапа

Если в проекте есть скрипты:

```

./scripts/backup/backup.sh
./scripts/backup/restore.sh

```

Или через `make`:

```

make backup
make restore

```

По умолчанию бэкапы могут складываться в директорию `export/`.

---

## 3. Пример логики backup.sh

Типичная последовательность:

1. Создать директорию `export/YYYY-MM-DD-HHMM/`
2. Сделать SQL дампы:

```

docker exec postgres pg_dumpall -U postgres > export/.../postgres.sql

```

3. Архивировать volumes:

```

docker run --rm \
-v ai-ass-core_postgres-data:/source \
-v \$(pwd)/export/...:/backup \
alpine tar czf /backup/postgres-data.tar.gz -C /source .

```

4. Скопировать `.env`, `docker-compose.*.yml`, `configs/`.

---

## 4. Ручное создание резервной копии

```

cd /opt/ai-ass-core

# Остановить нагрузку (опционально)

docker compose stop n8n openwebui

# Выполнить скрипт бэкапа

./scripts/backup/backup.sh

```

Убедитесь, что в `export/` появилась новая папка с:
- `postgres.sql` (или несколькими .sql файлам)
- `*.tar.gz` с томами
- `config-backup/` с конфигами
- `meta.json` (если предусмотрено)

---

## 5. Восстановление из бэкапа

### 5.1. На том же сервере

```

cd /opt/ai-ass-core

# Остановите стек

docker compose down

# Восстановление

./scripts/backup/restore.sh

# Запуск

make up-cpu   \# или другой режим

```

### 5.2. Миграция на новый сервер

**На старом сервере:**

```

cd /opt/ai-ass-core
./scripts/backup/backup.sh

cd ..
tar -czf ai-stack-migration.tar.gz ai-ass-core/

scp ai-stack-migration.tar.gz user@new-server:/opt/

```

**На новом сервере:**

```

cd /opt
tar -xzf ai-stack-migration.tar.gz
cd ai-ass-core

# Установить Docker и Compose

# (см. docs/setup/installation.md)

# Восстановить данные

./scripts/backup/restore.sh

# Запустить стек

make up-cpu

```

---

## 6. Автоматическое резервное копирование (cron)

Открыть crontab:

```

crontab -e

```

Добавить задачу (ежедневно в 02:00):

```

0 2 * * * cd /opt/ai-ass-core \&\& ./scripts/backup/backup.sh >> /var/log/ai-ass-backup.log 2>\&1

```

Убедитесь, что:
- Путь к проекту верный
- Скрипт имеет права на выполнение (`chmod +x scripts/backup/backup.sh`)
- Достаточно места на диске

---

## 7. Рекомендации

- Храните копию бэкапов вне сервера (S3, rsync, другой storage)
- Тестируйте восстановление на тестовом сервере
- Ведите журнал бэкапов (дата, размер, статус)
- При крупных изменениях схем БД делайте отдельные «checkpoint» бэкапы