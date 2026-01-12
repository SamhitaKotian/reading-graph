import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { analyzeBook } from '../geminiAPI';

function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [readBooks, setReadBooks] = useState(null);
  const [error, setError] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Parse CSV content
  const parseCSV = (text) => {
    const lines = text.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid');
    }

    // Get headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Find column indices for Goodreads CSV columns
    const bookIdIndex = headers.findIndex(h => h === 'Book Id' || h === 'Book ID');
    const titleIndex = headers.findIndex(h => h === 'Title');
    const authorIndex = headers.findIndex(h => h === 'Author');
    const ratingIndex = headers.findIndex(h => h === 'My Rating');
    const dateReadIndex = headers.findIndex(h => h === 'Date Read' || h === 'Date Added');
    const bookshelvesIndex = headers.findIndex(h => h === 'Bookshelves' || h === 'Bookshelf');
    const exclusiveShelfIndex = headers.findIndex(h => h === 'Exclusive Shelf');

    if (titleIndex === -1 || authorIndex === -1) {
      throw new Error('CSV file must contain Title and Author columns');
    }

    // Parse data rows
    const parsedBooks = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing with quoted fields
      const row = [];
      let currentField = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentField += '"';
            j++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());

      // Extract book data
      const bookId = bookIdIndex !== -1 ? (row[bookIdIndex]?.replace(/"/g, '') || '') : '';
      const title = row[titleIndex]?.replace(/"/g, '') || '';
      const author = row[authorIndex]?.replace(/"/g, '') || '';
      const rating = ratingIndex !== -1 ? (row[ratingIndex]?.replace(/"/g, '') || '') : '';
      const dateRead = dateReadIndex !== -1 ? (row[dateReadIndex]?.replace(/"/g, '') || '') : '';
      const bookshelves = bookshelvesIndex !== -1 ? (row[bookshelvesIndex]?.replace(/"/g, '') || '') : '';
      const exclusiveShelf = exclusiveShelfIndex !== -1 ? (row[exclusiveShelfIndex]?.replace(/"/g, '') || '') : '';

      if (title && author) {
        parsedBooks.push({
          id: bookId || `${i}-${title}-${author}`,
          title: title,
          author: author,
          rating: rating || 'Not rated',
          dateRead: dateRead || '',
          bookshelves: bookshelves || '',
          exclusiveShelf: exclusiveShelf || '',
        });
      }
    }

    return parsedBooks;
  };

  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const text = await file.text();
      const parsedBooks = parseCSV(text);
      
      if (parsedBooks.length === 0) {
        throw new Error('No valid books found in the CSV file');
      }

      // Filter out unread books (rating = 0)
      const filteredReadBooks = parsedBooks.filter(book => {
        const rating = parseFloat(book.rating) || 0;
        return rating > 0;
      });

      if (filteredReadBooks.length === 0) {
        throw new Error('No read books found. Please upload a CSV with books that have ratings.');
      }

      // Store books for loading screen (shows book count)
      setReadBooks(filteredReadBooks);
      setIsAnalyzing(true);
      setAnalysisProgress(0);

      // Analyze each book with Groq API
      const analyzedBooks = [];
      const totalBooks = filteredReadBooks.length;

      for (let i = 0; i < filteredReadBooks.length; i++) {
        const book = filteredReadBooks[i];
        
        try {
          // Call analyzeBook API
          const analysisResult = await analyzeBook(book.title, book.author);
          
          // Add themes and quotes to book object
          const enrichedBook = {
            ...book,
            themes: analysisResult.themes || [],
            quotes: analysisResult.themes?.flatMap(theme => theme.quotes || []) || []
          };
          
          analyzedBooks.push(enrichedBook);
        } catch (err) {
          console.error(`Error analyzing book "${book.title}":`, err);
          // Continue with book even if analysis fails
          analyzedBooks.push({
            ...book,
            themes: [],
            quotes: []
          });
        }

        // Update progress after each book is processed
        setAnalysisProgress(Math.floor(((i + 1) / totalBooks) * 100));

        // Small delay to avoid rate limiting (except for last book)
        if (i < filteredReadBooks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Ensure progress is 100% and stop analyzing
      setAnalysisProgress(100);
      setIsAnalyzing(false);

      // Navigate to graph with analyzed books
      setTimeout(() => {
        navigate('/graph', { state: { books: analyzedBooks } });
      }, 500);

    } catch (err) {
      setError(err.message || 'Error parsing CSV file');
      setIsLoading(false);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      setReadBooks(null);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Step Component
  const Step = ({ number, text }) => (
    <div className="flex items-center gap-3">
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg p-3"
        style={{
          backgroundColor: 'rgba(147, 51, 234, 0.2)',
          border: '2px solid rgba(147, 51, 234, 0.5)',
          color: '#9333ea'
        }}
      >
        {number}
      </div>
      <span className="py-3 leading-relaxed" style={{ color: '#9ca3af', fontSize: '16px' }}>
        {text}
      </span>
    </div>
  );

  return (
    <>
      {/* Loading Screen Overlay */}
      {isLoading && readBooks && (
        <LoadingScreen 
          bookCount={readBooks.length} 
          analysisProgress={analysisProgress}
          isAnalyzing={isAnalyzing}
        />
      )}

      <div 
        className="min-h-screen bg-[#0a0e27] flex flex-col relative overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Navigation Bar */}
        <div className="border-b px-6 py-4 md:px-8 md:py-6" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="container mx-auto flex items-center justify-end">
            <button
              onClick={() => navigate('/bookmarks')}
              className="px-3 py-1.5 rounded-lg font-semibold transition-all duration-300 flex items-center gap-3"
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
              Bookmarks
            </button>
          </div>
        </div>

        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(59, 130, 246, 0.15) 50%, rgba(147, 51, 234, 0.15) 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 15s ease infinite'
          }}
        />

        {/* Animated Background Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20"
              style={{
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                backgroundColor: '#9333ea',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float${i} ${Math.random() * 10 + 15}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
                boxShadow: '0 0 10px rgba(147, 51, 234, 0.5)'
              }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative z-10">
        {/* MAIN CONTENT WRAPPER */}
        <div className="w-full max-w-6xl mx-auto py-12">
          
          {/* Icon */}
          <div className="flex justify-center">
            <div className="animate-bounce-slow">
              <div 
                className="relative"
                style={{
                  filter: 'drop-shadow(0 0 40px rgba(147, 51, 234, 0.6))'
                }}
              >
                <svg
                  className="w-32 h-32 md:w-40 md:h-40"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: '#9333ea' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                {/* Glow effect */}
                <div 
                  className="absolute inset-0 rounded-full animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%)',
                    transform: 'scale(1.5)',
                    zIndex: -1
                  }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-wide bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3"
              style={{ 
                backgroundSize: '200% 200%',
                animation: 'gradientShift 3s ease infinite',
                filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.5))'
              }}
            >
              Your Reading Universe
            </h1>
            <p 
              className="text-lg md:text-xl lg:text-2xl text-gray-400 leading-relaxed mb-10"
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}
            >
              Discover the hidden connections in your library
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-10 lg:gap-12 mt-12">
            <Step number="1" text="Export your Goodreads library" />
            <svg 
              className="w-6 h-6 hidden md:block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#6b7280' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Step number="2" text="Upload here" />
            <svg 
              className="w-6 h-6 hidden md:block"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: '#6b7280' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Step number="3" text="See your reading universe" />
          </div>

          {/* Upload Card */}
          <div className="flex justify-center px-4 mt-12">
            <div className="w-full max-w-2xl">
              {!isLoading && (
                <div 
                  className="bg-blue-900/20 backdrop-blur-lg rounded-2xl border border-blue-800/30 p-12 md:p-20 w-full relative z-10 cursor-pointer transition-all duration-500"
                  onClick={handleClick}
                  style={{
                    backgroundColor: isDragging 
                      ? 'rgba(147, 51, 234, 0.15)' 
                      : 'rgba(59, 130, 246, 0.1)',
                    borderColor: isDragging 
                      ? 'rgba(147, 51, 234, 0.5)' 
                      : 'rgba(59, 130, 246, 0.3)',
                    boxShadow: isDragging
                      ? '0 0 60px rgba(147, 51, 234, 0.4), inset 0 0 60px rgba(147, 51, 234, 0.1)'
                      : '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 1px rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'rgba(147, 51, 234, 0.4)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(147, 51, 234, 0.2), inset 0 0 1px rgba(255, 255, 255, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 1px rgba(255, 255, 255, 0.1)';
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {/* Cloud Icon */}
                  <div className="flex justify-center mb-12">
                    <div 
                      className="relative animate-pulse-slow"
                      style={{
                        filter: 'drop-shadow(0 0 20px rgba(147, 51, 234, 0.5))'
                      }}
                    >
                      <svg
                        className="w-20 h-20 md:w-24 md:h-24"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        style={{ color: isDragging ? '#9333ea' : '#9ca3af' }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Drag drop text */}
                  <h2 
                    className="text-2xl md:text-3xl font-semibold text-center mb-6 py-2 transition-colors duration-300 tracking-wide leading-relaxed"
                    style={{ 
                      color: isDragging ? '#9333ea' : '#ffffff',
                      textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
                    }}
                  >
                    {isDragging ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
                  </h2>

                  {/* Or text */}
                  <p 
                    className="text-gray-400 text-center mb-10 py-1 transition-colors duration-300 leading-normal"
                    style={{ color: isDragging ? '#d1d5db' : '#9ca3af' }}
                  >
                    or click to browse
                  </p>

                  {/* Button */}
                  <div className="flex justify-center">
                    <button
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-lg transition-all duration-300 relative overflow-hidden group"
                      style={{
                        color: '#ffffff',
                        boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = '0 0 40px rgba(147, 51, 234, 0.7)';
                        e.target.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = '0 0 30px rgba(147, 51, 234, 0.5)';
                        e.target.style.transform = 'translateY(0)';
                      }}
                    >
                      <span className="relative z-10">Choose File</span>
                      {/* Button glow effect */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, transparent 70%)',
                          filter: 'blur(10px)'
                        }}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex justify-center px-4">
              <div 
                className="p-4 rounded-xl text-center backdrop-blur-sm leading-relaxed mb-6"
                style={{
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  color: '#fca5a5'
                }}
              >
                {error}
              </div>
            </div>
          )}

        </div>
        </div>

        {/* CSS Animations */}
        <style>{`
          @keyframes gradientShift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }

          @keyframes bounce-slow {
            0%, 100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          @keyframes pulse-slow {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }

          .animate-bounce-slow {
            animation: bounce-slow 3s ease-in-out infinite;
          }

          .animate-pulse-slow {
            animation: pulse-slow 2s ease-in-out infinite;
          }

          ${[...Array(20)].map((_, i) => `
            @keyframes float${i} {
              0%, 100% {
                transform: translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px) scale(1);
                opacity: 0.2;
              }
              25% {
                transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) scale(1.2);
                opacity: 0.4;
              }
              50% {
                transform: translate(${Math.random() * 40 - 20}px, ${Math.random() * 40 - 20}px) scale(1);
                opacity: 0.6;
              }
              75% {
                transform: translate(${Math.random() * 25 - 12}px, ${Math.random() * 25 - 12}px) scale(0.8);
                opacity: 0.3;
              }
            }
          `).join('')}
        `}</style>
      </div>
    </>
  );
}

export default UploadPage;
