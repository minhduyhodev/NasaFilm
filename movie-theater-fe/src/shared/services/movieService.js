import { authService } from '../../features/auth/api/authService';

class MovieService {
  constructor() {
    this.genresCache = null;
    this.countriesCache = null;
  }

  async getMovies(params = {}) {
    try {
      const requestParams = { ...params };
      if (Array.isArray(requestParams.genreUuids)) {
        requestParams.genreUuids = requestParams.genreUuids.join(',');
      }
      const response = await authService.api.get('/api/movies', { params: requestParams });
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMovieDetail(uuid) {
    try {
      const response = await authService.api.get(`/api/movies/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getGenres() {
    if (this.genresCache) {
      return this.genresCache;
    }
    try {
      const response = await authService.api.get('/api/genres');
      this.genresCache = response.data.data ?? response.data;
      return this.genresCache;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getCountries() {
    if (this.countriesCache) {
      return this.countriesCache;
    }
    try {
      const response = await authService.api.get('/api/countries');
      this.countriesCache = response.data.data ?? response.data;
      return this.countriesCache;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // Admin APIs
  async createMovie(data) {
    try {
      const response = await authService.api.post('/api/admin/movies', data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateMovie(uuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/movies/${uuid}`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteMovie(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/movies/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async addMovieMedia(movieUuid, mediaData) {
    try {
      const response = await authService.api.post(`/api/admin/movies/${movieUuid}/media`, mediaData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateMovieMedia(movieUuid, mediaUuid, mediaData) {
    try {
      const response = await authService.api.put(`/api/admin/movies/${movieUuid}/media/${mediaUuid}`, mediaData);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteMovieMedia(movieUuid, mediaUuid) {
    try {
      const response = await authService.api.delete(`/api/admin/movies/${movieUuid}/media/${mediaUuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const movieService = new MovieService();
export default movieService;
