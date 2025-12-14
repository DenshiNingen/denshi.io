"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import AnimatedLogo from './components/AnimatedLogo';
import MatrixText from './components/MatrixText';
import ProjectPlanets from './components/ProjectPlanets';
import Sun from './components/Sun';

// Physics constants - gentle attraction, stars should drift not cluster
const GRAVITY_STRENGTH = 150; // Much weaker gravity
const GRAVITY_FALLOFF_START = 200; // Start reducing gravity at this distance
const REPULSION_RADIUS = 80; // Larger repulsion zone
const REPULSION_STRENGTH = 100; // Stronger repulsion to prevent clustering
const MAX_VELOCITY = 1.5; // Slower movement
const DAMPING = 0.995; // Less friction, more drift
const ORBIT_TENDENCY = 0.6; // More orbital motion, less direct attraction
const DRIFT_STRENGTH = 0.02; // Gentle random drift

interface Planet {
  x: number;
  y: number;
  mass: number;
}

export default function Home() {
  const [showText, setShowText] = useState(false);
  const [showSolarSystem, setShowSolarSystem] = useState(false);
  const [logoSize, setLogoSize] = useState(240);
  const [animationsSkipped, setAnimationsSkipped] = useState(false);
  const [skipFadeIn, setSkipFadeIn] = useState(false);
  const planetsRef = useRef<Planet[]>([]);
  const animationsSkippedRef = useRef(false);

  // Skip all animations on double click with smooth fade-in
  const handleDoubleClick = useCallback(() => {
    if (animationsSkipped) return;
    animationsSkippedRef.current = true;
    setAnimationsSkipped(true);
    
    // Trigger fade-in animation
    setSkipFadeIn(true);
    
    // Show everything with a slight delay for the fade effect
    setTimeout(() => {
      setShowText(true);
      setShowSolarSystem(true);
    }, 50);
  }, [animationsSkipped]);

  // Set logo size based on screen size only (for layout)
  useEffect(() => {
    const updateLogoSize = () => {
      const isSmallScreen = window.innerWidth < 600;
      setLogoSize(isSmallScreen ? 140 : 240);
    };
    updateLogoSize();
    window.addEventListener('resize', updateLogoSize);
    return () => window.removeEventListener('resize', updateLogoSize);
  }, []);
  
  // Callback when ProjectPlanets generates positions
  const handlePositionsGenerated = useCallback((positions: { x: number; y: number }[]) => {
    planetsRef.current = positions.map((pos, index) => ({
      x: pos.x,
      y: pos.y,
      mass: 1 + (index % 3) * 0.5,
    }));
  }, []);

  // Called when logo animation completes
  const handleLogoAnimationComplete = useCallback(() => {
    // Nothing special here yet
  }, []);

  // Called when transitioning to solar system
  const handleTransitionToSolarSystem = useCallback(() => {
    setTimeout(() => {
      setShowSolarSystem(true);
    }, 500);
  }, []);

  useEffect(() => {
    // Start text animation after logo animation (unless skipped)
    if (animationsSkipped) return;
    const timer = setTimeout(() => setShowText(true), 2800);
    return () => clearTimeout(timer);
  }, [animationsSkipped]);

  useEffect(() => {
    // Particle animation setup with physics
    const canvas = document.getElementById('space-canvas') as HTMLCanvasElement;
    if (!canvas) {
      console.error("Canvas element not found");
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("Unable to get canvas context");
      return;
    }
    
    const particlesArray: Particle[] = [];
    const numberOfParticles = 200;
    const startDelay = 6600; // Stars appear when balls arrive
    const fadeInDuration = 3000;
    let startTime: number | null = null;
    let physicsActive = false;

    // Get planets from ref (set by ProjectPlanets)
    const getPlanets = () => planetsRef.current;
    
    // Check if animations were skipped
    const isSkipped = () => animationsSkippedRef.current;

    class Particle {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      opacity: number;
      targetOpacity: number;
      fadeInDelay: number;
      baseSpeed: number;
      
      constructor(index: number) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.baseSpeed = Math.random() * 0.5 + 0.1;
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.baseSpeed;
        this.vy = Math.sin(angle) * this.baseSpeed;
        this.opacity = 0;
        this.targetOpacity = Math.random() * 0.5 + 0.5;
        this.fadeInDelay = Math.random() * fadeInDuration;
      }
      
      applyGravity() {
        const planets = getPlanets();
        if (!physicsActive || planets.length === 0) return;

        // Add gentle random drift to keep stars spread out
        this.vx += (Math.random() - 0.5) * DRIFT_STRENGTH;
        this.vy += (Math.random() - 0.5) * DRIFT_STRENGTH;

        planets.forEach(planet => {
          const dx = planet.x - this.x;
          const dy = planet.y - this.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);
          
          if (dist < 1) return;
          
          const nx = dx / dist;
          const ny = dy / dist;
          
          if (dist < REPULSION_RADIUS) {
            // Strong repulsion when too close - prevents clustering
            const repulsionForce = REPULSION_STRENGTH / (dist * dist);
            this.vx -= nx * repulsionForce * 0.05;
            this.vy -= ny * repulsionForce * 0.05;
          } else if (dist < GRAVITY_FALLOFF_START) {
            // Gentle gravity that fades with distance
            const gravityFactor = 1 - (dist / GRAVITY_FALLOFF_START) * 0.7; // Reduce to 30% at edge
            const force = (GRAVITY_STRENGTH * planet.mass * gravityFactor) / distSq;
            
            // Mostly orbital motion (perpendicular), less direct attraction
            const perpX = -ny * ORBIT_TENDENCY;
            const perpY = nx * ORBIT_TENDENCY;
            const directX = nx * (1 - ORBIT_TENDENCY);
            const directY = ny * (1 - ORBIT_TENDENCY);
            
            this.vx += (directX + perpX) * force * 0.002;
            this.vy += (directY + perpY) * force * 0.002;
          }
          // Beyond GRAVITY_FALLOFF_START: no gravity, stars just drift
        });
      }
      
      update(elapsed: number) {
        this.applyGravity();
        
        // Apply damping
        this.vx *= DAMPING;
        this.vy *= DAMPING;
        
        // Clamp velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > MAX_VELOCITY) {
          this.vx = (this.vx / speed) * MAX_VELOCITY;
          this.vy = (this.vy / speed) * MAX_VELOCITY;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < -10) this.x = canvas.width + 10;
        if (this.x > canvas.width + 10) this.x = -10;
        if (this.y < -10) this.y = canvas.height + 10;
        if (this.y > canvas.height + 10) this.y = -10;
        
        // Progressive fade in (instant if skipped)
        if (isSkipped()) {
          this.opacity = this.targetOpacity;
        } else if (elapsed > startDelay + this.fadeInDelay) {
          const fadeProgress = Math.min(1, (elapsed - startDelay - this.fadeInDelay) / 1200);
          this.opacity = fadeProgress * this.targetOpacity;
        }
      }
      
      draw() {
        if (this.opacity <= 0) return;
        
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const trailLength = Math.min(speed * 3, 8);
        
        if (trailLength > 1) {
          const gradient = ctx!.createLinearGradient(
            this.x + this.vx * trailLength,
            this.y + this.vy * trailLength,
            this.x,
            this.y
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
          gradient.addColorStop(1, `rgba(255, 255, 255, ${this.opacity})`);
          
          ctx!.strokeStyle = gradient;
          ctx!.lineWidth = this.size * 0.8;
          ctx!.beginPath();
          ctx!.moveTo(this.x + this.vx * trailLength, this.y + this.vy * trailLength);
          ctx!.lineTo(this.x, this.y);
          ctx!.stroke();
        }
        
        ctx!.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.closePath();
        ctx!.fill();
      }
    }

    function init() {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle(i));
      }
      
      // Activate physics after stars and planets appear (or immediately if skipped)
      const checkAndActivatePhysics = () => {
        if (isSkipped()) {
          physicsActive = true;
        } else {
          setTimeout(() => {
            physicsActive = true;
          }, 8000);
        }
      };
      checkAndActivatePhysics();
      
      // Also check periodically in case skip happens after init
      const interval = setInterval(() => {
        if (isSkipped() && !physicsActive) {
          physicsActive = true;
          clearInterval(interval);
        }
      }, 100);
      
      setTimeout(() => clearInterval(interval), 10000);
    }

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach(particle => {
        particle.update(elapsed);
        particle.draw();
      });
      requestAnimationFrame(animate);
    }

    function resizeCanvas() {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    init();
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  return (
    <main
      className={`relative flex h-screen w-screen flex-col items-center justify-center
        gap-8 md:px-[26vw] overflow-hidden ${skipFadeIn ? 'skip-fade-in' : ''}`}
      onDoubleClick={handleDoubleClick}
    >
      <canvas id="space-canvas" style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}></canvas>

      <ProjectPlanets 
        startDelay={animationsSkipped || showSolarSystem ? 0 : 6400} 
        socialOrbitDelay={animationsSkipped ? 0 : 500} // Social planets stay still for 500ms after appearing, then start orbiting
        onPositionsGenerated={handlePositionsGenerated} 
      />

      {/* Sun in the center - appears after logo fades */}
      {showSolarSystem && <Sun size={logoSize < 200 ? 50 : 70} visible={true} />}

      {/* Animated Logo - balls fly to orbital positions */}
      <AnimatedLogo 
        size={logoSize} 
        onAnimationComplete={handleLogoAnimationComplete}
        onBallsInPosition={handleTransitionToSolarSystem}
        skipAnimation={animationsSkipped}
      />

      <div 
        className="header-text"
        style={{
          position: 'absolute',
          top: 'clamp(1rem, 4vw, 2rem)',
          left: 'clamp(1rem, 4vw, 2rem)',
          right: 'clamp(1rem, 4vw, 2rem)',
          textAlign: "left",
          zIndex: 20,
        }}
      >
        <h1 
          style={{
            fontFamily: "Orbitron",
            color: "white",
            fontSize: 'clamp(1rem, 4vw, 1.5rem)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {showText && (
            <MatrixText 
              text="Denshi Ningen" 
              charRevealTime={25}
              scrambleIterations={2}
            />
          )}
        </h1>
        <p
          style={{
            fontFamily: "Orbitron",
            color: "rgba(255, 255, 255, 0.6)",
            fontSize: 'clamp(0.5rem, 2vw, 0.75rem)',
            letterSpacing: '0.05em',
            marginTop: '0.5rem',
          }}
        >
          {showText && (
            <MatrixText 
              text="電子人間 | Half human, half machine. Creating stuff."
              startDelay={800}
              charRevealTime={20}
              scrambleIterations={1}
            />
          )}
        </p>
      </div>

      <style jsx>{`
        @keyframes skipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .skip-fade-in :global(.project-planets),
        .skip-fade-in :global(.sun-container),
        .skip-fade-in .header-text {
          animation: skipFadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
