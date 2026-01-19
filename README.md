# 🤖 AI Stack - Полная инфраструктура для работы с LLM

Комплексное решение для развертывания и управления AI-инфраструктурой на базе Docker, включающее автоматизацию (n8n), локальные LLM (Ollama), веб-интерфейс для чатов (Open WebUI), векторную базу данных (Supabase), мониторинг (Grafana + Prometheus) и трейсинг (Langfuse).

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)
[![Docker Compose](https://img.shields.io/badge/docker--compose-v2.20+-blue.svg)](https://docs.docker.com/compose/)

---

## 🚀 Быстрый старт

```


# Клонирование и настройка

git clone https://github.com/Bimo0420/ai-ass-core.git
cd ai-ass-core
cp .env.example .env

# Генерация секретов и запуск

make env-generate
make up-cpu

# Загрузка моделей

make ollama-pull

```

**Доступ к сервисам:** `https://{service}.${DOMAIN}`

Полная инструкция: [Установка и настройка](docs/setup/installation.md)

---

## 📚 Документация

### Начало работы
- [Требования](docs/setup/requirements.md) - Системные требования и зависимости
- [Установка](docs/setup/installation.md) - Пошаговая инструкция по установке
- [Конфигурация](docs/setup/configuration.md) - Настройка переменных окружения
- [Быстрый старт](docs/setup/quickstart.md) - Краткое руководство для начала работы

### Архитектура
- [Обзор архитектуры](docs/architecture/overview.md) - Схема и описание компонентов
- [Компоненты стека](docs/architecture/components.md) - Детальное описание сервисов
- [Сетевая архитектура](docs/architecture/networking.md) - Docker networks и Traefik
- [Хранилище данных](docs/architecture/storage.md) - Volumes и персистентность

### Операции
- [Управление стеком](docs/operations/management.md) - Команды запуска, остановки, перезапуска
- [Мониторинг](docs/operations/monitoring.md) - Grafana, Prometheus, метрики
- [Резервное копирование](docs/operations/backup-restore.md) - Создание и восстановление бэкапов
- [Обновление](docs/operations/updates.md) - Процесс обновления компонентов
- [Миграция](docs/operations/migration.md) - Перенос на новый сервер

### Использование
- [Работа с Ollama](docs/usage/ollama.md) - Управление LLM моделями
- [Настройка n8n](docs/usage/n8n.md) - Создание автоматизированных workflow
- [Open WebUI](docs/usage/open-webui.md) - Использование чат-интерфейса
- [Supabase и Vector DB](docs/usage/supabase.md) - Работа с векторной базой данных
- [RAG с LlamaIndex](docs/usage/llamaindex.md) - Настройка RAG пайплайнов
- [Трейсинг в Langfuse](docs/usage/langfuse.md) - Мониторинг LLM запросов

### Безопасность
- [Общие рекомендации](docs/security/best-practices.md) - Основные меры безопасности
- [SSL/TLS и Traefik](docs/security/ssl-tls.md) - Настройка сертификатов
- [Аутентификация](docs/security/authentication.md) - Защита доступа к сервисам
- [Cloudflare](docs/security/cloudflare.md) - Интеграция с Cloudflare WAF

### Устранение неполадок
- [Общие проблемы](docs/troubleshooting/common-issues.md) - Часто встречающиеся ошибки
- [Логи и диагностика](docs/troubleshooting/logs.md) - Анализ логов сервисов
- [Проблемы с производительностью](docs/troubleshooting/performance.md) - Оптимизация ресурсов
- [Сетевые проблемы](docs/troubleshooting/networking.md) - Решение проблем с подключением

### Разработка
- [Структура проекта](docs/development/project-structure.md) - Организация файлов и директорий
- [Кастомизация](docs/development/customization.md) - Добавление своих сервисов
- [Участие в разработке](docs/development/contributing.md) - Гайд для контрибьюторов
- [API документация](docs/api/README.md) - Endpoints всех сервисов

---

## 🏗 Архитектура

```

┌─────────────────────────────────────────────────────────────┐
│                      Traefik (Reverse Proxy)                 │
│                    SSL/TLS + Load Balancing                  │
└─────────────────────────────────────────────────────────────┘
│
┌─────────────────────┼─────────────────────┐
│                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│      n8n       │   │  Open WebUI     │   │   Langfuse     │
│  (Automation)  │   │   (Chat UI)     │   │  (Tracing)     │
└────────────────┘   └─────────────────┘   └────────────────┘
│                     │                     │
┌───────▼────────┐   ┌────────▼────────┐   ┌───────▼────────┐
│    Ollama      │   │   PostgreSQL    │   │   Supabase     │
│     (LLM)      │   │   (Database)    │   │  (Vector DB)   │
└────────────────┘   └─────────────────┘   └────────────────┘

```

[Подробнее об архитектуре →](docs/architecture/overview.md)

---

## 🧩 Основные компоненты

| Сервис | Описание | Документация |
|--------|----------|--------------|
| **Traefik** | Reverse proxy с SSL | [→](docs/architecture/components.md#traefik) |
| **n8n** | Автоматизация workflow | [→](docs/usage/n8n.md) |
| **Ollama** | Локальные LLM модели | [→](docs/usage/ollama.md) |
| **Open WebUI** | Чат-интерфейс для LLM | [→](docs/usage/open-webui.md) |
| **PostgreSQL** | Основная БД | [→](docs/architecture/storage.md) |
| **Supabase** | Векторная БД + Storage | [→](docs/usage/supabase.md) |
| **Langfuse** | Трейсинг LLM | [→](docs/usage/langfuse.md) |
| **Grafana** | Визуализация метрик | [→](docs/operations/monitoring.md) |

[Полный список компонентов →](docs/architecture/components.md)

---

## 🎮 Основные команды

```

make help              \# Показать все команды
make up-cpu            \# Запустить стек (CPU)
make up-gpu            \# Запустить стек (GPU)
make down              \# Остановить все
make logs              \# Показать логи
make backup            \# Создать бэкап
make health            \# Проверка здоровья

```

[Полная справка по командам →](docs/operations/management.md)

---

## 🌐 Доступ к сервисам

После запуска все сервисы доступны через HTTPS:

| Сервис | URL | Документация |
|--------|-----|--------------|
| n8n | `https://n8n.${DOMAIN}` | [→](docs/usage/n8n.md) |
| Open WebUI | `https://openwebui.${DOMAIN}` | [→](docs/usage/open-webui.md) |
| Grafana | `https://grafana.${DOMAIN}` | [→](docs/operations/monitoring.md) |
| Langfuse | `https://langfuse.${DOMAIN}` | [→](docs/usage/langfuse.md) |

[Полный список сервисов и credentials →](docs/setup/configuration.md#service-urls)

---

## 💻 Требования

- **OS**: Linux (Ubuntu 22.04+ / Debian 12+)
- **CPU**: 4+ ядер (рекомендуется 8+)
- **RAM**: 8+ GB (рекомендуется 16+ GB)
- **Disk**: 50+ GB SSD (рекомендуется 100+ GB NVMe)
- **Docker**: 24.0+
- **Docker Compose**: 2.20+

[Детальные требования →](docs/setup/requirements.md)

---

## 🔐 Безопасность

Проект использует:
- ✅ Автоматические SSL сертификаты (Let's Encrypt)
- ✅ Cloudflare DNS-01 challenge
- ✅ Изолированные Docker networks
- ✅ Секретные ключи в `.env`
- ✅ Регулярное резервное копирование

[Рекомендации по безопасности →](docs/security/best-practices.md)

---

## 🤝 Участие в разработке

Мы приветствуем ваш вклад! См. [CONTRIBUTING.md](docs/development/contributing.md)

---

## 📄 Лицензия

Проект использует компоненты с различными лицензиями. См. [LICENSE](LICENSE)

---

## 📞 Поддержка

- 📖 [Документация](docs/)
- 🐛 [Issues](https://github.com/Bimo0420/ai-ass-core/issues)
- 💬 [Discussions](https://github.com/Bimo0420/ai-ass-core/discussions)

---

<div align="center">

**Сделано с ❤️ для AI-энтузиастов**

⭐ Если проект был полезен, поставьте звезду на GitHub!

</div>
```


***

## Следующие шаги

Теперь я могу создать любой из файлов документации из этой структуры. Какие разделы вы хотите создать в первую очередь? Рекомендую начать с:

1. `docs/setup/installation.md` - детальная установка
2. `docs/setup/configuration.md` - конфигурация
3. `docs/operations/management.md` - управление стеком
4. `docs/operations/backup-restore.md` - бэкапы
5. `docs/troubleshooting/common-issues.md` - типовые проблемы
<span style="display:none">[^1]</span>

<div align="center">⁂</div>

[^1]: README-kopiia.md

