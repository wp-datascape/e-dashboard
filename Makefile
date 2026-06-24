.PHONY: help doctor current feature commit fetch push pull sync sync-all update-main finish delete-remote status graph history branches clean-branches dev-frontend dev-backend check build release db-up db-down db-generate db-migrate db-studio db-seed db-status db-reset docker-status docker-stop docker-up docker-down generate-key
SHELL := /bin/bash

# Database config — dibaca dari backend/.env
DB_USER := $(shell grep -E '^DATABASE_URL=' backend/.env 2>/dev/null | sed 's|.*://\([^:]*\).*|\1|')
DB_CONTAINER := e-dashboard-db
DB_URL := $(shell grep -E '^DATABASE_URL=' backend/.env 2>/dev/null | cut -d= -f2)
DB_NAME := $(shell echo "$(DB_URL)" | sed 's|.*/\([^?]*\).*|\1|')
DB_PORT := 5432

ifeq ($(DB_USER),)
$(warning Could not parse DATABASE_URL from backend/.env — using defaults)
DB_USER := dashboard
DB_PASS := dashboard123
DB_NAME := e_dashboard
endif

help:
	@echo "====================================================="
	@echo " e-dashboard Workflow"
	@echo "====================================================="
	@echo ""
	@echo "[Environment]"
	@echo " make doctor"
	@echo ""
	@echo "[Git Shortcuts]"
	@echo " make current"
	@echo " make commit"
	@echo " make fetch"
	@echo " make push"
	@echo " make pull"
	@echo " make update-main"
	@echo ""
	@echo "[Git Workflow]"
	@echo " make feature"
	@echo " make sync"
	@echo " make sync-all"
	@echo " make finish"
	@echo " make delete-remote"
	@echo " make branches"
	@echo " make clean-branches"
	@echo " make status"
	@echo " make graph"
	@echo " make history"
	@echo ""
	@echo "[Development]"
	@echo " make dev-frontend"
	@echo " make dev-backend"
	@echo ""
	@echo "[Docker]"
	@echo " make docker-status   Show running containers"
	@echo " make docker-stop     Stop all running containers"
	@echo " make docker-up       Start Infrastructure"
	@echo " make docker-down     Shut down Infrastructure"
	@echo ""
	@echo "[Security]"
	@echo " make generate-key    Generate secret key for encrypting credentials"
	@echo ""
	@echo "[Database]"
	@echo " make db-up           Start postgres container"
	@echo " make db-down         Stop postgres container"
	@echo " make db-status       Show tables & migration state"
	@echo " make db-generate     Generate migration from schema changes"
	@echo " make db-migrate      Run pending migrations"
	@echo " make db-seed         Run seed script"
	@echo " make db-studio       Open Drizzle Studio"
	@echo " make db-reset        Drop & re-run all migrations (DESTRUCTIVE)"
	@echo ""
	@echo "[Quality]"
	@echo " make check"
	@echo " make build"
	@echo " make release"
	@echo ""

doctor:
	@echo "Checking environment..."
	@command -v git >/dev/null || (echo "ERROR: git not found" && exit 1)
	@command -v bun >/dev/null || (echo "ERROR: bun not found" && exit 1)
	@test -d .git || (echo "ERROR: not a git repository" && exit 1)
	@test -f frontend/package.json || \
		(echo "ERROR: frontend/package.json not found" && exit 1)
	@echo "Environment OK"

current:
	@echo -n "Current branch: "
	@git branch --show-current

commit:
	@git status --short
	@echo ""
	@read -p "Stage all changes? (y/N): " confirm; \
	[ "$$confirm" = "y" ] || exit 1; \
	read -p "Commit message: " msg; \
	if [ -z "$$msg" ]; then \
		echo "ERROR: commit message required"; \
		exit 1; \
	fi; \
	git add . && git commit -m "$$msg"

fetch:
	@echo "Fetching metadata from origin..."
	@git fetch origin
	@git status -sb

push:
	@CURRENT=$$(git branch --show-current); \
	echo "Pushing $$CURRENT..."; \
	git push -u origin $$CURRENT

pull:
	@git pull --ff-only

update-main:
	@CURRENT=$$(git branch --show-current); \
	echo "Updating main..."; \
	git checkout main && \
	git pull --ff-only origin main && \
	git checkout $$CURRENT

feature:
	@git diff --quiet || (echo "ERROR: uncommitted changes detected" && exit 1)
	@git diff --cached --quiet || (echo "ERROR: staged changes detected" && exit 1)
	@git checkout main
	@git pull --ff-only origin main
	@echo ""
	@echo "Create new branch"
	@read -p "Type (feature/fix) [feature]: " type; \
	type=$${type:-feature}; \
	read -p "Branch name: " name; \
	if [ -z "$$name" ]; then \
		echo "ERROR: branch name required"; \
		exit 1; \
	fi; \
	git checkout -b $$type/$$name

sync:
	@git diff --quiet || (echo "ERROR: uncommitted changes detected" && exit 1)
	@git diff --cached --quiet || (echo "ERROR: staged changes detected" && exit 1)
	@echo "Fetching current branch..."
	@git fetch origin
	@CURRENT_BRANCH=$$(git branch --show-current); \
	echo "Current branch: $$CURRENT_BRANCH"; \
	git pull --ff-only origin $$CURRENT_BRANCH

sync-all:
	@git diff --quiet || (echo "ERROR: uncommitted changes detected" && exit 1)
	@git diff --cached --quiet || (echo "ERROR: staged changes detected" && exit 1)
	@echo "Fetching remotes..."
	@git fetch --all --prune
	@CURRENT_BRANCH=$$(git branch --show-current); \
	for branch in $$(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v '^origin/HEAD$$' | sed 's#^origin/##'); do \
		if [ "$$branch" = "$$CURRENT_BRANCH" ]; then \
			echo "Pulling $$branch"; \
			git pull --ff-only origin $$branch; \
		elif git show-ref --verify --quiet refs/heads/$$branch; then \
			echo "Updating $$branch"; \
			git fetch origin $$branch:$$branch 2>/dev/null || \
			echo "Skipped $$branch (diverged)"; \
		else \
			echo "Tracking $$branch"; \
			git branch --track $$branch origin/$$branch 2>/dev/null || true; \
		fi; \
	done
	@echo "Sync complete"

status:
	@git status -s

branches:
	@git branch -vv

graph:
	@git --no-pager log \
		--graph \
		--abbrev-commit \
		--decorate \
		--format=format:'%C(dim white)%ar%Creset - %C(bold yellow)%h%Creset %C(white)%s%Creset%C(auto)%d%Creset' \
		-n 20
	@echo ""

history:
	@git --no-pager log \
		-n 15 \
		--pretty=format:"%h - %an, %ar : %s"
	@echo ""

finish: check
	@CURRENT_BRANCH=$$(git branch --show-current); \
	if [ "$$CURRENT_BRANCH" = "main" ]; then \
		echo "ERROR: already on main"; \
		exit 1; \
	fi; \
	git diff --quiet || (echo "ERROR: uncommitted changes detected" && exit 1); \
	git diff --cached --quiet || (echo "ERROR: staged changes detected" && exit 1); \
	echo "Current branch: $$CURRENT_BRANCH"; \
	echo ""; \
	read -p "Merge $$CURRENT_BRANCH into main? (y/N): " confirm; \
	[ "$$confirm" = "y" ] || exit 1; \
	@echo "Step 0: Fetch latest remote state"; \
	git fetch origin || exit 1; \
	echo "Step 0.5: Pull (Merge) any remote changes"; \
	git pull --ff-only origin $$CURRENT_BRANCH || (echo "ERROR: Diverged branch, pull manually" && exit 1); \
	echo "Step 1: Push branch"; \
	git push origin $$CURRENT_BRANCH || exit 1; \
	echo "Step 2: Update main"; \
	git checkout main || exit 1; \
	git pull --ff-only origin main || exit 1; \
	echo "Step 3: Merge"; \
	git merge --no-ff $$CURRENT_BRANCH || exit 1; \
	echo "Step 4: Push main"; \
	git push origin main || exit 1; \
	echo ""; \
	read -p "Delete local branch $$CURRENT_BRANCH? (y/N): " del; \
	if [ "$$del" = "y" ]; then \
		git branch -d $$CURRENT_BRANCH; \
	fi

delete-remote:
	@read -p "Remote branch name: " branch; \
	if [ -z "$$branch" ]; then \
		echo "ERROR: branch name required"; \
		exit 1; \
	fi; \
	case "$$branch" in \
		main|master|release|production|staging) \
			echo "ERROR: protected branch"; \
			exit 1 ;; \
	esac; \
	git push origin --delete $$branch

clean-branches:
	@git fetch --prune
	@git branch --merged main | \
		grep -v "main$$" | \
		grep -v "master$$" | \
		xargs -r git branch -d

dev-frontend:
	@echo "Starting frontend..."
	@bun run --cwd frontend dev

dev-backend:
	@echo "Starting backend..."
	@PORT=$$(grep -E '^PORT=' backend/.env 2>/dev/null | cut -d= -f2 || echo 3000); \
	if lsof -ti :$$PORT > /dev/null 2>&1; then \
		echo "[error] Port $$PORT is already in use. Stop the existing process and try again."; \
		exit 1; \
	fi
	@bun run --cwd backend dev

docker-status:
	@echo "Showing running containers"
	docker ps -a

docker-stop:
	@echo "Stopping all running containers"
	@if [ -n "$$(docker ps -q)" ]; then \
		docker stop $$(docker ps -q); \
	else \
		echo "No running containers."; \
	fi

docker-up:
	@echo "Starting Infrastructure"
	docker compose up -d

docker-down:
	@echo "Shutting down Infrastructure"
	docker compose down

generate-key:
	@echo "WARNING: Rotating the encryption key will make all previously"
	@echo "encrypted data in the database UNREADABLE!"
	@echo "Make sure to re-save all credentials after rotating the key."
	@echo ""
	@read -p "   Are you sure you want to continue? (yes/no): " confirm; \
	if [ "$$confirm" != "yes" ]; then \
		echo "Aborted."; \
		exit 1; \
	fi
	@echo ""
	@echo "Generating CREDENTIALS_ENCRYPTION_KEY..."
	@KEY=$$(openssl rand -base64 32); \
	if grep -q "CREDENTIALS_ENCRYPTION_KEY" backend/.env 2>/dev/null; then \
		sed -i "s|CREDENTIALS_ENCRYPTION_KEY=.*|CREDENTIALS_ENCRYPTION_KEY=$$KEY|" backend/.env; \
		echo "Key updated in backend/.env"; \
	else \
		echo "CREDENTIALS_ENCRYPTION_KEY=$$KEY" >> backend/.env; \
		echo "Key added to backend/.env"; \
	fi
	@echo ""
	@echo "Restart server agar key baru terbaca!"

db-up:
	@echo "Starting postgres container..."
	@docker compose up -d postgres
	@echo "Waiting for postgres to be healthy..."
	@until docker exec $(DB_CONTAINER) pg_isready -U $(DB_USER) > /dev/null 2>&1; do sleep 1; done
	@echo "Postgres is ready"

db-down:
	@echo "Stopping postgres container..."
	@docker compose stop postgres

db-status:
	@echo "=== Container Status ==="
	@docker ps --filter name=$(DB_CONTAINER) --format "  {{.Names}} — {{.Status}}"
	@echo ""
	@echo "=== Tables in $(DB_NAME) ==="
	@docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c "\dt" 2>/dev/null || echo "  (cannot connect)"
	@echo ""
	@echo "=== Drizzle Migration Schema ==="
	@docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c "SELECT * FROM drizzle.__drizzle_migrations;" 2>/dev/null || echo "  (no drizzle schema yet)"
	@echo ""
	@echo "=== Migration Files ==="
	@ls backend/src/db/migrations/*.sql 2>/dev/null | xargs -I{} basename {} || echo "  (no migration files)"

db-generate:
	@echo "Generating migration from schema..."
	@cd backend && bun run db:generate

db-migrate:
	@echo "Running migrations..."
	@cd backend && bun run db:migrate
	@echo "Migration complete"

db-seed:
	@if [ ! -f backend/src/db/seed.ts ]; then \
		echo "ERROR: backend/src/db/seed.ts not found"; \
		exit 1; \
	fi
	@echo "Seeding database..."
	@cd backend && bun run db:seed

db-studio:
	@echo "Opening Drizzle Studio..."
	@cd backend && bun run db:studio

db-reset:
	@echo "WARNING: This will DROP all schemas and re-run all migrations."
	@read -p "Are you sure? (y/N): " confirm; \
	[ "$$confirm" = "y" ] || exit 1; \
	echo "Dropping drizzle schema (migration tracking)..."; \
	docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c \
		"DROP SCHEMA IF EXISTS drizzle CASCADE;"; \
	echo "Dropping public schema (all tables)..."; \
	docker exec $(DB_CONTAINER) psql -U $(DB_USER) -d $(DB_NAME) -c \
		"DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO $(DB_USER);"; \
	echo "Re-running migrations..."; \
	cd backend && bun run db:migrate; \
	echo "Reset complete"

check:
	@echo "=== Backend ==="
	@echo "Running TypeScript..."
	@bun --cwd backend tsc --noEmit
	@echo ""
	@echo "=== Frontend ==="
	@echo "Running TypeScript..."
	@bun --cwd frontend tsc --noEmit
	@echo "Running lint..."
	@bun run --cwd frontend lint

build: check
	@echo "Building..."
	@bun run --cwd frontend build

release: check build
	@echo ""
	@echo "Release validation passed"