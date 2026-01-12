import { useState, useEffect } from 'react';
import { generateInsights } from '../geminiAPI';

function QuotesPanel({ book, isOpen, onClose, isLoading = false, books = [] }) {
  const [expandedThemes, setExpandedThemes] = useState(new Set());
  const [bookmarkedQuotes, setBookmarkedQuotes] = useState(new Set());
  const [insights, setInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  // Load bookmarked quotes from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bookmarkedQuotes');
    if (savedBookmarks) {
      try {
        const bookmarks = JSON.parse(savedBookmarks);
        setBookmarkedQuotes(new Set(bookmarks));
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
  }, []);

  // Save bookmark to localStorage
  const handleBookmarkClick = (quote, theme) => {
    const bookmarkKey = `${book?.title || ''}|||${book?.author || ''}|||${quote}|||${theme}`;
    const savedBookmarks = localStorage.getItem('bookmarkedQuotes');
    let bookmarks = savedBookmarks ? JSON.parse(savedBookmarks) : [];
    
    if (bookmarkedQuotes.has(bookmarkKey)) {
      // Remove bookmark
      bookmarks = bookmarks.filter(b => b.key !== bookmarkKey);
      setBookmarkedQuotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookmarkKey);
        return newSet;
      });
    } else {
      // Add bookmark
      const bookmark = {
        key: bookmarkKey,
        quote,
        theme,
        bookTitle: book?.title || '',
        bookAuthor: book?.author || '',
        dateAdded: new Date().toISOString()
      };
      bookmarks.push(bookmark);
      setBookmarkedQuotes(prev => new Set([...prev, bookmarkKey]));
    }
    
    localStorage.setItem('bookmarkedQuotes', JSON.stringify(bookmarks));
  };

  // Check if a quote is bookmarked
  const isBookmarked = (quote, theme) => {
    const bookmarkKey = `${book?.title || ''}|||${book?.author || ''}|||${quote}|||${theme}`;
    return bookmarkedQuotes.has(bookmarkKey);
  };

  // Generate AI insights
  const handleGenerateInsights = async () => {
    if (!book || !book.title || !book.author) return;
    
    setIsGeneratingInsights(true);
    setInsightsError(null);
    
    try {
      const result = await generateInsights(book.title, book.author, books);
      setInsights(result);
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsightsError(error.message || 'Failed to generate insights. Please try again.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Reset insights when book changes
  useEffect(() => {
    setInsights(null);
    setInsightsError(null);
  }, [book?.title, book?.author]);

  if (!isOpen) return null;

  const themes = book?.themes || [];
  const allQuotes = book?.quotes || [];

  const toggleTheme = (themeName) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(themeName)) {
      newExpanded.delete(themeName);
    } else {
      newExpanded.add(themeName);
    }
    setExpandedThemes(newExpanded);
  };

  const getQuotesForTheme = (theme) => {
    const themeName = typeof theme === 'string' ? theme : theme.theme;
    // Get quotes from theme object if it has quotes, otherwise from flat quotes array
    if (theme.quotes && Array.isArray(theme.quotes)) {
      return theme.quotes.slice(0, 3);
    }
    // Fallback: return first 3 quotes from all quotes
    return allQuotes.slice(0, 3);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full md:w-96 backdrop-blur-lg bg-gray-900/80 border-l border-purple-500/30 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          boxShadow: '0 0 40px rgba(147, 51, 234, 0.3)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 backdrop-blur-lg bg-gray-900/80 border-b border-purple-500/30 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Book Quotes</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-purple-500/20 rounded-lg"
              aria-label="Close panel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Loading Spinner */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            </div>
          ) : book ? (
            /* Book Info */
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white leading-tight">{book.title}</h3>
              {book.author && (
                <p className="text-purple-300 text-sm">by {book.author}</p>
              )}
              {book.rating && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">★</span>
                  <span className="text-gray-300 text-sm">{book.rating}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">Loading quotes...</p>
          </div>
        ) : !book ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-400">No book selected</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {themes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400">No themes or quotes available for this book.</p>
              </div>
            ) : (
            themes.map((theme, index) => {
              const themeName = typeof theme === 'string' ? theme : theme.theme;
              const isExpanded = expandedThemes.has(themeName);
              const quotes = getQuotesForTheme(theme);

              return (
                <div
                  key={index}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20 overflow-hidden transition-all duration-300"
                  style={{
                    boxShadow: isExpanded 
                      ? '0 4px 20px rgba(147, 51, 234, 0.2)' 
                      : '0 2px 10px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  {/* Theme Header - Clickable */}
                  <button
                    onClick={() => toggleTheme(themeName)}
                    className="w-full px-4 py-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors"
                  >
                    <h4 className="text-lg font-semibold text-white text-left">{themeName}</h4>
                    <svg
                      className={`w-5 h-5 text-purple-400 transition-transform duration-300 ${isExpanded ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Theme Content - Expandable */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 animate-fadeIn">
                      {quotes.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No quotes available for this theme.</p>
                      ) : (
                        quotes.map((quote, quoteIndex) => (
                          <div
                            key={quoteIndex}
                            className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/10 hover:border-purple-500/30 transition-all group"
                          >
                            <div className="flex items-start gap-3">
                              {/* Quote text */}
                              <p className="text-gray-200 text-sm leading-relaxed flex-1 italic">
                                "{quote}"
                              </p>
                              
                              {/* Bookmark icon - filled if bookmarked */}
                              <button
                                className={`flex-shrink-0 transition-colors p-1 ${
                                  isBookmarked(quote, themeName) 
                                    ? 'text-yellow-400 hover:text-yellow-300' 
                                    : 'text-gray-500 hover:text-purple-400'
                                }`}
                                aria-label={isBookmarked(quote, themeName) ? 'Remove bookmark' : 'Bookmark quote'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookmarkClick(quote, themeName);
                                }}
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill={isBookmarked(quote, themeName) ? 'currentColor' : 'none'}
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
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
            )}

            {/* AI Insights Section */}
            <div className="mt-6 pt-6 border-t border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">AI Insights</h3>
                {!insights && (
                  <button
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights || !book}
                    className="px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: '#9333ea',
                      color: '#ffffff',
                      boxShadow: '0 0 10px rgba(147, 51, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.boxShadow = '0 0 15px rgba(147, 51, 234, 0.5)';
                        e.target.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.boxShadow = '0 0 10px rgba(147, 51, 234, 0.3)';
                        e.target.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {isGeneratingInsights ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate Insights</span>
                    )}
                  </button>
                )}
              </div>

              {isGeneratingInsights && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-sm">Generating insights...</p>
                  </div>
                </div>
              )}

              {insightsError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-red-400 text-sm">{insightsError}</p>
                </div>
              )}

              {insights && !isGeneratingInsights && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Book Suggestions */}
                  {insights.suggestions && insights.suggestions.length > 0 && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4">
                      <h4 className="text-md font-semibold text-purple-300 mb-3">Similar Books</h4>
                      <div className="space-y-3">
                        {insights.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="bg-gray-900/50 rounded-lg p-3 border border-purple-500/10 hover:border-purple-500/30 transition-all"
                          >
                            <div className="flex items-start gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                                New for you
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium text-sm mb-1">
                                  {suggestion.title}
                                </p>
                                {suggestion.author && (
                                  <p className="text-purple-300 text-xs">by {suggestion.author}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regenerate button */}
                  <button
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights}
                    className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    style={{ 
                      backgroundColor: 'rgba(147, 51, 234, 0.2)',
                      color: '#9333ea',
                      border: '1px solid rgba(147, 51, 234, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = 'rgba(147, 51, 234, 0.2)';
                      }
                    }}
                  >
                    Regenerate Insights
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!isLoading && book && (
          <div className="sticky bottom-0 backdrop-blur-lg bg-gray-900/80 border-t border-purple-500/30 p-4 text-center">
            <p className="text-gray-400 text-xs">
              {themes.length} theme{themes.length !== 1 ? 's' : ''} • {allQuotes.length} quote{allQuotes.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

export default QuotesPanel;
