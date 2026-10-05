import { StencilTemplate } from '../types/ar';

export const STENCILS: StencilTemplate[] = [
  {
    id: 'none',
    name: 'Freeform',
    description: 'Empty AR space for pure imagination',
    points: [],
  },
  {
    id: 'star',
    name: 'Cosmic Star',
    description: '5-pointed glowing star geometry',
    points: [
      { x: 0.50, y: 0.28 },
      { x: 0.55, y: 0.40 },
      { x: 0.68, y: 0.40 },
      { x: 0.58, y: 0.48 },
      { x: 0.62, y: 0.62 },
      { x: 0.50, y: 0.54 },
      { x: 0.38, y: 0.62 },
      { x: 0.42, y: 0.48 },
      { x: 0.32, y: 0.40 },
      { x: 0.45, y: 0.40 },
      { x: 0.50, y: 0.28 },
    ],
  },
  {
    id: 'heart',
    name: 'Neon Heart',
    description: 'Smooth AR heart contour',
    points: [
      { x: 0.50, y: 0.42 },
      { x: 0.43, y: 0.33 },
      { x: 0.36, y: 0.34 },
      { x: 0.33, y: 0.40 },
      { x: 0.34, y: 0.49 },
      { x: 0.42, y: 0.58 },
      { x: 0.50, y: 0.67 },
      { x: 0.58, y: 0.58 },
      { x: 0.66, y: 0.49 },
      { x: 0.67, y: 0.40 },
      { x: 0.64, y: 0.34 },
      { x: 0.57, y: 0.33 },
      { x: 0.50, y: 0.42 },
    ],
  },
  {
    id: 'crown',
    name: 'Imperial Crown',
    description: 'Three-peaked regal crest',
    points: [
      { x: 0.34, y: 0.60 },
      { x: 0.32, y: 0.38 },
      { x: 0.41, y: 0.48 },
      { x: 0.50, y: 0.32 },
      { x: 0.59, y: 0.48 },
      { x: 0.68, y: 0.38 },
      { x: 0.66, y: 0.60 },
      { x: 0.34, y: 0.60 },
    ],
  },
  {
    id: 'infinity',
    name: 'Quantum Infinity',
    description: 'Continuous figure-eight loop',
    points: Array.from({ length: 48 }, (_, i) => {
      const t = (i / 48) * Math.PI * 2;
      const scale = 0.16;
      const x = 0.5 + (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      const y = 0.48 + (scale * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
      return { x, y };
    }),
  },
];
