#!/usr/bin/env python3
"""Build Gamgee's native article pages from public Substack HTML snapshots."""

from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

from lxml import etree, html as lxml_html


@dataclass
class Article:
    slug: str
    title: str
    description: str
    published: str
    display_date: str
    author: str
    image: str
    source_url: str
    body_html: str
    reading_minutes: int


ARTICLE_INPUTS = (
    ("our-origin-story-rosies-journey", "gamgee-origin.html"),
    ("the-science-is-arriving-before-the", "gamgee-science.html"),
    ("from-decoding-biology-to-designing", "gamgee-designing.html"),
)

ALLOWED_TAGS = {
    "p", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "a",
    "blockquote", "figure", "figcaption", "img", "br", "hr", "span",
}


def class_tokens(node: etree._Element) -> set[str]:
    return set((node.get("class") or "").split())


def load_article(slug: str, snapshot: Path) -> Article:
    document = lxml_html.fromstring(snapshot.read_bytes())
    schema = None
    for raw in document.xpath('//script[@type="application/ld+json"]/text()'):
        try:
            candidate = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if candidate.get("@type") in {"NewsArticle", "Article"}:
            schema = candidate
            break
    if not schema:
        raise RuntimeError(f"Article metadata not found in {snapshot}")
    image_data = schema.get("image") or []
    image = image_data[0].get("url", "") if image_data and isinstance(image_data[0], dict) else (image_data[0] if image_data else "")

    bodies = document.xpath('//div[contains(concat(" ", normalize-space(@class), " "), " body ") and contains(concat(" ", normalize-space(@class), " "), " markup ")]')
    if not bodies:
        raise RuntimeError(f"Article body not found in {snapshot}")
    body = bodies[0]

    # Substack-only controls do not belong in the native Gamgee reading experience.
    for node in body.xpath('.//*[self::script or self::style or self::form or self::button or contains(@class,"subscription-widget") or contains(@class,"image-link-expand")]'):
        parent = node.getparent()
        if parent is not None:
            parent.remove(node)

    for node in list(body.iterdescendants()):
        if not isinstance(node.tag, str):
            continue
        tag = node.tag.lower()
        if tag not in ALLOWED_TAGS:
            node.drop_tag()
            continue
        attrs = dict(node.attrib)
        node.attrib.clear()
        if tag == "a":
            href = attrs.get("href", "")
            if href.startswith(("https://", "http://", "/")):
                node.set("href", href)
                if href.startswith("http"):
                    node.set("target", "_blank")
                    node.set("rel", "noopener noreferrer")
        elif tag == "img":
            src = attrs.get("src", "")
            if src.startswith("https://"):
                node.set("src", src)
            node.set("alt", attrs.get("alt") or attrs.get("title") or "")
            node.set("loading", "lazy")
            node.set("decoding", "async")
            if attrs.get("width"):
                node.set("width", attrs["width"])
            if attrs.get("height"):
                node.set("height", attrs["height"])

    def source_key(url: str) -> str:
        decoded = unquote(url)
        return decoded.rsplit("/https://", 1)[-1].split("?", 1)[0]

    # Substack often repeats the social cover as the first inline figure. The
    # native page already renders it as the hero, so remove only an exact match.
    for figure in body.xpath(".//figure[.//img]"):
        first_image = figure.xpath(".//img/@src")
        if first_image and source_key(first_image[0]) == source_key(image):
            parent = figure.getparent()
            if parent is not None:
                parent.remove(figure)
            break

    body_html = "".join(
        etree.tostring(child, encoding="unicode", method="html") for child in body
    )
    body_text = " ".join(body.itertext())
    reading_minutes = max(1, round(len(body_text.split()) / 220))
    published = schema["datePublished"]
    date_obj = datetime.fromisoformat(published.replace("Z", "+00:00"))
    author_data = schema.get("author") or [{"name": "GAMGEE"}]
    author = author_data[0].get("name", "GAMGEE") if isinstance(author_data, list) else author_data.get("name", "GAMGEE")
    return Article(
        slug=slug,
        title=schema["headline"],
        description=schema.get("description", ""),
        published=published,
        display_date=date_obj.strftime("%B %d, %Y").replace(" 0", " "),
        author=author,
        image=image,
        source_url=schema["url"],
        body_html=body_html,
        reading_minutes=reading_minutes,
    )


def nav() -> str:
    return '<div data-site-header></div>'


def footer() -> str:
    return '<div data-site-footer></div>'


def shell_script() -> str:
    return '<script src="/assets/site-shell.js" defer></script>'


def html_head(title: str, description: str, canonical: str, image: str, schema: dict | None = None) -> str:
    safe_title = html.escape(title, quote=True)
    safe_description = html.escape(description, quote=True)
    safe_image = html.escape(image, quote=True)
    schema_markup = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>' if schema else ""
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{safe_title}</title><meta name="description" content="{safe_description}">
<link rel="canonical" href="{canonical}"><meta property="og:type" content="article"><meta property="og:title" content="{safe_title}"><meta property="og:description" content="{safe_description}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{safe_image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{safe_title}"><meta name="twitter:description" content="{safe_description}"><meta name="twitter:image" content="{safe_image}">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&amp;family=Inter:wght@400;500;600;700&amp;family=Poppins:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/shared-shell.css"><link rel="stylesheet" href="/assets/articles.css">{schema_markup}
</head>'''


def render_index(articles: list[Article]) -> str:
    cards = []
    for index, article in enumerate(articles):
        card_class = "article-card featured" if index == 0 else "article-card"
        cards.append(f'''<article class="{card_class}"><a class="card-image" href="/articles/{article.slug}/"><img src="{html.escape(article.image, quote=True)}" alt="" loading="{'eager' if index == 0 else 'lazy'}" decoding="async"></a><div class="card-copy"><p class="meta">{article.display_date} · {article.reading_minutes} min read</p><h2><a href="/articles/{article.slug}/">{html.escape(article.title)}</a></h2><p>{html.escape(article.description)}</p><a class="read-link" href="/articles/{article.slug}/">Read article <span aria-hidden="true">→</span></a></div></article>''')
    description = "Ideas, science, and stories from Gamgee about personalised cancer treatment for dogs."
    head = html_head("Articles | Gamgee", description, "https://www.gamgee.io/articles/", articles[0].image)
    return f'''{head}<body>{nav()}<main><header class="articles-hero"><p class="eyebrow">From Gamgee</p><h1>Ideas, science, and the stories behind the work.</h1><p>{description}</p></header><section class="article-grid" aria-label="Latest articles">{''.join(cards)}</section><aside class="media-note"><p><strong>Looking for coverage about Gamgee?</strong> Interviews, reporting, and external publications live on our Media page.</p><a href="/media/">Visit Media <span aria-hidden="true">→</span></a></aside></main>{footer()}{shell_script()}</body></html>'''


def render_article(article: Article, related: list[Article]) -> str:
    canonical = f"https://www.gamgee.io/articles/{article.slug}/"
    schema = {
        "@context": "https://schema.org", "@type": "Article", "headline": article.title,
        "description": article.description, "image": [article.image], "datePublished": article.published,
        "author": {"@type": "Organization", "name": "GAMGEE", "url": "https://www.gamgee.io/"},
        "publisher": {"@type": "Organization", "name": "GAMGEE", "url": "https://www.gamgee.io/"},
        "mainEntityOfPage": canonical,
    }
    related_links = "".join(f'<li><a href="/articles/{item.slug}/">{html.escape(item.title)}</a></li>' for item in related)
    head = html_head(f"{article.title} | Gamgee", article.description, canonical, article.image, schema)
    return f'''{head}<body>{nav()}<main class="article-page"><a class="back-link" href="/articles/">← All articles</a><article><header class="article-header"><p class="eyebrow">Gamgee article</p><h1>{html.escape(article.title)}</h1><p class="dek">{html.escape(article.description)}</p><div class="byline"><span>By {html.escape(article.author)}</span><span>{article.display_date}</span><span>{article.reading_minutes} min read</span></div></header><figure class="hero-image"><img src="{html.escape(article.image, quote=True)}" alt="" decoding="async"></figure><div class="article-body">{article.body_html}</div><div class="article-source"><p>Originally published by GAMGEE on Substack.</p><a href="{html.escape(article.source_url, quote=True)}" target="_blank" rel="noopener noreferrer">View the original publication <span aria-hidden="true">↗</span></a></div></article><aside class="related"><p class="eyebrow">Continue reading</p><ul>{related_links}</ul></aside></main>{footer()}{shell_script()}</body></html>'''


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshots", type=Path, required=True)
    parser.add_argument("--site", type=Path, required=True)
    args = parser.parse_args()
    articles = [load_article(slug, args.snapshots / filename) for slug, filename in ARTICLE_INPUTS]
    articles.sort(key=lambda item: item.published, reverse=True)
    root = args.site / "articles"
    root.mkdir(parents=True, exist_ok=True)
    (root / "index.html").write_text(render_index(articles), encoding="utf-8")
    for article in articles:
        target = root / article.slug
        target.mkdir(parents=True, exist_ok=True)
        related = [item for item in articles if item.slug != article.slug]
        (target / "index.html").write_text(render_article(article, related), encoding="utf-8")
    print(json.dumps([{"slug": a.slug, "title": a.title, "date": a.display_date, "minutes": a.reading_minutes, "source": a.source_url} for a in articles], indent=2))


if __name__ == "__main__":
    main()
