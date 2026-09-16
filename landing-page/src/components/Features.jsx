import {
  Shield,
  BarChart3,
  Timer,
  TrendingUp,
  Globe,
  Lock,
} from 'lucide-react';
import { featuresContent } from '../data/features';

// Map icon names to components
const iconMap = {
  Shield,
  BarChart3,
  Timer,
  TrendingUp,
  Globe,
  Lock,
};

function FeatureRow({ feature, index }) {
  const IconComponent = iconMap[feature.icon] || Shield;
  const number = String(index + 1).padStart(2, '0');

  return (
    <article className="group grid grid-cols-[auto_1fr] sm:grid-cols-[64px_48px_1fr] items-start gap-4 sm:gap-6 border-t border-white/10 py-8 transition-colors last:border-b hover:border-accent/60">
      <span
        className="font-mono text-sm text-white/60 group-hover:text-accent transition-colors pt-1"
        aria-hidden="true"
      >
        {number}
      </span>
      <span className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white group-hover:border-accent group-hover:text-accent transition-colors">
        <IconComponent className="w-5 h-5" aria-hidden="true" />
      </span>
      <div>
        <h3 className="font-display text-2xl font-medium tracking-tight text-white">
          {feature.title}
        </h3>
        <p className="mt-2 max-w-2xl leading-relaxed text-white/60">
          {feature.description}
        </p>
      </div>
    </article>
  );
}

function Features() {
  return (
    <section id="features" className="bg-black py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header — editorial kicker + serif title + right-aligned lede */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-10 sm:mb-14">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3">
              <span
                className="inline-block h-px w-8 bg-accent"
                aria-hidden="true"
              />
              01 — Index of features
            </p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-medium tracking-tight text-white">
              {featuresContent.sectionTitle}
            </h2>
          </div>
          <p className="lg:col-span-5 text-lg leading-relaxed text-white/60 lg:text-right lg:pb-1">
            {featuresContent.sectionDescription}
          </p>
        </div>

        <div>
          {featuresContent.features.map((feature, i) => (
            <FeatureRow key={feature.id} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
