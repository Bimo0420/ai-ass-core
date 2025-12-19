# Мониторинг и наблюдаемость

Этот документ описывает настройку и использование системы мониторинга для AI Stack.

---

## 1. Обзор компонентов мониторинга

Стек включает:

| Компонент | Назначение |
|-----------|------------|
| **Prometheus** | Сбор и хранение метрик |
| **Grafana** | Визуализация метрик, дашборды |
| **Node Exporter** | Системные метрики хоста |
| **cAdvisor** | Метрики Docker контейнеров |
| **Langfuse** | Трейсинг LLM запросов |

---

## 2. Prometheus

### 2.1. Доступ

URL: `https://prometheus.${DOMAIN}`

Без аутентификации по умолчанию (можно добавить BasicAuth через Traefik).

### 2.2. Конфигурация

Файл: `configs/base/prometheus/prometheus.yml`

Пример:

```

global:
scrape_interval: 15s
evaluation_interval: 15s

scrape_configs:

- job_name: 'prometheus'
static_configs:
    - targets: ['localhost:9090']
- job_name: 'node-exporter'
static_configs:
    - targets: ['node-exporter:9100']
- job_name: 'cadvisor'
static_configs:
    - targets: ['cadvisor:8080']
- job_name: 'postgres'
static_configs:
    - targets: ['postgres:5432']


# требуется postgres_exporter, если нужен

- job_name: 'n8n'
static_configs:
    - targets: ['n8n:5678']


# если n8n экспортирует метрики


```

### 2.3. Проверка targets

1. Откройте `https://prometheus.${DOMAIN}/targets`
2. Убедитесь, что все endpoints в состоянии **UP**
3. Если есть DOWN — проверьте логи:

```

docker compose logs prometheus
docker compose logs node-exporter
docker compose logs cadvisor

```

---

## 3. Grafana

### 3.1. Доступ

URL: `https://grafana.${DOMAIN}`

**Учётные данные:**
- User: `admin` (или `${GF_SECURITY_ADMIN_USER}`)
- Password: из `.env` (`${GF_SECURITY_ADMIN_PASSWORD}`)

### 3.2. Подключение Prometheus Data Source

После первого входа:

1. **Configuration** → **Data Sources** → **Add data source**
2. Выберите **Prometheus**
3. URL: `http://prometheus:9090`
4. Нажмите **Save & Test**

### 3.3. Импорт готовых дашбордов

Grafana имеет библиотеку публичных дашбордов на [grafana.com/grafana/dashboards](https://grafana.com/grafana/dashboards).

#### Рекомендуемые дашборды

| Название | ID | Описание |
|----------|----|----|
| **Node Exporter Full** | 1860 | Детальные системные метрики |
| **Docker Container & Host Metrics** | 179 | Метрики Docker контейнеров |
| **PostgreSQL Database** | 9628 | Метрики PostgreSQL |
| **Traefik 2** | 12250 | Метрики Traefik |

#### Процесс импорта

1. **Dashboards** → **Import**
2. Введите ID дашборда (например, `1860`)
3. Нажмите **Load**
4. Выберите Prometheus data source
5. Нажмите **Import**

---

## 4. Node Exporter

### 4.1. Назначение

Собирает метрики хост-системы:
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Filesystem usage

### 4.2. Endpoints

Внутренний: `http://node-exporter:9100/metrics`

### 4.3. Основные метрики

- `node_cpu_seconds_total` — использование CPU
- `node_memory_MemAvailable_bytes` — доступная память
- `node_filesystem_avail_bytes` — свободное место на диске
- `node_network_receive_bytes_total` — входящий трафик

---

## 5. cAdvisor

### 5.1. Назначение

Собирает метрики Docker контейнеров:
- CPU per container
- Memory per container
- Network per container
- Disk I/O per container

### 5.2. Endpoints

Внутренний: `http://cadvisor:8080/metrics`

Веб-интерфейс (если проброшен через Traefik): `https://cadvisor.${DOMAIN}`

### 5.3. Основные метрики

- `container_cpu_usage_seconds_total` — CPU контейнера
- `container_memory_usage_bytes` — память контейнера
- `container_network_receive_bytes_total` — сетевой трафик

---

## 6. Langfuse — Трейсинг LLM

### 6.1. Назначение

Langfuse собирает и визуализирует все запросы к LLM:
- История промптов и ответов
- Использование токенов
- Время ответа (latency)
- Стоимость запросов (для платных API)
- Цепочки вызовов (traces)

### 6.2. Доступ

URL: `https://langfuse.${DOMAIN}`

**Учётные данные:**
- Email: `${LANGFUSE_INIT_USER_EMAIL}` (обычно равен `${ACME_EMAIL}`)
- Password: `${LANGFUSE_INIT_USER_PASSWORD}`

### 6.3. Получение API ключей

После входа:

1. **Settings** → **API Keys**
2. Нажмите **Create new key**
3. Скопируйте:
- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
4. Добавьте их в `.env`:

```

LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...

```

5. Перезапустите сервисы, использующие LLM (например, n8n, pipelines):

```

docker compose restart n8n pipelines

```

### 6.4. Интеграция с приложениями

Если вы используете LlamaIndex, LangChain, или другие фреймворки, настройте Langfuse callback:

**Пример для LangChain (Python):**

```

from langfuse.callback import CallbackHandler

langfuse_handler = CallbackHandler(
public_key=os.getenv("LANGFUSE_PUBLIC_KEY"),
secret_key=os.getenv("LANGFUSE_SECRET_KEY"),
host="https://langfuse.\${DOMAIN}"
)

# использование в цепочке

chain.run(input_text, callbacks=[langfuse_handler])

```

### 6.5. Просмотр трейсов

1. Откройте Langfuse
2. **Traces** — список всех запросов
3. Кликните на trace для детального просмотра:
   - Промпт
   - Ответ модели
   - Токены (input/output)
   - Время выполнения
   - Метаданные (модель, температура и т.д.)

---

## 7. Алерты и уведомления

### 7.1. Настройка алертов в Grafana

1. Откройте дашборд
2. Выберите панель, на которой хотите создать алерт
3. **Edit** → **Alert** → **Create Alert**
4. Настройте условия (например, CPU > 80%)
5. Добавьте **Notification channel** (Email, Slack, Telegram, Webhook)

### 7.2. Notification channels

**Email:**
- Требуется настройка SMTP в Grafana (в `docker-compose` или через UI)

**Slack:**
- Создайте Incoming Webhook в Slack
- Добавьте URL в Grafana

**Telegram:**
- Используйте Telegram Bot API
- Добавьте Bot Token и Chat ID

---

## 8. Логи

Для анализа проблем комбинируйте метрики с логами.

### 8.1. Просмотр логов

```


# Все сервисы

make logs

# Конкретный сервис

docker compose logs -f <service-name>

# С фильтрацией

docker compose logs grafana | grep -i error

```

### 8.2. Ротация логов

Docker может накапливать большие логи. Настройте ротацию в `/etc/docker/daemon.json`:

```

{
"log-driver": "json-file",
"log-opts": {
"max-size": "10m",
"max-file": "3"
}
}

```

Перезапустите Docker:

```

sudo systemctl restart docker

```

---

## 9. Практические сценарии

### 9.1. Мониторинг нагрузки на Ollama

**Метрика:** CPU и память контейнера `ollama`

1. Откройте дашборд **Docker Container & Host Metrics** (ID: 179)
2. Фильтр по контейнеру: `ollama`
3. Отслеживайте:
   - CPU usage
   - Memory usage
   - Network I/O (если модель загружается)

### 9.2. Мониторинг использования БД

**Метрика:** Postgres connections, queries

1. Импортируйте дашборд **PostgreSQL Database** (ID: 9628)
2. Настройте data source на Prometheus
3. Отслеживайте:
   - Количество подключений
   - Query latency
   - Disk I/O

### 9.3. Отслеживание запросов к LLM

1. Откройте Langfuse
2. **Traces** — все запросы
3. **Sessions** — группировка по сессиям (если настроено)
4. **Datasets** — наборы тестовых промптов
5. **Analytics** — агрегированная статистика (токены, стоимость, latency)

---

## 10. Оптимизация и тюнинг

### 10.1. Увеличение retention в Prometheus

По умолчанию Prometheus хранит метрики 15 дней. Для увеличения:

В `docker-compose.monitoring.yml`:

```

services:
prometheus:
command:
- '--storage.tsdb.retention.time=30d'
- '--storage.tsdb.path=/prometheus'

```

### 10.2. Уменьшение scrape_interval

Если метрик слишком много или нагрузка высокая, увеличьте интервал в `prometheus.yml`:

```

global:
scrape_interval: 30s  \# вместо 15s

```

---

## 11. Проблемы и решения

### Prometheus не видит targets

**Проверить:**
1. Имена контейнеров в `prometheus.yml` соответствуют сервисам в `docker-compose`
2. Порты открыты и сервисы слушают метрики
3. Сеть Docker позволяет коммуникацию (обычно `default` или `ai-network`)

**Решение:**

```

docker compose logs prometheus
docker network inspect <network-name>

```

### Grafana не отображает данные

**Проверить:**
1. Data source настроен и протестирован
2. Временной диапазон на дашборде корректный
3. В Prometheus есть метрики (проверить через `/targets`)

### Langfuse не записывает трейсы

**Проверить:**
1. API ключи корректны и добавлены в `.env`
2. Приложение использует Langfuse SDK с правильным `host`
3. Сеть позволяет доступ к Langfuse

---

## 12. Дополнительные ресурсы

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Langfuse Documentation](https://langfuse.com/docs)
- [Node Exporter Metrics](https://github.com/prometheus/node_exporter)
- [cAdvisor GitHub](https://github.com/google/cadvisor)

---

## 13. Следующие шаги

- Настроить алерты для критических метрик
- Интегрировать Langfuse в свои LLM пайплайны
- Регулярно просматривать дашборды для выявления аномалий
- Оптимизировать ресурсы на основе метрик
```