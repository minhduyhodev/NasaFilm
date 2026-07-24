import { Suspense, lazy } from "react";
import Hero from "../components/Hero";
import TicketFilters from "../components/TicketFilters";
import OrbitActiveRoomsPanel from "../components/OrbitActiveRoomsPanel";
import NowShowing from "../components/NowShowing";
import LazySection from "../../../shared/components/LazySection";
import HomeArrivalFade from "../components/HomeArrivalFade";
import "../components/HomeSpaceBackdrop.css";

const HomeSpaceBackdrop = lazy(() => import("../components/HomeSpaceBackdrop"));
const ComingSoon = lazy(() => import("../components/ComingSoon"));
const Upcoming = lazy(() => import("../components/Upcoming"));
const MovieMatchmakerWidget = lazy(
  () => import("../components/MovieMatchmakerWidget"),
);

const SectionPlaceholder = ({ minHeight = "12rem" }) => (
  <div aria-hidden style={{ minHeight }} />
);

const HomePage = () => {
  return (
    <div className="text-white min-h-screen">
      <HomeArrivalFade />
      <main className="pt-0">
        <Hero />

        <section
          id="quick-booking"
          className="-mt-16 md:-mt-24 relative z-20 px-4 md:px-8 lg:px-20"
        >
          <div className="max-w-6xl mx-auto">
            <TicketFilters />
          </div>
        </section>

        <div className="home-space-zone">
          <LazySection fallback={null}>
            <Suspense fallback={null}>
              <HomeSpaceBackdrop />
            </Suspense>
          </LazySection>

          <div className="home-space-zone__content">
            <section className="px-4 pt-8 md:px-8 md:pt-10 lg:px-20">
              <div className="mx-auto max-w-6xl">
                <OrbitActiveRoomsPanel title="Phòng Orbit của bạn" />
              </div>
            </section>

            <LazySection
              as="section"
              className="mt-10 px-4 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="16rem" />}
            >
              <div className="max-w-7xl mx-auto">
                <NowShowing />
              </div>
            </LazySection>

            <LazySection
              as="section"
              className="mt-16 px-4 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="18rem" />}
            >
              <div className="max-w-7xl mx-auto">
                <Suspense fallback={<SectionPlaceholder minHeight="18rem" />}>
                  <ComingSoon />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="section"
              className="mt-16 px-4 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="22rem" />}
            >
              <div className="max-w-6xl mx-auto">
                <Suspense fallback={<SectionPlaceholder minHeight="22rem" />}>
                  <Upcoming />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="section"
              id="movie-matchmaker"
              className="mt-16 px-4 md:px-8 lg:px-20 pb-16 overflow-visible home-section"
              fallback={<SectionPlaceholder minHeight="10rem" />}
              rootMargin="320px 0px"
            >
              <div className="max-w-6xl mx-auto overflow-visible py-1">
                <Suspense fallback={<SectionPlaceholder minHeight="10rem" />}>
                  <MovieMatchmakerWidget />
                </Suspense>
              </div>
            </LazySection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
