import React, { useEffect, useRef } from 'react';
import spaceAuthBg from '../../../shared/assets/space_auth_bg.png';

export const SpaceBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic particles / Twinkling stars overlay
    const stars = [];
    const starCount = 50; 
    
    // Orbit lines parameters
    const orbits = [
      { rx: width * 0.45, ry: height * 0.35, cx: width * 0.3, cy: height * 0.5, speed: 0.0003, angle: 0, tilt: 25 * Math.PI / 180 },
      { rx: width * 0.25, ry: height * 0.2, cx: width * 0.7, cy: height * 0.4, speed: -0.0005, angle: 0, tilt: -15 * Math.PI / 180 },
    ];

    class SparkleStar {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1; 
        this.baseOpacity = Math.random() * 0.6 + 0.2;
        this.opacity = this.baseOpacity;
        this.twinkleSpeed = Math.random() * 0.01 + 0.002;
        this.twinkleFactor = Math.random() * Math.PI;
        this.speedX = (Math.random() - 0.5) * 0.03;
        this.speedY = (Math.random() - 0.5) * 0.03;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        this.twinkleFactor += this.twinkleSpeed;
        this.opacity = this.baseOpacity + Math.sin(this.twinkleFactor) * 0.3;
        if (this.opacity < 0) this.opacity = 0;
        if (this.opacity > 1) this.opacity = 1;
      }

      draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        if (this.size > 2) {
          const glowGrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
          glowGrad.addColorStop(0, `rgba(224, 231, 255, ${this.opacity * 0.3})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Dense Meteor shower animation (falling shooting stars)
    class Meteor {
      constructor() {
        this.reset();
        // Stagger spawn times initially
        this.y = Math.random() * height - 100;
        this.x = Math.random() * (width + 300) - 150;
      }

      reset() {
        // Fall diagonally from top-right to bottom-left (135 degrees)
        this.x = Math.random() * (width + 300) - 50;
        this.y = -100;
        this.len = Math.random() * 150 + 100; 
        this.speed = Math.random() * 6 + 7; // Smooth falling speed (7 to 13px per frame)
        this.angle = (135 + (Math.random() - 0.5) * 8) * Math.PI / 180;
        this.baseOpacity = Math.random() * 0.6 + 0.4;
        this.opacity = this.baseOpacity;
        this.width = Math.random() * 1.5 + 1.2;
      }

      update() {
        const dx = this.speed * Math.cos(this.angle);
        const dy = this.speed * Math.sin(this.angle);
        this.x += dx;
        this.y += dy;
        
        // Fade out as it falls
        this.opacity -= 0.008;

        if (this.opacity <= 0 || this.x < -200 || this.y > height + 200) {
          this.reset();
        }
      }

      draw() {
        const angle = this.angle;
        const startX = this.x;
        const startY = this.y;
        const endX = this.x - this.len * Math.cos(angle);
        const endY = this.y - this.len * Math.sin(angle);

        // Linear gradient for a glowing shooting star tail
        const grad = ctx.createLinearGradient(startX, startY, endX, endY);
        grad.addColorStop(0, `rgba(255, 255, 255, ${this.opacity})`);
        grad.addColorStop(0.2, `rgba(99, 102, 241, ${this.opacity * 0.6})`); // indigo trail
        grad.addColorStop(0.6, `rgba(59, 130, 246, ${this.opacity * 0.2})`);  // blue trail
        grad.addColorStop(1, 'transparent');

        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw meteor head spark
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(startX, startY, this.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialize stars
    for (let i = 0; i < starCount; i++) {
      stars.push(new SparkleStar());
    }

    // Initialize meteors (constant falling shooting stars)
    const meteors = [];
    const meteorCount = 5; // Constantly keep 5 shooting stars falling
    for (let i = 0; i < meteorCount; i++) {
      meteors.push(new Meteor());
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      orbits[0].rx = width * 0.45;
      orbits[0].ry = height * 0.35;
      orbits[0].cx = width * 0.3;
      orbits[0].cy = height * 0.5;

      orbits[1].rx = width * 0.25;
      orbits[1].ry = height * 0.2;
      orbits[1].cx = width * 0.7;
      orbits[1].cy = height * 0.4;
    };

    window.addEventListener('resize', handleResize);

    const animate = () => {
      // Clear canvas with transparent color to see the background photo
      ctx.clearRect(0, 0, width, height);

      // Draw Orbit Lines
      ctx.lineWidth = 0.5;
      orbits.forEach(orbit => {
        orbit.angle += orbit.speed;
        
        ctx.save();
        ctx.translate(orbit.cx, orbit.cy);
        ctx.rotate(orbit.tilt);
        
        // Faint dashed orbit path
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.setLineDash([5, 15]);
        ctx.beginPath();
        ctx.ellipse(0, 0, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Draw a tiny glow dot traveling on the orbit path
        const dotX = Math.cos(orbit.angle) * orbit.rx;
        const dotY = Math.sin(orbit.angle) * orbit.ry;
        
        const dotGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6);
        dotGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        dotGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');
        dotGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = dotGrad;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      // Draw Twinkling Stars overlay
      stars.forEach(star => {
        star.update();
        star.draw();
      });

      // Draw Falling Meteors (Shooting Stars)
      meteors.forEach(meteor => {
        meteor.update();
        meteor.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* High-resolution space dust/nebula photo with slow GPU-accelerated motion */}
      <div 
        className="absolute inset-0 bg-cover bg-center select-none"
        style={{
          backgroundImage: `url(${spaceAuthBg})`,
          transform: 'scale(1.04)',
          animation: 'spaceBgPan 60s ease-in-out infinite',
          filter: 'brightness(0.32) contrast(1.1)',
        }}
      />
      
      {/* Dark gradient overlay to improve text contrast and visual depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/40 to-black/60 pointer-events-none" />

      {/* Custom CSS keyframe for background panning */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spaceBgPan {
          0% { transform: scale(1.04) translate(0, 0); }
          50% { transform: scale(1.08) translate(-1.5%, -1%); }
          100% { transform: scale(1.04) translate(0, 0); }
        }
      `}} />

      {/* Canvas for dynamic particles, orbits, and shooting stars */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};
