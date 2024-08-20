"use client"; // This line marks the file as a Client Component

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Particle animation setup
    const canvas = document.getElementById('space-canvas');
    const ctx = canvas.getContext('2d');

    const particlesArray = [];
    const numberOfParticles = 100;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
      }
      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Re-position particles if they move off the canvas
        if (this.x < 0 || this.x > canvas.width) this.x = Math.random() * canvas.width;
        if (this.y < 0 || this.y > canvas.height) this.y = Math.random() * canvas.height;
      }
      draw() {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    function init() {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach(particle => {
        particle.update();
        particle.draw();
      });
      requestAnimationFrame(animate);
    }

    init();
    animate();

    // Resize canvas to match the window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <main
      className="relative flex h-screen w-screen flex-col items-center justify-center
        gap-8 md:px-[26vw] overflow-hidden"
    >
      <div style={{
        position: "absolute", height: "100%", width: "100%",
        backgroundImage: "url(/noise.png)", backgroundRepeat: "repeat",
        backgroundSize: "10%", opacity: "0.3",
      }}></div>

      <canvas id="space-canvas" style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,  // Behind content, but above noise background
      }}></canvas>

      <img src="/denshi_ningen_logo.png" className="logo" style={{
        height: "20vh", width: "auto", zIndex: 2,
      }} />

      <h1 className="name" style={{
        fontFamily: "Orbitron",
        color: "white",
        fontSize: "3vh",
        textAlign: "center",
        marginTop: "0vh",
        zIndex: 2,
      }}>
        Denshi Ningen
      </h1>

      <style jsx>{`
        @keyframes pulse {
          0% {
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.8));
          }
          100% {
            filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0));
          }
        }

        .logo {
          animation: pulse 2s infinite;
        }
      `}</style>
    </main>
  );
}
