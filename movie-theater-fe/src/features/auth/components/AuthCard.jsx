import React from 'react';
import { motion } from 'framer-motion';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';



export const AuthCard = ({ children, title, subtitle }) => {
  const [logoSrc, setLogoSrc] = React.useState(nasaLogo);

  React.useEffect(() => {
    const img = new Image();
    img.src = nasaLogo;
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, width, height);
      const data = imgData.data;
      
      // Flood fill from corners to find and remove white background
      const visited = new Uint8Array(width * height);
      const queue = [];
      
      const isWhite = (x, y) => {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx+1];
        const b = data[idx+2];
        return r > 240 && g > 240 && b > 240;
      };
      
      const corners = [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1]
      ];
      
      corners.forEach(([x, y]) => {
        if (isWhite(x, y)) {
          queue.push([x, y]);
          visited[y * width + x] = 1;
        }
      });
      
      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const idx = (cy * width + cx) * 4;
        data[idx+3] = 0; // Transparent
        
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1]
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const vIdx = ny * width + nx;
            if (visited[vIdx] === 0 && isWhite(nx, ny)) {
              visited[vIdx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
      }
      
      // Recolor dark text in the bottom half of the image to white
      for (let y = Math.floor(height * 0.5); y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const alpha = data[idx+3];
          if (alpha > 0) {
            const r = data[idx];
            const g = data[idx+1];
            const b = data[idx+2];
            // NASA text / FILM outlines
            if (r < 130 && g < 130 && b < 160) {
              data[idx] = 255;
              data[idx+1] = 255;
              data[idx+2] = 255;
            }
          }
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      setLogoSrc(canvas.toDataURL());
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="relative">
        {/* Glassy background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl blur-xl opacity-20"></div>

        {/* Card content */}
        <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-7 shadow-2xl">
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          {/* Content */}
          <div className="relative z-10 space-y-4">
            {/* Logo from assets */}
            <div className="flex justify-center mb-4">
              <img 
                src={logoSrc} 
                alt="NASA FILM Logo" 
                className="h-16 w-auto object-contain" 
              />
            </div>

            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>

            {/* Children */}
            <div>{children}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
