import { useState, useCallback } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { ArrowUpRight } from 'lucide-react';
import { screenshotGalleryContent } from '../data/screenshots';

function Screenshots() {
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const openLightbox = useCallback((index) => {
    setPhotoIndex(index);
    setIsOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Prepare slides for lightbox
  const slides = screenshotGalleryContent.screenshots.map((screenshot) => ({
    src: screenshot.src,
    alt: screenshot.alt,
    title: screenshot.caption,
  }));

  return (
    <section id="screenshots" className="bg-black py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mb-10 sm:mb-14">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3">
              <span
                className="inline-block h-px w-8 bg-accent"
                aria-hidden="true"
              />
              02 — Plates
            </p>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl font-medium tracking-tight text-white">
              {screenshotGalleryContent.sectionTitle}
            </h2>
          </div>
          <p className="lg:col-span-5 text-lg leading-relaxed text-white/60 lg:text-right lg:pb-1">
            {screenshotGalleryContent.sectionDescription}
          </p>
        </div>

        {/* Plates grid — lead plate spans 2, the rest follow the rule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {screenshotGalleryContent.screenshots.map((screenshot, index) => {
            const plate = String(index + 1).padStart(2, '0');
            const isLead = index === 0;
            return (
              <figure
                key={screenshot.id}
                className={isLead ? 'sm:col-span-2 lg:col-span-2' : ''}
              >
                <button
                  onClick={() => openLightbox(index)}
                  className="group block w-full text-left overflow-hidden rounded-2xl border border-white/15 hover:border-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  aria-label={`View ${screenshot.caption} in full size`}
                >
                  <span className="block aspect-video relative overflow-hidden">
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white border border-accent px-4 py-2 rounded-full">
                        Enlarge plate
                        <ArrowUpRight
                          className="w-4 h-4 text-accent"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </span>
                </button>
                <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                  <span className="text-sm text-white/70">
                    {screenshot.caption}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                    Pl. {plate}
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>

        {/* Lightbox */}
        <Lightbox
          open={isOpen}
          close={closeLightbox}
          index={photoIndex}
          slides={slides}
          controller={{ aria: true }}
          carousel={{ finite: false }}
          render={{
            buttonPrev: slides.length <= 1 ? () => null : undefined,
            buttonNext: slides.length <= 1 ? () => null : undefined,
          }}
          styles={{
            container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
          }}
        />
      </div>
    </section>
  );
}

export default Screenshots;
