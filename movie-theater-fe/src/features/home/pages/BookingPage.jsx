import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';

// Import movie poster assets for summary preview
import stelarHorizonImg from '../../../shared/assets/movie_stelar_horizon.png';
import midnightEchoImg from '../../../shared/assets/movie_midnight_echo.png';
import velvetLegacyImg from '../../../shared/assets/movie_velvet_legacy.png';
import whispersOfOakImg from '../../../shared/assets/movie_whispers_of_oak.png';
import kineticPulseImg from '../../../shared/assets/movie_kinetic_pulse.png';
import aetheriaImg from '../../../shared/assets/movie_aetheria.png';
import doraemonPoster from '../../../shared/assets/Doraemon_Movie_2026_Poster.png';
import ngoiDenPoster from '../../../shared/assets/ngoidenkyquai.webp';
import ocMuonHonPoster from '../../../shared/assets/ocmuonhon.jpg';
import maXoPoster from '../../../shared/assets/maxo.jpg';
import kumanthongPoster from '../../../shared/assets/kumanthong.jpg';
import gohanPoster from '../../../shared/assets/tam-biet-gohan.webp';
import baTronPoster from '../../../shared/assets/batron.webp';
import khachPoster from '../../../shared/assets/khach.webp';

import './BookingPage.css';

const movieLookup = {
  'STELAR HORIZON': { poster: stelarHorizonImg, rating: 8.9, format: 'IMAX 4K' },
  'MIDNIGHT ECHO': { poster: midnightEchoImg, rating: 7.4, format: 'DOLBY ATMOS' },
  'VELVET LEGACY': { poster: velvetLegacyImg, rating: 9.2, format: 'PREMIER' },
  'WHISPERS OF OAK': { poster: whispersOfOakImg, rating: 8.1, format: 'IMAX 3D' },
  'KINETIC PULSE': { poster: kineticPulseImg, rating: 7.8, format: '4DX Immersive' },
  'AETHERIA': { poster: aetheriaImg, rating: 8.5, format: 'IMAX 3D' },
  'Doraemon: Lâu Đài Dưới Đáy Biển': { poster: doraemonPoster, rating: 8.9, format: '2D Lồng Tiếng' },
  'Ngôi Đền Kỳ Quái 5': { poster: ngoiDenPoster, rating: 4.7, format: '2D Phụ Đề' },
  'Ốc Mượn Hồn': { poster: ocMuonHonPoster, rating: 4.6, format: '2D VN' },
  'GALACTIC VANGUARD: RISING TIDE': { poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYqavNEfcS3zyX2HMQ1uG4gKIAPAyU4L9ks1n82DMfbRBzxq7IdDZK5KsLA7fIW73GWQRz13F_uaagugNXp77bEq0AnzBTzNI0b-TlyYqzpm-vk9x0NtdDREoBJemeckMbhRxyxC1bk7rk3A3EHSCZbzCyBBfq2Ic0FBiQg8LHwgi6M-oy10EodnS4_uU9tWSNGbSOU6Zs2myWZlcuBwNQ9h2CXwHAbJuA4yD9WNj5iwy5bzZbhxrtDJe-WkkbZ_qVOZqacgwbjtU', rating: 8.5, format: 'IMAX 3D' }
};

const getMovieInfo = (title) => {
  if (!title) {
    return {
      poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNZGCN-dgL3_iYyo3N9bk9mYRKTuKI0afwrbdNoSV44T8GYG0FUZ5Au3HZF6bCbPWrK3n1K-ZL-kg946Pnffa8Kwx2TUI1gpKu4gZ8usEEasZIgEf08y0j3DHe8eF_uzZ9EONUNNg7PU55HEWnCvIIX7hLaNUOm88ySxdElrkSYcd-AonsJy_gM8VhQrtWxv6-_Ndu2jXqKjx7A6HgQthjwngecceimt-dIoOB3b73-hmfWgpkMoHa7Y_mcxYnVaLBzA9Q1LFMGx8',
      rating: 8.5,
      format: 'IMAX 3D'
    };
  }
  const key = Object.keys(movieLookup).find((k) => k.toLowerCase() === title.toLowerCase());
  return key ? movieLookup[key] : {
    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNZGCN-dgL3_iYyo3N9bk9mYRKTuKI0afwrbdNoSV44T8GYG0FUZ5Au3HZF6bCbPWrK3n1K-ZL-kg946Pnffa8Kwx2TUI1gpKu4gZ8usEEasZIgEf08y0j3DHe8eF_uzZ9EONUNNg7PU55HEWnCvIIX7hLaNUOm88ySxdElrkSYcd-AonsJy_gM8VhQrtWxv6-_Ndu2jXqKjx7A6HgQthjwngecceimt-dIoOB3b73-hmfWgpkMoHa7Y_mcxYnVaLBzA9Q1LFMGx8',
    rating: 8.5,
    format: 'IMAX 3D'
  };
};

const BookingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract booking details from routing state
  const { 
    theater = 'NASA Landmark 81 - Phòng chiếu IMAX', 
    movie = 'GALACTIC VANGUARD: RISING TIDE', 
    date = 'Hôm nay, 10/06', 
    showtime = '19:30' 
  } = location.state || {};

  const movieInfo = getMovieInfo(movie);

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowTypes = ['standard', 'standard', 'standard', 'standard', 'vip', 'vip', 'couple', 'couple'];

  const [occupiedSeats, setOccupiedSeats] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);

  // Generate mock occupied seats on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Hash code based on theater, showtime, movie
    const seedStr = `${theater}-${showtime}-${movie}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const occupiedStandardCount = (hash % 26) + 10; // 10 to 35 standard seats occupied
    const occupiedVipCount = ((hash >> 1) % 14) + 5; // 5 to 18 VIP seats occupied
    const occupiedCoupleCount = ((hash >> 2) % 8) + 2; // 2 to 9 couple seats occupied

    const standardSeatsList = [];
    const vipSeatsList = [];
    const coupleSeatsList = [];
    
    rows.forEach((row, rowIndex) => {
      const type = rowTypes[rowIndex];
      const count = type === 'couple' ? 6 : 12;
      for (let i = 1; i <= count; i++) {
        const id = `${row}${i}`;
        if (type === 'standard') standardSeatsList.push(id);
        else if (type === 'vip') vipSeatsList.push(id);
        else coupleSeatsList.push(id);
      }
    });

    const pickSeats = (list, count, seed) => {
      const picked = new Set();
      let indexSeed = seed;
      while (picked.size < count && picked.size < list.length) {
        indexSeed = (indexSeed * 9301 + 49297) % 233280;
        const index = indexSeed % list.length;
        picked.add(list[index]);
      }
      return picked;
    };

    const occupiedStandard = pickSeats(standardSeatsList, occupiedStandardCount, hash);
    const occupiedVip = pickSeats(vipSeatsList, occupiedVipCount, hash + 1);
    const occupiedCouple = pickSeats(coupleSeatsList, occupiedCoupleCount, hash + 2);

    const occupied = new Set([...occupiedStandard, ...occupiedVip, ...occupiedCouple]);
    setOccupiedSeats(occupied);
  }, [theater, showtime, movie]);

  const getSeatPriceAndType = (rowLetter) => {
    const rowIndex = rows.indexOf(rowLetter);
    const type = rowTypes[rowIndex];
    if (type === 'couple') return { price: 160000, typeName: 'Ghế Đôi' };
    if (type === 'vip') return { price: 120000, typeName: 'Ghế VIP' };
    return { price: 85000, typeName: 'Ghế Thường' };
  };

  const handleSeatClick = (seatId, rowLetter) => {
    const isSelected = selectedSeats.some(s => s.id === seatId);
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.id !== seatId));
    } else {
      const { price, typeName } = getSeatPriceAndType(rowLetter);
      setSelectedSeats(prev => [...prev, { id: seatId, price, type: typeName }]);
    }
  };

  const handleConfirm = () => {
    setIsConfirming(true);
    setTimeout(() => {
      setIsConfirming(false);
      navigate('/checkout', {
        state: {
          theater,
          movie,
          date,
          showtime,
          selectedSeats,
          totalAmount
        }
      });
    }, 800);
  };

  const totalAmount = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="booking-wrapper">
      <Navbar />

      <main className="py-24 px-4 md:px-12 lg:px-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left Column: Seat Selection */}
        <div className="lg:col-span-8 flex flex-col items-center bg-[#111215]/30 border border-white/5 p-6 rounded-2xl">
          
          {/* Screen Indicator */}
          <div className="w-full mb-16 text-center">
            <div className="screen-curve relative mx-auto w-3/4 h-2 bg-gradient-to-b from-white/45 to-transparent rounded-[50%] screen-glow"></div>
            <p className="text-[10px] md:text-xs font-bold text-gray-400 mt-4 tracking-widest uppercase">MÀN HÌNH CHÍNH</p>
          </div>
          
          {/* Seat Grid */}
          <div className="flex flex-col gap-2.5 overflow-x-auto w-full items-center pb-4 scrollbar-hide select-none">
            {rows.map((row, rowIndex) => {
              const type = rowTypes[rowIndex];
              const count = type === 'couple' ? 6 : 12;

              const renderSeat = (seatIndex) => {
                const seatId = `${row}${seatIndex}`;
                const isOccupied = occupiedSeats.has(seatId);
                const isSelected = selectedSeats.some(s => s.id === seatId);
                
                let seatClass = `seat ${type}`;
                
                if (isOccupied) {
                  seatClass += ' occupied';
                } else if (isSelected) {
                  seatClass += ' selected';
                }

                return (
                  <div
                    key={seatId}
                    onClick={() => !isOccupied && handleSeatClick(seatId, row)}
                    className={seatClass}
                  >
                    {isOccupied ? <X className="h-3 w-3" /> : seatIndex}
                  </div>
                );
              };

              if (type === 'couple') {
                return (
                  <div key={row} className="flex items-center gap-2 mb-1 justify-center min-w-max">
                    <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>
                    <div className="flex gap-2">
                      {Array.from({ length: count }).map((_, i) => renderSeat(i + 1))}
                    </div>
                    <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>
                  </div>
                );
              }

              const isCenterRow = ['C', 'D', 'E', 'F'].includes(row);
              let centerClasses = "flex gap-2 px-1";
              if (row === 'C') {
                centerClasses += " border-t-2 border-x-2 border-emerald-500/30 bg-emerald-500/5 rounded-t-xl py-0.5";
              } else if (row === 'D' || row === 'E') {
                centerClasses += " border-x-2 border-emerald-500/30 bg-emerald-500/5 py-0.5";
              } else if (row === 'F') {
                centerClasses += " border-b-2 border-x-2 border-emerald-500/30 bg-emerald-500/5 rounded-b-xl py-0.5";
              }

              return (
                <div key={row} className="flex items-center gap-2 mb-1 justify-center min-w-max">
                  {/* Row Label Left */}
                  <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>
                  
                  {/* Left Block */}
                  <div className="flex gap-2">
                    {[1, 2].map(seatIndex => renderSeat(seatIndex))}
                  </div>

                  {/* Center Block with optional blue border */}
                  <div className={centerClasses}>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map(seatIndex => renderSeat(seatIndex))}
                  </div>

                  {/* Right Block */}
                  <div className="flex gap-2">
                    {[11, 12].map(seatIndex => renderSeat(seatIndex))}
                  </div>
                  
                  {/* Row Label Right */}
                  <div className="w-6 text-center text-[10px] md:text-xs font-bold text-gray-500">{row}</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 glass-panel p-6 rounded-xl w-full border border-white/5 bg-[#121215]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-white/25 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-zinc-500">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế Thường (85k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-yellow-500/35 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-yellow-500/70">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế VIP (120k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-16 h-6 border-2 border-red-500/35 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-red-500/70">1</div>
              <span className="text-xs font-bold text-gray-300">Ghế Đôi (160k)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 bg-white/5 border-2 border-red-500/20 rounded-lg flex items-center justify-center text-red-500/25 opacity-60">
                <X className="h-3 w-3" />
              </div>
              <span className="text-xs font-bold text-gray-300">Đã đặt</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 bg-white border border-white rounded-lg flex items-center justify-center text-[9px] font-bold text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]">1</div>
              <span className="text-xs font-bold text-gray-300">Đang chọn</span>
            </div>
             <div className="flex items-center gap-2.5">
              <div className="w-9 h-6 border-2 border-emerald-500/40 bg-emerald-500/10 rounded-lg"></div>
              <span className="text-xs font-bold text-gray-300">Vùng trung tâm</span>
            </div>
          </div>
        </div>

        {/* Right Column: Summary Panel */}
        <aside className="lg:col-span-4">
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-full sticky top-28 border border-white/5 bg-[#111215]/40 shadow-2xl">
            {/* Movie Details */}
            <div className="flex gap-4 mb-6 border-b border-white/10 pb-6 items-start">
              <img 
                alt="Movie Poster" 
                className="w-20 h-28 rounded-lg object-cover shadow-xl border border-white/5 bg-[#0f121d]" 
                src={movieInfo.poster} 
              />
              <div className="text-left space-y-1">
                <h2 className="text-base font-black text-white uppercase tracking-wide leading-tight line-clamp-2">{movie}</h2>
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{movieInfo.rating.toFixed(1)} IMDb</span>
                </div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{movieInfo.format}</p>
                <p className="text-[11px] font-bold text-red-500 mt-1">{showtime} • {date}</p>
                <p className="text-[10px] font-semibold text-gray-500">{theater}</p>
              </div>
            </div>
            
            {/* Selected Seats List */}
            <div className="flex-grow flex flex-col min-h-[160px]">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">Ghế đã chọn</h3>
              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1 flex-grow">
                {selectedSeats.length === 0 ? (
                  <div className="text-gray-500 font-medium text-xs py-8 text-center italic">
                    Chưa chọn ghế nào.
                  </div>
                ) : (
                  selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors animate-fade-in">
                      <div className="text-left">
                        <span className="text-xs font-black text-white block">Ghế {seat.id}</span>
                        <span className="text-[10px] font-bold text-gray-400">{seat.type}</span>
                      </div>
                      <span className="text-xs font-black text-yellow-400">{(seat.price).toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Price & Checkout */}
            <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-400">Tổng cộng</span>
                <span className="text-xl font-black text-white">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
              
              <button 
                onClick={handleConfirm}
                disabled={selectedSeats.length === 0 || isConfirming}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
                  selectedSeats.length === 0 
                    ? 'bg-neutral-800 text-gray-500 cursor-not-allowed border border-white/5' 
                    : isConfirming
                      ? 'bg-red-700 text-white cursor-wait opacity-80'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.35)] cursor-pointer active:scale-[0.98]'
                }`}
              >
                {isConfirming ? 'Đang xử lý...' : selectedSeats.length === 0 ? 'Xác nhận ghế' : `Xác nhận đặt (${selectedSeats.length} ghế)`}
              </button>
            </div>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default BookingPage;
