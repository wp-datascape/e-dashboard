.PHONY: help doctor current feature commit push pull sync sync-all update-main finish delete-remote status graph history branches clean-branches dev-frontend dev-backend check build release
SHELL := /bin/bash

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
	echo "Step 0: Fetch latest remote state"; \
	git fetch origin || exit 1; \
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
	@echo "Configure backend command first."

check:
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