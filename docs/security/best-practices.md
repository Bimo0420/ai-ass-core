# Рекомендации по безопасности

Этот документ описывает лучшие практики для обеспечения безопасности AI Stack.

---

## 1. Общие принципы

### 1.1. Defense in Depth

Используйте многоуровневую защиту:
- Сетевой уровень (firewall, Cloudflare)
- Уровень приложений (authentication, authorization)
- Уровень данных (encryption at rest, backups)
- Мониторинг и аудит

### 1.2. Principle of Least Privilege

- Каждый сервис получает минимально необходимые права
- Пользователи имеют доступ только к нужным ресурсам
- Регулярный аудит прав доступа

### 1.3. Security by Default

- Безопасные настройки из коробки
- Требование изменения паролей по умолчанию
- Отключение ненужных сервисов

---

## 2. Сетевая безопасность

### 2.1. Firewall (UFW)

**Установка и настройка:**

```

sudo apt install ufw

# Разрешить только необходимые порты

sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Запретить все остальное

sudo ufw default deny incoming
sudo ufw default allow outgoing

# Включить

sudo ufw enable
sudo ufw status verbose

```

**Ограничение SSH по IP (рекомендуется):**

```

sudo ufw delete allow 22/tcp
sudo ufw allow from <your-ip> to any port 22 proto tcp

```

### 2.2. Fail2Ban

**Защита от брутфорса SSH:**

```

sudo apt install fail2ban

# Настройка

sudo nano /etc/fail2ban/jail.local

```

**Пример конфигурации:**

```

[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

```

```

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status sshd

```

### 2.3. Cloudflare

**Настройки в панели Cloudflare:**

1. **SSL/TLS:**
   - Mode: **Full (strict)**
   - Minimum TLS Version: **1.2**
   - Automatic HTTPS Rewrites: **On**

2. **Firewall:**
   - **Managed Rules** → Enable OWASP ModSecurity Core Rule Set
   - **Rate Limiting:** 100 requests/minute per IP

3. **Security Level:** **Medium** или **High**

4. **Bot Fight Mode:** **On**

5. **DDoS Protection:** автоматически включено

---

## 3. Аутентификация и авторизация

### 3.1. Надежные пароли

**Требования:**
- Минимум 16 символов
- Заглавные и строчные буквы
- Цифры и спецсимволы
- Не использовать словарные слова

**Генерация:**

```

openssl rand -base64 32

```

**Хранение:**
- Используйте менеджер паролей (Bitwarden, 1Password, KeePass)
- Никогда не храните пароли в plain text
- Не коммитьте `.env` в git

### 3.2. SSH ключи вместо паролей

**Генерация ключа:**

```

ssh-keygen -t ed25519 -C "your-email@example.com"

```

**Копирование на сервер:**

```

ssh-copy-id user@server-ip

```

**Отключение password authentication:**

```

sudo nano /etc/ssh/sshd_config

```

```

PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no

```

```

sudo systemctl restart sshd

```

### 3.3. Traefik BasicAuth

**Для защиты административных панелей:**

**Генерация пароля:**

```

sudo apt install apache2-utils
htpasswd -nB admin

```

**Добавление middleware в Traefik:**

```


# configs/base/traefik/config/middlewares.yml

http:
middlewares:
admin-auth:
basicAuth:
users:
- "admin:$apr1$..."  \# вывод htpasswd

```

**Применение к сервису:**

```


# docker-compose.yml

labels:

- "traefik.http.routers.prometheus.middlewares=admin-auth"

```

---

## 4. Шифрование

### 4.1. SSL/TLS сертификаты

**Let's Encrypt через Traefik:**

- Автоматическое получение и обновление
- DNS-01 challenge через Cloudflare
- Сертификаты хранятся в `volumes/traefik-acme/`

**Проверка сертификата:**

```

openssl s_client -connect n8n.\${DOMAIN}:443 -showcerts

```

### 4.2. Encryption at Rest

**PostgreSQL:**

Для полного шифрования используйте:
- Encrypted volumes на уровне хоста (LUKS)
- Managed database с encryption (AWS RDS, etc)

**Резервные копии:**

```


# Шифрование бэкапа

tar czf - backup/ | openssl enc -aes-256-cbc -pbkdf2 -out backup.tar.gz.enc

# Расшифровка

openssl enc -aes-256-cbc -pbkdf2 -d -in backup.tar.gz.enc | tar xzf -

```

### 4.3. Secrets Management

**Избегайте:**
- Хранение secrets в коде
- Коммит `.env` в git
- Отправка secrets в логи

**Используйте:**
- `.env` для локальных секретов
- Docker Secrets (в Swarm mode)
- HashiCorp Vault (для enterprise)
- AWS Secrets Manager / Azure Key Vault (в облаке)

---

## 5. Docker Security

### 5.1. Образы

**Используйте официальные образы:**

```


# Хорошо

image: postgres:15-alpine

# Плохо

image: random-user/postgres:latest

```

**Проверяйте образы:**

```

docker scan postgres:15-alpine

```

**Обновляйте регулярно:**

```

docker compose pull
docker compose up -d

```

### 5.2. User namespaces

**Запуск контейнеров от не-root пользователя:**

```

services:
app:
user: "1000:1000"  \# UID:GID

```

### 5.3. Ограничение ресурсов

**Предотвращение DoS:**

```

services:
app:
deploy:
resources:
limits:
cpus: '2'
memory: 2G
reservations:
cpus: '1'
memory: 1G

```

### 5.4. Read-only файловая система

**Для stateless сервисов:**

```

services:
app:
read_only: true
tmpfs:
- /tmp
- /var/run

```

---

## 6. Безопасность приложений

### 6.1. n8n

**Настройки в `.env`:**

```


# Отключить регистрацию новых пользователей

N8N_PERSONALIZATION_ENABLED=false

# Ограничить выполнение кода

N8N_BLOCK_ENV_ACCESS_IN_NODE=true

# HTTPS only

N8N_PROTOCOL=https

```

**BasicAuth для webhook (если нужно):**

```


# В workflow

- Webhook Node
    - Authentication: Basic Auth
    - User: your-user
    - Password: your-password

```

### 6.2. Open WebUI

**Ограничение регистрации:**

```


# Только приглашения

ENABLE_SIGNUP=false

```

**Session timeout:**

```

WEBUI_SESSION_TIMEOUT=3600  \# 1 час

```

### 6.3. Supabase

**Row Level Security (RLS):**

```

-- Включить RLS
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои данные
CREATE POLICY "Users see own data" ON embeddings
FOR SELECT
USING (auth.uid() = user_id);

```

### 6.4. Ollama

**Ограничение доступа:**

- Не выставлять Ollama API публично без авторизации
- Использовать Traefik middleware для ограничения
- Логировать все запросы к LLM (Langfuse)

---

## 7. Мониторинг и аудит

### 7.1. Логирование

**Централизованные логи:**

```


# Ротация логов Docker

sudo nano /etc/docker/daemon.json

```

```

{
"log-driver": "json-file",
"log-opts": {
"max-size": "10m",
"max-file": "3",
"labels": "production"
}
}

```

**Мониторинг логов:**

```


# Подозрительная активность

docker compose logs traefik | grep -i "401\|403\|404"
docker compose logs postgres | grep -i "failed\|error"

```

### 7.2. Алерты

**Настройка в Grafana:**

- CPU > 80% в течение 5 минут
- Disk > 90%
- Memory > 90%
- Сервис down > 1 минута
- Необычное количество 4xx/5xx ошибок

**Уведомления:**
- Email, Slack, Telegram
- PagerDuty для критичных алертов

### 7.3. Audit Trail

**Langfuse для LLM:**
- Все запросы логируются
- История промптов и ответов
- Метаданные (user, timestamp, model)

**n8n executions:**
- История всех запусков workflow
- Входные и выходные данные
- Ошибки и warning

---

## 8. Резервное копирование

### 8.1. Стратегия 3-2-1

- **3** копии данных
- **2** разных носителя (например, локальный диск + облако)
- **1** копия offsite (вне локации сервера)

### 8.2. Автоматизация

**Cron задача:**

```

crontab -e

```

```


# Ежедневный бэкап в 02:00

0 2 * * * cd /opt/ai-ass-core \&\& ./scripts/backup/backup.sh

# Недельный бэкап в воскресенье

0 3 * * 0 cd /opt/ai-ass-core \&\& ./scripts/backup/backup-weekly.sh

```

### 8.3. Шифрование бэкапов

```


# В backup.sh

tar czf - export/ | openssl enc -aes-256-cbc -pbkdf2 -out backup-\$(date +%Y%m%d).tar.gz.enc

```

### 8.4. Тестирование восстановления

**Регулярно (раз в квартал) проверяйте:**

```


# На тестовом сервере

./scripts/backup/restore.sh

# Проверить, что все сервисы работают

```

---

## 9. Обновления и патчи

### 9.1. Операционная система

**Автоматические обновления безопасности:**

```

sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

```

**Ручные обновления:**

```

sudo apt update
sudo apt upgrade -y
sudo reboot  \# если обновлено ядро

```

### 9.2. Docker образы

**Регулярно (еженедельно):**

```

cd /opt/ai-ass-core
make pull
make down
make up-cpu

```

**Проверка новых версий:**

- Следите за GitHub releases компонентов
- Подпишитесь на security mailing lists

### 9.3. Уязвимости

**Сканирование:**

```


# Docker images

docker scan <image-name>

# Система

sudo apt install lynis
sudo lynis audit system

```

---

## 10. Incident Response

### 10.1. План реагирования

**В случае взлома:**

1. **Изолировать:** отключить сервер от сети
2. **Оценить:** масштаб ущерба, украденные данные
3. **Уведомить:** пользователей, если данные скомпрометированы
4. **Восстановить:** из чистого бэкапа
5. **Расследовать:** как произошел взлом
6. **Исправить:** уязвимость
7. **Мониторить:** повторные попытки

### 10.2. Контакты

**Заранее подготовьте:**

- Список ответственных лиц
- Контакты хостинг-провайдера
- Контакты юристов (если применимо)
- Шаблоны уведомлений пользователей

---

## 11. Compliance

### 11.1. GDPR (для EU пользователей)

- **Право на удаление:** возможность удалить все данные пользователя
- **Право на экспорт:** предоставление данных в машинночитаемом формате
- **Согласие:** explicit consent на обработку данных
- **Breach notification:** уведомление в течение 72 часов

### 11.2. Логирование персональных данных

**Минимизация:**
- Не логируйте PII (Personally Identifiable Information) без необходимости
- Используйте anonymization/pseudonymization
- Ограничьте доступ к логам

---

## 12. Чек-лист безопасности

### Сетевая безопасность
- [ ] Firewall настроен (ufw/iptables)
- [ ] Fail2Ban установлен и активен
- [ ] SSH только по ключам
- [ ] SSH порт изменен (опционально)
- [ ] Root login отключен
- [ ] Cloudflare WAF настроен
- [ ] Rate limiting включен

### Шифрование и авторизация
- [ ] SSL/TLS сертификаты актуальны
- [ ] Все сервисы доступны только через HTTPS
- [ ] Надежные пароли (16+ символов)
- [ ] Пароли хранятся в менеджере
- [ ] `.env` не закоммичен в git
- [ ] BasicAuth на административных панелях

### Docker
- [ ] Образы из официальных источников
- [ ] Образы регулярно обновляются
- [ ] Ограничены ресурсы контейнеров
- [ ] Логи ротируются

### Мониторинг
- [ ] Prometheus собирает метрики
- [ ] Grafana с алертами настроена
- [ ] Langfuse логирует LLM запросы
- [ ] Логи проверяются на аномалии

### Резервное копирование
- [ ] Автоматические ежедневные бэкапы
- [ ] Бэкапы хранятся offsite
- [ ] Бэкапы зашифрованы
- [ ] Восстановление протестировано

### Обновления
- [ ] ОС обновления автоматические
- [ ] Docker образы обновляются еженедельно
- [ ] Подписка на security advisories

---

## 13. Дополнительные ресурсы

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)