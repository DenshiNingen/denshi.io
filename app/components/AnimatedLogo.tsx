"use client";

import { useEffect, useState, useMemo } from 'react';

// Type for parsed SVG data
interface LogoData {
  viewBox: { width: number; height: number };
  circles: { cx: number; cy: number; r: number; fill: string }[];
  lineWidth: number;
}

// Parse SVG file and extract circle data
function parseSVG(svgText: string): LogoData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  if (!svg) return null;
  
  // Get viewBox
  const viewBoxAttr = svg.getAttribute('viewBox');
  const [, , width, height] = viewBoxAttr?.split(' ').map(Number) || [0, 0, 750, 531];
  
  // Get all circles (these are our vertices)
  const circleElements = svg.querySelectorAll('circle');
  const circles = Array.from(circleElements).map(circle => ({
    cx: parseFloat(circle.getAttribute('cx') || '0'),
    cy: parseFloat(circle.getAttribute('cy') || '0'),
    r: parseFloat(circle.getAttribute('r') || '0'),
    fill: circle.getAttribute('fill') || '#FFFFFF',
  }));
  
  // Get line width from first rect
  const rect = svg.querySelector('rect');
  const lineWidth = parseFloat(rect?.getAttribute('width') || '65');
  
  return { viewBox: { width, height }, circles, lineWidth };
}

interface AnimatedLogoProps {
  size?: number;
  svgPath?: string;
}

// Animated Logo Component - loads SVG dynamically
export default function AnimatedLogo({ 
  size = 240, 
  svgPath = '/denshi_ningen_logo.svg' 
}: AnimatedLogoProps) {
  const [svgData, setSvgData] = useState<LogoData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [animationDone, setAnimationDone] = useState(false);

  // Load and parse SVG on mount
  useEffect(() => {
    fetch(svgPath)
      .then(res => res.text())
      .then(text => {
        const data = parseSVG(text);
        setSvgData(data);
      })
      .catch(err => console.error('Failed to load SVG:', err));
  }, [svgPath]);

  // Start animation after SVG is loaded
  useEffect(() => {
    if (!svgData) return;
    
    const timer = setTimeout(() => setIsLoaded(true), 100);
    const doneTimer = setTimeout(() => setAnimationDone(true), 2600);
    return () => {
      clearTimeout(timer);
      clearTimeout(doneTimer);
    };
  }, [svgData]);

  // Sort circles by position to identify vertices
  const vertices = useMemo(() => {
    if (!svgData || svgData.circles.length < 3) return null;
    
    const sorted = [...svgData.circles].sort((a, b) => a.cy - b.cy);
    // Top circle (smallest y) = green (topLeft)
    // Middle circle = blue (right) 
    // Bottom circle (largest y) = red (bottomLeft)
    return {
      green: sorted[0],  // topLeft
      blue: sorted[1],   // right (middle y)
      red: sorted[2],    // bottomLeft
    };
  }, [svgData]);

  if (!svgData || !vertices) {
    return <div style={{ width: size, height: size * 0.7 }} />;
  }

  const { viewBox, lineWidth } = svgData;
  const { green: topLeft, red: bottomLeft, blue: right } = vertices;
  const dotRadius = topLeft.r;

  // Calculate line lengths for stroke-dasharray
  const lineRedLength = Math.sqrt(Math.pow(bottomLeft.cx - topLeft.cx, 2) + Math.pow(bottomLeft.cy - topLeft.cy, 2));
  const lineBlueLength = Math.sqrt(Math.pow(right.cx - bottomLeft.cx, 2) + Math.pow(right.cy - bottomLeft.cy, 2));
  const lineGreenLength = Math.sqrt(Math.pow(topLeft.cx - right.cx, 2) + Math.pow(topLeft.cy - right.cy, 2));

  return (
    <div className="logo-container" style={{ width: size, height: size * (viewBox.height / viewBox.width) }}>
      <svg
        viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
        width={size}
        height={size * (viewBox.height / viewBox.width)}
        className={`logo-svg ${isLoaded ? 'loaded' : ''} ${animationDone ? 'done' : ''}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Static lines (shown after animation) */}
        <g className="static-lines">
          <line x1={topLeft.cx} y1={topLeft.cy} x2={bottomLeft.cx} y2={bottomLeft.cy}
            stroke={bottomLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" />
          <line x1={bottomLeft.cx} y1={bottomLeft.cy} x2={right.cx} y2={right.cy}
            stroke={right.fill} strokeWidth={lineWidth} strokeLinecap="round" />
          <line x1={topLeft.cx} y1={topLeft.cy} x2={right.cx} y2={right.cy}
            stroke={topLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" />
        </g>

        {/* Animated lines (trails) */}
        <g className="animated-lines">
          <line x1={topLeft.cx} y1={topLeft.cy} x2={bottomLeft.cx} y2={bottomLeft.cy}
            stroke={bottomLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" 
            className="line line-red" style={{ strokeDasharray: lineRedLength, strokeDashoffset: lineRedLength }} />
          <line x1={bottomLeft.cx} y1={bottomLeft.cy} x2={right.cx} y2={right.cy}
            stroke={right.fill} strokeWidth={lineWidth} strokeLinecap="round" 
            className="line line-blue" style={{ strokeDasharray: lineBlueLength, strokeDashoffset: lineBlueLength }} />
          <line x1={right.cx} y1={right.cy} x2={topLeft.cx} y2={topLeft.cy}
            stroke={topLeft.fill} strokeWidth={lineWidth} strokeLinecap="round" 
            className="line line-green" style={{ strokeDasharray: lineGreenLength, strokeDashoffset: lineGreenLength }} />
        </g>

        {/* Static dots (shown after animation) */}
        <g className="static-dots">
          <circle cx={bottomLeft.cx} cy={bottomLeft.cy} r={dotRadius} fill={bottomLeft.fill} />
          <circle cx={right.cx} cy={right.cy} r={dotRadius} fill={right.fill} />
          <circle cx={topLeft.cx} cy={topLeft.cy} r={dotRadius} fill={topLeft.fill} />
        </g>
        
        {/* Animated balls */}
        <circle r={dotRadius} fill={bottomLeft.fill} className="ball ball-red" />
        <circle r={dotRadius} fill={right.fill} className="ball ball-blue" />
        <circle r={dotRadius} fill={topLeft.fill} className="ball ball-green" />
      </svg>

      <style jsx>{`
        .logo-container {
          position: relative;
          z-index: 2;
        }

        .logo-svg {
          overflow: visible;
        }


        /* Hide static elements until animation done */
        .static-lines, .static-dots {
          opacity: 0;
        }
        .logo-svg.done .static-lines,
        .logo-svg.done .static-dots {
          opacity: 1;
        }

        /* Hide animated elements after done */
        .logo-svg.done .animated-lines,
        .logo-svg.done .ball {
          opacity: 0;
        }

        /* Animated lines */
        .animated-lines .line {
          opacity: 0;
        }

        .logo-svg.loaded .animated-lines .line {
          opacity: 1;
          stroke-dashoffset: 0 !important;
        }

        .logo-svg.loaded .line-red {
          transition: stroke-dashoffset 0.6s linear, opacity 0.05s;
          transition-delay: 0.12s;
        }
        .logo-svg.loaded .line-blue {
          transition: stroke-dashoffset 0.6s linear, opacity 0.05s;
          transition-delay: 0.92s;
        }
        .logo-svg.loaded .line-green {
          transition: stroke-dashoffset 0.6s linear, opacity 0.05s;
          transition-delay: 1.72s;
        }

        /* Animated balls */
        .ball { opacity: 0; }

        .ball-red {
          cx: ${topLeft.cx};
          cy: ${topLeft.cy};
        }
        .logo-svg.loaded .ball-red {
          opacity: 1;
          cx: ${bottomLeft.cx};
          cy: ${bottomLeft.cy};
          transition: cx 0.6s linear, cy 0.6s linear, opacity 0.1s ease;
          transition-delay: 0.1s;
        }

        .ball-blue {
          cx: ${bottomLeft.cx};
          cy: ${bottomLeft.cy};
        }
        .logo-svg.loaded .ball-blue {
          opacity: 1;
          cx: ${right.cx};
          cy: ${right.cy};
          transition: cx 0.6s linear, cy 0.6s linear, opacity 0.1s ease;
          transition-delay: 0.9s;
        }

        .ball-green {
          cx: ${right.cx};
          cy: ${right.cy};
        }
        .logo-svg.loaded .ball-green {
          opacity: 1;
          cx: ${topLeft.cx};
          cy: ${topLeft.cy};
          transition: cx 0.6s linear, cy 0.6s linear, opacity 0.1s ease;
          transition-delay: 1.7s;
        }
      `}</style>
    </div>
  );
}

