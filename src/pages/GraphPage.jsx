import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BookGraph from '../BookGraph';
import FilterSidebar from '../FilterSidebar';

function GraphPage() {
  const [books, setBooks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNodeSelected, setIsNodeSelected] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [quotesPanelOpen, setQuotesPanelOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    all: true,
    topRated: false,
    last20: false,
    fiction: false,
    selfHelp: false,
    memoirs: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  const handleReset = () => {
    setIsNodeSelected(false);
    setSelectedBook(null);
    setQuotesPanelOpen(false);
    if (window.__bookGraphReset) {
      window.__bookGraphReset();
    }
  };

  // Expose functions for BookGraph to notify when node is selected (for backward compatibility)
  useEffect(() => {
    window.setIsNodeSelected = setIsNodeSelected;
    return () => {
      delete window.setIsNodeSelected;
    };
  }, []);

  // Load books from navigation state or localStorage on mount
  useEffect(() => {
    // First try to get books from navigation state
    if (location.state?.books && location.state.books.length > 0) {
      setBooks(location.state.books);
      // Also save to localStorage for persistence
      localStorage.setItem('readingGraphBooks', JSON.stringify(location.state.books));
    } else {
      // Fallback to localStorage
      const savedBooks = localStorage.getItem('readingGraphBooks');
      if (savedBooks) {
        try {
          const parsedBooks = JSON.parse(savedBooks);
          setBooks(parsedBooks);
        } catch (error) {
          console.error('Error loading books from localStorage:', error);
        }
      }
    }
  }, [location.state]);

  // Parse date string to Date object for sorting
  const parseDate = (dateString) => {
    if (!dateString || dateString.trim() === '') return new Date(0);
    
    try {
      let date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        const parts = dateString.split('/');
        if (parts.length >= 2) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
          date = new Date(year, month, day);
        } else {
          const dashParts = dateString.split('-');
          if (dashParts.length >= 2) {
            const year = parseInt(dashParts[0], 10);
            const month = parseInt(dashParts[1], 10) - 1;
            const day = dashParts.length > 2 ? parseInt(dashParts[2], 10) : 1;
            date = new Date(year, month, day);
          }
        }
      }
      
      return isNaN(date.getTime()) ? new Date(0) : date;
    } catch {
      return new Date(0);
    }
  };

  // Check if book belongs to a genre based on bookshelves or exclusiveShelf
  const hasGenre = (book, genreKeywords) => {
    if (!book) return false;
    
    const bookshelves = (book.bookshelves || '').toLowerCase();
    const exclusiveShelf = (book.exclusiveShelf || '').toLowerCase();
    const combined = `${bookshelves} ${exclusiveShelf}`;
    
    return genreKeywords.some(keyword => 
      combined.includes(keyword.toLowerCase())
    );
  };

  // Filter books based on active filters
  const filterBooks = (booksList, filters) => {
    if (!booksList || booksList.length === 0) {
      return [];
    }

    let filtered = [...booksList];

    // If 'all' is true, return all books
    if (filters.all) {
      return filtered;
    }

    // Apply top rated filter
    if (filters.topRated) {
      filtered = filtered.filter(book => {
        const rating = parseFloat(book.rating) || 0;
        return rating >= 4;
      });
    }

    // Apply last 20 filter - sort by Date Read
    if (filters.last20) {
      filtered.sort((a, b) => {
        const dateA = parseDate(a.dateRead);
        const dateB = parseDate(b.dateRead);
        return dateB.getTime() - dateA.getTime();
      });
      
      filtered = filtered.slice(0, 20);
    }

    // Apply genre filters
    if (filters.fiction) {
      filtered = filtered.filter(book => 
        hasGenre(book, ['fiction', 'novel', 'literary fiction', 'contemporary fiction'])
      );
    }

    if (filters.selfHelp) {
      filtered = filtered.filter(book => 
        hasGenre(book, ['self-help', 'self help', 'non-fiction', 'nonfiction', 'personal development', 'psychology', 'business'])
      );
    }

    if (filters.memoirs) {
      filtered = filtered.filter(book => 
        hasGenre(book, ['memoir', 'memoirs', 'autobiography', 'biography'])
      );
    }

    return filtered;
  };

  // Calculate filtered books based on active filters
  const filteredBooks = useMemo(() => {
    return filterBooks(books, activeFilters);
  }, [books, activeFilters]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0e27' }}>
      {/* Header */}
      <div className="border-b md:px-6 md:py-6 lg:px-8 lg:py-8" style={{ borderColor: 'rgba(255, 255, 255, 0.1)', padding: '24px' }}>
        <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide" 
            style={{ 
              color: '#ffffff',
              textShadow: '0 0 20px rgba(147, 51, 234, 0.4)'
            }}
          >
            A Novel Universe
          </h1>
          <div className="flex items-center gap-2 md:gap-5 w-full md:w-auto justify-between md:justify-end">
            {/* Mobile menu button - moved here */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg transition-all duration-300 flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgba(147, 51, 234, 0.8)',
                color: '#ffffff',
                boxShadow: '0 0 15px rgba(147, 51, 234, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 25px rgba(147, 51, 234, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 0 15px rgba(147, 51, 234, 0.5)';
              }}
              aria-label="Toggle filters"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {sidebarOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
            <div className="flex items-center gap-2 md:gap-5">
              <button
                onClick={() => navigate('/bookmarks')}
                className="min-h-[44px] px-3 md:px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 text-sm md:text-base"
                style={{ 
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  boxShadow: '0 0 15px rgba(147, 51, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 25px rgba(147, 51, 234, 0.6)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 0 15px rgba(147, 51, 234, 0.4)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span className="hidden sm:inline">Bookmarks</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="min-h-[44px] px-3 md:px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm md:text-base"
                style={{ 
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  boxShadow: '0 0 15px rgba(147, 51, 234, 0.4)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 25px rgba(147, 51, 234, 0.6)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 0 15px rgba(147, 51, 234, 0.4)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <span className="md:hidden">Back</span>
                <span className="hidden md:inline">Back to Upload</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with sidebar and graph */}
      {books.length > 0 ? (
        <div className="flex flex-1 overflow-hidden relative min-h-0" style={{ padding: '24px' }}>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Filter Sidebar */}
          <div
            className={`
              absolute md:relative
              h-full flex-shrink-0 z-40
              transform transition-transform duration-300 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              w-64 md:w-64 lg:w-72
            `}
          >
            <FilterSidebar
              filteredBooks={filteredBooks}
              onFilterChange={setActiveFilters}
              activeFilters={activeFilters}
              onClose={() => setSidebarOpen(false)}
            />
          </div>

          {/* Graph area */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {/* Reset/Back Button - shown when node is selected */}
            {(isNodeSelected || quotesPanelOpen) && (
              <button
                onClick={handleReset}
                className="absolute top-4 left-4 z-50 min-h-[44px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 md:gap-3 text-sm md:text-base"
                style={{ 
                  backgroundColor: 'rgba(147, 51, 234, 0.9)',
                  color: '#ffffff',
                  boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 0 30px rgba(147, 51, 234, 0.7)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.5)';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Reset View
              </button>
            )}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-0 w-full h-full">
                <BookGraph 
                  books={filteredBooks} 
                  onReset={() => {
                    setIsNodeSelected(false);
                    setSelectedBook(null);
                    setQuotesPanelOpen(false);
                  }}
                  onBookUpdate={(updatedBooks) => {
                    // Update books state when a book is analyzed
                    setBooks(updatedBooks);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center" style={{ padding: '24px' }}>
          <div className="text-center space-y-4 md:space-y-6 lg:space-y-8">
            <p className="text-sm md:text-base lg:text-lg mb-4 leading-relaxed" style={{ color: '#d1d5db' }}>
              No books found. Please upload books first.
            </p>
            <button
              onClick={() => navigate('/')}
              className="min-h-[44px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm md:text-base"
              style={{ 
                backgroundColor: '#9333ea',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.5)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = '0 0 30px rgba(147, 51, 234, 0.7)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.5)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Go to Upload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GraphPage;
