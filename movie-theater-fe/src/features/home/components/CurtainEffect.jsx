import React, { useState, useEffect } from 'react';
import './CurtainEffect.css';

export const CurtainEffect = ({ onComplete }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Ngăn cuộn trang trong lúc hiệu ứng đang chạy
    document.body.style.overflow = 'hidden';

    // Bắt đầu mở rèm sau khi chữ chào mừng hiện lên
    const openTimer = setTimeout(() => {
      setIsOpen(true);
    }, 1800);

    // Hoàn thành hiệu ứng, gỡ bỏ khỏi DOM và khôi phục thanh cuộn
    const completeTimer = setTimeout(() => {
      document.body.style.overflow = '';
      if (onComplete) onComplete();
    }, 3500);

    return () => {
      clearTimeout(openTimer);
      clearTimeout(completeTimer);
      document.body.style.overflow = '';
    };
  }, [onComplete]);

  return (
    <div className={`curtain-container ${isOpen ? 'open' : ''}`}>
      <div className="curtain-panel curtain-left" />
      <div className="curtain-panel curtain-right" />
      <div className="curtain-welcome-sign">
        <span className="welcome-tag">WELCOME TO</span>
        <h1 className="welcome-title">NASA FILM</h1>
        <div className="welcome-divider" />
      </div>
    </div>
  );
};

export default CurtainEffect;
