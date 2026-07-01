import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, MapPin, User } from 'lucide-react';
import { searchService } from '../../../shared/services/searchService';
import PageMeta from '../../../shared/components/PageMeta';
import './SearchResultsPage.css';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    searchService.search(query.trim(), 'all')
      .then(setResults)
      .catch(() => setResults({ movies: [], cinemas: [], actors: [] }))
      .finally(() => setIsLoading(false));
  }, [query]);

  const sections = [
    { key: 'movies', label: 'Phim', icon: Film, items: results?.movies || [] },
    { key: 'cinemas', label: 'Rạp chiếu', icon: MapPin, items: results?.cinemas || [] },
    { key: 'actors', label: 'Diễn viên', icon: User, items: results?.actors || [] },
  ];

  return (
    <div className="search-results-page">
      <PageMeta
        title={`Tìm kiếm: ${query || 'NASAFILM'}`}
        description={`Kết quả tìm kiếm cho "${query}" trên NASAFILM`}
      />
      <main className="search-results-main">
        <h1 className="search-results-title">Kết quả tìm kiếm</h1>
        <p className="search-results-query">
          {query ? `“${query}”` : 'Nhập từ khóa trên thanh tìm kiếm để bắt đầu.'}
        </p>

        {isLoading && <p className="search-results-empty">Đang tìm...</p>}

        {!isLoading && query && sections.every((section) => section.items.length === 0) && (
          <p className="search-results-empty">Không tìm thấy kết quả phù hợp.</p>
        )}

        {sections.map((section) => {
          if (!section.items.length) return null;
          const Icon = section.icon;
          return (
            <section key={section.key} className="search-results-section">
              <h2 className="search-results-section-title">
                <Icon className="w-4 h-4" />
                {section.label}
              </h2>
              <div className="search-results-list">
                {section.items.map((item) => (
                  <Link key={`${section.key}-${item.uuid}`} to={item.href} className="search-results-card">
                    <div>
                      <p className="search-results-card-title">{item.title}</p>
                      {item.subtitle && <p className="search-results-card-sub">{item.subtitle}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default SearchResultsPage;
