# ai-ass-core

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-brightgreen.svg)
![GPU](https://img.shields.io/badge/GPU-NVIDIA-green.svg)

> **Локальная AI RAG Agent система для работы с документами и автоматизации workflow**

## 🎯 Обзор

**ai-ass-core** — это self-hosted платформа для создания AI-агентов с поддержкой RAG (Retrieval-Augmented Generation). Система объединяет локальные LLM модели, векторный поиск, автоматизацию workflow и мониторинг в едином Docker-стеке.

### Ключевые особенности

- 🔒 **Полная приватность** — все данные остаются на вашем сервере
- 🚀 **GPU-ускорение** — поддержка NVIDIA GPU для быстрого inference
- 🔍 **Hybrid Search** — комбинация семантического и полнотекстового поиска
- 🔄 **Автоматизация** — n8n workflow для построения AI-пайплайнов
- 📊 **Мониторинг** — полный observability стек с Langfuse, Prometheus, Grafana
- 🌐 **Production-ready** — Traefik reverse proxy с автоматическим SSL

---

## 🏗️ Архитектура

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              TRAEFIK                                      │
│                    (Reverse Proxy + SSL + Load Balancer)                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Open WebUI    │    │      n8n        │    │   LlamaIndex    │
│  (Chat Interface)│    │   (Workflow)    │    │   (RAG API)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         └───────────────────────┼───────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              OLLAMA                                       │
│                     (Local LLM Inference Engine)                          │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │    Supabase     │
│   + pgvector    │    │   (Queue/Cache) │    │   (BaaS API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## ⚡ Quick Start

### Требования

- Docker Engine 24.0+
- Docker Compose V2
- NVIDIA GPU + Container Toolkit (для GPU версии)
- 16+ GB RAM (32 GB рекомендуется)

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/Bimo0420/ai-ass-core.git
cd ai-ass-core

# 2. Настройка окружения
cp .env.example .env
# Отредактируйте .env, установив домен и пароли

# 3. Запуск стека
make up        # GPU версия
make up-cpu    # CPU версия

# 4. Загрузка моделей
docker exec ollama ollama pull qwen3:8b
docker exec ollama ollama pull nomic-embed-text
```

### Проверка

```bash
make ps        # Статус сервисов
make health    # Health check
make logs      # Просмотр логов
```

---

## 📦 Компоненты

| Компонент | Описание | URL |
|-----------|----------|-----|
| **Ollama** | LLM inference | `https://ollama.your-domain.com` |
| **Open WebUI** | Chat интерфейс | `https://openwebui.your-domain.com` |
| **n8n** | Workflow автоматизация | `https://n8n.your-domain.com` |
| **LlamaIndex** | RAG API с hybrid search | `http://localhost:8000` |
| **Langfuse** | LLM tracing | `https://langfuse.your-domain.com` |
| **Grafana** | Мониторинг | `https://grafana.your-domain.com` |
| **Supabase** | BaaS (Auth, Storage, DB) | `https://supabase.your-domain.com` |

---

## 📚 Документация

Полная документация находится в директории [`docs/`](./docs/):

| Документ | Описание |
|----------|----------|
| [README](./docs/README.md) | Главная страница документации |
| [ARCHITECTURE](./docs/ARCHITECTURE.md) | Архитектура системы |
| [INSTALLATION](./docs/INSTALLATION.md) | Руководство по установке |
| [DEVELOPMENT](./docs/DEVELOPMENT.md) | Руководство разработчика |
| [CONFIGURATION](./docs/CONFIGURATION.md) | Конфигурационные параметры |
| [API](./docs/API.md) | API документация |
| [DEPLOYMENT](./docs/DEPLOYMENT.md) | Production deployment |

---

## 🛠️ Makefile команды

```bash
make help          # Все доступные команды
make up            # Запуск (GPU)
make up-cpu        # Запуск (CPU)
make down          # Остановка
make logs          # Логи
make ps            # Статус
make backup        # Backup данных
make clean         # Очистка Docker
```

---

## 🤝 Contributing

См. [DEVELOPMENT.md](./docs/DEVELOPMENT.md) для руководства по contributing.

---

## 📄 Лицензия

MIT License
