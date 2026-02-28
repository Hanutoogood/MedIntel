
import React, { useState, useEffect, useRef } from 'react';

interface InteractiveCreatureProps {
  isEyesClosed: boolean;
}

const InteractiveCreature: React.FC<InteractiveCreatureProps> = ({ isEyesClosed }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const creatureRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (creatureRef.current) {
        const rect = creatureRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate relative position (-1 to 1)
        const relX = (e.clientX - centerX) / (window.innerWidth / 2);
        const relY = (e.clientY - centerY) / (window.innerHeight / 2);
        
        setMousePos({ x: relX, y: relY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Pupil movement range
  const pupilRange = 4;
  const pupilX = mousePos.x * pupilRange;
  const pupilY = mousePos.y * pupilRange;

  return (
    <div className="flex justify-center mb-4">
      <svg
        ref={creatureRef}
        width="80"
        height="80"
        viewBox="0 0 100 100"
        className="drop-shadow-lg"
      >
        {/* Body - Yellow Minion-like */}
        <rect x="20" y="20" width="60" height="70" rx="30" fill="#FDE047" />
        
        {/* Goggles Strap */}
        <rect x="15" y="40" width="70" height="10" fill="#334155" />

        {/* Eyes */}
        <g transform="translate(35, 45)">
          {/* Left Eye */}
          <circle cx="0" cy="0" r="12" fill="white" stroke="#334155" strokeWidth="2" />
          {!isEyesClosed ? (
            <circle 
              cx={pupilX} 
              cy={pupilY} 
              r="4" 
              fill="#1e293b" 
              className="transition-transform duration-75 ease-out"
            />
          ) : (
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>

        <g transform="translate(65, 45)">
          {/* Right Eye */}
          <circle cx="0" cy="0" r="12" fill="white" stroke="#334155" strokeWidth="2" />
          {!isEyesClosed ? (
            <circle 
              cx={pupilX} 
              cy={pupilY} 
              r="4" 
              fill="#1e293b" 
              className="transition-transform duration-75 ease-out"
            />
          ) : (
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          )}
        </g>

        {/* Mouth */}
        <path 
          d={isEyesClosed ? "M 40 75 Q 50 75 60 75" : "M 40 75 Q 50 82 60 75"} 
          fill="none" 
          stroke="#334155" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
      </svg>
    </div>
  );
};

export default InteractiveCreature;
