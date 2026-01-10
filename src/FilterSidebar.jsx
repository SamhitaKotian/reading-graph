import { useMemo } from 'react';

function FilterSidebar({ filteredBooks = [], onFilterChange, activeFilters = {}, onClose }) {
  // Calculate total connections (similar to BookGraph logic)
  const totalConnections = useMemo(() => {
    if (filteredBooks.length === 0) return 0;
    if (filteredBooks.length === 1) return 0;
    // Similar calculation to BookGraph: Math.min(Math.floor(books.length * 1.5), Math.max(1, books.length - 1))
    return Math.min(
      Math.floor(filteredBooks.length * 1.5),
      Math.max(1, filteredBooks.length - 1)
    );
  }, [filteredBooks]);

  const handleFilterChange = (filterName, checked) => {
    const newFilters = {
      ...activeFilters,
      [filterName]: checked,
    };

    // If "all" is checked, uncheck all other filters
    if (filterName === 'all' && checked) {
      Object.keys(newFilters).forEach(key => {
        if (key !== 'all') {
          newFilters[key] = false;
        }
      });
    } else if (filterName !== 'all' && checked) {
      // If any other filter is checked, uncheck "all"
      newFilters.all = false;
    } else if (filterName !== 'all' && !checked) {
      // If a filter is unchecked, check if all other filters are also unchecked
      // If so, set "all" to true (default state)
      const otherFiltersActive = Object.keys(newFilters).some(key => 
        key !== 'all' && key !== filterName && newFilters[key] === true
      );
      
      if (!otherFiltersActive) {
        // No other filters are active, set "all" to true
        newFilters.all = true;
        // Make sure the filter being unchecked is set to false
        newFilters[filterName] = false;
      }
    }

    onFilterChange(newFilters);
  };

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: '#0f1419',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 tracking-wide" style={{ color: '#ffffff' }}>
            Filters
          </h2>
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-gray-400 hover:text-white transition-colors"
              aria-label="Close filters"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-4">
        {/* All Books */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.all === true}
            onChange={(e) => handleFilterChange('all', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            All Books
          </span>
        </label>

        {/* Top Rated */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.topRated || false}
            onChange={(e) => handleFilterChange('topRated', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            Top Rated (4-5 stars)
          </span>
        </label>

        {/* Last 20 Read */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.last20 || false}
            onChange={(e) => handleFilterChange('last20', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            Last 20 Read
          </span>
        </label>

        {/* Fiction */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.fiction || false}
            onChange={(e) => handleFilterChange('fiction', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            Fiction
          </span>
        </label>

        {/* Self-Help/Non-Fiction */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.selfHelp || false}
            onChange={(e) => handleFilterChange('selfHelp', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            Self-Help/Non-Fiction
          </span>
        </label>

        {/* Memoirs */}
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={activeFilters.memoirs || false}
            onChange={(e) => handleFilterChange('memoirs', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500 focus:ring-2"
            style={{
              accentColor: '#9333ea',
            }}
          />
          <span className="ml-3 text-sm text-gray-300 group-hover:text-white transition-colors leading-relaxed">
            Memoirs
          </span>
        </label>
        </div>
      </div>

      {/* Stats at bottom */}
      <div
        className="border-t p-6"
        style={{
          borderColor: 'rgba(255, 255, 255, 0.1)',
          flexShrink: 0,
        }}
      >
        <div className="space-y-2 leading-relaxed">
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Total books:</span>{' '}
            <span className="text-gray-300 font-medium">{filteredBooks.length}</span>
          </div>
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Total connections:</span>{' '}
            <span className="text-gray-300 font-medium">{totalConnections}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilterSidebar;
