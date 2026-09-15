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

function FeatureCard({ feature }) {
  const IconComponent = iconMap[feature.icon] || Shield;

  return (
    <div className="card group hover:border-accent/30 transition-all duration-300">
      {/* Icon */}
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
        <IconComponent className="w-6 h-6 text-accent" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>

      {/* Description */}
      <p className="text-gray-400 text-sm leading-relaxed">
        {feature.description}
      </p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 bg-dark-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {featuresContent.sectionTitle}
          </h2>
          <p className="text-gray-400 text-lg">
            {featuresContent.sectionDescription}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresContent.features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
