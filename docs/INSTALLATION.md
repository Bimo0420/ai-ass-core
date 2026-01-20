# Руководство по установке ai-ass-core

## Содержание

- [Системные требования](#системные-требования)
- [Подготовка сервера](#подготовка-сервера)
- [Установка Docker](#установка-docker)
- [Настройка GPU (NVIDIA)](#настройка-gpu-nvidia)
- [Клонирование репозитория](#клонирование-репозитория)
- [Настройка окружения](#настройка-окружения)
- [Запуск системы](#запуск-системы)
- [Первоначальная настройка](#первоначальная-настройка)
- [Troubleshooting](#troubleshooting)

---

## Системные требования

### Минимальные требования (CPU-only)

| Компонент | Требование |
|-----------|------------|
| **ОС** | Ubuntu 22.04 LTS / Debian 12 / Windows 11 + WSL2 |
| **CPU** | 4+ ядер (x86_64) |
| **RAM** | 16 GB |
| **Диск** | 50 GB SSD |
| **Сеть** | Статический IP или динамический DNS |

### Рекомендуемые требования (GPU)

| Компонент | Требование |
|-----------|------------|
| **ОС** | Ubuntu 22.04 LTS |
| **CPU** | 8+ ядер |
| **RAM** | 32 GB |
| **GPU** | NVIDIA RTX 3080+ / RTX 4090 / A100 |
| **VRAM** | 12+ GB (24 GB для 13B моделей) |
| **Диск** | 100 GB NVMe SSD |
| **Сеть** | Статический IP с открытыми портами 80/443 |

### Поддерживаемые GPU

| GPU | VRAM | Рекомендуемые модели |
|-----|------|---------------------|
| RTX 3060 | 12 GB | qwen3:8b, llama3:8b |
| RTX 3080 | 10 GB | qwen3:8b, llama3:8b |
| RTX 3090 | 24 GB | gpt-oss:20b, qwen3:14b, llama3:8b |
| RTX 4090 | 24 GB | gpt-oss:20b, qwen3:30b, llama3:70b (quantized) |
| A100 | 40/80 GB | Все модели до 70B |

---

## Подготовка сервера

### Ubuntu/Debian

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y \
    curl \
    git \
    make \
    wget \
    ca-certificates \
    gnupg \
    lsb-release

# Настройка swap (опционально, но рекомендуется)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Настройка firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Windows (WSL2)

```powershell
# PowerShell (Administrator)
# Включение WSL2
wsl --install -d Ubuntu-22.04

# После перезагрузки и настройки Ubuntu:
wsl -d Ubuntu-22.04
```

---

## Установка Docker

### Ubuntu/Debian

```bash
# Удаление старых версий
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# Добавление Docker GPG ключа
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавление Docker репозитория
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker

# Проверка установки
docker --version
docker compose version
```

### Проверка Docker

```bash
# Запуск тестового контейнера
docker run --rm hello-world

# Ожидаемый вывод: "Hello from Docker!"
```

---

## Настройка GPU (NVIDIA)

### Установка драйверов NVIDIA

```bash
# Добавление репозитория
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update

# Установка драйвера (автоматический выбор)
sudo ubuntu-drivers autoinstall

# Или конкретная версия
sudo apt install nvidia-driver-545

# Перезагрузка
sudo reboot

# Проверка
nvidia-smi
```

### Установка NVIDIA Container Toolkit

```bash
# Добавление репозитория
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Установка
sudo apt update
sudo apt install -y nvidia-container-toolkit

# Настройка Docker
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Проверка GPU в Docker
docker run --rm --gpus all nvidia/cuda:12.0-base-ubuntu22.04 nvidia-smi
```

### Ожидаемый вывод nvidia-smi

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 545.23.06    Driver Version: 545.23.06    CUDA Version: 12.3     |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce ...  Off  | 00000000:01:00.0 Off |                  N/A |
|  0%   35C    P8    10W / 350W |      0MiB / 24576MiB |      0%      Default |
+-------------------------------+----------------------+----------------------+
```

---

## Клонирование репозитория

```bash
# Переход в директорию для проектов
cd /opt  # или ~/projects

# Клонирование
git clone https://github.com/Bimo0420/ai-ass-core.git
cd ai-ass-core

# Проверка структуры
ls -la
```

---

## Настройка окружения

### Создание .env файла

```bash
# Копирование примера
cp .env.example .env

# Редактирование
nano .env  # или vim .env
```

### Обязательные параметры

```bash
# ===== ДОМЕН И SSL =====
DOMAIN=your-domain.com           # Ваш домен
ACME_EMAIL=admin@your-domain.com # Email для Let's Encrypt

# ===== CLOUDFLARE (опционально) =====
CF_API_EMAIL=your-email@example.com
CF_DNS_API_TOKEN=your-cloudflare-token

# ===== POSTGRESQL =====
POSTGRES_USER=postgres
POSTGRES_PASSWORD=STRONG_PASSWORD_HERE  # Измените!
POSTGRES_HOST=postgres
POSTGRES_DB=postgres
POSTGRES_DB_SCHEMA=n8n
POSTGRES_PORT=5432

# ===== N8N =====
N8N_ENCRYPTION_KEY=  # Генерируйте: openssl rand -hex 32

# ===== OPEN WEBUI =====
WEBUI_SECRET_KEY=    # Генерируйте: openssl rand -hex 32
```

### Генерация секретных ключей

```bash
# Генерация всех необходимых ключей
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "WEBUI_SECRET_KEY=$(openssl rand -hex 32)"
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)"
echo "SALT=$(openssl rand -hex 16)"
echo "LWORKER_ENCRYPTION_KEY=$(openssl rand -hex 32)"

# Генерация Supabase ключей
# Используйте https://supabase.com/docs/guides/self-hosting для генерации
# ANON_KEY и SERVICE_ROLE_KEY
```

### Генерация Supabase ключей

```bash
# Установка jwt-cli
npm install -g jwt-cli

# Генерация JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET"

# Генерация ANON_KEY
ANON_KEY=$(jwt encode \
  --secret "$JWT_SECRET" \
  --exp "2030-01-01" \
  '{"role": "anon", "iss": "supabase"}')
echo "ANON_KEY=$ANON_KEY"

# Генерация SERVICE_ROLE_KEY
SERVICE_ROLE_KEY=$(jwt encode \
  --secret "$JWT_SECRET" \
  --exp "2030-01-01" \
  '{"role": "service_role", "iss": "supabase"}')
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
```

### Пример заполненного .env

```bash
# ===== ДОМЕН И SSL =====
DOMAIN=ai.example.com
ACME_EMAIL=admin@example.com

# ===== CLOUDFLARE =====
CF_API_EMAIL=admin@example.com
CF_DNS_API_TOKEN=xxxxx

# ===== POSTGRESQL =====
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SuperSecure123!
POSTGRES_HOST=postgres
POSTGRES_DB=postgres
POSTGRES_DB_SCHEMA=n8n
POSTGRES_PORT=5432

# ===== N8N =====
N8N_ENCRYPTION_KEY=a1b2c3d4e5f6...

# ===== OPEN WEBUI =====
WEBUI_SECRET_KEY=f6e5d4c3b2a1...

# ===== SUPABASE =====
JWT_SECRET=your-jwt-secret
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=  # Опционально для Supabase AI features
SUPABASE_URL=http://supabase-kong:8000

# ===== OLLAMA =====
OLLAMA_URL=http://ollama:11434

# ===== GRAFANA =====
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=GrafanaSecure123!

# ===== LANGFUSE =====
NEXTAUTH_SECRET=xxx
LANGFUSE_INIT_USER_NAME=admin
LANGFUSE_INIT_USER_PASSWORD=LangfuseSecure123!
SALT=xxx
LWORKER_ENCRYPTION_KEY=xxx

# ===== LANGFUSE CLICKHOUSE =====
CLICKHOUSE_URL=http://langfuse-clickhouse:8123
CLICKHOUSE_USER=langfuse_user
CLICKHOUSE_PASSWORD=ClickHouseSecure123!

# ===== LANGFUSE MINIO =====
MINIO_ROOT_USER=langfuse
MINIO_ROOT_PASSWORD=MinioSecure123!

# ===== LANGFUSE PIPELINES =====
LANGFUSE_PUBLIC_KEY=  # Получите после первого запуска Langfuse
LANGFUSE_SECRET_KEY=  # Получите после первого запуска Langfuse
```

---

## Запуск системы

### GPU версия (рекомендуется)

```bash
# Запуск полного стека
make up

# Или напрямую через docker compose
docker compose -f deployments/docker/docker-compose.base.yml \
               -f deployments/docker/docker-compose.cpu.yml \
               -f deployments/docker/docker-compose.gpu.yml \
               -f deployments/docker/docker-compose.monitoring.yml \
               up -d
```

### CPU-only версия

```bash
# Запуск без GPU
make up-cpu

# Или напрямую
docker compose -f deployments/docker/docker-compose.base.yml \
               -f deployments/docker/docker-compose.cpu.yml \
               -f deployments/docker/docker-compose.monitoring.yml \
               up -d
```

### Проверка статуса

```bash
# Статус всех контейнеров
make ps

# Логи (все сервисы)
make logs

# Логи конкретного сервиса
docker logs -f ollama
```

### Ожидаемый вывод `make ps`

```
NAME                  STATUS              PORTS
traefik               running             0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
postgres              running (healthy)   5432/tcp
redis                 running (healthy)   6379/tcp
ollama                running             11434/tcp
openwebui             running             8080/tcp
n8n                   running             5678/tcp
n8n-worker            running
llamaindex            running (healthy)   8000/tcp
langfuse              running             3000/tcp
grafana               running             3000/tcp
prometheus            running             9090/tcp
...
```

---

## Первоначальная настройка

### 1. Загрузка LLM моделей в Ollama

```bash
# Подключение к контейнеру Ollama
docker exec -it ollama bash

# Загрузка моделей
ollama pull qwen3:8b          # Основная LLM модель
ollama pull nomic-embed-text  # Embedding модель для RAG
ollama pull llama3:8b         # Альтернативная модель

# Проверка загруженных моделей
ollama list

# Выход
exit
```

### 2. Настройка Open WebUI

1. Откройте `https://openwebui.your-domain.com`
2. Создайте первого пользователя (будет администратором)
3. Перейдите в Settings → Models → выберите модель по умолчанию

### 3. Настройка n8n

1. Откройте `https://n8n.your-domain.com`
2. Создайте аккаунт
3. Импортируйте готовые workflows из `deployments/docker/n8n-workflows/`

### 4. Настройка Langfuse

1. Откройте `https://langfuse.your-domain.com`
2. Войдите с credentials из `.env` (LANGFUSE_INIT_USER_*)
3. Создайте проект "AI-Agent"
4. Скопируйте Public Key и Secret Key
5. Добавьте их в `.env`:
   ```bash
   LANGFUSE_PUBLIC_KEY=pk-xxx
   LANGFUSE_SECRET_KEY=sk-xxx
   ```
6. Перезапустите сервисы: `make restart`

### 5. Настройка Hybrid Search в PostgreSQL

```bash
# Подключение к PostgreSQL
docker exec -it postgres psql -U postgres

# Выполните SQL из deployments/docker/supabase/HYBRID_SEARCH_SETUP.md
# или примените миграции:
# \i /path/to/migrations/001_enable_vector.sql
# \i /path/to/migrations/002_create_documents.sql
# ...

\q
```

### 6. Проверка работоспособности

```bash
# Health check всех сервисов
make health

# Тест API LlamaIndex
curl http://localhost:8000/health

# Тест Ollama
curl http://localhost:11434/api/tags
```

---

## Troubleshooting

### Проблема: Контейнер Ollama не запускается с GPU

**Симптомы**: Ошибка `nvidia-container-cli: initialization error`

**Решение**:
```bash
# Проверка nvidia-smi
nvidia-smi

# Перезапуск Docker
sudo systemctl restart docker

# Проверка runtime
docker info | grep -i runtime

# Должно показать: Runtimes: nvidia runc
```

### Проблема: PostgreSQL не стартует

**Симптомы**: `FATAL: data directory has wrong permissions`

**Решение**:
```bash
# Удаление volume (ОСТОРОЖНО: удалит все данные!)
docker volume rm ai-ass-core_postgres-data

# Перезапуск
make down
make up
```

### Проблема: SSL сертификат не выдается

**Симптомы**: Traefik показывает self-signed certificate

**Решение**:
```bash
# Проверка DNS записей
dig +short yourdomain.com

# Проверка доступности порта 80
curl -I http://yourdomain.com/.well-known/acme-challenge/test

# Очистка ACME storage
docker exec traefik rm /acme/acme.json
docker restart traefik
```

### Проблема: n8n worker не подключается к Redis

**Симптомы**: Workflows не выполняются

**Решение**:
```bash
# Проверка Redis
docker exec redis redis-cli ping
# Должно вернуть: PONG

# Проверка очереди
docker logs n8n-worker | tail -20
```

### Проблема: Out of Memory при загрузке модели

**Симптомы**: Ollama завершается с OOM

**Решение**:
```bash
# Использование меньшей модели
docker exec ollama ollama pull qwen3:1.7b

# Или увеличение swap
sudo fallocate -l 16G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
```

### Проверка логов

```bash
# Все логи
make logs

# Конкретный сервис
docker logs -f --tail 100 ollama
docker logs -f --tail 100 langfuse
docker logs -f --tail 100 llamaindex

# Traefik access logs
docker logs traefik 2>&1 | grep "your-domain"
```

---

## Следующие шаги

- [CONFIGURATION.md](./CONFIGURATION.md) — Детальная настройка каждого компонента
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Локальная разработка
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Production deployment
