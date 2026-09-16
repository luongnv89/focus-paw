import Hero from '../components/Hero';
import Features from '../components/Features';
import Screenshots from '../components/Screenshots';
import { ArrowRight, Lock } from 'lucide-react';
import { heroContent } from '../data/hero';

const steps = [
  {
    n: '01',
    title: 'Pin it',
    body: 'Add FocusPaw from the Chrome Web Store. No account, no setup wizard — it starts counting visits quietly.',
  },
  {
    n: '02',
    title: 'See it',
    body: 'Open the dashboard to read your week as one calm graph. Per-domain counts, focus scores, streaks.',
  },
  {
    n: '03',
    title: 'Steer it',
    body: 'Set daily limits for the sites that pull you away. A gentle block page appears when you cross the line.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-black py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-10 sm:mb-14">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3">
              <span
                className="inline-block h-px w-8 bg-accent"
                aria-hidden="true"
              />
              03 — Method
            </p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-medium tracking-tight text-white">
              Three moves to a calmer browser
            </h2>
          </div>
          <p className="lg:col-span-5 text-lg leading-relaxed text-white/60 lg:text-right lg:pb-1">
            No streak hacks. Just a short loop: capture, review, adjust.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 border-t border-b border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {steps.map((step) => (
            <li
              key={step.n}
              className="px-2 py-8 md:px-8 md:first:pl-0 md:last:pr-0"
            >
              <p
                className="font-display italic text-lg text-accent"
                aria-hidden="true"
              >
                {step.n}
              </p>
              <h3 className="mt-2 font-display text-2xl font-medium text-white">
                {step.title}
              </h3>
              <p className="mt-2 leading-relaxed text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LocalPromise() {
  return (
    <section aria-label="Privacy promise" className="bg-black pb-16 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/15 px-6 py-10 sm:px-12 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)]">
          <div className="lg:col-span-8">
            <p className="eyebrow flex items-center gap-3">
              <Lock className="w-4 h-4 text-accent" aria-hidden="true" />
              04 — The local-only promise
            </p>
            <h2 className="mt-4 font-display text-3xl sm:text-4xl font-medium tracking-tight text-white">
              Your visits never leave this device.
            </h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-white/60">
              Counts live in local extension storage. No cloud sync, no
              analytics beacons. Map pins appear only after an optional lookup
              you switch on yourself.
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right">
            <a
              href="/privacy"
              className="btn-secondary text-sm"
              aria-label="Read the FocusPaw privacy policy"
            >
              Read the privacy note
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <>
      <Hero />
      <Features />
      <Screenshots />
      <HowItWorks />
      <LocalPromise />

      {/* Final CTA — colophon style */}
      <section className="bg-black pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/10 pt-12 sm:pt-16 text-center">
            <p className="eyebrow justify-center flex items-center gap-3">
              <span
                className="inline-block h-px w-8 bg-accent"
                aria-hidden="true"
              />
              Colophon
              <span
                className="inline-block h-px w-8 bg-accent"
                aria-hidden="true"
              />
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl sm:text-6xl font-medium tracking-tight text-white">
              Ready to take control of{' '}
              <em className="italic font-light text-accent">your focus?</em>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/60">
              Join the readers who improved their days with FocusPaw. Free,
              private, installed in seconds.
            </p>
            <a
              href={heroContent.ctaButton.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-lg px-8 py-4 mt-9"
              aria-label={heroContent.ctaButton.ariaLabel}
            >
              Get FocusPaw Now
              <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
            </a>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
              Free · No account · Open source
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export default Landing;
