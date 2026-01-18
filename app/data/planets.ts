export interface Planet {
  id: string;
  name: string;
  description: string;
  url?: string;
  color?: string;
  mass?: number; // 1-5, affects planet size and orbital characteristics
  isSocialPlanet?: boolean; // Special planets from logo
  icon?: string; // Icon identifier for social planets
  isDummy?: boolean; // Decorative planets without interaction
  isVisitor?: boolean; // Real-time visitor planet
  isCurrentUser?: boolean; // Is this the current user's planet
  // Visitor-specific info
  visitorInfo?: {
    browser: string;
    device: string;
    country: string;
    flag: string;
    joinedAt: number;
  };
}

// Social link planets (from logo balls)
export const socialPlanets: Planet[] = [
  {
    id: 'social-github',
    name: 'GitHub',
    description: 'Check out my code',
    url: 'https://github.com/DenshiNingen',
    color: '#FF3333', // Red ball
    mass: 3,
    isSocialPlanet: true,
    icon: 'github',
  },
  {
    id: 'social-instagram',
    name: 'Instagram',
    description: 'Follow my journey',
    url: 'https://instagram.com/denshi.ningen',
    color: '#33FF33', // Green ball
    mass: 3,
    isSocialPlanet: true,
    icon: 'instagram',
  },
  {
    id: 'social-linkedin',
    name: '',
    description: '',
    color: '#3333FF', // Blue ball
    mass: 3,
    isSocialPlanet: true,
    isDummy: true, // Disabled - no tooltip or link
  },
];

// Project planets
export const projectPlanets: Planet[] = [
  {
    id: 'ros-robot',
    name: 'ROS Robot',
    description: 'SLAM robot using ROS, Google Cartographer & RPLidar',
    url: 'https://github.com/DenshiNingen/ROS_robot',
    color: '#E74C3C', // Red for robotics
    mass: 4, // Significant project
  },
  {
    id: 'oscvg',
    name: 'OsCvg',
    description: 'Convert SVGs to oscilloscope audio/visuals using Python',
    url: 'https://github.com/DenshiNingen/OsCvg',
    color: '#00FF9D', // Oscilloscope Green
    mass: 4,
  },
];

// Dummy decorative planets (no tooltip, just draggable)
export const dummyPlanets: Planet[] = [
  {
    id: 'dummy-1',
    name: '',
    description: '',
    color: '#6B7280', // Gray
    mass: 0.8,
    isDummy: true,
  },
  {
    id: 'dummy-2',
    name: '',
    description: '',
    color: '#8B5CF6', // Purple
    mass: 1,
    isDummy: true,
  },
  {
    id: 'dummy-3',
    name: '',
    description: '',
    color: '#EC4899', // Pink
    mass: 0.6,
    isDummy: true,
  },
  {
    id: 'dummy-4',
    name: '',
    description: '',
    color: '#14B8A6', // Teal
    mass: 0.9,
    isDummy: true,
  },
  {
    id: 'dummy-5',
    name: '',
    description: '',
    color: '#F97316', // Orange
    mass: 0.7,
    isDummy: true,
  },
  {
    id: 'dummy-6',
    name: '',
    description: '',
    color: '#A78BFA', // Light purple
    mass: 0.5,
    isDummy: true,
  },
  {
    id: 'dummy-7',
    name: '',
    description: '',
    color: '#34D399', // Emerald
    mass: 1.1,
    isDummy: true,
  },
  {
    id: 'dummy-8',
    name: '',
    description: '',
    color: '#FBBF24', // Amber
    mass: 0.4,
    isDummy: true,
  },
];

// All planets combined
export const allPlanets: Planet[] = [...socialPlanets, ...projectPlanets, ...dummyPlanets];

