#!/usr/bin/env python3
"""
SATYA repository inventory collector.
Read-only: it does not modify the repository.

Usage:
  python satya_repo_audit.py /path/to/satya --output /tmp/satya-audit
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Iterable

SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".next", ".cache", "vendor"}
TEXT_EXT = {".js", ".jsx", ".ts", ".tsx", ".json", ".md", ".sql", ".yml", ".yaml", ".env.example"}

CANDIDATES = [
    "internalMonitoringRoutes.js",
    "internalMonitoringRepo.js",
    "internalMonitoringService.js",
    "internalMonitoringController.js",
    "internalMonitoringGeneratorService.js",
    "internalMonitoringDashboardService.js",
    "reportService.js",
    "tenantContext.js",
    "202607170001_internal_monitoring_foundation.js",
]

PATTERNS = {
    "internal_monitoring": r"internal.?monitoring|PT_INTERNAL|monitoring_targets",
    "roles": r"ADMIN_PT|PIMPINAN_PT|UNIT_PIC|VERIFIER|ADMIN_PN|SATKER_PN",
    "periods": r"period_type|periode_bulan|quarterly|semesterly|annually",
    "submissions": r"report_submissions|report_revision_logs",
    "notifications": r"in_app_notifications|notification_logs|BullMQ|Nodemailer",
    "route_registration": r"internalMonitoringRoutes|/internal-monitoring",
    "todo_fixme": r"\b(TODO|FIXME|HACK|XXX)\b",
}

def run(cmd: list[str], cwd: Path) -> dict:
    try:
        p = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True, timeout=120)
        return {"command": cmd, "returncode": p.returncode, "stdout": p.stdout[-20000:], "stderr": p.stderr[-10000:]}
    except Exception as exc:
        return {"command": cmd, "returncode": -1, "stdout": "", "stderr": repr(exc)}

def iter_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        try:
            if not p.is_file():
                continue
        except OSError:
            continue
        yield p

def scan_text(path: Path, regex: re.Pattern[str]) -> list[dict]:
    out = []
    try:
        for no, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
            if regex.search(line):
                out.append({"file": str(path), "line": no, "text": line[:500]})
                if len(out) >= 500:
                    break
    except Exception:
        pass
    return out

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("repo")
    ap.add_argument("--output", default="satya-audit-output")
    ap.add_argument("--run-tests", action="store_true")
    args = ap.parse_args()

    root = Path(args.repo).resolve()
    outdir = Path(args.output).resolve()
    outdir.mkdir(parents=True, exist_ok=True)

    if not (root / ".git").exists():
        raise SystemExit(f"{root} bukan working tree Git.")

    files = list(iter_files(root))
    rel_files = [str(p.relative_to(root)) for p in files]
    by_name = {}
    for candidate in CANDIDATES:
        by_name[candidate] = [r for r in rel_files if Path(r).name == candidate]

    scans = {}
    for key, pat in PATTERNS.items():
        rx = re.compile(pat, re.I)
        matches = []
        for p in files:
            if p.suffix.lower() in TEXT_EXT or p.name in {"Dockerfile", "Makefile"}:
                for item in scan_text(p, rx):
                    item["file"] = str(Path(item["file"]).relative_to(root))
                    matches.append(item)
                    if len(matches) >= 1000:
                        break
            if len(matches) >= 1000:
                break
        scans[key] = matches

    manifests = {}
    for name in ["package.json", "docker-compose.yml", "docker-compose.yaml", "knexfile.js", "README.md"]:
        manifests[name] = [r for r in rel_files if Path(r).name == name]

    report = {
        "repo": str(root),
        "git": {
            "status": run(["git", "status", "--short", "--branch"], root),
            "head": run(["git", "rev-parse", "HEAD"], root),
            "branch": run(["git", "branch", "--show-current"], root),
            "remote": run(["git", "remote", "-v"], root),
            "last_commits": run(["git", "log", "-20", "--date=iso", "--pretty=format:%H|%ad|%an|%s"], root),
        },
        "counts": {
            "files": len(rel_files),
            "migrations": len([r for r in rel_files if "migration" in r.lower()]),
            "tests": len([r for r in rel_files if re.search(r"(^|/)(__tests__|test|tests)(/|$)|\.(test|spec)\.", r, re.I)]),
        },
        "candidate_files": by_name,
        "manifests": manifests,
        "scans": scans,
        "commands": {}
    }

    if args.run_tests:
        package_dirs = sorted({str(Path(r).parent) for r in manifests["package.json"]})
        for d in package_dirs:
            cwd = root / d
            key = d or "."
            report["commands"][key] = {
                "npm_test": run(["npm", "test", "--", "--runInBand"], cwd),
                "npm_build": run(["npm", "run", "build"], cwd),
            }

    (outdir / "audit.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    (outdir / "tree.txt").write_text("\n".join(rel_files), encoding="utf-8")

    md = [
        "# SATYA Repository Audit Inventory",
        "",
        f"- Repo: `{root}`",
        f"- Files: {len(rel_files)}",
        f"- Migration-like files: {report['counts']['migrations']}",
        f"- Test-like files: {report['counts']['tests']}",
        "",
        "## Candidate files",
    ]
    for name, found in by_name.items():
        md.append(f"- `{name}`: " + (", ".join(f"`{x}`" for x in found) if found else "**not found**"))
    md += ["", "## Pattern match counts"]
    for key, matches in scans.items():
        md.append(f"- `{key}`: {len(matches)}")
    md += ["", "Detail lengkap tersedia pada `audit.json` dan `tree.txt`."]
    (outdir / "audit.md").write_text("\n".join(md), encoding="utf-8")
    print(outdir)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
