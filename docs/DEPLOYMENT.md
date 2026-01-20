# Production Deployment ai-ass-core

## Содержание

- [Обзор](#обзор)
- [Подготовка сервера](#подготовка-сервера)
- [Cloud провайдеры](#cloud-провайдеры)
- [Production конфигурация](#production-конфигурация)
- [Мониторинг и алертинг](#мониторинг-и-алертинг)
- [Backup и Recovery](#backup-и-recovery)
- [Security Best Practices](#security-best-practices)
- [Обновления и обслуживание](#обновления-и-обслуживание)
- [Troubleshooting Production](#troubleshooting-production)

---

## Обзор

### Production Checklist

- [ ] Сервер с GPU соответствует требованиям
- [ ] DNS записи настроены
- [ ] SSL сертификаты выпущены
- [ ] Все пароли изменены с примеров
- [ ] Backup настроен и протестирован
- [ ] Мониторинг и алертинг настроены
- [ ] Firewall настроен
- [ ] Rate limiting включен
- [ ] Логирование настроено

### Рекомендуемая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                               │
│                    (DDoS Protection + CDN)                       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                          ┌───────▼───────┐
                          │    FIREWALL    │
                          │  (80, 443 only)│
                          └───────┬───────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────┐
│                        VPS / GCP VM                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                       TRAEFIK                                ││
│  │              (SSL + Reverse Proxy)                           ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────────┐│
│  │                    DOCKER NETWORK                            ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     ││
│  │  │ OpenWebUI│  │   n8n    │  │LlamaIndex│  │  Ollama  │     ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     ││
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     ││
│  │  │PostgreSQL│  │  Redis   │  │ Langfuse │  │ Grafana  │     ││
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     ││
│  └──────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────▼──────────────────────────────────┐│
│  │                   NVIDIA GPU (RTX 4090)                      ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Подготовка сервера

### Требования для Production

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| **CPU** | 8 vCPU | 16 vCPU |
| **RAM** | 32 GB | 64 GB |
| **GPU** | RTX 3090 24GB | RTX 4090 24GB |
| **Storage** | 200 GB NVMe | 500 GB NVMe |
| **Network** | 1 Gbps | 10 Gbps |

### Настройка Ubuntu Server

```bash
# 1. Обновление системы
sudo apt update && sudo apt upgrade -y

# 2. Установка необходимых пакетов
sudo apt install -y \
    curl wget git make htop iotop \
    ca-certificates gnupg lsb-release \
    fail2ban ufw

# 3. Настройка hostname
sudo hostnamectl set-hostname ai-server

# 4. Настройка swap (опционально)
sudo fallocate -l 16G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 5. Увеличение лимитов файловых дескрипторов
cat << 'EOF' | sudo tee /etc/security/limits.d/docker.conf
* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
EOF

# 6. Настройка sysctl
cat << 'EOF' | sudo tee /etc/sysctl.d/99-docker.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
vm.swappiness = 10
vm.overcommit_memory = 1
EOF
sudo sysctl -p /etc/sysctl.d/99-docker.conf
```

### Настройка Firewall

```bash
# UFW конфигурация
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH (измените порт если используете нестандартный)
sudo ufw allow 22/tcp

# HTTP/HTTPS для Traefik
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включение
sudo ufw enable

# Проверка
sudo ufw status verbose
```

### Fail2ban

```bash
# Конфигурация для SSH
cat << 'EOF' | sudo tee /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Cloud провайдеры

### Google Cloud Platform (GCP)

#### Создание VM с GPU

```bash
# Через gcloud CLI
gcloud compute instances create ai-server \
    --zone=us-central1-a \
    --machine-type=n1-standard-16 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=200GB \
    --boot-disk-type=pd-ssd \
    --maintenance-policy=TERMINATE \
    --tags=http-server,https-server

# Firewall rules
gcloud compute firewall-rules create allow-http \
    --allow=tcp:80 --target-tags=http-server

gcloud compute firewall-rules create allow-https \
    --allow=tcp:443 --target-tags=https-server
```

#### Зарезервированный IP

```bash
# Создание статического IP
gcloud compute addresses create ai-static-ip --region=us-central1

# Привязка к VM
gcloud compute instances delete-access-config ai-server \
    --access-config-name="External NAT"
    
gcloud compute instances add-access-config ai-server \
    --access-config-name="External NAT" \
    --address=$(gcloud compute addresses describe ai-static-ip \
        --region=us-central1 --format='value(address)')
```

### Hetzner Cloud

```bash
# Через hcloud CLI
hcloud server create \
    --name ai-server \
    --type ccx53 \
    --image ubuntu-22.04 \
    --location fsn1 \
    --ssh-key my-ssh-key

# GPU серверы доступны через Robot marketplace
# или dedicated server с GPU
```

### VPS с GPU (Scaleway, Lambda Labs)

```bash
# Scaleway GPU instances
scw instance server create \
    name=ai-server \
    type=GPU-3070-S \
    image=ubuntu_jammy \
    zone=fr-par-2
```

---

## Production конфигурация

### .env для Production

```bash
# ===== PRODUCTION .env =====

# Домен (обязательно настройте DNS!)
DOMAIN=ai.yourcompany.com
ACME_EMAIL=devops@yourcompany.com

# PostgreSQL (ОБЯЗАТЕЛЬНО ИЗМЕНИТЕ!)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=VERY_LONG_RANDOM_PASSWORD_64_CHARS_MIN
POSTGRES_HOST=postgres
POSTGRES_DB=postgres
POSTGRES_DB_SCHEMA=n8n
POSTGRES_PORT=5432

# Все секреты сгенерированы через openssl rand -hex 32
N8N_ENCRYPTION_KEY=<generated>
WEBUI_SECRET_KEY=<generated>
JWT_SECRET=<generated>
NEXTAUTH_SECRET=<generated>
SALT=<generated>
LWORKER_ENCRYPTION_KEY=<generated>

# Supabase ключи (сгенерированы правильно)
ANON_KEY=<generated_jwt>
SERVICE_ROLE_KEY=<generated_jwt>

# Langfuse API keys (после первого запуска)
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx

# Grafana
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=SECURE_GRAFANA_PASSWORD
```

### Docker Compose overrides для Production

```yaml
# deployments/docker/docker-compose.production.yml
version: '3.8'

services:
  traefik:
    command:
      # Production log level
      - --log.level=INFO
      
      # Disable insecure dashboard
      - --api.dashboard=true
      - --api.insecure=false
      
      # Access logs
      - --accesslog=true
      - --accesslog.filepath=/var/log/traefik/access.log
      
      # Metrics
      - --metrics.prometheus=true
      - --metrics.prometheus.addentrypointslabels=true
      - --metrics.prometheus.addserviceslabels=true
      
      # Let's Encrypt production
      - --certificatesresolvers.letsencrypt.acme.caserver=https://acme-v02.api.letsencrypt.org/directory
    
    volumes:
      - /var/log/traefik:/var/log/traefik
    
    labels:
      # Dashboard with auth
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$xxx"

  postgres:
    # Увеличенные ресурсы
    deploy:
      resources:
        limits:
          memory: 8G
        reservations:
          memory: 4G
    
    # Конфигурация PostgreSQL
    command:
      - postgres
      - -c
      - shared_buffers=2GB
      - -c
      - effective_cache_size=6GB
      - -c
      - work_mem=256MB
      - -c
      - maintenance_work_mem=512MB
      - -c
      - max_connections=200

  ollama:
    deploy:
      resources:
        limits:
          memory: 32G
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]

  n8n:
    environment:
      # Production settings
      - N8N_LOG_LEVEL=info
      - N8N_LOG_OUTPUT=file
      - N8N_LOG_FILE_LOCATION=/home/node/.n8n/logs/

  langfuse:
    environment:
      # Production settings
      - NODE_ENV=production
      - LANGFUSE_LOG_LEVEL=info
```

### Запуск Production стека

```bash
# Сборка образов
make build-gpu

# Запуск с production overrides
docker compose \
    -f deployments/docker/docker-compose.base.yml \
    -f deployments/docker/docker-compose.cpu.yml \
    -f deployments/docker/docker-compose.gpu.yml \
    -f deployments/docker/docker-compose.monitoring.yml \
    -f deployments/docker/docker-compose.production.yml \
    up -d

# Или добавьте в Makefile:
# up-prod:
#     $(COMPOSE_GPU) -f deployments/docker/docker-compose.production.yml up -d
```

---

## Мониторинг и алертинг

### Prometheus Alerts

```yaml
# configs/production/prometheus/alerts.yml
groups:
  - name: ai-stack-production
    rules:
      # System alerts
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage: {{ $value | printf \"%.1f\" }}%"
          
      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage: {{ $value | printf \"%.1f\" }}%"
          
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 15
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space: {{ $value | printf \"%.1f\" }}% free"

      # Service alerts
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

      - alert: OllamaNotResponding
        expr: probe_success{job="ollama-probe"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Ollama is not responding"

      - alert: PostgresConnectionsHigh
        expr: pg_stat_activity_count > 150
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "PostgreSQL connections high: {{ $value }}"

      # n8n alerts
      - alert: N8NExecutionsFailing
        expr: rate(n8n_workflow_executions_total{status="failed"}[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "n8n workflows failing frequently"
```

### Grafana Dashboards

```bash
# Импорт готовых dashboards
# 1. Docker Dashboard: ID 893
# 2. Node Exporter Full: ID 1860
# 3. PostgreSQL: ID 9628
# 4. Redis: ID 11835

# API для импорта
curl -X POST \
    -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @dashboard.json \
    "http://localhost:3001/api/dashboards/db"
```

### Alertmanager (опционально)

```yaml
# configs/production/alertmanager/alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourcompany.com'
  smtp_auth_username: 'alerts@yourcompany.com'
  smtp_auth_password: 'app-password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'team-email'
  
  routes:
    - match:
        severity: critical
      receiver: 'team-pagerduty'

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@yourcompany.com'
        
  - name: 'team-pagerduty'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
```

---

## Backup и Recovery

### Backup скрипт

```bash
#!/bin/bash
# scripts/backup/backup.sh

set -e

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="ai-stack-backup-${DATE}"
RETENTION_DAYS=7

mkdir -p "${BACKUP_DIR}"

echo "=== Starting backup: ${BACKUP_NAME} ==="

# 1. PostgreSQL backup
echo "Backing up PostgreSQL..."
docker exec postgres pg_dumpall -U postgres | gzip > "${BACKUP_DIR}/${BACKUP_NAME}-postgres.sql.gz"

# 2. n8n workflows и credentials
echo "Backing up n8n..."
docker run --rm \
    -v n8n-data:/data:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/${BACKUP_NAME}-n8n.tar.gz -C /data .

# 3. Langfuse data
echo "Backing up Langfuse..."
docker exec langfuse-clickhouse clickhouse-client \
    --query "SELECT * FROM langfuse.traces FORMAT Native" \
    | gzip > "${BACKUP_DIR}/${BACKUP_NAME}-clickhouse-traces.gz"

# 4. Environment и конфигурации
echo "Backing up configs..."
tar czf "${BACKUP_DIR}/${BACKUP_NAME}-configs.tar.gz" \
    .env \
    deployments/docker/*.yml \
    configs/

# 5. Ollama models (опционально, большой размер!)
# echo "Backing up Ollama models..."
# docker run --rm \
#     -v ollama-data:/data:ro \
#     -v ${BACKUP_DIR}:/backup \
#     alpine tar czf /backup/${BACKUP_NAME}-ollama.tar.gz -C /data .

# 6. Создание manifest файла
cat > "${BACKUP_DIR}/${BACKUP_NAME}-manifest.txt" << EOF
Backup: ${BACKUP_NAME}
Date: $(date)
Components:
  - PostgreSQL: ${BACKUP_NAME}-postgres.sql.gz
  - n8n: ${BACKUP_NAME}-n8n.tar.gz
  - ClickHouse: ${BACKUP_NAME}-clickhouse-traces.gz
  - Configs: ${BACKUP_NAME}-configs.tar.gz
EOF

# 7. Удаление старых backup'ов
echo "Cleaning old backups..."
find "${BACKUP_DIR}" -name "ai-stack-backup-*" -mtime +${RETENTION_DAYS} -delete

# 8. Upload в S3 (опционально)
# aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}-*" s3://your-bucket/backups/

echo "=== Backup completed: ${BACKUP_NAME} ==="
```

### Restore скрипт

```bash
#!/bin/bash
# scripts/backup/restore.sh

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-name>"
    echo "Example: $0 ai-stack-backup-20240120_120000"
    exit 1
fi

BACKUP_DIR="/opt/backups"
BACKUP_NAME="$1"

echo "=== Starting restore from: ${BACKUP_NAME} ==="

# Подтверждение
read -p "This will OVERWRITE current data. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# 1. Остановка сервисов
echo "Stopping services..."
make down

# 2. PostgreSQL restore
echo "Restoring PostgreSQL..."
docker compose -f deployments/docker/docker-compose.base.yml up -d postgres
sleep 10

gunzip -c "${BACKUP_DIR}/${BACKUP_NAME}-postgres.sql.gz" | \
    docker exec -i postgres psql -U postgres

# 3. n8n restore
echo "Restoring n8n..."
docker run --rm \
    -v n8n-data:/data \
    -v ${BACKUP_DIR}:/backup \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/${BACKUP_NAME}-n8n.tar.gz -C /data"

# 4. Configs restore (осторожно!)
# echo "Restoring configs..."
# tar xzf "${BACKUP_DIR}/${BACKUP_NAME}-configs.tar.gz"

# 5. Запуск сервисов
echo "Starting services..."
make up

echo "=== Restore completed ==="
echo "Please verify all services are working correctly."
```

### Автоматический Backup (cron)

```bash
# Добавление в crontab
crontab -e

# Ежедневный backup в 3:00
0 3 * * * /opt/ai-ass-core/scripts/backup/backup.sh >> /var/log/ai-backup.log 2>&1

# Еженедельная очистка логов
0 4 * * 0 find /var/log -name "*.log" -mtime +30 -delete
```

---

## Security Best Practices

### 1. Secrets Management

```bash
# Используйте Docker secrets вместо .env для production
docker secret create postgres_password - <<< "your-password"
docker secret create jwt_secret - <<< "your-jwt-secret"

# В docker-compose:
# secrets:
#   postgres_password:
#     external: true
# services:
#   postgres:
#     secrets:
#       - postgres_password
#     environment:
#       POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

### 2. Network Security

```yaml
# Ограничение сетевого доступа
# docker-compose.production.yml
services:
  postgres:
    # Не expose порт наружу
    # ports:
    #   - "5432:5432"  # НИКОГДА!
    networks:
      - ai-network  # Только внутренняя сеть

  redis:
    networks:
      - ai-network
    # Включить аутентификацию
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

### 3. Rate Limiting

```yaml
# Traefik rate limiting middleware
# configs/production/traefik/middlewares.yml
http:
  middlewares:
    ratelimit:
      rateLimit:
        average: 100    # Запросов в секунду
        burst: 200      # Burst лимит
        period: 1s

    ratelimit-strict:
      rateLimit:
        average: 10
        burst: 20
        period: 1s

# Применение к сервисам
services:
  llamaindex:
    labels:
      - "traefik.http.routers.llamaindex.middlewares=ratelimit"
```

### 4. HTTPS Everywhere

```yaml
# Принудительный редирект на HTTPS
http:
  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true

  routers:
    http-catchall:
      rule: hostregexp(`{host:.+}`)
      entrypoints:
        - web
      middlewares:
        - redirect-to-https
      service: noop@internal
```

### 5. Security Headers

```yaml
# Security headers middleware
http:
  middlewares:
    security-headers:
      headers:
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
        customResponseHeaders:
          X-Robots-Tag: "noindex, nofollow"
```

### 6. Регулярные обновления

```bash
#!/bin/bash
# scripts/update.sh

echo "=== Security Update ==="

# 1. Backup перед обновлением
./scripts/backup/backup.sh

# 2. Обновление системы
sudo apt update && sudo apt upgrade -y

# 3. Обновление Docker images
docker compose pull

# 4. Перезапуск с новыми образами
make down
make up

# 5. Очистка старых образов
docker image prune -f

echo "=== Update completed ==="
```

---

## Обновления и обслуживание

### Zero-Downtime Deployment

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "=== Zero-Downtime Deployment ==="

# 1. Pull новых образов
docker compose pull

# 2. Постепенное обновление (для stateless сервисов)
for service in openwebui n8n llamaindex; do
    echo "Updating ${service}..."
    docker compose up -d --no-deps --scale ${service}=2 ${service}
    sleep 30
    docker compose up -d --no-deps --scale ${service}=1 ${service}
done

# 3. Обновление stateful сервисов (с кратким downtime)
echo "Updating PostgreSQL (brief downtime)..."
docker compose up -d --no-deps postgres

echo "=== Deployment completed ==="
```

### Health Monitoring

```bash
#!/bin/bash
# scripts/health-check.sh

echo "=== Health Check ==="

# Массив сервисов и их health endpoints
declare -A services=(
    ["LlamaIndex"]="http://localhost:8000/health"
    ["Ollama"]="http://localhost:11434/api/tags"
    ["n8n"]="http://localhost:5678/healthz"
    ["Langfuse"]="http://localhost:3000/api/public/health"
)

all_healthy=true

for service in "${!services[@]}"; do
    url="${services[$service]}"
    
    if curl -sf "$url" > /dev/null 2>&1; then
        echo "✅ ${service}: healthy"
    else
        echo "❌ ${service}: unhealthy"
        all_healthy=false
    fi
done

# Docker containers status
echo ""
echo "=== Container Status ==="
docker compose ps --format "table {{.Name}}\t{{.Status}}"

if [ "$all_healthy" = true ]; then
    echo ""
    echo "✅ All services healthy"
    exit 0
else
    echo ""
    echo "❌ Some services are unhealthy!"
    exit 1
fi
```

---

## Troubleshooting Production

### Высокое использование CPU/Memory

```bash
# Проверка ресурсов по контейнерам
docker stats --no-stream

# Top процессы в контейнере
docker exec ollama top -b -n 1

# Проверка GPU
nvidia-smi

# Логи OOM killer
dmesg | grep -i "oom\|killed"
```

### PostgreSQL проблемы

```bash
# Активные соединения
docker exec postgres psql -U postgres -c \
    "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Долгие запросы
docker exec postgres psql -U postgres -c \
    "SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
     FROM pg_stat_activity 
     WHERE (now() - pg_stat_activity.query_start) > interval '1 minute';"

# Kill долгих запросов
docker exec postgres psql -U postgres -c \
    "SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE duration > interval '10 minutes';"
```

### Ollama не отвечает

```bash
# Проверка процесса
docker exec ollama ps aux | grep ollama

# Проверка GPU загрузки
docker exec ollama nvidia-smi

# Перезапуск с очисткой
docker compose restart ollama

# Если модель зависла
docker exec ollama ollama stop qwen3:8b
docker exec ollama ollama run qwen3:8b --verbose
```

### Сбор диагностики

```bash
#!/bin/bash
# scripts/diagnostics.sh

DIAG_DIR="/tmp/ai-diagnostics-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DIAG_DIR"

echo "Collecting diagnostics to: $DIAG_DIR"

# System info
uname -a > "$DIAG_DIR/system.txt"
free -h >> "$DIAG_DIR/system.txt"
df -h >> "$DIAG_DIR/system.txt"

# Docker info
docker info > "$DIAG_DIR/docker-info.txt"
docker compose ps > "$DIAG_DIR/containers.txt"
docker stats --no-stream > "$DIAG_DIR/docker-stats.txt"

# Logs (last 1000 lines)
for container in $(docker compose ps -q); do
    name=$(docker inspect --format '{{.Name}}' $container | tr -d '/')
    docker logs --tail 1000 $container > "$DIAG_DIR/logs-${name}.txt" 2>&1
done

# GPU info
nvidia-smi > "$DIAG_DIR/gpu.txt" 2>&1 || echo "No GPU" > "$DIAG_DIR/gpu.txt"

# Network
docker network inspect ai-network > "$DIAG_DIR/network.txt"

# Compress
tar czf "${DIAG_DIR}.tar.gz" -C /tmp $(basename $DIAG_DIR)
rm -rf "$DIAG_DIR"

echo "Diagnostics saved to: ${DIAG_DIR}.tar.gz"
```

---

## Следующие шаги

После успешного production deployment:

1. **Настройте мониторинг** и добавьте алерты в Grafana
2. **Протестируйте backup/restore** полностью
3. **Настройте автоматические обновления** через CI/CD
4. **Документируйте runbooks** для вашей команды
5. **Проведите load testing** перед запуском в production

---

## Полезные ссылки

- [Docker Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Ollama Documentation](https://ollama.ai/docs)
- [Langfuse Self-Hosting](https://langfuse.com/docs/deployment/self-host)
