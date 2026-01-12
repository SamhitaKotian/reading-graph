import { useMemo, useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { analyzeBook } from './geminiAPI';
import QuotesPanel from './components/QuotesPanel';

function BookGraph({ books = [], onReset, onBookUpdate }) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [selectedNode, setSelectedNode] = useState(null);
  const [relatedNodeIds, setRelatedNodeIds] = useState(new Set());
  const [selectedBook, setSelectedBook] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [graphWidth, setGraphWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth - 300; // Account for sidebar width
    }
    return 1200; // Fallback for SSR
  });
  const [graphHeight, setGraphHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerHeight - 100; // Account for header
    }
    return 800; // Fallback for SSR
  });

  // Handle window resize to update width and height
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGraphWidth(rect.width);
        setGraphHeight(rect.height || window.innerHeight - 100);
      } else {
        // Account for sidebar width (approximately 300px) and header
        setGraphWidth(window.innerWidth - 300);
        setGraphHeight(window.innerHeight - 100);
      }
    };

    // Set initial size after a short delay to ensure container is rendered
    const timer = setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    
    // Also update when books change (container might resize)
    updateSize();
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSize);
    };
  }, [books]);

  // Generate graph data from books
  const graphData = useMemo(() => {
    if (!books || books.length === 0) {
      return { nodes: [], links: [] };
    }

    // Helper function to check if book was read recently (last 30 days)
    const isRecentlyRead = (dateRead) => {
      if (!dateRead) return false;
      const readDate = new Date(dateRead);
      const now = new Date();
      const daysDiff = (now - readDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 30 && daysDiff >= 0;
    };

    // Create nodes from books
    const nodes = books.map((book, index) => {
      const nodeId = book.id || `book-${index}`;
      const isRelated = selectedNode ? relatedNodeIds.has(nodeId) : true;
      const isSelected = selectedNode && nodeId === selectedNode.id;
      
      return {
        id: nodeId,
        name: book.title || 'Untitled',
        title: book.title || 'Untitled',
        val: 6, // Node size
        rating: book.rating || 'Not rated',
        author: book.author || 'Unknown',
        dateRead: book.dateRead || null,
        isRecent: isRecentlyRead(book.dateRead),
        themes: book.themes || [],
        isRelated,
        isSelected,
        opacity: selectedNode ? (isRelated || isSelected ? 1 : 0.2) : 1,
      };
    });

    // Generate theme-based links between books
    const links = [];
    
    // Theme colors mapping
    const themeColors = {
      'Identity & Self': '#9370DB',
      'Emotional Health': '#87CEEB',
      'Love & Relationships': '#FF1493',
      'Power & Strategy': '#8B0000',
      'Existentialism': '#00CED1',
      'Science & Universe': '#4169E1',
      'War & Conflict': '#DC143C',
      'Time & Memory': '#FF69B4',
      'Morality & Ethics': '#32CD32',
      'Human Nature': '#FFA500',
      'Dystopia': '#696969',
    };

    // Create links based on shared themes
    if (nodes.length >= 2) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          const book1 = books.find(b => (b.id || `book-${i}`) === node1.id);
          const book2 = books.find(b => (b.id || `book-${j}`) === node2.id);

          if (!book1 || !book2) continue;

          const themes1 = (book1.themes || []).map(t => typeof t === 'string' ? t : t.theme);
          const themes2 = (book2.themes || []).map(t => typeof t === 'string' ? t : t.theme);

          // Find shared themes
          const sharedThemes = themes1.filter(t => themes2.includes(t));

          if (sharedThemes.length > 0) {
            // Use the first shared theme for the link
            const linkTheme = sharedThemes[0];
            const isVisible = selectedNode 
              ? (relatedNodeIds.has(node1.id) && relatedNodeIds.has(node2.id))
              : true;
            
            links.push({
              source: node1.id,
              target: node2.id,
              theme: linkTheme,
              strength: 0.7 + (sharedThemes.length * 0.1), // Higher strength for more shared themes
              color: themeColors[linkTheme] || '#00CED1',
              isVisible,
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [books, selectedNode, relatedNodeIds]);

  // Helper function to update book in books array
  const updateBookInState = (bookToUpdate, updatedData) => {
    const updatedBooks = books.map(book => {
      // Match by id if available, otherwise by title and author
      const matchesById = bookToUpdate.id && book.id && bookToUpdate.id === book.id;
      const matchesByTitleAuthor = bookToUpdate.title === book.title && 
                                   bookToUpdate.author === book.author;
      
      if (matchesById || matchesByTitleAuthor) {
        return { ...book, ...updatedData };
      }
      return book;
    });
    
    // Update localStorage
    localStorage.setItem('readingGraphBooks', JSON.stringify(updatedBooks));
    
    // Notify parent component to update books
    if (onBookUpdate) {
      onBookUpdate(updatedBooks);
    }
  };

  // Handle node click
  const handleNodeClick = async (node) => {
    if (selectedNode && selectedNode.id === node.id) {
      // Clicking the same node resets
      handleReset();
      return;
    }

    setSelectedNode(node);
    
    // Find book data
    const book = books.find(b => {
      const bookId = b.id || `book-${books.indexOf(b)}`;
      return bookId === node.id;
    });
    
    if (!book) return;

    // Check if book has themes, if not analyze it
    let bookToUse = book;
    if (!book.themes || book.themes.length === 0) {
      setIsAnalyzing(true);
      try {
        const analysisResult = await analyzeBook(book.title, book.author);
        
        // Prepare updated data
        const updatedData = {
          themes: analysisResult.themes || [],
          quotes: analysisResult.themes?.flatMap(theme => theme.quotes || []) || []
        };
        
        // Update book object
        bookToUse = {
          ...book,
          ...updatedData
        };
        
        // Update book in state
        updateBookInState(book, updatedData);
        
        // Set selected book with updated data
        setSelectedBook(bookToUse);
      } catch (error) {
        console.error('Error analyzing book:', error);
        // Still set the book even if analysis fails
        setSelectedBook(book);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      // Book already has themes, just set it
      setSelectedBook(book);
    }

    // Find books that share themes with selected book
    const selectedThemes = (bookToUse.themes || []).map(t => typeof t === 'string' ? t : t.theme);
    const relatedIds = new Set([node.id]); // Include selected node itself

    books.forEach((bookItem, index) => {
      const bookId = bookItem.id || `book-${index}`;
      if (bookId === node.id) return; // Skip selected book

      const bookThemes = (bookItem.themes || []).map(t => typeof t === 'string' ? t : t.theme);
      const hasSharedTheme = selectedThemes.some(t => bookThemes.includes(t));

      if (hasSharedTheme) {
        relatedIds.add(bookId);
      }
    });

    setRelatedNodeIds(relatedIds);

    // Zoom to selected node
    setTimeout(() => {
      if (graphRef.current && node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 800);
        graphRef.current.zoom(3, 800);
      }
    }, 100);
  };

  // Reset view
  const handleReset = () => {
    setSelectedNode(null);
    setRelatedNodeIds(new Set());
    setSelectedBook(null);
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
    if (onReset) {
      onReset();
    }
  };

  // Expose reset function and notify parent when node is selected
  useEffect(() => {
    window.__bookGraphReset = handleReset;
    if (onReset && selectedNode) {
      // Notify parent that a node is selected
      setTimeout(() => {
        if (window.setIsNodeSelected) {
          window.setIsNodeSelected(true);
        }
      }, 100);
    }
  }, [onReset, selectedNode, books]);

  // Animation loop for pulsing effect (throttled for better performance)
  useEffect(() => {
    let animationFrameId;
    let lastTime = 0;
    const throttleMs = 16; // ~60fps
    
    const animate = (currentTime) => {
      if (currentTime - lastTime >= throttleMs) {
        setPulsePhase((prev) => (prev + 0.02) % (Math.PI * 2));
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Force re-render when books change and handle loading state
  useEffect(() => {
    if (books && books.length > 0) {
      setIsLoading(true);
      // Give graph time to initialize
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [books, books.length]);

  // Get color based on rating
  const getNodeColor = (node) => {
    const rating = node.rating;
    
    // Handle different rating formats (e.g., "5", "5 stars", "5.0")
    const ratingNum = parseFloat(rating?.toString().replace(/[^0-9.]/g, '')) || 0;

    if (ratingNum >= 5) {
      return '#FFD700'; // Gold for 5 stars
    } else if (ratingNum >= 4) {
      return '#4169E1'; // Royal Blue for 4 stars
    } else if (ratingNum >= 3) {
      return '#32CD32'; // Lime Green for 3 stars
    } else if (ratingNum >= 2) {
      return '#FF8C00'; // Dark Orange for 2 stars
    } else if (ratingNum >= 1) {
      return '#DC143C'; // Crimson for 1 star
    } else {
      return '#696969'; // Dim Gray for unrated
    }
  };

  if (!books || books.length === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-lg border-2 border-dashed"
        style={{ 
          height: '800px', 
          backgroundColor: '#0a0e27',
          borderColor: 'rgba(255, 255, 255, 0.2)'
        }}
      >
        <p style={{ color: '#9ca3af' }} className="text-lg">
          Upload books to see the graph visualization
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden shadow-2xl relative" 
      style={{ backgroundColor: '#0a0e27', minHeight: '600px', height: '100%' }}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ backgroundColor: '#0a0e27' }}
        >
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-gray-400 text-lg">Initializing graph...</p>
          </div>
        </div>
      )}
      <ForceGraph2D
        ref={graphRef}
        key={`graph-${books.length}`}
        graphData={graphData}
        nodeLabel={(node) => `${node.name}\nby ${node.author}\nRating: ${node.rating}`}
        nodeColor={getNodeColor}
        nodeVal={(node) => node.val || 6}
        linkColor={(link) => {
          if (!link.isVisible) return 'rgba(0, 0, 0, 0)'; // Hide non-visible links
          const color = link.color || '#00CED1';
          const opacity = link.strength || 0.6;
          
          // Convert hex to rgba if needed
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          return color;
        }}
        linkWidth={(link) => link.isVisible ? 2 : 0}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={(link) => {
          if (!link.isVisible) return 'rgba(0, 0, 0, 0)';
          return link.color || 'rgba(0, 255, 255, 1)';
        }}
        linkCanvasObject={(link, ctx) => {
          if (!link.isVisible) return; // Don't draw hidden links
          
          const color = link.color || '#00CED1';
          const opacity = link.strength || 0.6;
          
          // Convert hex to rgba if needed
          let strokeColor = color;
          if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            strokeColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          
          ctx.save();
          ctx.shadowBlur = 20;
          ctx.shadowColor = color;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(link.source.x, link.source.y);
          ctx.lineTo(link.target.x, link.target.y);
          ctx.stroke();
          ctx.restore();
        }}
        linkCanvasObjectMode={() => 'replace'}
        cooldownTicks={400}
        warmupTicks={150}
        onEngineStop={() => {
          // Graph has finished initializing
          setIsLoading(false);
        }}
        onNodeHover={(node) => {
          // Optional: Add hover effects
        }}
        onNodeClick={handleNodeClick}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          // Safety check: ensure node has valid position
          if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) {
            return;
          }
          
          // Truncate long titles
          const label = node.name && node.name.length > 20 
            ? node.name.substring(0, 20) + '...' 
            : (node.name || 'Untitled');
          const fontSize = 10 / Math.sqrt(globalScale);
          const nodeColor = getNodeColor(node);
          
          // Use fixed small radius
          const radius = 5;
          
          // Calculate pulse scale for recently read books
          const pulseScale = node.isRecent 
            ? 1 + Math.sin(pulsePhase) * 0.15 
            : 1;
          const currentRadius = radius * pulseScale;
          
          ctx.save();
          
          // Outer glow layer (largest) - reduced spread
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 25;
          ctx.shadowColor = nodeColor;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * 2, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Middle glow layer - reduced spread
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * 1.5, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Inner bright circle - reduced spread
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * 1.2, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Main node circle (small dot)
          ctx.shadowBlur = 0;
          ctx.globalAlpha = node.opacity || 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Highlight selected node
          if (node.isSelected) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFD700';
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
          }
          ctx.stroke();
          
          ctx.restore();

          // Draw label below node (only when zoomed in)
          if (globalScale > 1.2) {
            // Calculate fade-in opacity based on zoom level
            const opacity = Math.min((globalScale - 1) / 2, 1);
            
            ctx.save();
            ctx.font = `${fontSize}px 'Inter', -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Add text shadow for better readability
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            
            // Apply fade-in opacity
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fillText(label, node.x, node.y + currentRadius + 4);
            
            ctx.restore();
          }
        }}
        nodeCanvasObjectMode={() => 'replace'}
        backgroundColor="#0a0e27"
        width={graphWidth}
        height={graphHeight || 800}
        nodeRelSize={4}
        nodeRepulsion={-500}
        linkDistance={250}
        d3AlphaDecay={0.005}
        d3AlphaMin={0.001}
        d3VelocityDecay={0.15}
        d3Force={{
          charge: { strength: -500 },
          link: { distance: 250 }
        }}
      />
      <QuotesPanel 
        book={selectedBook} 
        isOpen={!!selectedBook} 
        isLoading={isAnalyzing} 
        onClose={() => setSelectedBook(null)}
        books={books}
      />
    </div>
  );
}

export default BookGraph;
