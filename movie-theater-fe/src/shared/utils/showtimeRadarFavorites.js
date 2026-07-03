export const collectGenreUuidsFromFavorites = (favorites = []) => {
  const genreIds = new Set();
  for (const favorite of favorites) {
    for (const genreUuid of favorite?.genreUuids ?? []) {
      if (genreUuid != null) {
        genreIds.add(String(genreUuid));
      }
    }
  }
  return [...genreIds];
};

export const mergeGenreSelections = (current = [], fromFavorites = []) => [
  ...new Set([...current.map(String), ...fromFavorites.map(String)]),
];

export const removeFavoriteDerivedGenres = (current = [], fromFavorites = []) => {
  const favoriteSet = new Set(fromFavorites.map(String));
  return current.map(String).filter((genreUuid) => !favoriteSet.has(genreUuid));
};
