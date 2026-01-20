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
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Open WebUI    │    │      n8n        │    │   LlamaIndex    │
│  (Chat Interface)│    │   (Workflow)    │    │   (RAG API)     │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              OLLAMA                                       │
│                     (Local LLM Inference Engine)                          │
│                   [Qwen3, Llama3, Mistral, и др.]                         │
└──────────────────────────────────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │    Supabase     │
│   + pgvector    │    │   (Queue/Cache) │    │   (BaaS API)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

                    ┌───────────────────────┐
                    │      MONITORING       │
                    │  Langfuse │ Prometheus │
                    │  Grafana  │ ClickHouse │
                    └───────────────────────┘
```

---

## 📦 Компоненты

| Компонент | Описание | Порт |
|-----------|----------|------|
| **Ollama** | Локальный LLM inference (Qwen3, Llama3, Mistral) | 11434 |
| **Open WebUI** | Chat-интерфейс с поддержкой RAG | 8080 |
| **n8n** | Low-code автоматизация workflow | 5678 |
| **LlamaIndex API** | FastAPI сервис для RAG с hybrid search | 8000 |
| **Docling** | Парсинг PDF, DOCX, Excel документов | 5001 |
| **Supabase** | BaaS с PostgreSQL, Auth, Storage | 8000 |
| **PostgreSQL** | База данных с pgvector для векторов | 5432 |
| **Redis** | Очереди задач и кэширование | 6379 |
| **Traefik** | Reverse proxy с автоматическим SSL | 80/443 |
| **Langfuse** | LLM observability и трейсинг | 3000 |
| **Prometheus** | Сбор метрик | 9090 |
| **Grafana** | Визуализация метрик | 3001 |

---

## ⚡ Quick Start

### Требования

#### Hardware (минимум)
- **CPU**: 4+ ядра
- **RAM**: 16 GB (рекомендуется 32 GB для больших моделей)
- **Диск**: 50 GB SSD

#### Hardware (с GPU)
- **NVIDIA GPU**: RTX 3060+ / RTX 4090 / A100
- **VRAM**: 8 GB+ (16 GB для 13B моделей)

#### Software
- Docker Engine 24.0+
- Docker Compose V2
- NVIDIA Container Toolkit (для GPU)
- Git

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/Bimo0420/ai-ass-core.git
cd ai-ass-core

# 2. Копирование и настройка окружения
cp .env.example .env
# Отредактируйте .env, установив ваш домен и пароли

# 3. Запуск стека (GPU)
make up

# Или только CPU версия
make up-cpu
```

### Проверка работоспособности

```bash
# Статус сервисов
make ps

# Health check
make health

# Просмотр логов
make logs
```

---

## 📚 Документация

| Документ | Описание |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Детальная архитектура системы |
| [INSTALLATION.md](./INSTALLATION.md) | Полная инструкция по установке |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Руководство для разработчиков |
| [CONFIGURATION.md](./CONFIGURATION.md) | Все конфигурационные параметры |
| [API.md](./API.md) | Описание API endpoints |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide |

---

## 🛠️ Makefile команды

```bash
make help          # Показать все доступные команды
make up            # Запустить стек (GPU по умолчанию)
make up-cpu        # Запустить без GPU
make down          # Остановить все сервисы
make restart       # Перезапустить стек
make logs          # Просмотр логов
make ps            # Статус контейнеров
make backup        # Создать backup
make restore       # Восстановить из backup
make clean         # Очистить Docker ресурсы
make health        # Проверка health всех сервисов
```

---

## 🔗 Endpoints (при настроенном домене)

| Сервис | URL |
|--------|-----|
| Open WebUI | `https://openwebui.your-domain.com` |
| n8n | `https://n8n.your-domain.com` |
| Traefik Dashboard | `https://traefik.your-domain.com` |
| Langfuse | `https://langfuse.your-domain.com` |
| Grafana | `https://grafana.your-domain.com` |
| Portainer | `https://portainer.your-domain.com` |
| Docling | `https://docling.your-domain.com` |
| Supabase | `https://supabase.your-domain.com` |

---

## 🤝 Contributing

Мы приветствуем вклад в проект! См. [DEVELOPMENT.md](./DEVELOPMENT.md) для руководства по contributing.

---

## 📄 Лицензия

MIT License. См. [LICENSE](../LICENSE) для деталей.

---

## 🙏 Благодарности

- [Ollama](https://ollama.ai/) — Local LLM inference
- [LlamaIndex](https://www.llamaindex.ai/) — RAG framework
- [n8n](https://n8n.io/) — Workflow automation
- [Open WebUI](https://openwebui.com/) — Chat interface
- [Supabase](https://supabase.com/) — Backend as a Service
- [Langfuse](https://langfuse.com/) — LLM observability
