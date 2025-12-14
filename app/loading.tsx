"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface LogoData {
  viewBox: { width: number; height: number };
  circles: { cx: number; cy: number; r: number; fill: string }[];
  lineWidth: number;
}

function parseSVG(svgText: string): LogoData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  if (!svg) return null;
  
  const viewBoxAttr = svg.getAttribute('viewBox');
  const [, , width, height] = viewBoxAttr?.split(' ').map(Number) || [0, 0, 750, 531];
  
  const circleElements = svg.querySelectorAll('circle');
  const circles = Array.from(circleElements).map(circle => ({
    cx: parseFloat(circle.getAttribute('cx') || '0'),
    cy: parseFloat(circle.getAttribute('cy') || '0'),
    r: parseFloat(circle.getAttribute('r') || '0'),
    fill: circle.getAttribute('fill') || '#FFFFFF',
  }));
  
  const rect = svg.querySelector('rect');
  const lineWidth = parseFloat(rect?.getAttribute('width') || '65');
  
  return { viewBox: { width, height }, circles, lineWidth };
}

export default function Loading() {
  const router = useRouter();
  const [svgData, setSvgData] = useState<LogoData | null>(null);
  // One ball cycles through: 
  // 0: At green pos, morphs to red
  // 1: Red ball moves green→red, draws red trail
  // 2: Red trail erases
  // 3: At red pos, morphs to blue
  // 4: Blue ball moves red→blue, draws blue trail
  // 5: Blue trail erases
  // 6: At blue pos, morphs to green
  // 7: Green ball moves blue→green, draws green trail
  // 8: Green trail erases
  // Then back to 0
  const [phase, setPhase] = useState(0);
  const [isFirstCycle, setIsFirstCycle] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false); // Initial 2s black screen
  const [isTransitioning, setIsTransitioning] = useState(false); // Fade out before navigation
  const [logoSize, setLogoSize] = useState(240); // Match main page size
  
  // Set logo size based on screen size (match main page)
  useEffect(() => {
    const updateLogoSize = () => {
      const isSmallScreen = window.innerWidth < 600;
      setLogoSize(isSmallScreen ? 140 : 240);
    };
    updateLogoSize();
    window.addEventListener('resize', updateLogoSize);
    return () => window.removeEventListener('resize', updateLogoSize);
  }, []);
  
  // Track which trails have been drawn and not yet erased (for smooth transition after first cycle)
  const [redTrailDrawn, setRedTrailDrawn] = useState(false);
  const [blueTrailDrawn, setBlueTrailDrawn] = useState(false);
  const [greenTrailDrawn, setGreenTrailDrawn] = useState(false);
  // Track static balls that stay in place during first cycle
  const [redBallVisible, setRedBallVisible] = useState(false);
  const [blueBallVisible, setBlueBallVisible] = useState(false);
  const [greenBallVisible, setGreenBallVisible] = useState(false);
  
  // Initial 2s black screen delay
  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(true), 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Load SVG on mount
  useEffect(() => {
    fetch('/denshi_ningen_logo.svg')
      .then(res => res.text())
      .then(text => {
        const data = parseSVG(text);
        setSvgData(data);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, []);

  // Animation cycle
  useEffect(() => {
    if (!svgData || !showAnimation) return;

    // Phase durations - pause longer after completing logo in first cycle
    const phaseDurations = [
      200,  // 0: morph to red
      500,  // 1: red ball travels, draws red trail
      400,  // 2: red trail erases
      200,  // 3: morph to blue
      500,  // 4: blue ball travels, draws blue trail
      400,  // 5: blue trail erases
      200,  // 6: morph to green
      500,  // 7: green ball travels, draws green trail
      400,  // 8: green trail erases
    ];
    
    // Extra pause after completing logo (phase 7 in first cycle)
    const currentDuration = (isFirstCycle && phase === 7) 
      ? phaseDurations[phase] + 800 // Show complete logo for 800ms extra
      : phaseDurations[phase];

    // In first cycle, skip erase phases (2, 5, 8) - go directly to next morph
    const getNextPhase = (current: number): number => {
      // Track when trails are drawn
      if (current === 1) setRedTrailDrawn(true);
      if (current === 4) setBlueTrailDrawn(true);
      if (current === 7) setGreenTrailDrawn(true);
      
      // Track when trails are erased
      if (current === 2) setRedTrailDrawn(false);
      if (current === 5) setBlueTrailDrawn(false);
      if (current === 8) setGreenTrailDrawn(false);
      
      // Track static balls - they stay after being placed in first cycle
      if (isFirstCycle) {
        if (current === 1) setRedBallVisible(true);   // Red ball placed
        if (current === 4) setBlueBallVisible(true);  // Blue ball placed
        if (current === 7) setGreenBallVisible(true); // Green ball placed
      }
      
      // Determine what the next phase will be
      let nextPhase: number;
      
      if (isFirstCycle) {
        if (current === 1) {
          nextPhase = 3; // Skip erase red, go to morph blue
        } else if (current === 4) {
          nextPhase = 6; // Skip erase blue, go to morph green
        } else if (current === 7) {
          setIsFirstCycle(false); // First cycle complete!
          nextPhase = 2; // Start erasing from red trail
        } else {
          nextPhase = (current + 1) % 9;
        }
      } else {
        nextPhase = (current + 1) % 9;
      }
      
      // Static balls disappear when morphing ball arrives at their position
      // This happens when entering erase phases (2, 5, 8)
      if (nextPhase === 2) setRedBallVisible(false);   // Morphing ball at red pos
      if (nextPhase === 5) setBlueBallVisible(false);  // Morphing ball at blue pos
      if (nextPhase === 8) setGreenBallVisible(false); // Morphing ball at green pos
      
      return nextPhase;
    };

    const timeout = setTimeout(() => {
      setPhase(prev => getNextPhase(prev));
    }, currentDuration);

    return () => clearTimeout(timeout);
  }, [svgData, phase, isFirstCycle, showAnimation]);

  // Sort circles by position to identify vertices
  const vertices = useMemo(() => {
    if (!svgData || svgData.circles.length < 3) return null;
    const sorted = [...svgData.circles].sort((a, b) => a.cy - b.cy);
    return {
      green: sorted[0],    // top (green ball position)
      blue: sorted[1],     // middle right (blue ball position)
      red: sorted[2],      // bottom left (red ball position)
    };
  }, [svgData]);

  const handleClick = () => {
    if (isTransitioning) return; // Prevent multiple clicks
    
    setIsTransitioning(true);
    
    // Wait for fade out animation then navigate
    setTimeout(() => {
      router.push('/');
    }, 500);
  };

  if (!svgData || !vertices) {
    return (
      <div className="loading-container" onClick={handleClick} style={{ cursor: 'pointer' }}>
        <style jsx>{`
          .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            width: 100vw;
            background: black;
          }
        `}</style>
      </div>
    );
  }

  const size = logoSize;
  const { viewBox, lineWidth } = svgData;
  const { green: greenPos, blue: bluePos, red: redPos } = vertices;
  const dotRadius = greenPos.r;

  // Calculate line lengths
  const lineRedLength = Math.sqrt(Math.pow(redPos.cx - greenPos.cx, 2) + Math.pow(redPos.cy - greenPos.cy, 2));
  const lineBlueLength = Math.sqrt(Math.pow(bluePos.cx - redPos.cx, 2) + Math.pow(bluePos.cy - redPos.cy, 2));
  const lineGreenLength = Math.sqrt(Math.pow(greenPos.cx - bluePos.cx, 2) + Math.pow(greenPos.cy - bluePos.cy, 2));

  // Ball state (position and color)
  const getBallState = () => {
    switch (phase) {
      case 0: // At green, morphing to red
        return { pos: greenPos, color: redPos.fill, prevColor: greenPos.fill };
      case 1: // Red ball traveling green→red
        return { pos: redPos, color: redPos.fill, prevColor: redPos.fill };
      case 2: // At red, red trail erasing
        return { pos: redPos, color: redPos.fill, prevColor: redPos.fill };
      case 3: // At red, morphing to blue
        return { pos: redPos, color: bluePos.fill, prevColor: redPos.fill };
      case 4: // Blue ball traveling red→blue
        return { pos: bluePos, color: bluePos.fill, prevColor: bluePos.fill };
      case 5: // At blue, blue trail erasing
        return { pos: bluePos, color: bluePos.fill, prevColor: bluePos.fill };
      case 6: // At blue, morphing to green
        return { pos: bluePos, color: greenPos.fill, prevColor: bluePos.fill };
      case 7: // Green ball traveling blue→green
        return { pos: greenPos, color: greenPos.fill, prevColor: greenPos.fill };
      case 8: // At green, green trail erasing
        return { pos: greenPos, color: greenPos.fill, prevColor: greenPos.fill };
      default:
        return { pos: greenPos, color: greenPos.fill, prevColor: greenPos.fill };
    }
  };

  // Line offsets - trails stay visible after being drawn until erased
  // Red line: green→red (drawn at phase 1, erased at phase 2)
  const getRedLineOffset = () => {
    if (phase === 1) return 0; // Drawing
    if (phase === 2) return -lineRedLength; // Erasing (animates to retract)
    if (redTrailDrawn) return 0; // Drawn and not yet erased
    return lineRedLength; // Hidden
  };

  // Blue line: red→blue (drawn at phase 4, erased at phase 5)
  const getBlueLineOffset = () => {
    if (phase === 4) return 0; // Drawing
    if (phase === 5) return -lineBlueLength; // Erasing
    if (blueTrailDrawn) return 0; // Drawn and not yet erased
    return lineBlueLength; // Hidden
  };

  // Green line: blue→green (drawn at phase 7, erased at phase 8)
  const getGreenLineOffset = () => {
    if (phase === 7) return 0; // Drawing
    if (phase === 8) return -lineGreenLength; // Erasing
    if (greenTrailDrawn) return 0; // Drawn and not yet erased
    return lineGreenLength; // Hidden
  };

  const ball = getBallState();
  const morphDuration = '0.15s';
  const moveDuration = '0.45s';
  const eraseDuration = '0.35s';

  // Determine which transition to use based on phase
  const isMoving = phase === 1 || phase === 4 || phase === 7;
  const isMorphing = phase === 0 || phase === 3 || phase === 6;
  const isErasing = phase === 2 || phase === 5 || phase === 8;

  return (
    <div className="loading-container" onClick={handleClick}>
      <div className={`logo-wrapper ${showAnimation && !isTransitioning ? 'visible' : ''}`}>
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          width={size}
          height={size * (viewBox.height / viewBox.width)}
          style={{ overflow: 'visible' }}
        >
          {/* Lines */}
          <g>
            {/* Red line - from green pos to red pos */}
            <line 
              x1={greenPos.cx} y1={greenPos.cy} 
              x2={redPos.cx} y2={redPos.cy}
              stroke={redPos.fill} 
              strokeWidth={lineWidth} 
              strokeLinecap="round"
              style={{
                strokeDasharray: lineRedLength,
                strokeDashoffset: getRedLineOffset(),
                transition: phase === 1 
                  ? `stroke-dashoffset ${moveDuration} ease-out`
                  : phase === 2 
                    ? `stroke-dashoffset ${eraseDuration} ease-in`
                    : 'none',
              }}
            />
            {/* Blue line - from red pos to blue pos */}
            <line 
              x1={redPos.cx} y1={redPos.cy} 
              x2={bluePos.cx} y2={bluePos.cy}
              stroke={bluePos.fill} 
              strokeWidth={lineWidth} 
              strokeLinecap="round"
              style={{
                strokeDasharray: lineBlueLength,
                strokeDashoffset: getBlueLineOffset(),
                transition: phase === 4 
                  ? `stroke-dashoffset ${moveDuration} ease-out`
                  : phase === 5 
                    ? `stroke-dashoffset ${eraseDuration} ease-in`
                    : 'none',
              }}
            />
            {/* Green line - from blue pos to green pos */}
            <line 
              x1={bluePos.cx} y1={bluePos.cy} 
              x2={greenPos.cx} y2={greenPos.cy}
              stroke={greenPos.fill} 
              strokeWidth={lineWidth} 
              strokeLinecap="round"
              style={{
                strokeDasharray: lineGreenLength,
                strokeDashoffset: getGreenLineOffset(),
                transition: phase === 7 
                  ? `stroke-dashoffset ${moveDuration} ease-out`
                  : phase === 8 
                    ? `stroke-dashoffset ${eraseDuration} ease-in`
                    : 'none',
              }}
            />
          </g>

          {/* Static balls - stay in place during first cycle, fade out when their trail erases */}
          {redBallVisible && (
            <circle 
              cx={redPos.cx} 
              cy={redPos.cy} 
              r={dotRadius} 
              fill={redPos.fill}
              style={{
                filter: `drop-shadow(0 0 15px ${redPos.fill})`,
                opacity: 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
          {blueBallVisible && (
            <circle 
              cx={bluePos.cx} 
              cy={bluePos.cy} 
              r={dotRadius} 
              fill={bluePos.fill}
              style={{
                filter: `drop-shadow(0 0 15px ${bluePos.fill})`,
                opacity: 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}
          {greenBallVisible && (
            <circle 
              cx={greenPos.cx} 
              cy={greenPos.cy} 
              r={dotRadius} 
              fill={greenPos.fill}
              style={{
                filter: `drop-shadow(0 0 15px ${greenPos.fill})`,
                opacity: 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* Single morphing ball - travels and draws trails */}
          <circle 
            cx={ball.pos.cx} 
            cy={ball.pos.cy} 
            r={dotRadius} 
            fill={ball.color}
            style={{
              transition: isMoving 
                ? `cx ${moveDuration} ease-out, cy ${moveDuration} ease-out, fill ${morphDuration} ease`
                : isMorphing
                  ? `fill ${morphDuration} ease`
                  : 'none',
              filter: `drop-shadow(0 0 15px ${ball.color})`,
            }}
          />
        </svg>
        
        <p className="loading-text">Loading</p>
      </div>

      <style jsx>{`
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          background: black;
          cursor: pointer;
        }

        .logo-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          opacity: 0;
          transition: opacity 0.5s ease;
        }

        .logo-wrapper.visible {
          opacity: 1;
        }

        .loading-text {
          font-family: 'Orbitron', monospace;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
        }

        .loading-text::after {
          content: '';
          animation: dots-content 1.5s ease-in-out infinite;
        }

        @keyframes dots-content {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
      `}</style>
    </div>
  );
}
