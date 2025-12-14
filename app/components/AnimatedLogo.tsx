"use client";

import { useEffect, useState, useMemo, useRef } from 'react';

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

// Calculate orbital positions - MUST match ProjectPlanets exactly
function calculateSocialPlanetPositions(screenWidth: number, screenHeight: number) {
  const cx = screenWidth / 2;
  const cy = screenHeight / 2;
  const screenSize = Math.min(screenWidth, screenHeight);
  
  // Layout based on screen size only (same logic as ProjectPlanets)
  const isSmallScreen = screenSize < 600;
  const isMobileLayout = isSmallScreen;
  
  // Use same values as ProjectPlanets
  const baseRadius = screenSize * (isMobileLayout ? 0.15 : 0.12);
  const radiusStep = screenSize * (isMobileLayout ? 0.06 : 0.04);
  
  return {
    red: {
      x: cx + Math.cos((0 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 0 * radiusStep),
      y: cy + Math.sin((0 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 0 * radiusStep),
    },
    green: {
      x: cx + Math.cos((1 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 1 * radiusStep),
      y: cy + Math.sin((1 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 1 * radiusStep),
    },
    blue: {
      x: cx + Math.cos((2 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 2 * radiusStep),
      y: cy + Math.sin((2 * Math.PI * 2) / 3 + Math.PI / 6) * (baseRadius + 2 * radiusStep),
    },
  };
}

interface AnimatedLogoProps {
  size?: number;
  svgPath?: string;
  onAnimationComplete?: () => void;
  onBallsInPosition?: () => void;
}

interface BallState {
  x: number;
  y: number;
  visible: boolean;
}

export default function AnimatedLogo({ 
  size = 240, 
  svgPath = '/denshi_ningen_logo.svg',
  onAnimationComplete,
  onBallsInPosition,
}: AnimatedLogoProps) {
  const [svgData, setSvgData] = useState<LogoData | null>(null);
  const [phase, setPhase] = useState<'loading' | 'building' | 'built' | 'transitioning' | 'arrived' | 'hidden'>('loading');
  const [screenSize, setScreenSize] = useState({ width: 1000, height: 800 });
  
  // Ball positions - start at null, set when logo is built
  const [redBall, setRedBall] = useState<BallState | null>(null);
  const [greenBall, setGreenBall] = useState<BallState | null>(null);
  const [blueBall, setBlueBall] = useState<BallState | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    fetch(svgPath)
      .then(res => res.text())
      .then(text => {
        const data = parseSVG(text);
        setSvgData(data);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, [svgPath]);

  const vertices = useMemo(() => {
    if (!svgData || svgData.circles.length < 3) return null;
    const sorted = [...svgData.circles].sort((a, b) => a.cy - b.cy);
    return {
      green: sorted[0],
      blue: sorted[1],
      red: sorted[2],
    };
  }, [svgData]);

  const orbitalPositions = useMemo(() => {
    return calculateSocialPlanetPositions(screenSize.width, screenSize.height);
  }, [screenSize]);

  // Animation sequence
  useEffect(() => {
    if (!svgData || !vertices) return;
    
    const buildTimer = setTimeout(() => setPhase('building'), 100);
    
    const builtTimer = setTimeout(() => {
      setPhase('built');
      onAnimationComplete?.();
      
      // Initialize floating balls at logo positions
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scaleX = rect.width / svgData.viewBox.width;
        const scaleY = rect.height / svgData.viewBox.height;
        
        setRedBall({
          x: rect.left + vertices.red.cx * scaleX,
          y: rect.top + vertices.red.cy * scaleY,
          visible: true,
        });
        setGreenBall({
          x: rect.left + vertices.green.cx * scaleX,
          y: rect.top + vertices.green.cy * scaleY,
          visible: true,
        });
        setBlueBall({
          x: rect.left + vertices.blue.cx * scaleX,
          y: rect.top + vertices.blue.cy * scaleY,
          visible: true,
        });
      }
    }, 2600);
    
    // Start transition - move balls to orbital positions
    const transitionTimer = setTimeout(() => {
      setPhase('transitioning');
      
      // Animate balls to orbital positions
      setRedBall(prev => prev ? { ...prev, x: orbitalPositions.red.x, y: orbitalPositions.red.y } : null);
      setGreenBall(prev => prev ? { ...prev, x: orbitalPositions.green.x, y: orbitalPositions.green.y } : null);
      setBlueBall(prev => prev ? { ...prev, x: orbitalPositions.blue.x, y: orbitalPositions.blue.y } : null);
    }, 4600);
    
    // Balls arrived
    const arrivedTimer = setTimeout(() => {
      setPhase('arrived');
      onBallsInPosition?.();
    }, 6400);
    
    // Hide balls
    const hideTimer = setTimeout(() => {
      setRedBall(prev => prev ? { ...prev, visible: false } : null);
      setGreenBall(prev => prev ? { ...prev, visible: false } : null);
      setBlueBall(prev => prev ? { ...prev, visible: false } : null);
    }, 6500);
    
    const hiddenTimer = setTimeout(() => setPhase('hidden'), 6800);
    
    return () => {
      clearTimeout(buildTimer);
      clearTimeout(builtTimer);
      clearTimeout(transitionTimer);
      clearTimeout(arrivedTimer);
      clearTimeout(hideTimer);
      clearTimeout(hiddenTimer);
    };
  }, [svgData, vertices, orbitalPositions, onAnimationComplete, onBallsInPosition]);

  if (!svgData || !vertices) {
    return <div style={{ width: size, height: size * 0.7 }} />;
  }

  const { viewBox, lineWidth } = svgData;
  const { green: topLeft, red: bottomLeft, blue: right } = vertices;
  const dotRadius = topLeft.r;

  const lineRedLength = Math.sqrt(Math.pow(bottomLeft.cx - topLeft.cx, 2) + Math.pow(bottomLeft.cy - topLeft.cy, 2));
  const lineBlueLength = Math.sqrt(Math.pow(right.cx - bottomLeft.cx, 2) + Math.pow(right.cy - bottomLeft.cy, 2));
  const lineGreenLength = Math.sqrt(Math.pow(topLeft.cx - right.cx, 2) + Math.pow(topLeft.cy - right.cy, 2));

  const isBuilding = phase === 'building';
  const isBuilt = phase === 'built' || phase === 'transitioning' || phase === 'arrived';
  const isTransitioning = phase === 'transitioning' || phase === 'arrived' || phase === 'hidden';
  const showFloatingBalls = redBall && greenBall && blueBall && phase !== 'loading' && phase !== 'building';

  // Ball size in screen pixels
  const logoHeight = size * (viewBox.height / viewBox.width);
  const ballSize = (dotRadius / viewBox.width) * size * 2;

  return (
    <>
      {/* SVG Logo */}
      <div 
        ref={containerRef}
        className="logo-container"
        style={{ 
          width: size, 
          height: logoHeight,
          opacity: isTransitioning ? 0 : 1,
          transition: 'opacity 0.5s ease',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          width={size}
          height={logoHeight}
          style={{ overflow: 'visible' }}
        >
          {/* Lines - animated during build, retract into START point balls when transitioning */}
          <g>
            {/* Red line - from GREEN (start) to red (end), retracts INTO GREEN ball */}
            <line x1={topLeft.cx} y1={topLeft.cy} x2={bottomLeft.cx} y2={bottomLeft.cy}
              stroke={bottomLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" 
              style={{ 
                strokeDasharray: lineRedLength, 
                strokeDashoffset: isTransitioning ? lineRedLength : ((isBuilding || isBuilt) ? 0 : lineRedLength),
                filter: isTransitioning ? `drop-shadow(0 0 15px ${bottomLeft.fill})` : 'none',
                transition: isTransitioning 
                  ? 'stroke-dashoffset 0.8s ease-in, filter 0.2s ease' 
                  : 'stroke-dashoffset 0.6s linear 0.12s',
              }} 
            />
            {/* Blue line - from RED (start) to blue (end), retracts INTO RED ball */}
            <line x1={bottomLeft.cx} y1={bottomLeft.cy} x2={right.cx} y2={right.cy}
              stroke={right.fill} strokeWidth={lineWidth} strokeLinecap="round" 
              style={{ 
                strokeDasharray: lineBlueLength, 
                strokeDashoffset: isTransitioning ? lineBlueLength : ((isBuilding || isBuilt) ? 0 : lineBlueLength),
                filter: isTransitioning ? `drop-shadow(0 0 15px ${right.fill})` : 'none',
                transition: isTransitioning 
                  ? 'stroke-dashoffset 0.8s ease-in 0.1s, filter 0.2s ease' 
                  : 'stroke-dashoffset 0.6s linear 0.92s',
              }} 
            />
            {/* Green line - from BLUE (start) to green (end), retracts INTO BLUE ball */}
            <line x1={right.cx} y1={right.cy} x2={topLeft.cx} y2={topLeft.cy}
              stroke={topLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" 
              style={{ 
                strokeDasharray: lineGreenLength, 
                strokeDashoffset: isTransitioning ? lineGreenLength : ((isBuilding || isBuilt) ? 0 : lineGreenLength),
                filter: isTransitioning ? `drop-shadow(0 0 15px ${topLeft.fill})` : 'none',
                transition: isTransitioning 
                  ? 'stroke-dashoffset 0.8s ease-in 0.2s, filter 0.2s ease' 
                  : 'stroke-dashoffset 0.6s linear 1.72s',
              }} 
            />
          </g>

          {/* Static dots in SVG (hidden when floating balls take over) */}
          <g style={{ opacity: isBuilt && !showFloatingBalls ? 1 : 0, transition: 'opacity 0.1s ease' }}>
            <circle cx={bottomLeft.cx} cy={bottomLeft.cy} r={dotRadius} fill={bottomLeft.fill} />
            <circle cx={right.cx} cy={right.cy} r={dotRadius} fill={right.fill} />
            <circle cx={topLeft.cx} cy={topLeft.cy} r={dotRadius} fill={topLeft.fill} />
          </g>
          
          {/* Build animation balls - appear sequentially */}
          <g style={{ opacity: isBuilt ? 0 : 1 }}>
            {/* Red ball - appears first, travels from green position to red position */}
            <circle 
              r={dotRadius} fill={bottomLeft.fill}
              cx={isBuilding ? bottomLeft.cx : topLeft.cx}
              cy={isBuilding ? bottomLeft.cy : topLeft.cy}
              style={{ 
                opacity: isBuilding ? 1 : 0,
                transition: 'cx 0.6s linear 0.1s, cy 0.6s linear 0.1s, opacity 0.1s ease 0.1s',
              }}
            />
            {/* Blue ball - appears second, travels from red position to blue position */}
            <circle 
              r={dotRadius} fill={right.fill}
              cx={isBuilding ? right.cx : bottomLeft.cx}
              cy={isBuilding ? right.cy : bottomLeft.cy}
              style={{ 
                opacity: isBuilding ? 1 : 0,
                transition: 'cx 0.6s linear 0.9s, cy 0.6s linear 0.9s, opacity 0.1s ease 0.9s',
              }}
            />
            {/* Green ball - appears third, travels from blue position to green position */}
            <circle 
              r={dotRadius} fill={topLeft.fill}
              cx={isBuilding ? topLeft.cx : right.cx}
              cy={isBuilding ? topLeft.cy : right.cy}
              style={{ 
                opacity: isBuilding ? 1 : 0,
                transition: 'cx 0.6s linear 1.7s, cy 0.6s linear 1.7s, opacity 0.1s ease 1.7s',
              }}
            />
          </g>
        </svg>
      </div>

      {/* Floating balls that fly to orbital positions */}
      {showFloatingBalls && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}>
          {/* Red ball */}
          {redBall && (
            <div
              style={{
                position: 'absolute',
                left: redBall.x,
                top: redBall.y,
                width: ballSize,
                height: ballSize,
                borderRadius: '50%',
                backgroundColor: bottomLeft.fill,
                transform: 'translate(-50%, -50%)',
                transition: 'left 1.8s cubic-bezier(0.25, 0.1, 0.25, 1), top 1.8s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.3s ease',
                opacity: redBall.visible ? 1 : 0,
                boxShadow: `0 0 ${ballSize}px ${bottomLeft.fill}`,
              }}
            />
          )}
          {/* Green ball */}
          {greenBall && (
            <div
              style={{
                position: 'absolute',
                left: greenBall.x,
                top: greenBall.y,
                width: ballSize,
                height: ballSize,
                borderRadius: '50%',
                backgroundColor: topLeft.fill,
                transform: 'translate(-50%, -50%)',
                transition: 'left 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s, top 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.1s, opacity 0.3s ease',
                opacity: greenBall.visible ? 1 : 0,
                boxShadow: `0 0 ${ballSize}px ${topLeft.fill}`,
              }}
            />
          )}
          {/* Blue ball */}
          {blueBall && (
            <div
              style={{
                position: 'absolute',
                left: blueBall.x,
                top: blueBall.y,
                width: ballSize,
                height: ballSize,
                borderRadius: '50%',
                backgroundColor: right.fill,
                transform: 'translate(-50%, -50%)',
                transition: 'left 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s, top 1.8s cubic-bezier(0.25, 0.1, 0.25, 1) 0.2s, opacity 0.3s ease',
                opacity: blueBall.visible ? 1 : 0,
                boxShadow: `0 0 ${ballSize}px ${right.fill}`,
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
