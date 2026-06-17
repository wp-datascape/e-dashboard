# Makefile untuk Project e-dashboard
# Standar: Type-checking, Linting, & Git Workflow

.PHONY: help feature sync merge delete-remote dev build check

# Membaca variabel dari environment jika ada
SHELL := /bin/bash

help:
	@echo "====================================================="
	@echo "        Senior Dev Workflow - e-dashboard            "
	@echo "====================================================="
	@echo "  make feature name=FITUR   : Buat branch fitur"
	@echo "  make sync                 : Update main"
	@echo "  make check                : Jalankan tsc (type-check) & lint"
	@echo "  make merge branch=FITUR   : Merge, test, hapus lokal"
	@echo "  make dev                  : Jalankan dev server"
	@echo "====================================================="

# 1. Menjalankan Type Checking (TSC) & Linting
# Memastikan kode bersih sebelum di-merge atau dideploy
check:
	@echo "Running TypeScript check..."
	@bun --cwd frontend tsc --noEmit
	@echo "Running Linting..."
	@bun --cwd frontend run lint

# 2. Membuat fitur baru
feature:
	git checkout main && git pull origin main
	git checkout -b feature/$(name)

# 3. Sinkronisasi Main
sync:
	git checkout main && git pull origin main

# 4. Merge dengan proteksi (Hanya merge jika check lolos)
# Ini adalah standar senior: jangan pernah merge kode yang error!
merge: check
	@echo "Tests passed! Merging $(branch)..."
	git checkout main
	git merge $(branch)
	git branch -d $(branch)
	git push origin main

# 5. Jalankan Dev
dev:
	@echo "Starting development server..."
	bun run --cwd frontend dev

# 6. Build untuk Production
build: check
	bun --cwd frontend run build

delete-remote:
	git push origin --delete $(branch)