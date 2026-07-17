PYTHON=backend/../venv/bin/python
PIP=backend/../venv/bin/pip
MANAGE=$(PYTHON) backend/manage.py

.PHONY: help install dev migrate migrations check test clean docker-up docker-down backup

help:
	@echo "BIMS commands:"
	@echo "  make install      Install development dependencies"
	@echo "  make dev          Start Django development server"
	@echo "  make migrate      Apply database migrations"
	@echo "  make migrations   Create database migrations"
	@echo "  make check        Run Django checks"
	@echo "  make test         Run backend tests"
	@echo "  make docker-up    Start Docker services"
	@echo "  make docker-down  Stop Docker services"
	@echo "  make backup       Back up PostgreSQL"
	@echo "  make clean        Remove Python caches"

install:
	$(PIP) install -r backend/requirements-dev.txt

dev:
	$(MANAGE) runserver

migrate:
	$(MANAGE) migrate

migrations:
	$(MANAGE) makemigrations

check:
	$(MANAGE) check

test:
	$(MANAGE) test

docker-up:
	docker compose up --build

docker-down:
	docker compose down

backup:
	./scripts/backup_postgres.sh

clean:
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
