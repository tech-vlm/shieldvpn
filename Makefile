.PHONY: up down restart logs ps rebuild fresh

# Full stack up: builds dashboard + API, starts every service
up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

# Rebuild only the dashboard + API (after code changes)
rebuild:
	docker compose up -d --build api dashboard

# Wipe all state (profiles, Caddy certs) — destructive
fresh:
	docker compose down -v
