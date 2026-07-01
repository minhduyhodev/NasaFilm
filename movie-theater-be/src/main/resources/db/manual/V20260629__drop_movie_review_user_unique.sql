-- Allow multiple reviews per user per movie (run once if uk_movie_review_movie_user still exists)
ALTER TABLE movie_review DROP CONSTRAINT IF EXISTS uk_movie_review_movie_user;
