.PHONY: up down restart logs ps rebuild fresh

# Auto-detect: compose plugin (v2) or standalone docker-compose (v1)
COMPOSE := $(shell docker compose version >/dev/null 2>&1 2>&1 && echo "docker compose" || echo "docker-compose")

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f --tail=100

ps:
	$(COMPOSE) ps

# Rebuild only the dashboard + API (after code changes)
rebuild:
	$(COMPOSE) up -d --build api dashboard

# Wipe all state (profiles, Caddy certs) — destructive
fresh:
	$(COMPOSE) down -v
