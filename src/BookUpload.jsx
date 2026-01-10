import { useState } from 'react';

function BookUpload({ books = [], onBooksChange }) {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Parse CSV content
  const parseCSV = (text) => {
    const lines = text.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid');
    }

    // Get headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Find column indices for Goodreads CSV columns - look for exact matches first
    const bookIdIndex = headers.findIndex(h => h === 'Book Id' || h === 'Book ID');
    const titleIndex = headers.findIndex(h => h === 'Title');
    const authorIndex = headers.findIndex(h => h === 'Author');
    const ratingIndex = headers.findIndex(h => h === 'My Rating');

    if (titleIndex === -1 || authorIndex === -1) {
      throw new Error('CSV file must contain Title and Author columns');
    }

    // Parse data rows
    const parsedBooks = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      // Handle CSV parsing with quoted fields
      const row = [];
      let currentField = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        const nextChar = line[j + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            // Escaped quote
            currentField += '"';
            j++; // Skip next quote
          } else {
            // Toggle quote state
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          // Field separator
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      // Push last field
      row.push(currentField.trim());

      // Extract book data from Goodreads CSV columns and map to lowercase property names
      const bookId = bookIdIndex !== -1 ? (row[bookIdIndex]?.replace(/"/g, '') || '') : '';
      const title = row[titleIndex]?.replace(/"/g, '') || '';
      const author = row[authorIndex]?.replace(/"/g, '') || '';
      const rating = ratingIndex !== -1 ? (row[ratingIndex]?.replace(/"/g, '') || '') : '';

      // Only add books with at least title and author
      if (title && author) {
        parsedBooks.push({
          id: bookId || `${i}-${title}-${author}`, // Use Book Id if available, otherwise generate one
          title: title,
          author: author,
          rating: rating || 'Not rated',
        });
      }
    }

    return parsedBooks;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }

    // Check if it's a CSV file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const text = await file.text();
      
      // Parse CSV
      const parsedBooks = parseCSV(text);
      
      if (parsedBooks.length === 0) {
        throw new Error('No valid books found in the CSV file');
      }

      // Console.log to verify the format
      console.log('Parsed books array:', parsedBooks);
      console.log('Sample book structure:', parsedBooks[0]);

      if (onBooksChange) {
        onBooksChange(parsedBooks);
      }
    } catch (err) {
      setError(err.message || 'Error parsing CSV file');
      if (onBooksChange) {
        onBooksChange([]);
      }
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleLoadTestData = () => {
    setError(null);
    const testBooks = [
      { id: '1', title: 'Test Book 1', author: 'Author 1', rating: '5' },
      { id: '2', title: 'Test Book 2', author: 'Author 2', rating: '4' },
      { id: '3', title: 'Test Book 3', author: 'Author 3', rating: '3' },
      { id: '4', title: 'Test Book 4', author: 'Author 4', rating: '5' },
      { id: '5', title: 'Test Book 5', author: 'Author 5', rating: '4' }
    ];

    // Console.log to verify the format
    console.log('Test books array:', testBooks);
    console.log('Sample book structure:', testBooks[0]);

    if (onBooksChange) {
      onBooksChange(testBooks);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Upload Goodreads CSV</h2>
      
      <div className="mb-6 space-y-4">
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        
        <div className="flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-sm text-gray-500">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <div>
          <button
            onClick={handleLoadTestData}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold
              hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Load Test Data (5 Books)
          </button>
          <p className="mt-1 text-xs text-gray-500">
            Load 5 hardcoded test books to verify graph rendering
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 text-blue-600">Parsing CSV file...</div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {books.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            Uploaded Books ({books.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Author
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {book.title}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {book.author}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {book.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookUpload;
