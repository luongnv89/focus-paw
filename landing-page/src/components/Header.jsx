import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navigationContent } from '../data/navigation';

function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Auto-hide header on scroll down (mobile only)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false);
          setIsMobileMenuOpen(false);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Handle smooth scroll for anchor links
  const handleNavClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-white/10 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <nav
          className="flex items-center justify-between h-full"
          aria-label="Main navigation"
        >
          {/* Masthead: serif wordmark + mono issue tag */}
          <Link
            to="/"
            className="flex items-baseline gap-3 text-white hover:text-white transition-colors"
            aria-label="FocusPaw home"
          >
            <span className="font-display text-2xl font-semibold tracking-tight">
              FocusPaw
            </span>
            <span className="hidden sm:inline font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
              Vol. 01 — Focus
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigationContent.links.map((link, i) => {
              const number = String(i + 1).padStart(2, '0');
              const linkClass =
                'font-mono text-xs uppercase tracking-[0.18em] text-white/65 hover:text-accent transition-colors';
              return link.external ? (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  <span className="text-accent mr-1.5">{number}</span>
                  {link.label}
                </a>
              ) : link.href.startsWith('#') ? (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={linkClass}
                >
                  <span className="text-accent mr-1.5">{number}</span>
                  {link.label}
                </a>
              ) : (
                <Link key={link.id} to={link.href} className={linkClass}>
                  <span className="text-accent mr-1.5">{number}</span>
                  {link.label}
                </Link>
              );
            })}

            {/* CTA Button — white pill, green never a background */}
            <a
              href={navigationContent.ctaButton.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm !px-5 !py-2.5"
              aria-label={navigationContent.ctaButton.ariaLabel}
            >
              {navigationContent.ctaButton.text}
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-white hover:text-accent transition-colors"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`md:hidden absolute top-full left-0 right-0 bg-black border-b border-white/10 transition-all duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="px-4 py-4 space-y-3">
          {navigationContent.links.map((link) =>
            link.external ? (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 text-white/70 hover:text-accent transition-colors"
                tabIndex={isMobileMenuOpen ? 0 : -1}
              >
                {link.label}
              </a>
            ) : link.href.startsWith('#') ? (
              <a
                key={link.id}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="block py-2 text-white/70 hover:text-accent transition-colors"
                tabIndex={isMobileMenuOpen ? 0 : -1}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.id}
                to={link.href}
                className="block py-2 text-white/70 hover:text-accent transition-colors"
                tabIndex={isMobileMenuOpen ? 0 : -1}
              >
                {link.label}
              </Link>
            )
          )}

          {/* Mobile CTA */}
          <a
            href={navigationContent.ctaButton.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary w-full text-center mt-4"
            aria-label={navigationContent.ctaButton.ariaLabel}
            tabIndex={isMobileMenuOpen ? 0 : -1}
          >
            {navigationContent.ctaButton.text}
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
