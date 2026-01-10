import { useState } from 'react'
import BookUpload from './BookUpload'
import BookGraph from './BookGraph'
import './App.css'

function App() {
  const [books, setBooks] = useState([])

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          Reading Graph
        </h1>
        
        <div className="mb-8">
          <BookUpload books={books} onBooksChange={setBooks} />
        </div>

        {books.length > 0 && (() => {
          console.log('Books being passed to graph:', books);
          console.log('Number of books:', books?.length);
          console.log('First book structure:', books?.[0]);
          return (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">
                Book Network Graph
              </h2>
              <BookGraph books={books} />
            </div>
          );
        })()}
      </div>
    </div>
  )
}

export default App
