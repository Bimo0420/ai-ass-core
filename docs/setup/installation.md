# Установка

Этот документ описывает полный процесс установки и первичной подготовки стека **AI Stack** на новом сервере.

## Предварительные условия

- Доменное имя с управляемой DNS-зоной (желательно через Cloudflare)
- Доступ по SSH к серверу под пользователем с правами `sudo`
- Свободные порты 80 и 443
- Установленные `git` и `curl`

Рекомендуемые ОС:
- Ubuntu 22.04 LTS
- Debian 12

Подробнее о ресурсах: см. [requirements.md](requirements.md).

---

## 1. Подготовка сервера

### Обновление системы

```

sudo apt update \&\& sudo apt upgrade -y
sudo apt install -y git curl ca-certificates

```

### Настройка часового пояса (опционально)

```

sudo timedatectl set-timezone Europe/Moscow
timedatectl status

```

---

## 2. Установка Docker и Docker Compose

### Установка Docker

```

curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo usermod -aG docker \$USER

# Перелогиньтесь из SSH, чтобы группа применилась

```

Проверка:

```

docker version
docker info

```

### Установка Docker Compose plugin

```

sudo apt update
sudo apt install -y docker-compose-plugin

docker compose version

```

---

## 3. Клонирование репозитория

```

cd /opt
sudo git clone https://github.com/Bimo0420/ai-ass-core.git
sudo chown -R $USER:$USER ai-ass-core
cd ai-ass-core

```

---

## 4. Подготовка окружения

### 4.1. Создание `.env`

```

cp .env.example .env
nano .env

```

Минимум нужно заполнить:

- `DOMAIN`
- `ACME_EMAIL`
- `CF_API_EMAIL`
- `CF_DNS_API_TOKEN`
- Все пароли и секреты (если не будете генерировать автоматически)

Подробнее о переменных: [configuration.md](configuration.md).

### 4.2. Генерация секретов (рекомендуется)

Если есть `Makefile` и скрипты:

```

make env-generate

```

Или вручную:

```

chmod +x scripts/setup/generate-secrets.sh
./scripts/setup/generate-secrets.sh

```

Проверьте, что в `.env` появились значения:
- `N8N_ENCRYPTION_KEY`
- `WEBUI_SECRET_KEY`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `SALT`
и другие, если предусмотрено.

---

## 5. Настройка DNS (Cloudflare)

В панели Cloudflare для вашей зоны:

1. Создайте A-запись:
   - Тип: `A`
   - Имя: `*` (или отдельные поддомены: `n8n`, `openwebui`, `ollama`, и т.д.)
   - Адрес: IP вашего сервера
   - Proxy: **Proxied** (оранжевая тучка)

2. Убедитесь, что:
   - DNS уже указывает на ваш сервер
   - `CF_API_EMAIL` и `CF_DNS_API_TOKEN` в `.env` соответствуют аккаунту Cloudflare

---

## 6. Первый запуск стека

### Вариант 1: CPU (без GPU)

```

make up-cpu

# или напрямую:

docker compose -f docker-compose.base.yml \
-f docker-compose.cpu.yml \
-f docker-compose.monitoring.yml up -d

```

### Вариант 2: GPU (с NVIDIA)

1. Установите драйверы NVIDIA и `nvidia-container-toolkit` (см. оф. документацию).
2. Проверьте:

```

nvidia-smi

```

3. Запускайте:

```

make up-gpu

# или соответствующий compose с GPU

```

---

## 7. Проверка статуса

```

make ps

# или

docker compose ps

```

Основные сервисы должны быть в состоянии `running`.

Проверка логов:

```

make logs

# или

docker compose logs -f traefik

```

---

## 8. Проверка доступа к сервисам

После того как Traefik поднял сертификаты, откройте в браузере:

- `https://openwebui.${DOMAIN}`
- `https://n8n.${DOMAIN}`
- `https://grafana.${DOMAIN}`
- `https://langfuse.${DOMAIN}`

Учетные данные по умолчанию и переменные см. в [configuration.md](configuration.md).

---

## 9. Загрузка моделей Ollama

```

make ollama-pull

# или вручную:

docker exec -it ollama ollama pull llama3.2
docker exec -it ollama ollama pull nomic-embed-text

```

Проверка:

```

docker exec -it ollama ollama list

```

---

## 10. Следующие шаги

- Настроить мониторинг: [monitoring.md](../operations/monitoring.md)
- Настроить резервное копирование: [backup-restore.md](../operations/backup-restore.md)
- Ознакомиться с типовыми проблемами: [common-issues.md](../troubleshooting/common-issues.md)