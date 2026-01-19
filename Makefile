.PHONY: help up down restart logs backup restore ps clean

# Переменные
COMPOSE_BASE := docker compose -f deployments/docker/docker-compose.base.yml
COMPOSE_MONITORING := -f deployments/docker/docker-compose.monitoring.yml
COMPOSE_CPU := $(COMPOSE_BASE) -f deployments/docker/docker-compose.cpu.yml $(COMPOSE_MONITORING)
COMPOSE_GPU := $(COMPOSE_BASE) -f deployments/docker/docker-compose.cpu.yml -f deployments/docker/docker-compose.gpu.yml $(COMPOSE_MONITORING)

# По умолчанию используем GPU, если не указано иное
COMPOSE_ALL := $(COMPOSE_GPU)

help: ## Показать помощь
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Запустить весь стек (GPU по умолчанию)
	$(COMPOSE_ALL) up -d

up-cpu: ## Запустить стек только на CPU
	$(COMPOSE_CPU) up -d

up-gpu: ## Запустить стек с GPU
	$(COMPOSE_GPU) up -d

build-cpu: ## Собрать образы для CPU
	$(COMPOSE_CPU) build

build-gpu: ## Собрать образы для GPU
	$(COMPOSE_GPU) build

up-base: ## Запустить только базовые сервисы
	$(COMPOSE_BASE) up -d

up-monitoring: ## Запустить только мониторинг
	$(COMPOSE_BASE) $(COMPOSE_MONITORING) up -d

down: ## Остановить все сервисы
	$(COMPOSE_ALL) down

down-volumes: ## Остановить с удалением volumes (ОСТОРОЖНО!)
	$(COMPOSE_ALL) down -v

restart: ## Перезапустить все сервисы
	$(COMPOSE_ALL) restart

logs: ## Показать логи всех сервисов
	$(COMPOSE_ALL) logs -f

ps: ## Показать статус контейнеров
	$(COMPOSE_ALL) ps

pull: ## Обновить все образы
	$(COMPOSE_ALL) pull

backup: ## Создать резервную копию
	./scripts/backup/backup.sh

restore: ## Восстановить из резервной копии
	./scripts/backup/restore.sh

clean: ## Очистить неиспользуемые ресурсы Docker
	docker system prune -a --volumes -f

health: ## Проверить health всех сервисов
	./scripts/health-check.sh