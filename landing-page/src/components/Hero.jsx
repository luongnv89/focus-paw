import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { heroContent } from '../data/hero';

function Hero() {
  return (
    <section className="grain relative overflow-hidden bg-black">
      {/* Hairline frame: vertical rules + top index row */}
      <div
        className="pointer-events-none absolute inset-0 mx-auto hidden max-w-7xl grid-cols-12 px-4 sm:px-6 lg:grid lg:px-8"
        aria-hidden="true"
      >
        {Array.from({ length: 13 }).map((_, i) => (
          <div
            key={i}
            className={`border-l border-white/5 ${i === 12 ? 'border-r' : ''}`}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 lg:pt-28 pb-12 sm:pb-16">
        {/* Index row */}
        <div className="reveal reveal-1 flex items-center justify-between border-b border-white/10 pb-4">
          <p className="eyebrow flex items-center gap-3">
            <span
              className="inline-block h-px w-8 bg-accent"
              aria-hidden="true"
            />
            A field guide to attention
          </p>
          <p className="hidden sm:block font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
            N°01 — Privacy-first
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 mt-10 sm:mt-14">
          {/* Headline block — spans 8, deliberately off-center */}
          <div className="lg:col-span-8">
            <h1 className="reveal reveal-2 font-display font-medium tracking-[-0.02em] leading-[0.95] text-5xl sm:text-7xl lg:text-[5.5rem]">
              <span className="block text-white">Track your focus,</span>
              <span className="block text-white">
                master{' '}
                <em className="italic font-light text-accent">your time.</em>
              </span>
            </h1>

            <p className="reveal reveal-3 mt-7 max-w-xl text-lg sm:text-xl leading-relaxed text-white/65">
              {heroContent.tagline}
            </p>

            {/* CTA row: primary action + plain-language secondary */}
            <div className="reveal reveal-4 mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
              <a
                href={heroContent.ctaButton.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-base px-8 py-4"
                aria-label={heroContent.ctaButton.ariaLabel}
              >
                {heroContent.ctaButton.text}
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </a>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 px-2 py-3 font-mono text-xs uppercase tracking-[0.18em] text-white/65 hover:text-accent transition-colors"
              >
                How it works
                <ArrowUpRight
                  className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </a>
            </div>

            {/* Trust row — scannable mono badges */}
            <dl className="reveal reveal-5 mt-9 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-5">
              {[
                ['100%', 'Free forever'],
                ['0', 'Accounts needed'],
                ['100%', 'Local-only data'],
              ].map(([stat, label]) => (
                <div key={label} className="flex items-baseline gap-2">
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-xl text-white">{stat}</dd>
                  <dd className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Margin note — the asymmetric editorial device */}
          <aside className="reveal reveal-3 lg:col-span-4 lg:pl-8 lg:border-l lg:border-white/10">
            <p className="eyebrow">Marginalia</p>
            <blockquote className="mt-4 border-l-2 border-accent pl-4">
              <p className="font-display italic text-xl leading-snug text-white">
                “You can’t change what you can’t see.”
              </p>
              <footer className="mt-3 text-sm text-white/60">
                FocusPaw draws one honest picture of your browsing day — counts,
                streaks, and gentle limits. Nothing leaves your device.
              </footer>
            </blockquote>
            <ul className="mt-6 space-y-2.5 text-sm text-white/60">
              {[
                'Installs in seconds',
                'No sign-up, no sync',
                'Open source',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full border border-accent"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Figure — captioned plate, not a floating card */}
        <figure className="reveal reveal-5 mt-14 sm:mt-20">
          <div className="overflow-hidden rounded-2xl border border-white/15 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
            <img
              src={heroContent.heroImage.src}
              alt={heroContent.heroImage.alt}
              width={heroContent.heroImage.width}
              height={heroContent.heroImage.height}
              className="w-full h-auto"
              loading="eager"
              decoding="async"
            />
          </div>
          <figcaption className="mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-white/10 pb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
              Fig. 01 — The dashboard
            </span>
            <span className="text-sm text-white/60">
              Your week of attention, drawn as one calm graph.
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export default Hero;
