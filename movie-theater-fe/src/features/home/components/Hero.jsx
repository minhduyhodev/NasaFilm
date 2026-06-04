import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import hero1 from '../../../shared/assets/hero1.jpg';
import hero2 from '../../../shared/assets/hero2.jpg';
import hero3 from '../../../shared/assets/hero3.jpg';

const Hero = () => {
  const slides = useMemo(
    () => [
      { image: hero1 },
      { image: hero2 },
      { image: hero3 },
    ],
    []
  );

  const [activeSlide, setActiveSlide] = useState(0);

  const currentSlide = slides[activeSlide];

  const goToPrevious = () => {
    setActiveSlide((current) => (current === 0 ? slides.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveSlide((current) => (current === slides.length - 1 ? 0 : current + 1));
  };

  return (
    <section className="relative overflow-hidden pt-20">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-neutral-950 to-transparent z-10" />

      <div className="absolute inset-0 bg-[#0f172a]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 h-full">
        <div className="pt-6 md:pt-8">
          <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.6)] bg-neutral-900/60 backdrop-blur-md">
            <div className="relative bg-black">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.image}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  className="relative flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={currentSlide.image}
                    alt="Hero slide"
                    className="w-full h-auto object-contain object-center block"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/20 to-black/5" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                aria-label="Previous slide"
                onClick={goToPrevious}
                className="absolute left-3 md:left-6 top-1/2 z-20 -translate-y-1/2 h-11 w-11 md:h-14 md:w-14 rounded-full border border-white/15 bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/65 hover:scale-105 transition-all"
              >
                <ChevronLeft size={28} className="md:size-8" />
              </button>

              <button
                type="button"
                aria-label="Next slide"
                onClick={goToNext}
                className="absolute right-3 md:right-6 top-1/2 z-20 -translate-y-1/2 h-11 w-11 md:h-14 md:w-14 rounded-full border border-white/15 bg-black/45 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black/65 hover:scale-105 transition-all"
              >
                <ChevronRight size={28} className="md:size-8" />
              </button>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
