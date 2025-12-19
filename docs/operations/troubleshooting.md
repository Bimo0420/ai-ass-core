# Типовые проблемы и их решения

Этот документ собирает наиболее частые проблемы при работе со стеком и способы их диагностики.

---

## 1. Сервисы не доступны по HTTPS

**Симптомы:**
- Браузер не открывает `https://openwebui.${DOMAIN}`
- Сертификат не выдан, Traefik в логах ругается на ACME / DNS

**Проверки:**

1. DNS:
```

dig +short n8n.\${DOMAIN}
dig +short \${DOMAIN}

```
IP должен совпадать с IP сервера.

2. Логи Traefik:
```

docker compose logs traefik | grep -i 'acme\|letsencrypt\|certificate'

```

3. Переменные:
- `DOMAIN`
- `ACME_EMAIL`
- `CF_API_EMAIL`
- `CF_DNS_API_TOKEN`

**Возможные решения:**
- Исправить DNS записи в Cloudflare, дождаться распространения.
- Проверить, что токен Cloudflare имеет права `Zone.DNS`.
- Перезапустить Traefik, очистив старые сертификаты (осторожно):
```

docker compose down
rm -rf volumes/traefik-acme/   \# путь может отличаться
docker compose up -d traefik

```

---

## 2. `docker compose up` падает с ошибками портов

**Симптомы:**
- Ошибка вида `port is already allocated` для 80 или 443.

**Проверка:**

```

sudo lsof -i:80 -i:443
sudo systemctl status nginx apache2

```

**Решения:**
- Остановить/удалить другие веб-серверы:
```

sudo systemctl stop nginx
sudo systemctl disable nginx
sudo systemctl stop apache2
sudo systemctl disable apache2

```
- Повторить запуск стека.

---

## 3. Ollama не отвечает

**Симптомы:**
- Ошибка 500/timeout от `https://ollama.${DOMAIN}`
- Внутри контейнера `ollama list` не работает

**Проверки:**

```

docker compose logs ollama
docker exec -it ollama ollama list

```

**Решения:**

- Перезапуск контейнера:
```

docker compose restart ollama

```
- Повторная загрузка моделей:
```

make ollama-pull

# или

docker exec -it ollama ollama pull llama3.2

```
- Проверить, хватает ли дискового пространства и RAM.

---

## 4. PostgreSQL / БД не поднимается

**Симптомы:**
- n8n, Supabase, другие сервисы не могут подключиться к БД
- В логах Postgres ошибки

**Проверки:**

```

docker compose logs postgres
docker exec -it postgres psql -U postgres -c "\l"

```

**Типовые проблемы:**

- Нехватка места на диске
- Повреждённые данные в volume
- Некорректные переменные `POSTGRES_*`

**Решения:**

- Проверить диск:
```

df -h

```
- Попробовать перезапуск:
```

docker compose restart postgres

```
- Если данные не критичны — удалить volume и поднять заново (осторожно).

---

## 5. n8n не запускается / падает по ошибке

**Симптомы:**
- Контейнер `n8n` рестартится
- В логах ошибки подключения к БД или Redis

**Проверки:**

```

docker compose logs n8n
docker compose logs postgres
docker compose logs redis

```

**Решения:**

- Убедиться, что Postgres и Redis `healthy`.
- Проверить переменные подключения в `.env`.
- Пересоздать контейнеры n8n (без удаления всех volumes БД):
```

docker compose stop n8n
docker compose rm -f n8n
docker compose up -d n8n

```

---

## 6. Не хватает памяти / свопа

**Симптомы:**
- Контейнеры убиваются OOM killer-ом
- В логах ядра `Out of memory`

**Проверки:**

```

docker stats --no-stream
free -h

```

**Решения:**

- Уменьшить количество одновременно запущенных сервисов (отключить ненужные).
- Добавить swap:

```

sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

```

---

## 7. Заканчивается дисковое пространство

**Симптомы:**
- Ошибки записи в БД
- Невозможность сохранить данные
- Docker ругается на `no space left on device`

**Проверки:**

```

df -h
docker system df

```

**Решения:**

- Очистить неиспользуемые образы и volumes:
```

docker image prune -a
docker volume prune

# очень осторожно:

docker system prune -a --volumes

```
- Перенести старые бэкапы на внешний storage.
- Увеличить диск на уровне провайдера.

---

## 8. Проблемы с Grafana / Prometheus

**Симптомы:**
- Нет данных на дашбордах
- Targets в Prometheus в состоянии `DOWN`

**Проверки:**

1. Prometheus Targets:
```


# URL

https://prometheus.\${DOMAIN}/targets

```
2. Логи:
```

docker compose logs prometheus
docker compose logs node-exporter cadvisor

```

**Решения:**

- Проверить `prometheus.yml`, корректность `scrape_configs`.
- Убедиться, что указанные endpoints доступны по сети (имена контейнеров, порты).
- Перезапустить мониторинг:
```

make restart-monitoring

# или соответствующие docker compose команды

```

---

## 9. Общий чек-лист при «ничего не работает»

1. Проверить `docker compose ps` — какие контейнеры упали.
2. Просмотреть логи проблемных контейнеров.
3. Проверить:
 - DNS (dig)
 - Порты 80/443 (конкурирующие сервисы)
 - Свободное место (df -h)
 - RAM и swap (free -h, docker stats)
4. Перезапустить базу и Traefik.
5. Если проблема остаётся — создать issue с логами и описанием:
 - ОС, версия Docker/Compose
 - фрагменты `.env` (без секретов)
 - вывод `docker compose ps`
 - логи проблемных контейнеров