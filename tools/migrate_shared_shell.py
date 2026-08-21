#!/usr/bin/env python3
"""Replace duplicated marketing-page chrome with the shared React shell mounts."""

from __future__ import annotations

import re
from pathlib import Path


TARGETS = (
    "index.html",
    "mission/index.html",
    "story/index.html",
    "media/index.html",
    "vet/index.html",
    "trial/index.html",
    "privacy&terms/index.html",
)

HEADER = '<div data-site-header></div>'
FOOTER = '<div data-site-footer></div>'
SCRIPT = '<script src="/assets/site-shell.js" defer></script>'


def migrate(path: Path) -> bool:
    original = path.read_text(encoding="utf-8")
    text = original

    if HEADER not in text:
        text, count = re.subn(r"<nav(?:\s[^>]*)?>.*?</nav>", HEADER, text, count=1, flags=re.S | re.I)
        if count == 0:
            text = re.sub(r"(<body(?:\s[^>]*)?>)", rf"\1\n{HEADER}", text, count=1, flags=re.I)

    if FOOTER not in text:
        text, count = re.subn(r"<footer(?:\s[^>]*)?>.*?</footer>", FOOTER, text, count=1, flags=re.S | re.I)
        if count == 0:
            text = re.sub(r"</body>", f"{FOOTER}\n</body>", text, count=1, flags=re.I)

    if SCRIPT not in text:
        text = re.sub(r"</body>", f"{SCRIPT}\n</body>", text, count=1, flags=re.I)

    if text == original:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def main() -> None:
    site = Path(__file__).resolve().parents[1] / "site"
    changed = [relative for relative in TARGETS if migrate(site / relative)]
    print("Migrated shared React shell:")
    for relative in changed:
        print(f"- {relative}")


if __name__ == "__main__":
    main()
