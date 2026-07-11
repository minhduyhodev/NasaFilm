import java.lang.Class;
public class CheckMovieService {
  public static void main(String[] args) throws Exception {
    Class.forName("com.thdpv.movietheater.movie.service.MovieService");
    System.out.println("LOADED");
  }
}
