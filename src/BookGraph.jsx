import { useMemo, useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

function BookGraph({ books = [] }) {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const [pulsePhase, setPulsePhase] = useState(0);
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
    const nodes = books.map((book, index) => ({
      id: book.id || `book-${index}`,
      name: book.title || 'Untitled',
      title: book.title || 'Untitled',
      val: 6, // Node size
      rating: book.rating || 'Not rated',
      author: book.author || 'Unknown',
      dateRead: book.dateRead || null,
      isRecent: isRecentlyRead(book.dateRead),
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
            strength: Math.random() * 0.4 + 0.6, // Random strength between 0.6 and 1.0
          });
        }
      }
    }

    return { nodes, links };
  }, [books]);

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
        key={`graph-${books.length}`}
        graphData={graphData}
        nodeLabel={(node) => `${node.name}\nby ${node.author}\nRating: ${node.rating}`}
        nodeColor={getNodeColor}
        nodeVal={(node) => node.val || 6}
        linkColor={(link) => `rgba(0, 255, 255, ${link.strength || 0.6})`}
        linkWidth={1.5}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={3}
        linkDirectionalParticleWidth={3}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleColor={() => 'rgba(0, 255, 255, 1)'}
        linkCanvasObject={(link, ctx) => {
          // Add cyan glow effect to links
          ctx.save();
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
          ctx.strokeStyle = `rgba(0, 255, 255, ${link.strength || 0.6})`;
          ctx.lineWidth = 1.5;
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
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = nodeColor;
          ctx.fill();
          
          // Improved border
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
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
    </div>
  );
}

export default BookGraph;
