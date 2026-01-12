import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function BookmarksView() {
  const [bookmarks, setBookmarks] = useState([]);
  const [groupedBookmarks, setGroupedBookmarks] = useState({});
  const navigate = useNavigate();

  // Load bookmarks from localStorage
  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    const savedBookmarks = localStorage.getItem('bookmarkedQuotes');
    if (savedBookmarks) {
      try {
        const parsed = JSON.parse(savedBookmarks);
        setBookmarks(parsed);
        
        // Group bookmarks by book
        const grouped = {};
        parsed.forEach(bookmark => {
          const bookKey = `${bookmark.bookTitle}|||${bookmark.bookAuthor}`;
          if (!grouped[bookKey]) {
            grouped[bookKey] = {
              title: bookmark.bookTitle,
              author: bookmark.bookAuthor,
              quotes: []
            };
          }
          grouped[bookKey].quotes.push(bookmark);
        });
        setGroupedBookmarks(grouped);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
  };

  const handleDeleteBookmark = (bookmarkKey) => {
    const updatedBookmarks = bookmarks.filter(b => b.key !== bookmarkKey);
    localStorage.setItem('bookmarkedQuotes', JSON.stringify(updatedBookmarks));
    loadBookmarks(); // Reload to update grouped view
  };

  const handleDeleteAllFromBook = (bookKey) => {
    const bookQuotes = groupedBookmarks[bookKey].quotes;
    const bookmarkKeys = new Set(bookQuotes.map(q => q.key));
    const updatedBookmarks = bookmarks.filter(b => !bookmarkKeys.has(b.key));
    localStorage.setItem('bookmarkedQuotes', JSON.stringify(updatedBookmarks));
    loadBookmarks();
  };

  const bookGroups = Object.entries(groupedBookmarks);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0e27' }}>
      {/* Header */}
      <div className="border-b px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-wide" 
            style={{ 
              color: '#ffffff',
              textShadow: '0 0 20px rgba(147, 51, 234, 0.4)'
            }}
          >
            Bookmarked Quotes
          </h1>
          <div className="flex flex-wrap gap-3 md:gap-5">
            <button
              onClick={() => navigate('/graph')}
              className="min-h-[44px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm md:text-base"
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
              Back to Graph
            </button>
            <button
              onClick={() => navigate('/')}
              className="min-h-[44px] px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm md:text-base"
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
              Upload
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 space-y-4 md:space-y-6 lg:space-y-8">
        <div className="container mx-auto max-w-4xl">
          {bookGroups.length === 0 ? (
            <div className="text-center py-12 md:py-20 space-y-4 md:space-y-6 lg:space-y-8">
              <div className="mb-4 md:mb-6">
                <svg
                  className="w-16 h-16 md:w-24 md:h-24 mx-auto text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2 leading-relaxed">No bookmarks yet</h2>
              <p className="text-sm md:text-base text-gray-400 mb-6 leading-relaxed">
                Start bookmarking quotes from your books to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 lg:space-y-8">
              {bookGroups.map(([bookKey, bookData]) => (
                <div
                  key={bookKey}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-purple-500/20 overflow-hidden mb-6"
                  style={{
                    boxShadow: '0 4px 20px rgba(147, 51, 234, 0.1)'
                  }}
                >
                  {/* Book Header */}
                  <div className="px-4 py-3 md:px-6 md:py-4 border-b border-purple-500/20 bg-gray-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                    <div>
                      <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white leading-relaxed">{bookData.title}</h3>
                      {bookData.author && (
                        <p className="text-purple-300 text-sm md:text-base mt-1 leading-normal">by {bookData.author}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAllFromBook(bookKey)}
                      className="min-h-[44px] px-4 py-2 text-sm md:text-base rounded-lg font-medium transition-all duration-300 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      aria-label="Delete all bookmarks from this book"
                    >
                      Delete All
                    </button>
                  </div>

                  {/* Quotes */}
                  <div className="p-4 md:p-6 space-y-4 md:space-y-6 lg:space-y-8">
                    {bookData.quotes.map((bookmark, index) => (
                      <div
                        key={bookmark.key}
                        className="bg-gray-800/50 rounded-lg p-4 border border-purple-500/10 hover:border-purple-500/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Theme badge */}
                          {bookmark.theme && (
                            <div className="flex-shrink-0">
                              <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 leading-normal">
                                {bookmark.theme}
                              </span>
                            </div>
                          )}
                          
                          {/* Quote text */}
                          <p className="text-gray-200 text-sm md:text-base leading-relaxed flex-1 italic">
                            "{bookmark.quote}"
                          </p>
                          
                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteBookmark(bookmark.key)}
                            className="min-h-[44px] min-w-[44px] px-3 py-2 flex-shrink-0 text-gray-500 hover:text-red-400 transition-colors flex items-center justify-center"
                            aria-label="Delete bookmark"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookmarksView;
