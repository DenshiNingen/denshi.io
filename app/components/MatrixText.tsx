"use client";

import { useEffect, useState, useCallback } from 'react';

interface MatrixTextProps {
  text: string;
  startDelay?: number;
  charRevealTime?: number;
  scrambleIterations?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Matrix-style text reveal component
export default function MatrixText({ 
  text, 
  startDelay = 0,
  charRevealTime = 25,
  scrambleIterations = 2,
  className,
  style,
}: MatrixTextProps) {
  const [displayText, setDisplayText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
  
  const getRandomChar = useCallback(() => {
    return chars[Math.floor(Math.random() * chars.length)];
  }, []);

  useEffect(() => {
    const startTimer = setTimeout(() => setIsStarted(true), startDelay);
    return () => clearTimeout(startTimer);
  }, [startDelay]);

  useEffect(() => {
    if (!isStarted) return;
    
    let currentIndex = 0;
    let scrambleCount = 0;
    
    const animate = () => {
      if (currentIndex >= text.length) return;
      
      // Build the display string
      let result = text.slice(0, currentIndex); // Already revealed chars
      
      // Current char being scrambled
      if (scrambleCount < scrambleIterations) {
        // Still scrambling - show random char (preserve spaces)
        result += text[currentIndex] === ' ' ? ' ' : getRandomChar();
        scrambleCount++;
      } else {
        // Done scrambling - reveal actual char and move to next
        result += text[currentIndex];
        currentIndex++;
        scrambleCount = 0;
      }
      
      // Fill rest with spaces or nothing
      setDisplayText(result);
    };

    const interval = setInterval(animate, charRevealTime);
    
    return () => clearInterval(interval);
  }, [isStarted, text, charRevealTime, scrambleIterations, getRandomChar]);

  return (
    <span className={className} style={{ fontFamily: 'Orbitron, monospace', ...style }}>
      {displayText || '\u00A0'}
    </span>
  );
}

