"use client";

import { useEffect, useState } from 'react';
import AnimatedLogo from './components/AnimatedLogo';
import MatrixText from './components/MatrixText';

export default function Home() {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    // Start text animation after logo animation
    const timer = setTimeout(() => setShowText(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Particle animation setup
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
    const numberOfParticles = 100;
    const startDelay = 3000; // Start after logo and text animation
    const fadeInDuration = 2000; // Total time for all stars to fade in
    let startTime: number | null = null;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      targetOpacity: number;
      fadeInDelay: number; // When this particle starts fading in
      
      constructor(index: number) {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.opacity = 0;
        this.targetOpacity = Math.random() * 0.5 + 0.5; // Random brightness
        // Stagger fade-in: each particle has a random delay within the duration
        this.fadeInDelay = Math.random() * fadeInDuration;
      }
      
      update(elapsed: number) {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas.width) this.x = Math.random() * canvas.width;
        if (this.y < 0 || this.y > canvas.height) this.y = Math.random() * canvas.height;
        
        // Progressive fade in after delay
        if (elapsed > startDelay + this.fadeInDelay) {
          const fadeProgress = Math.min(1, (elapsed - startDelay - this.fadeInDelay) / 800);
          this.opacity = fadeProgress * this.targetOpacity;
        }
      }
      
      draw() {
        if (this.opacity <= 0) return;
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
      className="relative flex h-screen w-screen flex-col items-center justify-center
        gap-8 md:px-[26vw] overflow-hidden"
    >
      <canvas id="space-canvas" style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
      }}></canvas>

      <AnimatedLogo size={240} />

      <h1 
        className="name"
        style={{
          fontFamily: "Orbitron",
          color: "white",
          fontSize: "3vh",
          textAlign: "center",
          marginTop: "0vh",
          zIndex: 2,
          minHeight: '1.5em',
          letterSpacing: '0.1em',
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
    </main>
  );
}
