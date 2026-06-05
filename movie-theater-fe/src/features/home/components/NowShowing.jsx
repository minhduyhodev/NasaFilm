import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import MovieCard from './MovieCard';
import doraemonPoster from '../../../shared/assets/Doraemon_Movie_2026_Poster.png';
import ngoiDenPoster from '../../../shared/assets/ngoidenkyquai.webp';
import ocMuonHonPoster from '../../../shared/assets/ocmuonhon.jpg';
import maXoPoster from '../../../shared/assets/maxo.jpg';
import kumanthongPoster from '../../../shared/assets/kumanthong.jpg';
import gohanPoster from '../../../shared/assets/tam-biet-gohan.webp';
import baTronPoster from '../../../shared/assets/batron.webp';
import khachPoster from '../../../shared/assets/khach.webp';

const movies = [
  {
    title: 'Doraemon: Nobita và lâu đài dưới đáy biển',
    rating: 4.8,
    poster: doraemonPoster,
    hoverDetails: {
      fullTitle: 'PHIM ĐIỆN ẢNH DORAEMON: NOBITA VÀ LÂU ĐÀI DƯỚI ĐÁY BIỂN (PHIÊN BẢN MỚI) LT (P)',
      genre: 'Hoạt hình, Phiêu Lưu',
      duration: "101'",
      country: 'Nhật Bản',
      language: 'Lồng Tiếng'
    }
  },
  {
    title: 'NGÔI ĐỀN KỲ QUÁI 5 (T16)',
    rating: 4.7,
    poster: ngoiDenPoster,
    hoverDetails: {
      fullTitle: 'NGÔI ĐỀN KỲ QUÁI 5 (T16)',
      genre: 'Hài, Kinh Dị',
      duration: "118'",
      country: 'Thái Lan',
      language: 'Phụ Đề'
    }
  },
  {
    title: 'ỐC MƯỢN HỒN (T16)',
    rating: 4.6,
    poster: ocMuonHonPoster,
    hoverDetails: {
      fullTitle: 'ỐC MƯỢN HỒN (T16)',
      genre: 'Tâm Lý',
      duration: "109'",
      country: 'Việt Nam',
      language: 'VN'
    }
  },
  {
    title: 'MA XÓ (T18)',
    rating: 4.9,
    poster: maXoPoster,
    hoverDetails: {
      fullTitle: 'MA XÓ (T18)',
      genre: 'Kinh Dị',
      duration: "102'",
      country: 'Khác',
      language: 'VN'
    }
  },
  {
    title: 'KUMANTHONG: ÁC QUỶ DẪN ĐƯỜNG (T18)',
    rating: 4.5,
    poster: kumanthongPoster,
    hoverDetails: {
      fullTitle: 'KUMANTHONG: ÁC QUỶ DẪN ĐƯỜNG (T18)',
      genre: 'Kinh Dị',
      duration: "94'",
      country: 'Thái Lan',
      language: 'Lồng Tiếng'
    }
  },
  {
    title: 'TẠM BIỆT GOHAN (K)',
    rating: 4.8,
    poster: gohanPoster,
    hoverDetails: {
      fullTitle: 'TẠM BIỆT GOHAN (K)',
      genre: 'Tình Cảm, Chữa Lành',
      duration: "110'",
      country: 'Thái Lan',
      language: 'Phụ Đề'
    }
  },
  {
    title: 'BA TRỢN (T18)',
    rating: 4.6,
    poster: baTronPoster,
    hoverDetails: {
      fullTitle: 'BA TRỢN (T18)',
      genre: 'Hoạt Hình, Gia Đình',
      duration: "90'",
      country: 'Việt Nam',
      language: 'Lồng Tiếng'
    }
  },
  {
    title: 'KHÁCH (T16)',
    rating: 4.3,
    poster: khachPoster,
    hoverDetails: {
      fullTitle: 'KHÁCH (T16)',
      genre: 'Kinh Dị',
      duration: "95'",
      country: 'Mỹ',
      language: 'Phụ Đề'
    }
  }
];

const NowShowing = () => {
  const scrollerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  const getScrollAmount = () => {
    const el = scrollerRef.current;
    if (!el) return 240;
    const card = el.firstElementChild;
    const cardWidth = card ? card.clientWidth : 240;
    const gap = 24; // gap-6 is 24px
    return cardWidth + gap;
  };

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    
    const scrollAmount = getScrollAmount();
    const gap = 24; // gap-6 is 24px
    // Correct the visible cards calculation by adding the gap back
    const visibleCards = Math.max(1, Math.floor((el.clientWidth + gap) / scrollAmount));
    
    if (visibleCards >= 4) {
      // On desktop, scroll page-by-page (4 cards) using absolute scrollTo for perfect alignment
      const currentPageIndex = Math.round(el.scrollLeft / (scrollAmount * 4));
      const targetPageIndex = direction === 'right' ? currentPageIndex + 1 : currentPageIndex - 1;
      const nextPageIndex = Math.max(0, Math.min(targetPageIndex, totalPages - 1));
      
      el.scrollTo({
        left: nextPageIndex * scrollAmount * 4,
        behavior: 'smooth'
      });
    } else {
      // On smaller screens, scroll by the number of visible cards
      const totalScroll = scrollAmount * visibleCards;
      el.scrollBy({
        left: direction === 'right' ? totalScroll : -totalScroll,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    
    const scrollAmount = getScrollAmount();
    const scrollLeft = el.scrollLeft;
    // Calculate page index (based on 4 cards per page on desktop)
    const pageIndex = Math.round(scrollLeft / (scrollAmount * 4));
    setCurrentPage(pageIndex);
  };

  const handlePrev = () => scroll('left');
  const handleNext = () => scroll('right');

  // Total pages = total movies / 4 (since we display 4 movies per page on desktop)
  const totalPages = Math.ceil(movies.length / 4);

  return (
    <section className="relative">
      <div className="mb-6 flex items-center justify-center">
        <h2 className="text-3xl font-black text-white md:text-4xl text-center">PHIM ĐANG CHIẾU </h2>
      </div>

      {/* arrows positioned outside scroller (borderless, transparent, no focus ring/background circles) */}
      <button 
        onClick={handlePrev} 
        style={{ left: '-48px' }} 
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-20 border-none outline-none focus:outline-none focus:ring-0 bg-transparent hover:bg-transparent shadow-none"
        aria-label="Previous page"
      >
        <ChevronLeft size={44} />
      </button>
      <button 
        onClick={handleNext} 
        style={{ right: '-48px' }} 
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-20 border-none outline-none focus:outline-none focus:ring-0 bg-transparent hover:bg-transparent shadow-none"
        aria-label="Next page"
      >
        <ChevronRight size={44} />
      </button>

      <div 
        ref={scrollerRef} 
        onScroll={handleScroll}
        className="no-scrollbar flex gap-6 overflow-x-auto pb-4 pr-1 snap-x snap-mandatory"
      >
        {movies.map((movie, index) => (
          <div
            key={movie.title}
            className={`${index % 4 === 0 ? 'md:snap-start snap-center' : 'md:snap-none snap-center'} flex flex-col gap-4`}
            style={{ flex: '0 0 calc((100% - 72px) / 4)', minWidth: '190px', maxWidth: '300px' }}
          >
            <MovieCard {...movie} />
            
            {/* Action buttons under the card */}
            <div className="flex w-full items-center justify-between mt-auto px-1">
              <button className="flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors group/btn">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] p-[2px] transition-transform duration-200 group-hover/btn:scale-110">
                  <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-white">
                    <Play className="h-3 w-3 text-red-500 fill-current" />
                  </span>
                </span>
                <span className="underline underline-offset-4 decoration-white/30 hover:decoration-white">Xem Trailer</span>
              </button>

              <button className="rounded-md bg-yellow-400 px-6 py-2 text-sm font-bold text-black hover:brightness-95">
                ĐẶT VÉ
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* dynamic pagination dots */}
      <div className="mt-6 flex items-center justify-center gap-3">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const el = scrollerRef.current;
              if (!el) return;
              const scrollAmount = getScrollAmount();
              el.scrollTo({
                left: index * scrollAmount * 4,
                behavior: 'smooth'
              });
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              currentPage === index ? 'bg-white w-5' : 'bg-white/30 w-2 hover:bg-white/50'
            }`}
            aria-label={`Go to page ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default NowShowing;
