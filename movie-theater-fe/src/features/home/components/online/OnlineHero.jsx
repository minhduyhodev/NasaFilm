import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import { getOnlineMoviePath } from '../../utils/movieUtils';

const OnlineHero = ({ featuredMovie = null, isLoading = false, getOnlinePath, actionLabel = 'Xem ngay' }) => {
  const title = featuredMovie?.title || 'Vũ Trụ Phim Trực Tuyến';
  const description = featuredMovie?.description
    ? featuredMovie.description.slice(0, 180) + (featuredMovie.description.length > 180 ? '...' : '')
    : 'Thưởng thức kho phim đa dạng mọi lúc mọi nơi với chất lượng cao và trải nghiệm xem phim đỉnh cao trên NASAFilm.';
  const movieLink = featuredMovie?.uuid
    ? (getOnlinePath ? getOnlinePath(featuredMovie.uuid) : getOnlineMoviePath(featuredMovie.uuid))
    : '/online';
  const heroImage = featuredMovie?.primaryMediaUrl || featuredMovie?.poster || '';

  return (
    <section className="relative min-h-[88vh] md:min-h-screen w-full flex items-end pt-20 pb-10 md:pb-14 overflow-hidden bg-black">
      <div className="absolute inset-0 z-0 select-none pointer-events-none bg-[#0a0a0a]">
        {heroImage ? (
          <img
            src={heroImage}
            alt={title}
            className="w-full h-full object-cover transition-opacity duration-500 opacity-100"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br from-neutral-950 via-[#121212] to-neutral-900 ${
              isLoading ? 'animate-pulse' : ''
            }`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-950/55 to-neutral-950/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/80 via-neutral-950/25 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 lg:px-20 w-full">
        <div className="max-w-2xl text-left space-y-4 md:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/20 bg-red-600/10 text-red-400 text-xs font-extrabold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            Xem trực tuyến
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.05]"
          >
            {featuredMovie ? (
              title
            ) : (
              <>
                Vũ Trụ Phim <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
                  Trực Tuyến
                </span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base md:text-lg text-white/70 font-medium tracking-wide max-w-xl"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-3 pt-1"
          >
            <Link to={movieLink} className="btn-gold">
              <Play className="h-3.5 w-3.5 fill-current" />
              {actionLabel}
            </Link>
            <Link to={movieLink} className="btn-gold-outline">
              <Plus className="h-3.5 w-3.5" />
              Thêm vào danh sách
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default OnlineHero;
