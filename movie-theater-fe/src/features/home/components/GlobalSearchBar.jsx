import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Search, X } from 'lucide-react';
import { searchService } from '../../../shared/services/searchService';
import './GlobalSearchBar.css';

const GlobalSearchBar = ({ className = '' }) => {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchService.search(query.trim(), 'all');
        setResults(data);
        setIsOpen(true);
      } catch {
        setResults({ movies: [], cinemas: [], actors: [] });
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const flatItems = useMemo(() => {
    if (!results) return [];
    return [
      ...(results.movies || []).map((item) => ({ ...item, group: 'Phim' })),
      ...(results.cinemas || []).map((item) => ({ ...item, group: 'Rạp' })),
      ...(results.actors || []).map((item) => ({ ...item, group: 'Diễn viên' })),
    ].slice(0, 10);
  }, [results]);

  const submitSearch = () => {
    if (!query.trim()) return;
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div ref={wrapRef} className={`global-search ${className}`}>
      <div className="global-search-input-wrap">
        <Search className="global-search-icon" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitSearch();
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder="Tìm phim, rạp, diễn viên..."
          className="global-search-input"
          aria-label="Tìm kiếm toàn cục"
        />
        {query && (
          <button type="button" className="global-search-clear" onClick={() => { setQuery(''); setResults(null); }}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && <Loader2 className="global-search-spinner" />}
      </div>

      {isOpen && flatItems.length > 0 && (
        <div className="global-search-dropdown">
          {flatItems.map((item) => (
            <Link
              key={`${item.type}-${item.uuid}`}
              to={item.href}
              className="global-search-item"
              onClick={() => setIsOpen(false)}
            >
              <span className="global-search-item-type">{item.group}</span>
              <span className="global-search-item-title">{item.title}</span>
              {item.subtitle && <span className="global-search-item-sub">{item.subtitle}</span>}
            </Link>
          ))}
          <button type="button" className="global-search-view-all" onClick={submitSearch}>
            Xem tất cả kết quả cho &quot;{query.trim()}&quot;
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;
