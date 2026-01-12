import { useEffect, useState } from 'react';

function LoadingScreen({ bookCount = 0, onComplete, analysisProgress = 0, isAnalyzing = false }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(10, 14, 39, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <div className="text-center px-4">
        {/* Animated Spinner */}
        <div className="relative mb-8 flex items-center justify-center" style={{ minHeight: '160px' }}>
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: '140px',
              height: '140px',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 60px rgba(147, 51, 234, 0.6), 0 0 100px rgba(147, 51, 234, 0.4), inset 0 0 60px rgba(147, 51, 234, 0.2)'
            }}
          />
          
          {/* Spinning ring */}
          <div
            className="relative w-32 h-32 border-4 border-transparent rounded-full"
            style={{
              borderTopColor: '#9333ea',
              borderRightColor: '#9333ea',
              animation: 'spin 1.5s linear infinite',
              boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)'
            }}
          />

          {/* Inner pulsing circle */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#9333ea',
              boxShadow: '0 0 20px rgba(147, 51, 234, 0.8)'
            }}
          />
        </div>

        {/* Main text */}
        <h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{
            color: '#ffffff',
            textShadow: '0 0 20px rgba(147, 51, 234, 0.5)'
          }}
        >
          Discovering connections in your reading
        </h2>

        {/* Progress text */}
        {bookCount > 0 && (
          <p
            className="text-xl md:text-2xl"
            style={{ color: '#d1d5db' }}
          >
            {isAnalyzing 
              ? `Analyzing ${bookCount} book${bookCount !== 1 ? 's' : ''}...` 
              : `Processing ${bookCount} book${bookCount !== 1 ? 's' : ''}...`}
          </p>
        )}

        {/* Floating particles effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float"
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                backgroundColor: 'rgba(147, 51, 234, 0.6)',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${Math.random() * 3 + 4}s`,
                boxShadow: '0 0 10px rgba(147, 51, 234, 0.8)'
              }}
            />
          ))}
        </div>
      </div>

      {/* Add keyframe animations */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translateY(-20px) translateX(10px) scale(1.2);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-40px) translateX(-10px) scale(1);
            opacity: 1;
          }
          75% {
            transform: translateY(-20px) translateX(5px) scale(0.8);
            opacity: 0.7;
          }
        }

        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
