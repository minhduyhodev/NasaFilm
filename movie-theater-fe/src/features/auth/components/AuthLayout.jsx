import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SpaceBackground } from './SpaceBackground';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';

export const AuthLayout = ({
  children,
  showHero = true,
  heroTitle = 'NASAFILM',
  heroDescription = 'The most immersive cinema experience ever crafted for the digital age. Mission-critical quality, delivered directly to your home observatory.',
}) => {
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
      
      ctx.putImageData(imgData, 0, 0);
      setLogoSrc(canvas.toDataURL());
    };
  }, []);
  return (
    <div className="min-h-screen bg-[#030307] text-white overflow-hidden relative flex flex-col justify-between">
      {/* Dynamic Starry Canvas Background */}
      <SpaceBackground />

      {/* Cosmic spot lights */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl opacity-30"></div>
      </div>



      {/* Content Area */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-8 md:py-10">
        <div className="w-full max-w-7xl px-6 sm:px-8 lg:px-12">
          {showHero ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Side Hero */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="hidden lg:block text-white"
              >
                <div className="space-y-6 max-w-lg">
                  <div>
                    <Link to="/" className="flex items-center gap-5 mb-6 hover:opacity-90 transition-opacity cursor-pointer">
                      <img
                        src={logoSrc}
                        alt="NASAFILM Logo"
                        className="h-20 md:h-24 w-auto object-contain select-none"
                      />
                      <span className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                        NASA<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Film</span>
                      </span>
                    </Link>
                    <p className="text-base text-gray-300 leading-relaxed font-medium">
                      {heroDescription}
                    </p>
                  </div>

                  {/* Decorative line */}
                  <div className="pt-2">
                    <div className="h-0.5 w-24 bg-gradient-to-r from-blue-500 to-transparent"></div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-4 pt-4">
                    {['Exclusive Screenings', 'VIP Amenities', 'Premium Access'].map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * (index + 1) }}
                        className="flex items-center gap-3.5"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                        <span className="text-gray-400 font-semibold text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Form Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex justify-center lg:justify-end"
              >
                {children}
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              {children}
            </motion.div>
          )}
        </div>
      </div>


    </div>
  );
};
