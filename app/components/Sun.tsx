"use client";

interface SunProps {
  size?: number;
  visible?: boolean;
}

export default function Sun({ size = 60, visible = false }: SunProps) {
  return (
    <div className={`sun-container ${visible ? 'visible' : ''}`}>
      {/* Outer glow */}
      <div className="sun-glow" />
      
      {/* Main sun body */}
      <div className="sun-body" />

      <style jsx>{`
        .sun-container {
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          opacity: 0;
          transform: scale(0);
          transition: opacity 1s ease, transform 1s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 5;
        }

        .sun-container.visible {
          opacity: 1;
          transform: scale(1);
        }

        .sun-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: ${size * 2}px;
          height: ${size * 2}px;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            circle,
            rgba(255, 220, 100, 0.4) 0%,
            rgba(255, 180, 50, 0.2) 40%,
            transparent 70%
          );
          border-radius: 50%;
          animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }

        .sun-body {
          position: absolute;
          top: 50%;
          left: 50%;
          width: ${size}px;
          height: ${size}px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(
            circle at 35% 35%,
            #FFF8E8 0%,
            #FFE066 30%,
            #FFB830 60%,
            #FF9500 100%
          );
          box-shadow: 
            0 0 ${size * 0.4}px rgba(255, 200, 100, 0.6),
            0 0 ${size * 0.8}px rgba(255, 150, 50, 0.3);
          animation: sun-pulse 4s ease-in-out infinite;
        }

        @keyframes sun-pulse {
          0%, 100% { box-shadow: 0 0 ${size * 0.4}px rgba(255, 200, 100, 0.6), 0 0 ${size * 0.8}px rgba(255, 150, 50, 0.3); }
          50% { box-shadow: 0 0 ${size * 0.5}px rgba(255, 200, 100, 0.8), 0 0 ${size}px rgba(255, 150, 50, 0.4); }
        }
      `}</style>
    </div>
  );
}
