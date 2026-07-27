import { useEffect, useRef, useState, useCallback } from "react";
import { mountScrollWorld } from "../lib/scrollWorldEngine";
import "./ScrollWorldWrapper.css";

const SCENE_STILLS = [
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517604931441-175ad6222228?q=80&w=1920&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585647347483-22b66260dfff?q=80&w=1920&auto=format&fit=crop",
];

const SCENE_CONFIG = [
  {
    id: "hero",
    label: "Trang chủ",
    still: SCENE_STILLS[0],
    accent: "#e50914",
    scroll: 1.8,
    linger: 0.35,
    eyebrow: "NASAFilm",
    title: "Vũ trụ điện ảnh trong tầm tay",
    body: "Cuộn để bay qua từng không gian điện ảnh — khám phá phim, lịch chiếu và đặt vé chỉ trong một hành trình liền mạch.",
    tags: ["Dome Gallery", "Phim hot", "Đặt vé nhanh"],
    cta: {
      primary: { label: "Khám phá phim", href: "/movies" },
      secondary: { label: "Đặt vé ngay", href: "/booking" },
    },
  },
  {
    id: "now-showing",
    label: "Đang chiếu",
    still: SCENE_STILLS[1],
    accent: "#e50914",
    scroll: 1.6,
    linger: 0.45,
    eyebrow: "Đang chiếu",
    title: "Phim đang chiếu",
    body: "Những bom tấn đang trình chiếu tại rạp NASAFilm trên toàn quốc.",
    tags: ["Bom tấn", "Mới nhất", "Hot"],
  },
  {
    id: "coming-soon",
    label: "Sắp chiếu",
    still: SCENE_STILLS[2],
    accent: "#ff6b35",
    scroll: 1.6,
    linger: 0.45,
    eyebrow: "Sắp chiếu",
    title: "Phim sắp ra mắt",
    body: "Đón đầu siêu phẩm sắp đổ bộ màn ảnh rộng.",
    tags: ["Sắp chiếu", "Trailer", "Đặt trước"],
  },
  {
    id: "upcoming",
    label: "Lịch chiếu",
    still: SCENE_STILLS[3],
    accent: "#7b68ee",
    scroll: 1.6,
    linger: 0.45,
    eyebrow: "Lịch chiếu",
    title: "Suất chiếu & lịch trình",
    body: "Xem lịch chiếu chi tiết và đặt vé cho suất phim yêu thích.",
    tags: ["Lịch chiếu", "Suất sớm", "IMAX"],
  },
  {
    id: "booking",
    label: "Đặt vé",
    still: SCENE_STILLS[4],
    accent: "#e50914",
    scroll: 1.5,
    linger: 0.4,
    eyebrow: "Trải nghiệm",
    title: "Đặt vé ngay",
    body: "Tìm phim phù hợp và đặt vé chỉ trong vài giây.",
    tags: ["Đặt vé", "Gợi ý phim", "Ưu đãi"],
    cta: {
      primary: { label: "Mua vé ngay", href: "/movies" },
      secondary: { label: "Xem phim online", href: "/online" },
    },
  },
];

/**
 * Scroll-world layout giống mẫu Pearl & Co:
 * - Nền scene full-screen (still + zoom khi scroll)
 * - Copy bên trái (engine)
 * - Nội dung tương tác bên phải (React panels)
 * - Route dots bên phải (engine)
 */
export default function ScrollWorldWrapper({ sceneContents = [] }) {
  const containerRef = useRef(null);
  const [activeScene, setActiveScene] = useState(0);

  const handleActiveChange = useCallback((index) => {
    setActiveScene(index);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const result = mountScrollWorld(container, {
      sections: SCENE_CONFIG,
      connectors: [],
      diveScroll: 1.5,
      crossfade: 0.18,
      hint: "cuộn để khám phá",
      nav: false,
      atmosphere: true,
      onActiveChange: handleActiveChange,
    });

    return () => result?.destroy();
  }, [handleActiveChange]);

  const contents = Array.isArray(sceneContents) ? sceneContents : [sceneContents];

  return (
    <div ref={containerRef} className="sw-nasa-wrapper">
      {SCENE_CONFIG.map((scene, i) => {
        const entry = contents[i];
        if (!entry) return null;

        const isActive = activeScene === i;
        const isHero = i === 0;

        return (
          <div
            key={scene.id}
            className={`sw-scene-panel${isHero ? " sw-scene-panel--hero" : ""}${isActive ? " is-active" : ""}`}
            aria-hidden={!isActive}
          >
            {typeof entry === "function"
              ? entry({ isActive, sceneIndex: i })
              : entry}
          </div>
        );
      })}
    </div>
  );
}
