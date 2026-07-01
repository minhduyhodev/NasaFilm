import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Loader2, Search, Tags } from 'lucide-react';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';
import './CatalogBrowsePage.css';

const PAGE_META = {
  genre: {
    title: 'Thể loại phim',
    subtitle: 'Khám phá phim theo thể loại yêu thích của bạn',
    placeholder: 'Tìm thể loại...',
    empty: 'Không tìm thấy thể loại phù hợp',
    icon: Tags,
    buildLink: (uuid) => `/movies?genre=${uuid}`,
  },
  country: {
    title: 'Quốc gia',
    subtitle: 'Xem phim theo quốc gia sản xuất',
    placeholder: 'Tìm quốc gia...',
    empty: 'Không tìm thấy quốc gia phù hợp',
    icon: Globe,
    buildLink: (uuid) => `/movies?country=${uuid}`,
  },
};

const CatalogBrowsePage = ({ variant = 'genre' }) => {
  const meta = PAGE_META[variant] || PAGE_META.genre;
  const Icon = meta.icon;
  const [query, setQuery] = useState('');
  const { data, isLoading, isError } = useMovieFilterOptions();

  const items = useMemo(() => {
    const source = variant === 'country' ? (data?.countries || []) : (data?.genres || []);
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((item) => item.name?.toLowerCase().includes(q));
  }, [data, variant, query]);

  return (
    <div className="catalog-browse-page">
      <main className="catalog-browse-container">
        <header className="catalog-browse-header">
          <div className="catalog-browse-badge">
            <Icon className="h-4 w-4" aria-hidden />
            <span>{variant === 'country' ? 'Quốc gia' : 'Thể loại'}</span>
          </div>
          <h1 className="catalog-browse-title">{meta.title}</h1>
          <p className="catalog-browse-subtitle">{meta.subtitle}</p>
        </header>

        <div className="catalog-browse-search">
          <Search className="catalog-browse-search-icon" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={meta.placeholder}
            className="catalog-browse-search-input"
            aria-label={meta.placeholder}
          />
        </div>

        {isLoading ? (
          <div className="catalog-browse-loading">
            <Loader2 className="h-8 w-8 animate-spin text-red-500" />
            <span>Đang tải danh mục...</span>
          </div>
        ) : isError ? (
          <div className="catalog-browse-empty">Không thể tải danh mục. Vui lòng thử lại sau.</div>
        ) : items.length === 0 ? (
          <div className="catalog-browse-empty">{meta.empty}</div>
        ) : (
          <div className="catalog-browse-grid">
            {items.map((item) => (
              <Link
                key={item.uuid}
                to={meta.buildLink(item.uuid)}
                className="catalog-browse-chip"
                title={item.name}
              >
                <span className="catalog-browse-chip-label">{item.name}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CatalogBrowsePage;

export function GenresBrowsePage() {
  return <CatalogBrowsePage variant="genre" />;
}

export function CountriesBrowsePage() {
  return <CatalogBrowsePage variant="country" />;
}
