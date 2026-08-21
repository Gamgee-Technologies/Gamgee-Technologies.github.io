#!/usr/bin/env python3
"""Build a shareable, single-file copy of the Articles landing page."""

from __future__ import annotations

import base64
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
SOURCE = SITE / "articles" / "index.html"
OUTPUT = ROOT / "exports" / "Gamgee-Articles-Standalone.html"


def data_uri(path: Path, mime_type: str) -> str:
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def main() -> None:
    html = SOURCE.read_text(encoding="utf-8")
    shell_css = (SITE / "assets" / "shared-shell.css").read_text(encoding="utf-8")
    articles_css = (SITE / "assets" / "articles.css").read_text(encoding="utf-8")
    shell_js = (SITE / "assets" / "site-shell.js").read_text(encoding="utf-8")

    favicon = data_uri(SITE / "assets" / "favicon.svg", "image/svg+xml")
    us_flag = data_uri(SITE / "assets" / "icons" / "us-flag-3x2.png", "image/png")
    au_flag = data_uri(SITE / "assets" / "icons" / "au_flag.svg", "image/svg+xml")

    shell_js = shell_js.replace("/assets/icons/us-flag-3x2.png", us_flag)
    shell_js = shell_js.replace("/assets/icons/au_flag.svg", au_flag)

    html = html.replace(
        '<html lang="en">',
        '<html lang="en" data-active-path="/articles/">',
        1,
    )
    html = html.replace(
        '<meta charset="utf-8">',
        '<meta charset="utf-8"><base href="https://www.gamgee.io/">',
        1,
    )
    html = html.replace(
        '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
        f'<link rel="icon" href="{favicon}" type="image/svg+xml">',
        1,
    )
    html = html.replace(
        '<link rel="stylesheet" href="/assets/shared-shell.css"><link rel="stylesheet" href="/assets/articles.css">',
        f"<style>\n{shell_css}\n{articles_css}\n</style>",
        1,
    )
    html = html.replace(
        '<script src="/assets/site-shell.js" defer></script>',
        f"<script>\n{shell_js}\n</script>",
        1,
    )
    html = html.replace(
        "<title>Articles | Gamgee</title>",
        "<title>Articles | Gamgee — Shareable Copy</title>",
        1,
    )

    required_absences = (
        '/assets/shared-shell.css',
        '/assets/articles.css',
        '/assets/site-shell.js',
        '/assets/icons/us-flag-3x2.png',
        '/assets/icons/au_flag.svg',
    )
    leftovers = [value for value in required_absences if value in html]
    if leftovers:
        raise RuntimeError(f"Standalone export still references local assets: {leftovers}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding="utf-8")
    print(f"Built {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
