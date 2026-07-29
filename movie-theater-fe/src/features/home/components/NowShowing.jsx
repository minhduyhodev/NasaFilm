import { useMemo } from "react";
import { useNowShowingMovies } from "../hooks/useHomeQueries";
import { mapApiMovies } from "../utils/movieUtils";
import HomeMovieCarousel from "./HomeMovieCarousel";

const NowShowing = () => {
  const { data, isLoading } = useNowShowingMovies();

  const moviesList = useMemo(() => {
    if (!data?.content?.length) return [];
    return mapApiMovies(data.content);
  }, [data]);

  return (
    <HomeMovieCarousel
      sectionId="home-now-showing"
      title="Phim đang chiếu"
      subtitle="Suất chiếu hôm nay — chọn phim và đặt vé chỉ vài chạm"
      viewAllTo="/movies?tab=now-showing"
      moviesList={moviesList}
      isLoading={isLoading}
      actionLabel="Mua vé"
      showEarliestShowtime
    />
  );
};

export default NowShowing;
