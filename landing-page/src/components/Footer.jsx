import { Link } from 'react-router-dom';
import { Code, Heart } from 'lucide-react';
import { footerContent } from '../data/footer';

function Footer() {
  return (
    <footer className="bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Wordmark row */}
        <div className="flex flex-col gap-8">
          <Link
            to="/"
            className="font-display text-4xl sm:text-5xl font-medium tracking-tight text-white hover:text-white transition-colors"
            aria-label="FocusPaw home"
          >
            FocusPaw<span className="text-accent">.</span>
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <p className="max-w-md leading-relaxed text-white/60">
              {footerContent.tagline}
            </p>

            {/* Links */}
            <nav
              className="flex flex-wrap gap-x-8 gap-y-3"
              aria-label="Footer navigation"
            >
              {footerContent.links.map((link) =>
                link.external ? (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-white/60 hover:text-accent transition-colors"
                    aria-label={link.ariaLabel}
                  >
                    {link.id === 'github' && (
                      <Code className="w-4 h-4" aria-hidden="true" />
                    )}
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.id}
                    to={link.href}
                    className="font-mono text-xs uppercase tracking-[0.18em] text-white/60 hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-10 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
              {footerContent.copyright}
            </p>
            <p className="text-sm text-white/60 flex items-center gap-1.5">
              Made with{' '}
              <Heart
                className="w-4 h-4 text-danger inline"
                aria-hidden="true"
              />{' '}
              for focus seekers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
