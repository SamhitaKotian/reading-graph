import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import GraphPage from './pages/GraphPage';
import BookmarksView from './pages/BookmarksView';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/bookmarks" element={<BookmarksView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
