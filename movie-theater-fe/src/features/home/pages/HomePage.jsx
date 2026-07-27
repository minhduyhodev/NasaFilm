import { Suspense, lazy } from "react";
import Hero from "../components/Hero";
import OrbitActiveRoomsPanel from "../components/OrbitActiveRoomsPanel";
import NowShowing from "../components/NowShowing";
import HomeSpotlightBanner from "../components/HomeSpotlightBanner";
import HomeSectionDivider from "../components/HomeSectionDivider";
import HomeSectionReveal from "../components/HomeSectionReveal";
import LazySection from "../../../shared/components/LazySection";
import HomeArrivalFade from "../components/HomeArrivalFade";
import HomeSpaceBackdrop from "../components/HomeSpaceBackdrop";
import "../components/HomeSpaceBackdrop.css";

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
    <div className="home-page">
      <HomeArrivalFade />

      <div className="home-page__backdrop" aria-hidden>
        <HomeSpaceBackdrop />
      </div>

      <main className="home-page__main pt-0">
        <Hero />

        <div className="home-space-zone">
          <div className="home-space-zone__content">
            <LazySection
              as="section"
              className="px-4 pt-0 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="6rem" />}
            >
              <HomeSectionReveal>
                <div className="mx-auto max-w-6xl">
                  <OrbitActiveRoomsPanel title="Phòng Orbit của bạn" />
                </div>
              </HomeSectionReveal>
            </LazySection>

            <HomeSectionDivider label="Đang chiếu" />

            <LazySection
              as="section"
              className="px-4 pt-2 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="16rem" />}
            >
              <HomeSectionReveal>
                <div className="max-w-7xl mx-auto">
                  <NowShowing />
                </div>
              </HomeSectionReveal>
            </LazySection>

            <LazySection
              as="section"
              className="mt-12 px-4 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="14rem" />}
            >
              <HomeSectionReveal>
                <div className="max-w-7xl mx-auto">
                  <HomeSpotlightBanner />
                </div>
              </HomeSectionReveal>
            </LazySection>

            <HomeSectionDivider label="Sắp chiếu" />

            <LazySection
              as="section"
              className="mt-4 px-4 pt-2 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="18rem" />}
            >
              <HomeSectionReveal>
                <div className="max-w-7xl mx-auto">
                  <Suspense fallback={<SectionPlaceholder minHeight="18rem" />}>
                    <ComingSoon />
                  </Suspense>
                </div>
              </HomeSectionReveal>
            </LazySection>

            <HomeSectionDivider label="Lịch chiếu" />

            <LazySection
              as="section"
              className="mt-4 px-4 md:px-8 lg:px-20 home-section"
              fallback={<SectionPlaceholder minHeight="22rem" />}
            >
              <HomeSectionReveal>
                <div className="max-w-6xl mx-auto">
                  <Suspense fallback={<SectionPlaceholder minHeight="22rem" />}>
                    <Upcoming />
                  </Suspense>
                </div>
              </HomeSectionReveal>
            </LazySection>

            <HomeSectionDivider label="Gợi ý cho bạn" />

            <LazySection
              as="section"
              id="movie-matchmaker"
              className="mt-4 px-4 md:px-8 lg:px-20 pb-16 overflow-visible home-section"
              fallback={<SectionPlaceholder minHeight="10rem" />}
              rootMargin="320px 0px"
            >
              <HomeSectionReveal>
                <div className="max-w-6xl mx-auto overflow-visible py-1">
                  <Suspense fallback={<SectionPlaceholder minHeight="10rem" />}>
                    <MovieMatchmakerWidget />
                  </Suspense>
                </div>
              </HomeSectionReveal>
            </LazySection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
