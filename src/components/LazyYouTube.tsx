import { useState, useRef, useEffect } from 'react';

interface LazyYouTubeProps {
  videoId: string;
  title: string;
  className?: string;
}

/**
 * Shows a YouTube thumbnail that loads the iframe only when clicked or visible.
 * Uses facade pattern: renders a clickable thumbnail first, replaces with iframe on interaction.
 */
export const LazyYouTube = ({ videoId, title, className = '' }: LazyYouTubeProps) => {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      {loaded ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      ) : (
        <button
          onClick={() => setLoaded(true)}
          className="relative w-full h-full group cursor-pointer bg-black"
          aria-label={`Play: ${title}`}
        >
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-red-700 group-hover:scale-110 transition-all duration-200">
              <svg viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      )}
    </div>
  );
};
