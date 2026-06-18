.PHONY: help feature sync merge delete-remote status graph history dev-frontend dev-backend build check

SHELL := /bin/bash

help:
	@echo "====================================================="
	@echo "         Senior Dev Workflow - e-dashboard            "
	@echo "====================================================="
	@echo " [GIT WORKFLOW]"
	@echo "  make feature         : Buat branch fitur interaktif"
	@echo "  make sync            : Update main dari remote origin"
	@echo "  make merge           : Merge & hapus lokal interaktif"
	@echo "  make delete-remote   : Hapus branch di origin interaktif"
	@echo "  make status          : Cek status repositori (short-form)"
	@echo "  make graph           : Tampilkan git graph/tree ringkas"
	@echo "  make history         : Tampilkan 15 commit terakhir"
	@echo ""
	@echo " [RUN DEVELOPMENT SERVER]"
	@echo "  make dev-frontend    : Jalankan dev server Frontend (Bun)"
	@echo "  make dev-backend     : Jalankan dev server Backend"
	@echo ""
	@echo " [BUILD & QUALITY CHECK]"
	@echo "  make check           : Jalankan tsc (type-check) & lint"
	@echo "  make build           : Build aplikasi untuk production"
	@echo "====================================================="

# ==============================================================================
# 1. CATEGORY: GIT WORKFLOW
# ==============================================================================

feature:
	@git checkout main && git pull origin main
	@echo "--- Pembuatan Branch Baru ---"
	@read -p "Masukkan tipe branch (feature/fix) [default: feature]: " type; \
	type=$${type:-feature}; \
	read -p "Masukkan nama branch baru: " name; \
	if [ -z "$$name" ]; then \
		echo "Error: Nama branch tidak boleh kosong!"; \
		exit 1; \
	fi; \
	git checkout -b $$type/$$name

sync:
	git checkout main && git pull origin main

merge: check
	@read -p "Masukkan nama branch yang ingin di-merge: " branch; \
	if [ -z "$$branch" ]; then \
		echo "Error: Nama branch tidak boleh kosong!"; \
		exit 1; \
	fi; \
	echo "Tests passed! Merging $$branch..."; \
	git checkout main; \
	git merge $$branch; \
	git branch -d $$branch; \
	git push origin main

delete-remote:
	@read -p "Masukkan nama branch remote yang ingin dihapus: " branch; \
	if [ -z "$$branch" ]; then \
		echo "Error: Nama branch tidak boleh kosong!"; \
		exit 1; \
	fi; \
	git push origin --delete $$branch

status:
	@echo "--- Git Status Short ---"
	@git status -s

graph:
	@echo "--- Git Graphs ---"
	@git --no-pager log --graph --abbrev-commit --decorate --format=format:'%C(dim white)%ar%Creset - %C(bold yellow)%h%Creset %C(white)%s%Creset%C(auto)%d%Creset' -n 15
	@echo ""

history:
	@echo "--- 15 Last Commits ---"
	@git --no-pager log -n 15 --pretty=format:"%h - %an, %ar : %s"
	@echo ""

# ==============================================================================
# 2. CATEGORY: RUN DEVELOPMENT SERVER
# ==============================================================================

dev-frontend:
	@echo "Starting Frontend development server..."
	bun run --cwd frontend dev

dev-backend:
	@echo "Starting Backend development server..."
	@echo "Error: Command dev-backend belum dikonfigurasi."

# ==============================================================================
# 3. CATEGORY: BUILD & QUALITY CHECK
# ==============================================================================

check:
	@echo "Running TypeScript check..."
	@bun --cwd frontend tsc --noEmit
	@echo "Running Linting..."
	@bun run --cwd frontend lint

build: check
	bun run --cwd frontend build