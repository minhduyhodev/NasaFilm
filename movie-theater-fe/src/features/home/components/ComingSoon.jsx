import { useMemo } from "react";
import { useUpcomingMovies } from "../hooks/useHomeQueries";
import { mapApiMovies } from "../utils/movieUtils";
import HomeMovieCarousel from "./HomeMovieCarousel";

const ComingSoon = () => {
  const { data, isLoading } = useUpcomingMovies();

  const moviesList = useMemo(() => {
    if (!data?.content?.length) return [];
    return mapApiMovies(data.content);
  }, [data]);

  return (
    <HomeMovieCarousel
      sectionId="home-coming-soon"
      title="Phim sắp chiếu"
      subtitle="Theo dõi phim yêu thích và đặt nhắc khi mở bán vé"
      viewAllTo="/movies?tab=coming-soon"
      moviesList={moviesList}
      isLoading={isLoading}
      actionLabel="Chi tiết"
    />
  );
};

export default ComingSoon;
