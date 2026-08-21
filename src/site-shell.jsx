import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const NAV_ITEMS = [
  ["/mission/", "Our mission"],
  ["/story/", "Our story"],
  ["/articles/", "Articles"],
  ["/media/", "In the media"],
  ["/vet/", "For vets"],
  ["/trial/", "Trial"],
];

function isCurrent(pathname, href) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = document.documentElement.dataset.activePath || window.location.pathname;

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  const item = ([href, label], mobile = false) => {
    const current = isCurrent(pathname, href);
    return (
      <a
        key={`${mobile ? "mobile" : "desktop"}-${href}`}
        href={href}
        aria-current={current ? "page" : undefined}
        className={current ? "active" : undefined}
        onClick={mobile ? () => setOpen(false) : undefined}
      >
        {label}
      </a>
    );
  };

  return (
    <nav className="site-shell-nav" aria-label="Primary navigation">
      <div className="site-shell-nav-inner">
        <a className="site-shell-logo" href="/" aria-label="Gamgee home">GAMGEE</a>
        <div className="site-shell-links">
          {NAV_ITEMS.map(entry => item(entry))}
          <a className="site-shell-apply" href="/apply/">Apply</a>
        </div>
        <button
          className={`site-shell-toggle${open ? " open" : ""}`}
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="site-shell-mobile-menu"
          onClick={() => setOpen(value => !value)}
        >
          <span></span><span></span><span></span>
        </button>
      </div>
      <div className={`site-shell-mobile-menu${open ? " open" : ""}`} id="site-shell-mobile-menu">
        {NAV_ITEMS.map(entry => item(entry, true))}
        <a className="site-shell-apply" href="/apply/" onClick={() => setOpen(false)}>Apply now</a>
      </div>
    </nav>
  );
}

function Flag({ country, src, compact = false }) {
  return <img src={src} width={compact ? 18 : 42} height={compact ? 12 : 28} alt={country} />;
}

function SiteFooter() {
  return (
    <footer className="site-shell-footer">
      <div className="site-shell-footer-main">
        <div>
          <div className="site-shell-footer-brand">GAMGEE</div>
          <p className="site-shell-footer-tagline">Personalised cancer treatment for pets. Built one patient at a time.</p>
        </div>
        <div className="site-shell-footer-right">
          <div className="site-shell-footer-links">
            <h5>PRODUCT</h5>
            <a href="/vet/">For Vets</a>
            <a href="/apply/">Apply</a>
          </div>
          <div className="site-shell-footer-flags">
            <Flag country="United States" src="/assets/icons/us-flag-3x2.png" />
            <Flag country="Australia" src="/assets/icons/au_flag.svg" />
          </div>
        </div>
      </div>
      <div className="site-shell-footer-legal">
        <span>
          © 2026 GAMGEE · San Francisco, United States{" "}
          <span className="site-shell-footer-flag-inline"><Flag country="United States" src="/assets/icons/us-flag-3x2.png" compact /></span>
          <span className="site-shell-footer-flag-inline"><Flag country="Australia" src="/assets/icons/au_flag.svg" compact /></span>
        </span>
        <span><a href="/privacy&amp;terms/#privacy">Privacy</a> · <a href="/privacy&amp;terms/#terms">Terms</a></span>
      </div>
    </footer>
  );
}

document.querySelectorAll("[data-site-header]").forEach(node => createRoot(node).render(<SiteHeader />));
document.querySelectorAll("[data-site-footer]").forEach(node => createRoot(node).render(<SiteFooter />));
