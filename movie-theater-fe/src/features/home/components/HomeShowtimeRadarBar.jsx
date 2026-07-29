import { Suspense, lazy } from 'react';
import './ShowtimeRadarWidget.css';

const ShowtimeRadarWidget = lazy(() => import('./ShowtimeRadarWidget'));

const RadarFallback = () => (
  <aside className="showtime-radar-widget showtime-radar-widget--bar showtime-radar-widget--loading">
    <div className="showtime-radar-widget__glow" aria-hidden />
    <p className="showtime-radar-widget__empty">Đang tải Radar Suất Chiếu...</p>
  </aside>
);

export default function HomeShowtimeRadarBar() {
  return (
    <div className="home-radar-bar">
      <Suspense fallback={<RadarFallback />}>
        <ShowtimeRadarWidget layout="bar" embedded />
      </Suspense>
    </div>
  );
}
