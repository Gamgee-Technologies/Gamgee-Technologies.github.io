#!/usr/bin/env python3
"""Check internal links and article metadata in the generated static site."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

from lxml import html


def target_exists(site: Path, href: str) -> bool:
    parsed = urlsplit(href)
    route = unquote(parsed.path)
    if not route or route == "/":
        return (site / "index.html").exists()
    target = site / route.lstrip("/")
    if route.endswith("/"):
        target /= "index.html"
    return target.is_file()


def main() -> None:
    site = Path(__file__).resolve().parents[1] / "site"
    errors: list[str] = []
    checked_links = 0
    article_pages = 0

    for page in site.rglob("*.html"):
        if "assets" in page.parts or "original" in page.parts:
            continue
        document = html.fromstring(page.read_bytes())
        for href in document.xpath("//a/@href"):
            if href.startswith(("http://", "https://", "mailto:", "tel:", "#", "javascript:")):
                continue
            checked_links += 1
            if href.startswith("/") and not target_exists(site, href):
                errors.append(f"{page.relative_to(site)} -> missing {href}")

        if "articles" in page.parts and page.name == "index.html" and page.parent.name != "articles":
            article_pages += 1
            canonical = document.xpath('string(//link[@rel="canonical"]/@href)')
            schemas = document.xpath('//script[@type="application/ld+json"]/text()')
            if not canonical:
                errors.append(f"{page.relative_to(site)} -> missing canonical URL")
            if not schemas:
                errors.append(f"{page.relative_to(site)} -> missing Article schema")
            else:
                try:
                    json.loads(schemas[0])
                except json.JSONDecodeError as exc:
                    errors.append(f"{page.relative_to(site)} -> invalid JSON-LD: {exc}")

    if errors:
        print("Static-site checks failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print(f"Static-site checks passed: {checked_links} internal links; {article_pages} article pages with canonical metadata and JSON-LD.")


if __name__ == "__main__":
    main()
