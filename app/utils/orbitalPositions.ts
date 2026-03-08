// Shared calculation for social planet orbital positions
// Used by both AnimatedLogo (ball targets) and ProjectPlanets (planet positions)

export interface SocialPlanetPositions {
  red: { x: number; y: number; radius: number; angle: number };
  green: { x: number; y: number; radius: number; angle: number };
  blue: { x: number; y: number; radius: number; angle: number };
}

export function calculateSocialPlanetPositions(
  screenWidth: number,
  screenHeight: number
): SocialPlanetPositions {
  const cx = screenWidth / 2;
  const cy = screenHeight / 2;
  const screenSize = Math.min(screenWidth, screenHeight);

  const isMobileLayout = screenSize < 600;

  const baseRadius = screenSize * (isMobileLayout ? 0.15 : 0.12);
  const radiusStep = screenSize * (isMobileLayout ? 0.06 : 0.04);

  const planets = [
    { key: 'red' as const, index: 0 },
    { key: 'green' as const, index: 1 },
    { key: 'blue' as const, index: 2 },
  ];

  const result = {} as SocialPlanetPositions;

  for (const { key, index } of planets) {
    const angle = (index * Math.PI * 2) / 3 + Math.PI / 6;
    const radius = baseRadius + index * radiusStep;
    result[key] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      radius,
      angle,
    };
  }

  return result;
}
