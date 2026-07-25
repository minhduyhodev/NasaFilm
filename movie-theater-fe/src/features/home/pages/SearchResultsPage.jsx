import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Film, MapPin, User } from 'lucide-react';
import { searchService } from '../../../shared/services/searchService';
import PageMeta from '../../../shared/components/PageMeta';
import './SearchResultsPage.css';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatches = (text, query) => {
  if (!text) return null;
  const trimmed = query.trim();
  if (!trimmed) return text;

  const parts = text.split(new RegExp(`(${escapeRegex(trimmed)})`, 'ig'));
  return parts.map((part, index) =>
    part.toLowerCase() === trimmed.toLowerCase()
      ? <mark key={`${part}-${index}`} className="search-highlight">{part}</mark>
      : part
  );
};

const rankSections = (query, sections) => {
  const normalized = query.trim().toLowerCase();
  const actorFirst = normalized.length > 0 && sections.some((section) =>
    section.key === 'actors' && section.items.some((item) => item.title?.toLowerCase() === normalized)
  );

  if (actorFirst) {
    return [
      sections.find((section) => section.key === 'actors'),
      sections.find((section) => section.key === 'movies'),
      sections.find((section) => section.key === 'cinemas'),
    ].filter(Boolean);
  }

  return sections;
};

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

  const orderedSections = useMemo(() => rankSections(query, sections), [query, results]);

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

        {orderedSections.map((section) => {
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
                      <p className="search-results-card-title">{highlightMatches(item.title, query)}</p>
                      {item.subtitle && <p className="search-results-card-sub">{highlightMatches(item.subtitle, query)}</p>}
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
