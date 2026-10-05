/**
 * Augmented Reality & Hand Tracking Types
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HandLandmarkPoint extends Point3D {
  visibility?: number;
}

export type HandScanStatus = 'searching' | 'detecting' | 'locked' | 'lost';

export type GestureType = 'none' | 'pinch' | 'point' | 'open_palm' | 'peace' | 'fist';

export interface HandData {
  present: boolean;
  handedness: 'Left' | 'Right';
  confidence: number;
  landmarks: Point3D[];
  indexTip: Point2D;
  thumbTip: Point2D;
  wrist: Point2D;
  palmCenter: Point2D;
  pinchDistance: number;
  isPinching: boolean;
  isPointing: boolean;
  isOpenPalm: boolean;
  gesture: GestureType;
  rawPinchNormal: number; // 0 to 1
  rotationAngle: number;
}

export type DrawingToolType = 
  | 'neon' 
  | 'ink' 
  | 'rainbow' 
  | 'sparkle' 
  | 'laser' 
  | 'stamp' 
  | 'eraser';

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
  color?: string;
  size?: number;
}

export interface DrawingStroke {
  id: string;
  tool: DrawingToolType;
  color: string;
  size: number;
  stampEmoji?: string;
  points: StrokePoint[];
}

export interface ARToolButton {
  id: string;
  label: string;
  iconName: string;
  category: 'tool' | 'color' | 'action' | 'size' | 'stamp';
  value?: string;
  xPercent: number; // 0 to 100 relative to camera canvas
  yPercent: number;
  radius: number; // in pixels
  color?: string;
  active?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  decay: number;
  rotation: number;
}

export interface StencilTemplate {
  id: string;
  name: string;
  description: string;
  points: Point2D[]; // Normalized 0..1
}
