#!/usr/bin/env python3
"""
Sync state Plane work item berdasarkan branch tujuan dari sebuah PUSH (yang
di produksi oleh merge PR) — dan HANYA setelah job deploy terkait di
pipeline.yml sudah SUKSES:
  - push ke `dev`  (setelah job deploy-dev sukses)  -> state "In Review"
  - push ke `main` (setelah job deploy-prod sukses) -> state "Done"

Dipanggil sebagai job tambahan di file `.github/workflows/pipeline.yml` yang
sudah ada (BUKAN workflow terpisah — WAJIB file yang sama, `needs:` GitHub
Actions cuma bisa merujuk job di file workflow yang sama), dengan
`needs: [deploy-dev]` / `needs: [deploy-prod]`, supaya Plane baru diupdate
kalau deploy-nya beneran berhasil.

Cara kerja:
  1. Ambil semua commit message dari event `push` (github.event.commits[*].message),
     dikirim sebagai JSON lewat env var COMMIT_MESSAGES_JSON.
  2. Cari kode issue Plane di tiap commit message, format:
     `<IDENTIFIER>-<nomor>`  contoh: EDASHBOARD-586
     (Konvensi: commit baru wajib menyertakan kode ini kalau mau ikut
     automasi state — lihat panduan Fase 6.)
  3. Untuk tiap kode issue yang ketemu: lookup LANGSUNG ke UUID work item
     Plane lewat endpoint GET .../work-items/{IDENTIFIER}-{n}/ (1 API call,
     lihat find_work_item_id_by_code), PATCH state-nya, dan tempel link ke
     commit terkait.

Kalau tidak ada kode issue yang ketemu sama sekali di push itu, script
skip dengan warning (bukan error) — bukan semua push menyentuh task Plane.

Environment variables:
  PLANE_API_KEY            - Plane API token (GitHub secret)
  PLANE_WORKSPACE          - slug workspace, contoh "semanggi_holding"
  PLANE_PROJECT_ID         - UUID project Plane
  PLANE_PROJECT_IDENTIFIER - identifier project, contoh "EDASHBOARD"
  TARGET_BRANCH            - "dev" atau "main" (isi manual per job di workflow)
  COMMIT_MESSAGES_JSON     - JSON array string commit message, dari
                              ${{ toJson(github.event.commits.*.message) }}
  COMMIT_URL               - link ke commit HEAD, dari
                              https://github.com/${{ github.repository }}/commit/${{ github.sha }}

State target (override lewat env var kalau nama state kamu beda):
  STATE_NAME_DEV   (default "In Review")
  STATE_NAME_MAIN  (default "Done")
"""
import json
import os
import re
import sys
import requests

PLANE_API_KEY = os.environ.get("PLANE_API_KEY")
PLANE_WORKSPACE = os.environ.get("PLANE_WORKSPACE")
PLANE_PROJECT_ID = os.environ.get("PLANE_PROJECT_ID")
PLANE_PROJECT_IDENTIFIER = os.environ.get("PLANE_PROJECT_IDENTIFIER", "").upper()
TARGET_BRANCH = os.environ.get("TARGET_BRANCH", "")
COMMIT_MESSAGES_JSON = os.environ.get("COMMIT_MESSAGES_JSON", "[]")
COMMIT_URL = os.environ.get("COMMIT_URL", "")

STATE_NAME_DEV = os.environ.get("STATE_NAME_DEV", "In Review")
STATE_NAME_MAIN = os.environ.get("STATE_NAME_MAIN", "Done")

REQUIRED = {
    "PLANE_API_KEY": PLANE_API_KEY,
    "PLANE_WORKSPACE": PLANE_WORKSPACE,
    "PLANE_PROJECT_ID": PLANE_PROJECT_ID,
    "PLANE_PROJECT_IDENTIFIER": PLANE_PROJECT_IDENTIFIER,
    "TARGET_BRANCH": TARGET_BRANCH,
}
missing = [k for k, v in REQUIRED.items() if not v]
if missing:
    print(f"Missing env vars: {missing}")
    sys.exit(1)

PLANE_BASE = f"https://api.plane.so/api/v1/workspaces/{PLANE_WORKSPACE}/projects/{PLANE_PROJECT_ID}"
PLANE_HEADERS = {"X-API-Key": PLANE_API_KEY, "Content-Type": "application/json"}

ISSUE_CODE_RE = re.compile(rf"\b{re.escape(PLANE_PROJECT_IDENTIFIER)}-(\d+)\b", re.IGNORECASE)


def target_state_name():
    if TARGET_BRANCH == "dev":
        return STATE_NAME_DEV
    if TARGET_BRANCH == "main":
        return STATE_NAME_MAIN
    print(f"TARGET_BRANCH '{TARGET_BRANCH}' tidak dikenali (harus 'dev' atau 'main'), skip.")
    sys.exit(0)


def get_commit_messages():
    try:
        messages = json.loads(COMMIT_MESSAGES_JSON)
    except json.JSONDecodeError:
        messages = []
    if not isinstance(messages, list):
        messages = []
    return messages


def find_issue_numbers(texts):
    numbers = set()
    for t in texts:
        for m in ISSUE_CODE_RE.finditer(t or ""):
            numbers.add(int(m.group(1)))
    return sorted(numbers)


def get_state_id_by_name(name):
    # per_page=100 (max) — /states/ ikut dipaginate spt /work-items/ (defaultnya
    # cuma 20/halaman, dikonfirmasi lewat dokumentasi resmi developers.plane.so/
    # api-reference/state/list-states). Tanpa ini, project dgn >20 state custom
    # bisa gagal ketemu diam-diam kalau state targetnya kebetulan di halaman 2+.
    resp = requests.get(f"{PLANE_BASE}/states/", headers=PLANE_HEADERS, params={"per_page": 100})
    resp.raise_for_status()
    data = resp.json()
    items = data.get("results", data) if isinstance(data, dict) else data
    for s in items:
        if s.get("name", "").strip().lower() == name.strip().lower():
            return s["id"]
    return None


def find_work_item_id_by_code(code):
    """Lookup LANGSUNG by kode issue (mis. "EDASHBOARD-586") — 1 API call,
    endpoint level workspace (BUKAN /projects/{id}/work-items/), beda dari
    PLANE_BASE yang dipakai fungsi lain di file ini:
      GET /workspaces/{workspace_slug}/work-items/{PROJECT_IDENTIFIER}-{n}/

    Revisi 2026-09-01: versi sebelumnya paginate SELURUH work-items project
    (sampai ~5000 item, safety valve 50 halaman) krn diasumsikan endpoint
    lookup-by-kode tidak ada di v1 public API — asumsi itu SALAH, dikonfirmasi
    lewat dokumentasi resmi (developers.plane.so/api-reference/issue/
    get-issue-sequence-id). Endpoint ini jauh lebih cepat (1 request, bukan
    puluhan) dan tidak punya batas atas jumlah work item spt versi lama.
    """
    url = f"https://api.plane.so/api/v1/workspaces/{PLANE_WORKSPACE}/work-items/{code}/"
    resp = requests.get(url, headers=PLANE_HEADERS)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()["id"]


def add_commit_link(work_item_id, code):
    """Tempelkan link ke commit yang memicu deploy ini — menggantikan fitur
    auto-link yang di akun premium biasanya jalan otomatis lewat Plane GitHub App."""
    if not COMMIT_URL:
        return False
    resp = requests.post(
        f"{PLANE_BASE}/work-items/{work_item_id}/links/",
        headers=PLANE_HEADERS,
        json={"url": COMMIT_URL, "title": f"Deploy commit ({TARGET_BRANCH}) — {code}"},
    )
    return resp.status_code in (200, 201)


def main():
    state_name = target_state_name()
    state_id = get_state_id_by_name(state_name)
    if not state_id:
        print(f"FATAL: state '{state_name}' tidak ditemukan di project ini "
              f"(Project Settings > States). Buat dulu state itu.")
        sys.exit(1)

    messages = get_commit_messages()
    issue_numbers = find_issue_numbers(messages)

    if not issue_numbers:
        print(f"Tidak ada kode issue '{PLANE_PROJECT_IDENTIFIER}-<nomor>' ditemukan di commit message "
              f"push ini. Skip — tidak ada work item yang di-update.")
        return

    print(f"Push ke '{TARGET_BRANCH}' (deploy sukses) -> state '{state_name}'")
    print(f"Kode issue ditemukan: {[f'{PLANE_PROJECT_IDENTIFIER}-{n}' for n in issue_numbers]}")

    updated, not_found, failed = 0, 0, 0
    for seq in issue_numbers:
        code = f"{PLANE_PROJECT_IDENTIFIER}-{seq}"
        work_item_id = find_work_item_id_by_code(code)
        if not work_item_id:
            print(f"  {code}: work item tidak ditemukan di Plane, skip.")
            not_found += 1
            continue
        resp = requests.patch(
            f"{PLANE_BASE}/work-items/{work_item_id}/",
            headers=PLANE_HEADERS,
            json={"state": state_id},
        )
        if resp.status_code in (200, 201):
            link_ok = add_commit_link(work_item_id, code)
            link_note = "link commit ditambahkan" if link_ok else "link commit gagal ditambahkan (non-fatal)"
            print(f"  {code} ({work_item_id}) -> state updated to '{state_name}', {link_note}")
            updated += 1
        else:
            print(f"  {code} ({work_item_id}) -> FAILED {resp.status_code}: {resp.text}")
            failed += 1

    print(f"\nSelesai. Updated: {updated}, tidak ketemu: {not_found}, gagal: {failed}")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
