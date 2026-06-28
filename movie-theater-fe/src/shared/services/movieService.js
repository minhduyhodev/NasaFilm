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

  async getUpcomingMovies(params = {}) {
    try {
      const response = await authService.api.get('/api/movies/upcoming', { params });
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

  async getMovieSummaries(uuids = []) {
    const unique = [...new Set((uuids || []).filter(Boolean))];
    if (unique.length === 0) return [];
    try {
      const response = await authService.api.post('/api/movies/summaries', { uuids: unique.slice(0, 50) });
      return response.data.data ?? response.data ?? [];
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  clearMetadataCache() {
    this.genresCache = null;
    this.countriesCache = null;
  }

  async getGenres(forceRefresh = false) {
    if (!forceRefresh && this.genresCache) {
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

  async getCountries(forceRefresh = false) {
    if (!forceRefresh && this.countriesCache) {
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

  async getCinemas() {
    try {
      const response = await authService.api.get('/api/cinemas', { params: { size: 100 } });
      return response.data.data?.content ?? response.data?.content ?? [];
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

  // Actor APIs
  async getActors() {
    try {
      const response = await authService.api.get('/api/actors');
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createActor(data) {
    try {
      const response = await authService.api.post('/api/admin/actors', data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateActor(uuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/actors/${uuid}`, data);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteActor(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/actors/${uuid}`);
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createGenre(data) {
    try {
      const response = await authService.api.post('/api/admin/genres', data);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateGenre(uuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/genres/${uuid}`, data);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteGenre(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/genres/${uuid}`);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createCountry(data) {
    try {
      const response = await authService.api.post('/api/admin/countries', data);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateCountry(uuid, data) {
    try {
      const response = await authService.api.put(`/api/admin/countries/${uuid}`, data);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteCountry(uuid) {
    try {
      const response = await authService.api.delete(`/api/admin/countries/${uuid}`);
      this.clearMetadataCache();
      return response.data.data ?? response.data;
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const movieService = new MovieService();
export default movieService;
