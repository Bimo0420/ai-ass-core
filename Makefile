.PHONY: help up down restart logs backup restore ps clean

# Переменные
COMPOSE_BASE := docker compose -f deployments/docker/docker-compose.base.yml
COMPOSE_CPU := $(COMPOSE_BASE) -f deployments/docker/docker-compose.cpu.yml
COMPOSE_GPU := $(COMPOSE_CPU) -f deployments/docker/docker-compose.gpu.yml
COMPOSE_MONITORING := -f deployments/docker/docker-compose.monitoring.yml

help: ## Показать помощь
	@echo "Доступные команды:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

up-cpu: ## Запустить стек с CPU
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) up -d --build

up-gpu: ## Запустить стек с GPU
	$(COMPOSE_GPU) $(COMPOSE_MONITORING) up -d --build

build-cpu: ## Собрать образы для CPU
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) build

build-gpu: ## Собрать образы для GPU
	$(COMPOSE_GPU) $(COMPOSE_MONITORING) build

up-base: ## Запустить только базовые сервисы
	$(COMPOSE_BASE) up -d

up-monitoring: ## Запустить только мониторинг
	$(COMPOSE_BASE) $(COMPOSE_MONITORING) up -d

down: ## Остановить все сервисы
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) down

down-volumes: ## Остановить с удалением volumes (ОСТОРОЖНО!)
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) down -v

restart: ## Перезапустить все сервисы
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) restart

logs: ## Показать логи всех сервисов
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) logs -f

ps: ## Показать статус контейнеров
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) ps

pull: ## Обновить все образы
	$(COMPOSE_CPU) $(COMPOSE_MONITORING) pull --ignore-pull-failures

backup: ## Создать резервную копию
	./scripts/backup/backup.sh

restore: ## Восстановить из резервной копии
	./scripts/backup/restore.sh

clean: ## Очистить неиспользуемые ресурсы Docker
	docker system prune -a --volumes -f

health: ## Проверить health всех сервисов
	./scripts/health-check.sh
