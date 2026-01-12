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
  const [hoveredNode, setHoveredNode] = useState(null);
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
        transitionOpacity: true, // Enable opacity transitions
      };
    });

    // Generate theme-based links between books (branching network with strongest connections)
    const links = [];
    const connected = new Set();
    
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

    // Calculate similarity scores and create links to top 2-3 most similar books
    if (books.length >= 2) {
      books.forEach((book, bookIndex) => {
        const bookId = book.id || `book-${bookIndex}`;
        const themes1 = (book.themes || []).map(t => typeof t === 'string' ? t : t.theme);
        
        // Calculate similarity scores for all other books
        const similarities = [];
        
        books.forEach((other, otherIndex) => {
          const otherId = other.id || `book-${otherIndex}`;
          
          if (bookId === otherId) return; // Skip self
          
          const themes2 = (other.themes || []).map(t => typeof t === 'string' ? t : t.theme);
          
          // Calculate similarity: number of shared themes
          const sharedThemes = themes1.filter(t => themes2.includes(t));
          
          if (sharedThemes.length > 0) {
            // Similarity score: number of shared themes (higher = more similar)
            const similarityScore = sharedThemes.length;
            
            similarities.push({
              otherId,
              other,
              sharedThemes,
              similarityScore,
            });
          }
        });
        
        // Sort by similarity score (highest first)
        similarities.sort((a, b) => b.similarityScore - a.similarityScore);
        
        // Pick top 2-3 most similar books (randomly choose 2 or 3 for variety)
        const maxConnections = Math.min(2 + Math.floor(Math.random() * 2), similarities.length); // 2 or 3
        const topMatches = similarities.slice(0, maxConnections);
        
        // Create links to top matches
        topMatches.forEach((match) => {
          const linkKey = [bookId, match.otherId].sort().join('-');
          
          // Avoid duplicate links (bidirectional)
          if (connected.has(linkKey)) return;
          
          const linkTheme = match.sharedThemes[0];
          const isVisible = selectedNode 
            ? (relatedNodeIds.has(bookId) && relatedNodeIds.has(match.otherId))
            : true;
          
          links.push({
            source: bookId,
            target: match.otherId,
            theme: linkTheme,
            strength: 0.7 + (match.similarityScore * 0.1),
            color: themeColors[linkTheme] || '#00CED1',
            isVisible,
            opacity: isVisible ? 1 : 0,
          });
          
          connected.add(linkKey);
        });
      });
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

    // Zoom to selected node with smooth transition
    setTimeout(() => {
      if (graphRef.current && node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 800);
        graphRef.current.zoom(3, 800);
      }
    }, 100);
  };

  // Reset view with smooth transition
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

  // Get glow color based on rating
  const getNodeGlow = (rating) => {
    // Handle different rating formats (e.g., "5", "5 stars", "5.0")
    const ratingNum = parseFloat(rating?.toString().replace(/[^0-9.]/g, '')) || 0;
    const roundedRating = Math.round(ratingNum);
    
    const glows = {
      5: '#FFD700', // Gold
      4: '#4A90E2', // Blue  
      3: '#50C878', // Green
      2: '#FF6B6B', // Coral
      1: '#9B59B6'  // Purple
    };
    return glows[roundedRating] || '#00ffff';
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
      style={{ 
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #0a0e27 100%)',
        minHeight: '600px', 
        height: '100%' 
      }}
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
        enableNodeDrag={true}
        nodeLabel={(node) => `${node.name}\nby ${node.author}\nRating: ${node.rating}`}
        nodeColor={getNodeColor}
        nodeVal={(node) => 4}
        linkColor={() => '#00ffff'}
        linkWidth={0.8}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={() => 'rgba(0,255,255,0.5)'}
        linkCanvasObjectMode={() => 'replace'}
        linkCanvasObject={(link, ctx, globalScale) => {
          const start = link.source;
          const end = link.target;
          
          // Outer glow (subtle)
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
          ctx.lineWidth = 3 / globalScale;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ffff';
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          // Core line (bright, thin)
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
          ctx.lineWidth = 0.8 / globalScale;
          ctx.shadowBlur = 5;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          
          ctx.shadowBlur = 0;
        }}
        cooldownTicks={200}
        warmupTicks={100}
        linkOpacity={0.6}
        onEngineStop={() => {
          // Graph has finished initializing
          setIsLoading(false);
        }}
        onNodeHover={(node) => {
          setHoveredNode(node);
        }}
        onNodeClick={handleNodeClick}
        nodePointerAreaPaint={(node, color, ctx) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
          ctx.fill();
        }}
        nodeCanvasObjectMode={() => 'replace'}
        nodeCanvasObject={(node, ctx, globalScale) => {
          // Safety check: ensure node has valid position
          if (typeof node.x !== 'number' || typeof node.y !== 'number' || isNaN(node.x) || isNaN(node.y)) {
            return;
          }
          
          const baseSize = 8;
          const nodeColor = getNodeColor(node);
          const glowColor = getNodeGlow(node.rating);
          
          // Pulsing animation (subtle breathing effect)
          const pulseScale = 1 + Math.sin(pulsePhase) * 0.1;
          const size = baseSize * pulseScale;
          
          // Glow intensity multiplier (increased on hover)
          const isHovered = hoveredNode && hoveredNode.id === node.id;
          const glowMultiplier = isHovered ? 2 : 1;
          
          // Outer glow (large, soft) - enhanced on hover
          ctx.shadowBlur = 25 * glowMultiplier;
          ctx.shadowColor = glowColor;
          ctx.fillStyle = nodeColor;
          ctx.globalAlpha = 0.3 * (isHovered ? 1.5 : 1);
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // Inner glow (medium) - enhanced on hover
          ctx.shadowBlur = 15 * glowMultiplier;
          ctx.shadowColor = glowColor;
          ctx.globalAlpha = 0.6 * (isHovered ? 1.3 : 1);
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
          ctx.fill();
          
          // Core (bright solid) - enhanced on hover
          ctx.shadowBlur = 8 * glowMultiplier;
          ctx.shadowColor = glowColor;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }}
        backgroundColor="rgba(10, 14, 39, 1)"
        width={graphWidth}
        height={graphHeight || 800}
        nodeRelSize={4}
        nodeRepulsion={-400}
        linkDistance={120}
        d3AlphaDecay={0.02}
        d3AlphaMin={0.001}
        d3VelocityDecay={0.3}
        d3Force={{
          charge: { strength: -500 },
          link: { distance: 120 }
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
