import { Suspense, lazy, useEffect } from "react";
import Hero from "../components/Hero";
import HomeSectionShell from "../components/HomeSectionShell";
import HomeShowtimeRadarBar from "../components/HomeShowtimeRadarBar";
import LazySection from "../../../shared/components/LazySection";
import HomeArrivalFade from "../components/HomeArrivalFade";
import HomeSpaceBackdrop from "../components/HomeSpaceBackdrop";
import "../components/HomeSpaceBackdrop.css";
import "./HomePage.css";

const OrbitActiveRoomsPanel = lazy(() => import("../components/OrbitActiveRoomsPanel"));
const NowShowing = lazy(() => import("../components/NowShowing"));
const HomeSpotlightBanner = lazy(() => import("../components/HomeSpotlightBanner"));
const ComingSoon = lazy(() => import("../components/ComingSoon"));
const MovieMatchmakerWidget = lazy(
  () => import("../components/MovieMatchmakerWidget"),
);

const SectionPlaceholder = ({ minHeight = "12rem" }) => (
  <div aria-hidden style={{ minHeight }} />
);

const HomePage = () => {
  useEffect(() => {
    document.body.classList.remove("dg-scroll-lock");
    return () => {
      document.body.classList.remove("dg-scroll-lock");
    };
  }, []);

  return (
    <div className="home-page">
      <HomeArrivalFade />

      <div className="home-page__backdrop" aria-hidden>
        <HomeSpaceBackdrop />
      </div>

      <main className="home-page__main pt-0">
        <Hero />

        <div className="home-space-zone">
          <div className="home-space-zone__fade" aria-hidden />

          <div className="home-space-zone__content home-page__sections px-4 md:px-8 lg:px-20">
            <LazySection
              as="div"
              className="home-section pt-0"
              rootMargin="100px 0px"
              fallback={<SectionPlaceholder minHeight="4rem" />}
            >
              <div className="home-page__orbit-wrap">
                <Suspense fallback={<SectionPlaceholder minHeight="4rem" />}>
                  <OrbitActiveRoomsPanel title="Phòng Orbit của bạn" />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="div"
              className="home-section"
              rootMargin="120px 0px"
              fallback={<SectionPlaceholder minHeight="14rem" />}
            >
              <div className="home-page__spotlight-wrap">
                <Suspense fallback={<SectionPlaceholder minHeight="14rem" />}>
                  <HomeSpotlightBanner />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="div"
              className="home-section home-page__section--movies"
              rootMargin="120px 0px"
              fallback={<SectionPlaceholder minHeight="16rem" />}
            >
              <div className="home-page__grid-wrap">
                <Suspense fallback={<SectionPlaceholder minHeight="16rem" />}>
                  <NowShowing />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="div"
              className="home-section home-page__section--movies"
              rootMargin="120px 0px"
              fallback={<SectionPlaceholder minHeight="18rem" />}
            >
              <div className="home-page__grid-wrap">
                <Suspense fallback={<SectionPlaceholder minHeight="18rem" />}>
                  <ComingSoon />
                </Suspense>
              </div>
            </LazySection>

            <LazySection
              as="div"
              className="home-section home-page__section--personalize pb-16"
              fallback={<SectionPlaceholder minHeight="16rem" />}
              rootMargin="140px 0px"
            >
              <div className="home-personalize-duo">
                <HomeSectionShell
                  id="home-radar"
                  spacing="tight"
                  className="home-personalize-duo__panel home-personalize-duo__panel--radar"
                  title="Radar sở thích"
                  subtitle="Suất chiếu 48h tới khớp sở thích của bạn"
                >
                  <HomeShowtimeRadarBar />
                </HomeSectionShell>

                <div className="home-personalize-duo__divider" aria-hidden />

                <HomeSectionShell
                  id="home-matchmaker"
                  spacing="tight"
                  className="home-personalize-duo__panel home-personalize-duo__panel--match"
                  title="Gợi ý cho bạn"
                  subtitle="Vài câu hỏi nhanh — tìm phim đúng tâm trạng"
                >
                  <Suspense fallback={<SectionPlaceholder minHeight="10rem" />}>
                    <MovieMatchmakerWidget layout="panel" />
                  </Suspense>
                </HomeSectionShell>
              </div>
            </LazySection>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
