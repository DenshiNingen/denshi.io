"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { allPlanets, Planet } from '../data/planets';
import { useVisitors, Visitor } from '../hooks/useVisitors';
import { calculateSocialPlanetPositions } from '../utils/orbitalPositions';
import MatrixText from './MatrixText';
import Chat from './Chat';
import PrivateChat from './PrivateChat';

// Simple SVG icons for social planets
function getSocialIcon(icon: string): React.ReactNode {
  switch (icon) {
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="60%" height="60%">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    default:
      return null;
  }
}

// Helper to format time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  
  if (seconds < 60) return 'Just arrived';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return 'Long time explorer';
}

interface PlanetData {
  planet: Planet;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  mass: number;
  size: number; // Visual size based on mass
  isFreed: boolean;
  freedX?: number;
  freedY?: number;
}

interface PlanetPosition {
  x: number;
  y: number;
  planet: Planet;
  size: number;
  isFreed: boolean;
}

interface Connection {
  from: PlanetPosition;
  to: PlanetPosition;
  length: number;
}

interface ProjectPlanetsProps {
  startDelay?: number;
  attractRadius?: number;
  socialOrbitDelay?: number; // Delay before social planets start orbiting
  onPositionsGenerated?: (positions: { x: number; y: number }[]) => void;
}

export default function ProjectPlanets({ 
  startDelay = 3500, 
  attractRadius = 100,
  socialOrbitDelay = 0,
  onPositionsGenerated 
}: ProjectPlanetsProps) {
  const [positions, setPositions] = useState<PlanetPosition[]>([]);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [connectionsVisible, setConnectionsVisible] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [nearPlanetId, setNearPlanetId] = useState<string | null>(null);
  const [orbitRadii, setOrbitRadii] = useState<number[]>([]);
  const [isTouchDevice] = useState(
    () => typeof window !== 'undefined'
      && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  );
  const [highlightExplorers, setHighlightExplorers] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenMessageCountRef = useRef(-1); // -1 means not initialized
  const initialLoadDoneRef = useRef(false);
  const [privateChatTarget, setPrivateChatTarget] = useState<Visitor | null>(null);
  
  // Real-time visitors
  const { visitors, visitorCount, isConnected, messages, sendMessage, currentUserId, currentUserName, currentUserFlag, privateNotifications, clearPrivateNotification, getPrivateMessages, setPrivateMessagesForChannel } = useVisitors();
  
  // Use refs for animation state to avoid re-render issues
  const planetsRef = useRef<PlanetData[]>([]);
  const centerRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const onPositionsGeneratedRef = useRef(onPositionsGenerated);
  const socialOrbitingRef = useRef(false);
  const hasDraggedRef = useRef(false); // Track if actual dragging occurred
  
  // Keep callback ref updated
  useEffect(() => {
    onPositionsGeneratedRef.current = onPositionsGenerated;
  }, [onPositionsGenerated]);

  // Initialize planets with Kepler-like orbital mechanics
  useEffect(() => {
    const initPlanets = () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      centerRef.current = { x: cx, y: cy };
      setCenter({ x: cx, y: cy });

      const screenSize = Math.min(window.innerWidth, window.innerHeight);
      
      // Detect touch device (for interaction behavior, not layout)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = screenSize < 600;
      // Layout adjustments based on screen size, NOT touch capability
      const isMobileLayout = isSmallScreen;
      
      // Separate social planets (inner orbits) from project planets (outer orbits)
      const socialPlanetsData = allPlanets.filter(p => p.isSocialPlanet);
      const projectPlanetsData = allPlanets.filter(p => !p.isSocialPlanet);
      
      // Sort project planets by mass
      const sortedProjects = [...projectPlanetsData].sort((a, b) => (a.mass || 2) - (b.mass || 2));
      
      const radii: number[] = [];
      const allPlanetData: PlanetData[] = [];
      
      // Social planets: inner orbits (closest to sun) - use shared utility for positions
      const socialPositions = calculateSocialPlanetPositions(window.innerWidth, window.innerHeight);
      const socialKeys: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue'];
      socialPlanetsData.forEach((p, index) => {
        const mass = p.mass || 3;
        const pos = socialPositions[socialKeys[index]];
        radii.push(pos.radius);

        // Social planets orbit faster
        const orbitSpeed = 25 + index * 8;

        // Larger size for social planets (smaller on mobile)
        const size = isMobileLayout ? 10 + mass * 1.5 : 12 + mass * 2;

        allPlanetData.push({
          planet: p,
          orbitRadius: pos.radius,
          orbitSpeed,
          angle: pos.angle,
          mass,
          size,
          isFreed: false,
        });
      });
      
      // Project planets: outer orbits
      const projectBaseRadius = screenSize * (isMobileLayout ? 0.28 : 0.25);
      const maxRadius = screenSize * (isMobileLayout ? 0.42 : 0.45);
      
      sortedProjects.forEach((p, index) => {
        const mass = p.mass || 2;
        
        // Exponential orbit spacing (less spread on mobile)
        const orbitFactor = Math.pow(isMobileLayout ? 1.2 : 1.3, index);
        const radius = Math.min(projectBaseRadius * orbitFactor, maxRadius);
        radii.push(radius);
        
        // Kepler's 3rd law: T ∝ r^1.5
        const baseOrbitTime = 50;
        const orbitSpeed = baseOrbitTime * Math.pow(radius / projectBaseRadius, 1.5);
        
        // Golden angle distribution
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const startAngle = index * goldenAngle + Math.random() * 0.3;
        
        // Size based on mass (smaller on mobile)
        const size = isMobileLayout ? 5 + mass * 1.5 : 6 + mass * 2;
        
        allPlanetData.push({
          planet: p,
          orbitRadius: radius,
          orbitSpeed,
          angle: startAngle,
          mass,
          size,
          isFreed: false,
        });
      });
      
      planetsRef.current = allPlanetData;
      setOrbitRadii(radii);
    };

    initPlanets();
    window.addEventListener('resize', initPlanets);
    return () => window.removeEventListener('resize', initPlanets);
  }, []);

  // Convert visitors to planets and add them to the solar system
  const visitorPlanetsRef = useRef<Map<string, PlanetData>>(new Map());
  
  useEffect(() => {
    if (!visible || visitors.length === 0) return;
    
    const screenSize = Math.min(window.innerWidth, window.innerHeight);
    const isSmallScreen = screenSize < 600;
    
    // Visitor orbit zone - outermost ring
    const visitorBaseRadius = screenSize * (isSmallScreen ? 0.35 : 0.38);
    const visitorMaxRadius = screenSize * (isSmallScreen ? 0.48 : 0.5);
    
    // Update visitor planets
    const currentVisitorIds = new Set(visitors.map(v => v.id));
    const existingVisitorIds = new Set(visitorPlanetsRef.current.keys());
    
    // Remove visitors that left
    existingVisitorIds.forEach(id => {
      if (!currentVisitorIds.has(id)) {
        visitorPlanetsRef.current.delete(id);
        // Remove from planetsRef
        planetsRef.current = planetsRef.current.filter(p => p.planet.id !== id);
      }
    });
    
    // Add new visitors
    visitors.forEach((visitor, index) => {
      if (!visitorPlanetsRef.current.has(visitor.id)) {
        // Calculate orbit for new visitor
        const radiusVariation = (Math.random() * 0.5 + 0.5); // 50-100% of available range
        const radius = visitorBaseRadius + (visitorMaxRadius - visitorBaseRadius) * radiusVariation;
        
        // Random starting angle
        const startAngle = Math.random() * Math.PI * 2;
        
        // Orbit speed - slower for outer orbits
        const orbitSpeed = 60 + Math.random() * 40;
        
        const visitorPlanet: Planet = {
          id: visitor.id,
          name: visitor.isCurrentUser ? '✨ You' : visitor.name,
          description: visitor.isCurrentUser ? 'Your presence in this universe' : 'Exploring the cosmos',
          color: visitor.color,
          mass: 1.5,
          isVisitor: true,
          isCurrentUser: visitor.isCurrentUser,
          visitorInfo: {
            browser: visitor.browser,
            device: visitor.device,
            country: visitor.country,
            flag: visitor.flag,
            joinedAt: visitor.joinedAt,
          },
        };
        
        const planetData: PlanetData = {
          planet: visitorPlanet,
          orbitRadius: radius,
          orbitSpeed,
          angle: startAngle,
          mass: 1.5,
          size: isSmallScreen ? 6 : 8,
          isFreed: false,
        };
        
        visitorPlanetsRef.current.set(visitor.id, planetData);
        planetsRef.current.push(planetData);
      }
    });
  }, [visitors, visible]);

  // Start social planets orbiting after delay
  useEffect(() => {
    if (!visible) {
      socialOrbitingRef.current = false;
      return;
    }

    if (socialOrbitDelay <= 0) {
      socialOrbitingRef.current = true;
      return;
    }
    
    const timer = setTimeout(() => {
      socialOrbitingRef.current = true;
    }, socialOrbitDelay);
    
    return () => clearTimeout(timer);
  }, [visible, socialOrbitDelay]);

  // Animation loop - runs continuously, updates positions
  useEffect(() => {
    if (!visible) return;
    
    isAnimatingRef.current = true;
    lastTimeRef.current = performance.now();

    const animate = () => {
      if (!isAnimatingRef.current) return;
      
      const now = performance.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Update angles for orbiting planets
      const newPositions: PlanetPosition[] = planetsRef.current.map(pd => {
        if (pd.isFreed) {
          return {
            x: pd.freedX || centerRef.current.x,
            y: pd.freedY || centerRef.current.y,
            planet: pd.planet,
            size: pd.size,
            isFreed: pd.isFreed,
          };
        }

        // Social planets don't orbit until socialOrbitingRef is true
        const isSocial = pd.planet.isSocialPlanet;
        if (isSocial && !socialOrbitingRef.current) {
          // Stay at initial position
          return {
            x: centerRef.current.x + Math.cos(pd.angle) * pd.orbitRadius,
            y: centerRef.current.y + Math.sin(pd.angle) * pd.orbitRadius,
            planet: pd.planet,
            size: pd.size,
            isFreed: pd.isFreed,
          };
        }

        // Update angle
        const angleSpeed = (Math.PI * 2) / pd.orbitSpeed;
        pd.angle += angleSpeed * deltaTime;

        return {
          x: centerRef.current.x + Math.cos(pd.angle) * pd.orbitRadius,
          y: centerRef.current.y + Math.sin(pd.angle) * pd.orbitRadius,
          planet: pd.planet,
          size: pd.size,
          isFreed: pd.isFreed,
        };
      });

      setPositions(newPositions);
      
      // Notify parent (throttled)
      if (onPositionsGeneratedRef.current) {
        onPositionsGeneratedRef.current(newPositions.map(p => ({ x: p.x, y: p.y })));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [visible]);

  // Handle dragging
  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      hasDraggedRef.current = true; // Mark that actual dragging happened
      const pd = planetsRef.current.find(p => p.planet.id === draggingId);
      if (pd) {
        pd.freedX = e.clientX - dragOffsetRef.current.x;
        pd.freedY = e.clientY - dragOffsetRef.current.y;
      }
    };

    const handleMouseUp = () => {
      const pd = planetsRef.current.find(p => p.planet.id === draggingId);
      if (pd && pd.freedX !== undefined && pd.freedY !== undefined) {
        // Calculate new angle AND radius based on drop position
        const dx = pd.freedX - centerRef.current.x;
        const dy = pd.freedY - centerRef.current.y;
        const newAngle = Math.atan2(dy, dx);
        const newRadius = Math.sqrt(dx * dx + dy * dy);
        
        // Update both angle and orbit radius to match drop position
        pd.angle = newAngle;
        pd.orbitRadius = newRadius;
        
        // Return to orbit after dragging
        pd.isFreed = false;
      }
      setDraggingId(null);
    };

    // Touch events for mobile
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      hasDraggedRef.current = true;
      const pd = planetsRef.current.find(p => p.planet.id === draggingId);
      if (pd) {
        pd.freedX = touch.clientX - dragOffsetRef.current.x;
        pd.freedY = touch.clientY - dragOffsetRef.current.y;
      }
    };

    const handleTouchEnd = () => {
      handleMouseUp(); // Reuse the same logic
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingId]);

  // Track mouse position for nearby planet detection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingId) return;
      
      let nearest: string | null = null;
      let minDist = attractRadius;
      
      positions.forEach(({ x, y, planet }) => {
        const dx = e.clientX - x;
        const dy = e.clientY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = planet.id;
        }
      });
      
      setNearPlanetId(nearest);
    };

    const handleMouseLeave = () => {
      setNearPlanetId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [draggingId, positions, attractRadius]);

  // Close tooltip when clicking outside planets
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.planet')) {
        setHoveredProject(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Start dragging (mouse)
  const handleDragStart = useCallback((e: React.MouseEvent, projectId: string, planetX: number, planetY: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    hasDraggedRef.current = false; // Reset drag flag
    
    const planet = planetsRef.current.find(p => p.planet.id === projectId);
    if (planet) {
      planet.freedX = planetX;
      planet.freedY = planetY;
      planet.isFreed = true;
    }
    
    dragOffsetRef.current = {
      x: e.clientX - planetX,
      y: e.clientY - planetY,
    };
    
    setDraggingId(projectId);
    setNearPlanetId(null);
  }, []);

  // Start dragging (touch)
  const handleTouchStart = useCallback((e: React.TouchEvent, projectId: string, planetX: number, planetY: number) => {
    if (e.touches.length !== 1) return; // Only single touch
    
    const touch = e.touches[0];
    hasDraggedRef.current = false;
    
    const planet = planetsRef.current.find(p => p.planet.id === projectId);
    if (planet) {
      planet.freedX = planetX;
      planet.freedY = planetY;
      planet.isFreed = true;
    }
    
    dragOffsetRef.current = {
      x: touch.clientX - planetX,
      y: touch.clientY - planetY,
    };
    
    setDraggingId(projectId);
    setNearPlanetId(null);
  }, []);

  // Double-click to return to orbit
  const handleDoubleClick = useCallback((projectId: string) => {
    const planetData = planetsRef.current.find(p => p.planet.id === projectId);
    if (planetData) {
      // If it's a visitor planet (not current user), open private chat
      if (planetData.planet.isVisitor && !planetData.planet.isCurrentUser) {
        const visitor = visitors.find(v => v.id === projectId);
        if (visitor) {
          setPrivateChatTarget(visitor);
          // Clear notification for this user
          clearPrivateNotification(visitor.id);
        }
      } else {
        // Return to orbit for non-visitor planets
        planetData.isFreed = false;
      }
    }
  }, [visitors, clearPrivateNotification]);

  // Calculate connections between planets
  const connections = useMemo((): Connection[] => {
    if (positions.length < 2) return [];
    
    const conns: Connection[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const length = Math.sqrt(
          Math.pow(positions[j].x - positions[i].x, 2) + 
          Math.pow(positions[j].y - positions[i].y, 2)
        );
        conns.push({
          from: positions[i],
          to: positions[j],
          length,
        });
      }
    }
    return conns;
  }, [positions]);

  // Show planets after delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  // Show connections after planets appear
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setConnectionsVisible(true), 600);
    return () => clearTimeout(timer);
  }, [visible]);

  // Show visitor counter after planets and connections are visible
  useEffect(() => {
    if (!connectionsVisible || !isConnected) return;
    const timer = setTimeout(() => setShowCounter(true), 800);
    return () => clearTimeout(timer);
  }, [connectionsVisible, isConnected]);

  // Track unread messages
  useEffect(() => {
    // First time messages arrive (initial load from Redis), don't count as unread
    if (!initialLoadDoneRef.current && messages.length > 0) {
      lastSeenMessageCountRef.current = messages.length;
      initialLoadDoneRef.current = true;
      return;
    }
    
    if (chatOpen) {
      // When chat opens, mark all as read
      lastSeenMessageCountRef.current = messages.length;
    } else if (initialLoadDoneRef.current) {
      // When chat is closed, count new messages (only after initial load)
      const newMessages = messages.length - lastSeenMessageCountRef.current;
      if (newMessages > 0) {
        setUnreadCount(newMessages);
      }
    }
  }, [chatOpen, messages.length]);

  const handleChatToggle = useCallback(() => {
    if (!chatOpen) {
      lastSeenMessageCountRef.current = messages.length;
      setUnreadCount(0);
    }
    setChatOpen(open => !open);
  }, [chatOpen, messages.length]);

  const handleClick = useCallback((e: React.MouseEvent, planet: Planet) => {
    // Only process if no dragging occurred
    if (hasDraggedRef.current) return;
    
    // If tooltip is already showing for this planet, open the link
    if (hoveredProject === planet.id && planet.url) {
      window.open(planet.url, '_blank');
    } else {
      // First click: show tooltip
      setHoveredProject(planet.id);
    }
  }, [hoveredProject]);

  return (
    <div className="project-planets">
      {/* Orbit paths */}
      <svg className={`orbit-paths ${visible ? 'visible' : ''}`} width="100%" height="100%">
        {orbitRadii.map((radius, index) => (
          <circle
            key={`orbit-path-${index}`}
            cx={center.x}
            cy={center.y}
            r={radius}
            className="orbit-path"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </svg>

      {/* Constellation lines */}
      <svg 
        className={`constellation-lines ${connectionsVisible ? 'visible' : ''}`}
        width="100%" 
        height="100%"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
          </linearGradient>
        </defs>
        {connections.map((conn, index) => (
          <line
            key={`connection-${index}`}
            x1={conn.from.x}
            y1={conn.from.y}
            x2={conn.to.x}
            y2={conn.to.y}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            className="constellation-line"
          />
        ))}
      </svg>

      {positions.map(({ x, y, planet, size: planetSize, isFreed }) => {
        const isDragging = draggingId === planet.id;
        const isNear = nearPlanetId === planet.id && !isDragging;
        const isSocial = planet.isSocialPlanet;
        const isDummy = planet.isDummy;
        const isVisitor = planet.isVisitor;
        const isCurrentUser = planet.isCurrentUser;
        const hasPrivateMessage = isVisitor && !isCurrentUser && privateNotifications[planet.id];
        
        // Calculate tooltip position based on planet position
        const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const nearTop = y < 100;
        const nearLeft = x < 150;
        const nearRight = x > viewportWidth - 150;
        
        let tooltipPosition = 'top';
        if (nearTop) tooltipPosition = 'bottom';
        
        let tooltipAlign = 'center';
        if (nearLeft) tooltipAlign = 'left';
        else if (nearRight) tooltipAlign = 'right';
        
        return (
        <div
          key={planet.id}
          className={`planet ${visible ? 'visible' : ''} ${isDragging ? 'dragging' : ''} ${isNear ? 'near' : ''} ${isFreed ? 'freed' : ''} ${isSocial ? 'social-planet' : ''} ${isDummy ? 'dummy-planet' : ''} ${isVisitor ? 'visitor-planet' : ''} ${isCurrentUser ? 'current-user-planet' : ''} ${isVisitor && highlightExplorers ? 'highlight-explorer' : ''} ${hasPrivateMessage ? 'has-private-message' : ''}`}
          style={{
            transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
            '--planet-size': `${planetSize}px`,
            '--glow-size': `${planetSize * 2.5}px`,
          } as React.CSSProperties}
          onMouseEnter={() => !isTouchDevice && !draggingId && !isDummy && setHoveredProject(planet.id)}
          onMouseLeave={() => !isTouchDevice && setHoveredProject(null)}
          onMouseDown={(e) => handleDragStart(e, planet.id, x, y)}
          onTouchStart={(e) => handleTouchStart(e, planet.id, x, y)}
          onClick={(e) => !isDragging && !isDummy && handleClick(e, planet)}
          onDoubleClick={() => handleDoubleClick(planet.id)}
        >
          {/* Planet glow */}
          <div 
            className="planet-glow"
            style={{ 
              backgroundColor: planet.color || '#ffffff',
              width: `${planetSize * 2.5}px`,
              height: `${planetSize * 2.5}px`,
            }}
          />
          
          {/* Planet core */}
          <div 
            className="planet-core"
            style={{ 
              backgroundColor: planet.color || '#ffffff',
              width: `${planetSize}px`,
              height: `${planetSize}px`,
            }}
          >
            {/* Social icon */}
            {isSocial && planet.icon && (
              <span className="planet-icon">{getSocialIcon(planet.icon)}</span>
            )}
          </div>

          {/* Tooltip - only for non-dummy planets */}
          {!isDummy && !isVisitor && (
            <div className={`planet-tooltip tooltip-${tooltipPosition} tooltip-align-${tooltipAlign} ${hoveredProject === planet.id ? 'visible' : ''}`}>
              <div className="tooltip-name">{planet.name}</div>
              <div className="tooltip-desc">{planet.description}</div>
              <div className="tooltip-hint">
                {isFreed 
                  ? (isTouchDevice ? 'Double-tap to return to orbit' : 'Release to return to orbit')
                  : (isTouchDevice ? 'Tap again to open' : 'Click to open')
                }
              </div>
            </div>
          )}
          
          {/* Visitor tooltip */}
          {isVisitor && (
            <div className={`planet-tooltip visitor-tooltip tooltip-${tooltipPosition} tooltip-align-${tooltipAlign} ${hoveredProject === planet.id ? 'visible' : ''}`}>
              <div className="tooltip-name">{planet.name}</div>
              <div className="tooltip-desc">{planet.description}</div>
              {planet.visitorInfo && (
                <div className="visitor-info">
                  <div className="visitor-info-row">
                    <span>{planet.visitorInfo.flag}</span>
                    <span>{planet.visitorInfo.device}</span>
                  </div>
                  <div className="visitor-info-row">
                    <span>🌐 {planet.visitorInfo.browser}</span>
                  </div>
                  <div className="visitor-time">
                    {getTimeAgo(planet.visitorInfo.joinedAt)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        );
      })}

      {/* Visitor counter */}
      {showCounter && visitorCount > 0 && (
        <div 
          className={`visitor-counter ${showCounter ? 'visible' : ''} ${chatOpen ? 'chat-open' : ''} ${unreadCount > 0 && !chatOpen ? 'has-unread' : ''}`}
          onMouseEnter={() => setHighlightExplorers(true)}
          onMouseLeave={() => setHighlightExplorers(false)}
          onDoubleClick={handleChatToggle}
        >
          <div className="visitor-count">
            <MatrixText 
              text={visitorCount.toString()} 
              startDelay={0}
              charRevealTime={80}
              scrambleIterations={5}
            />
          </div>
          <div className="visitor-label">
            <MatrixText 
              text={visitorCount === 1 ? 'explorer' : 'explorers'} 
              startDelay={200}
              charRevealTime={40}
              scrambleIterations={3}
            />
          </div>
          <div className="visitor-hint">
            <MatrixText 
              text="hover to find yourself" 
              startDelay={600}
              charRevealTime={30}
              scrambleIterations={2}
            />
          </div>
        </div>
      )}

      {/* Global Chat */}
      <Chat 
        messages={messages}
        onSendMessage={sendMessage}
        isConnected={isConnected}
        visitorCount={visitorCount}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* Private Chat */}
      {currentUserId && currentUserName && privateChatTarget && (() => {
        const sorted = [currentUserId, privateChatTarget.id].sort();
        const channelId = `private-chat-${sorted[0]}-${sorted[1]}`.replace(/[^a-zA-Z0-9-_]/g, '_');
        return (
          <PrivateChat
            isOpen={!!privateChatTarget}
            onClose={() => setPrivateChatTarget(null)}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserFlag={currentUserFlag || '🌍'}
            targetUser={{
              id: privateChatTarget.id,
              name: privateChatTarget.name,
              flag: privateChatTarget.flag,
            }}
            messages={getPrivateMessages(channelId)}
            onLoadMessages={setPrivateMessagesForChannel}
          />
        );
      })()}

      <style jsx>{`
        .project-planets {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10;
        }

        .orbit-paths {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 1s ease;
        }

        .orbit-paths.visible {
          opacity: 1;
        }

        .orbit-path {
          fill: none;
          stroke: rgba(255, 255, 255, 0.06);
          stroke-width: 1;
          stroke-dasharray: 4 8;
          opacity: 0;
          animation: fade-in-orbit 1s ease forwards;
        }

        @keyframes fade-in-orbit {
          to { opacity: 1; }
        }

        .constellation-lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease;
          z-index: 1;
        }

        .constellation-lines.visible {
          opacity: 0.08;
        }

        .constellation-line {
          transition: all 0.3s ease;
        }

        .planet {
          position: absolute;
          left: 0;
          top: 0;
          cursor: grab;
          pointer-events: auto;
          opacity: 0;
          z-index: 4;
          user-select: none;
          will-change: transform;
          touch-action: none; /* Prevent browser gestures while dragging */
        }

        .planet.visible {
          opacity: 1;
        }

        /* Clickable planets (not dummy) show pointer cursor on hover */
        .planet:not(.dummy-planet) {
          cursor: pointer;
        }

        .planet:not(.dummy-planet):active {
          cursor: grabbing;
        }

        .planet.dragging {
          cursor: grabbing !important;
          z-index: 100 !important;
        }

        .planet.dragging .planet-core {
          transform: scale(1.8);
          box-shadow: 0 0 30px currentColor;
        }

        .planet.dragging .planet-glow {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(2.5);
        }

        .planet.near .planet-glow {
          opacity: 0.6;
          transform: translate(-50%, -50%) scale(1.5);
        }

        .planet.near .planet-core {
          transform: scale(1.3);
        }

        .planet-core {
          border-radius: 50%;
          position: relative;
          z-index: 2;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border 0.2s ease;
          animation: pulse-planet 2s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Clickable planets have a subtle ring */
        .planet:not(.dummy-planet) .planet-core {
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .planet:not(.dummy-planet):hover .planet-core {
          border-color: rgba(255, 255, 255, 0.8);
        }

        .planet-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 0, 0, 0.7);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .planet:hover .planet-icon {
          opacity: 1;
        }

        .social-planet .planet-core {
          animation: pulse-social 3s ease-in-out infinite;
        }

        @keyframes pulse-planet {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 15px currentColor; }
        }

        @keyframes pulse-social {
          0%, 100% { box-shadow: 0 0 8px currentColor; }
          50% { box-shadow: 0 0 25px currentColor; }
        }

        .planet-glow {
          position: absolute;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.3;
          filter: blur(8px);
          z-index: 1;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .social-planet .planet-glow {
          opacity: 0.5;
          filter: blur(12px);
        }

        /* Dummy planets - subtle, non-interactive appearance */
        .dummy-planet {
          cursor: default;
        }

        .dummy-planet .planet-core {
          animation: pulse-dummy 4s ease-in-out infinite;
          opacity: 0.4;
          border: none !important;
        }

        .dummy-planet .planet-glow {
          opacity: 0.1;
          filter: blur(4px);
        }

        .dummy-planet:hover .planet-core {
          opacity: 0.6;
          transform: scale(1.1);
        }

        .dummy-planet:hover .planet-glow {
          opacity: 0.2;
          transform: translate(-50%, -50%) scale(1.2);
        }

        @keyframes pulse-dummy {
          0%, 100% { box-shadow: 0 0 2px currentColor; opacity: 0.3; }
          50% { box-shadow: 0 0 5px currentColor; opacity: 0.5; }
        }

        .planet:hover {
          z-index: 1000 !important;
        }

        .planet:hover .planet-core {
          transform: scale(1.5);
          box-shadow: 0 0 20px currentColor;
        }

        .planet:hover .planet-glow {
          opacity: 0.6;
          transform: translate(-50%, -50%) scale(1.5);
        }

        .planet-tooltip {
          position: absolute;
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease, transform 0.3s ease;
          z-index: 9999;
        }

        /* Default: top center */
        .planet-tooltip.tooltip-top {
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-10px);
        }

        .planet-tooltip.tooltip-top.visible {
          transform: translateX(-50%) translateY(-15px);
        }

        /* Bottom position */
        .planet-tooltip.tooltip-bottom {
          top: 100%;
          bottom: auto;
          left: 50%;
          transform: translateX(-50%) translateY(10px);
        }

        .planet-tooltip.tooltip-bottom.visible {
          transform: translateX(-50%) translateY(15px);
        }

        /* Align left (for planets on left side) */
        .planet-tooltip.tooltip-align-left {
          left: 0;
          transform: translateX(0) translateY(-10px);
        }

        .planet-tooltip.tooltip-align-left.visible {
          transform: translateX(0) translateY(-15px);
        }

        .planet-tooltip.tooltip-bottom.tooltip-align-left {
          transform: translateX(0) translateY(10px);
        }

        .planet-tooltip.tooltip-bottom.tooltip-align-left.visible {
          transform: translateX(0) translateY(15px);
        }

        /* Align right (for planets on right side) */
        .planet-tooltip.tooltip-align-right {
          left: auto;
          right: 0;
          transform: translateX(0) translateY(-10px);
        }

        .planet-tooltip.tooltip-align-right.visible {
          transform: translateX(0) translateY(-15px);
        }

        .planet-tooltip.tooltip-bottom.tooltip-align-right {
          transform: translateX(0) translateY(10px);
        }

        .planet-tooltip.tooltip-bottom.tooltip-align-right.visible {
          transform: translateX(0) translateY(15px);
        }

        .planet-tooltip.visible {
          opacity: 1;
        }

        .tooltip-name {
          font-family: 'Orbitron', monospace;
          font-size: 14px;
          color: white;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .tooltip-desc {
          font-family: 'Orbitron', monospace;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
        }

        .tooltip-hint {
          font-family: 'Orbitron', monospace;
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 6px;
        }

        /* Visitor planets - white/ethereal appearance */
        .visitor-planet .planet-core {
          animation: pulse-visitor 3s ease-in-out infinite;
          background: radial-gradient(circle at 30% 30%, #FFFFFF, #E0E0E0, #CCCCCC) !important;
        }

        .visitor-planet .planet-glow {
          opacity: 0.4;
          filter: blur(10px);
          background: rgba(255, 255, 255, 0.8) !important;
        }

        @keyframes pulse-visitor {
          0%, 100% { 
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.6); 
            opacity: 0.7;
          }
          50% { 
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.9); 
            opacity: 1;
          }
        }

        /* Visitor planet with private message notification */
        .has-private-message .planet-core {
          animation: pulse-message 0.8s ease-in-out infinite !important;
          background: radial-gradient(circle at 30% 30%, #FFD700, #FFA500, #FF8C00) !important;
        }

        .has-private-message .planet-glow {
          background: rgba(255, 200, 0, 0.9) !important;
          animation: glow-message 0.8s ease-in-out infinite;
        }

        @keyframes pulse-message {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(255, 200, 0, 0.8);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 200, 0, 1);
            transform: scale(1.15);
          }
        }

        @keyframes glow-message {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }

        /* Current user's planet - special highlight */
        .current-user-planet .planet-core {
          animation: pulse-current-user 2s ease-in-out infinite;
          background: radial-gradient(circle at 30% 30%, #FFFFFF, #FFE4B5, #FFD700) !important;
          border: 2px solid rgba(255, 215, 0, 0.8) !important;
        }

        .current-user-planet .planet-glow {
          opacity: 0.6;
          filter: blur(15px);
          background: rgba(255, 215, 0, 0.5) !important;
        }

        @keyframes pulse-current-user {
          0%, 100% { 
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.8); 
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 215, 0, 1); 
            transform: scale(1.1);
          }
        }

        /* Highlight all explorers when hovering counter */
        .highlight-explorer {
          z-index: 9999 !important;
        }

        .highlight-explorer .planet-core {
          animation: pulse-highlight 0.5s ease-in-out infinite !important;
          transform: scale(1.5) !important;
        }

        .highlight-explorer .planet-glow {
          opacity: 1 !important;
          transform: translate(-50%, -50%) scale(2) !important;
          filter: blur(15px) !important;
        }

        @keyframes pulse-highlight {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.8), 0 0 60px rgba(255, 255, 255, 0.4); 
          }
          50% { 
            box-shadow: 0 0 50px rgba(255, 255, 255, 1), 0 0 100px rgba(255, 255, 255, 0.6); 
          }
        }

        .visitor-tooltip {
          background: rgba(20, 20, 30, 0.95) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        .visitor-info {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          font-family: 'Orbitron', monospace;
        }

        .visitor-info-row {
          display: flex;
          gap: 8px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 4px;
        }

        .visitor-time {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 4px;
          font-style: italic;
        }

        /* Visitor counter */
        .visitor-counter {
          position: fixed;
          bottom: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          pointer-events: auto;
          z-index: 100;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateY(20px) scale(0.9);
        }

        .visitor-counter.visible {
          animation: counter-appear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes counter-appear {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            box-shadow: 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        .visitor-counter:hover {
          background: rgba(255, 215, 0, 0.1);
          border-color: rgba(255, 215, 0, 0.4);
          transform: scale(1.02);
        }

        .visitor-counter:hover .visitor-count {
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
        }

        .visitor-counter:hover .visitor-label {
          color: rgba(255, 215, 0, 0.7);
        }

        .visitor-counter.chat-open {
          background: rgba(100, 150, 255, 0.15);
          border-color: rgba(100, 150, 255, 0.4);
        }

        .visitor-counter.chat-open .visitor-count {
          color: rgba(100, 150, 255, 1);
        }

        .visitor-counter.chat-open .visitor-label {
          color: rgba(100, 150, 255, 0.8);
        }

        .visitor-counter.has-unread {
          background: rgba(255, 100, 100, 0.15);
          border-color: rgba(255, 100, 100, 0.4);
        }

        .visitor-counter.visible.has-unread {
          animation: counter-appear 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, pulse-unread 1.5s ease-in-out 0.8s infinite;
        }

        .visitor-counter.has-unread .visitor-count {
          color: rgba(255, 100, 100, 1);
        }

        .visitor-counter.has-unread .visitor-label {
          color: rgba(255, 100, 100, 0.8);
        }

        @keyframes pulse-unread {
          0%, 100% { box-shadow: 0 0 5px rgba(255, 100, 100, 0.3); }
          50% { box-shadow: 0 0 20px rgba(255, 100, 100, 0.6); }
        }

        .visitor-count {
          font-family: 'Orbitron', monospace;
          font-size: 16px;
          font-weight: bold;
          color: white;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
          line-height: 1;
        }

        .visitor-label {
          font-family: 'Orbitron', monospace;
          font-size: 8px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .visitor-hint {
          font-family: 'Orbitron', monospace;
          font-size: 6px;
          color: rgba(255, 255, 255, 0.25);
          margin-top: 2px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .visitor-counter:hover .visitor-hint {
          opacity: 1;
          color: rgba(255, 215, 0, 0.5);
        }

        @media (max-width: 600px) {
          .planet-tooltip {
            padding: 8px 10px;
          }
          .tooltip-name {
            font-size: 12px;
          }
          .tooltip-desc {
            font-size: 10px;
          }
          .tooltip-hint {
            font-size: 8px;
          }
          .visitor-counter {
            bottom: 8px;
            right: 8px;
            padding: 6px 10px;
          }
          .visitor-count {
            font-size: 14px;
          }
          .visitor-label {
            font-size: 7px;
          }
          .visitor-hint {
            font-size: 5px;
          }
        }
      `}</style>
    </div>
  );
}
