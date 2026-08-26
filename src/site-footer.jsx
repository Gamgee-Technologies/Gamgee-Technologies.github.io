import React from "react";
import { createRoot } from "react-dom/client";

const SOCIAL_LINKS = [
  {
    label: "X",
    href: "https://x.com/gamgeevetmed",
    icon: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    ),
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/gamgee-technologies",
    icon: (
      <path d="M6.94 8.5H3.56V19.35h3.38V8.5ZM5.25 3.1a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM19.82 13.13c0-3.27-1.75-4.79-4.08-4.79-1.88 0-2.72 1.03-3.19 1.76V8.5H9.17v10.85h3.38v-5.37c0-1.42.27-2.8 2.04-2.8 1.75 0 1.77 1.64 1.77 2.9v5.27h3.38l.08-6.22Z" />
    ),
  },
  {
    label: "Substack",
    href: "https://substack.com/@gamgeetechnologiesinc/notes",
    icon: (
      <path d="M4 4h16v2.2H4V4Zm0 4h16v2.2H4V8Zm0 4h16v8l-8-4.45L4 20v-8Z" />
    ),
  },
];

function Flag({ country, src, compact = false }) {
  return <img src={src} width={compact ? 18 : 42} height={compact ? 12 : 28} alt={country} />;
}

function SocialLink({ label, href, icon }) {
  return (
    <a
      className="site-footer-social-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={"Gamgee on " + label + " (opens in a new tab)"}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {icon}
      </svg>
    </a>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div>
          <div className="site-footer-brand">GAMGEE</div>
          <p className="site-footer-tagline">Personalised cancer treatment for pets. Built one patient at a time.</p>
        </div>
        <div className="site-footer-right">
          <div className="site-footer-product">
            <div className="site-footer-links">
              <h5>PRODUCT</h5>
              <a href="/vet/">For Vets</a>
              <a href="/apply/">Register interest</a>
            </div>
          </div>
          <div className="site-footer-flags">
            <Flag country="United States" src="/assets/icons/us-flag-3x2.png" />
            <Flag country="Australia" src="/assets/icons/au_flag.svg" />
          </div>
        </div>
      </div>
      <div className="site-footer-legal">
        <span>
          © 2026 GAMGEE · San Francisco, United States{" "}
          <span className="site-footer-flag-inline"><Flag country="United States" src="/assets/icons/us-flag-3x2.png" compact /></span>
          <span className="site-footer-flag-inline"><Flag country="Australia" src="/assets/icons/au_flag.svg" compact /></span>
        </span>
        <nav className="site-footer-socials" aria-label="Gamgee social media">
          {SOCIAL_LINKS.map(link => <SocialLink key={link.label} {...link} />)}
        </nav>
        <span className="site-footer-legal-links"><a href="/privacy&amp;terms/#privacy">Privacy</a> · <a href="/privacy&amp;terms/#terms">Terms</a></span>
      </div>
    </footer>
  );
}

document.querySelectorAll("[data-site-footer]").forEach(node => {
  createRoot(node).render(<SiteFooter />);
});
