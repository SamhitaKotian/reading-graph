import { useMemo, useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

function BookGraph({ books = [] }) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const [graphWidth, setGraphWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200; // Fallback for SSR
  });
  const [graphHeight, setGraphHeight] = useState(600);

  // Handle window resize to update width and height
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGraphWidth(rect.width);
        setGraphHeight(rect.height || 600);
      } else {
        setGraphWidth(window.innerWidth);
        setGraphHeight(600);
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

    // Create nodes from books
    const nodes = books.map((book, index) => ({
      id: book.id || `book-${index}`,
      name: book.title || 'Untitled',
      title: book.title || 'Untitled',
      val: 8, // Node size
      rating: book.rating || 'Not rated',
      author: book.author || 'Unknown',
    }));

    // Generate random links between books (we'll make them real later)
    const links = [];
    
    // Only create links if there are at least 2 books
    if (nodes.length >= 2) {
      const numLinks = Math.min(Math.floor(books.length * 1.5), Math.max(1, books.length - 1));
      
      for (let i = 0; i < numLinks; i++) {
        const sourceIndex = Math.floor(Math.random() * books.length);
        let targetIndex = Math.floor(Math.random() * books.length);
        
        // Make sure source and target are different
        while (targetIndex === sourceIndex && nodes.length > 1) {
          targetIndex = Math.floor(Math.random() * books.length);
        }

        // Check if link already exists (avoid duplicates)
        const linkExists = links.some(
          link =>
            (link.source === nodes[sourceIndex].id && link.target === nodes[targetIndex].id) ||
            (link.source === nodes[targetIndex].id && link.target === nodes[sourceIndex].id)
        );

        if (!linkExists && sourceIndex !== targetIndex) {
          links.push({
            source: nodes[sourceIndex].id,
            target: nodes[targetIndex].id,
          });
        }
      }
    }

    return { nodes, links };
  }, [books]);

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
          height: '600px', 
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
      style={{ backgroundColor: '#0a0e27' }}
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
        key={books.length}
        graphData={graphData}
        nodeLabel={(node) => `${node.name}\nby ${node.author}\nRating: ${node.rating}`}
        nodeColor={getNodeColor}
        nodeVal={(node) => node.val || 8}
        linkColor={() => 'rgba(255, 255, 255, 0.2)'}
        linkWidth={1.5}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        cooldownTicks={200}
        onEngineStop={() => {
          // Graph has finished initializing
          setIsLoading(false);
        }}
        onNodeHover={(node) => {
          // Optional: Add hover effects
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 10 / Math.sqrt(globalScale);
          const nodeColor = getNodeColor(node);
          
          // Draw node circle with glow effect
          ctx.save();
          
          // Outer glow
          ctx.shadowBlur = 20;
          ctx.shadowColor = nodeColor;
          ctx.beginPath();
          ctx.arc(node.x, node.y, (node.val || 8) * 1.5, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Main node circle
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.val || 8, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Add border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          ctx.restore();

          // Draw label below node
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillText(label, node.x, node.y + (node.val || 8) + 4);
        }}
        nodeCanvasObjectMode={() => 'replace'}
        backgroundColor="#0a0e27"
        width={graphWidth}
        height={graphHeight || 600}
        nodeRelSize={6}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
      />
    </div>
  );
}

export default BookGraph;
