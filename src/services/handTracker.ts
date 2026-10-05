/**
 * MediaPipe Tasks Vision Hand Landmarker & Gesture Recognition Service
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { HandData, GestureType, Point3D } from '../types/ar';

// Standard 21 Hand Landmark Connections
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base Cross Connections
  [5, 9], [9, 13], [13, 17],
];

export class HandTrackerService {
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private initError: string | null = null;
  private lastDetectionTime: number = -1;

  // Coordinate smoothing for pointer & drawing jitter reduction
  private smoothedIndexTip: { x: number; y: number } | null = null;
  private smoothedThumbTip: { x: number; y: number } | null = null;
  private readonly LERP_FACTOR = 0.45; // Smooth but snappy

  public async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      // Load wasm from fast JSDelivr CDN
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err: unknown) {
      console.warn('MediaPipe initialization fallback:', err);
      this.initError = err instanceof Error ? err.message : String(err);
      this.isInitializing = false;
      return false;
    }
  }

  public getStatus() {
    return {
      isReady: this.isReady,
      isInitializing: this.isInitializing,
      error: this.initError,
    };
  }

  /**
   * Process a video frame and return hand telemetry with aspect-ratio projection
   */
  public processVideoFrame(
    video: HTMLVideoElement,
    mirrored: boolean = true,
    canvasWidth?: number,
    canvasHeight?: number
  ): HandData | null {
    if (!this.handLandmarker || !this.isReady || video.readyState < 2) {
      return null;
    }

    const now = performance.now();
    if (now <= this.lastDetectionTime) {
      return null;
    }
    this.lastDetectionTime = now;

    try {
      const results = this.handLandmarker.detectForVideo(video, now);
      if (!results || !results.landmarks || results.landmarks.length === 0) {
        return null;
      }

      // Take primary hand (first detected)
      const rawLandmarks = results.landmarks[0];
      const handednessStr =
        results.handednesses && results.handednesses[0]?.[0]?.categoryName
          ? (results.handednesses[0][0].categoryName as 'Left' | 'Right')
          : 'Right';
      const confidence =
        results.handednesses && results.handednesses[0]?.[0]?.score
          ? results.handednesses[0][0].score
          : 0.9;

      const videoW = video.videoWidth || 1280;
      const videoH = video.videoHeight || 720;

      // Project video coordinates (0..1) to cover canvas viewport coordinates (0..1)
      const projectCoords = (rawX: number, rawY: number) => {
        const vx = mirrored ? 1 - rawX : rawX;
        const vy = rawY;

        if (!canvasWidth || !canvasHeight || !videoW || !videoH) {
          return { x: vx, y: vy };
        }

        const videoAspect = videoW / videoH;
        const canvasAspect = canvasWidth / canvasHeight;

        if (canvasAspect > videoAspect) {
          // Canvas wider than video -> scaled to width, cropped vertically
          const scale = canvasWidth / videoW;
          const renderedH = videoH * scale;
          const offsetY = (renderedH - canvasHeight) / 2;
          return {
            x: vx,
            y: (vy * renderedH - offsetY) / canvasHeight,
          };
        } else {
          // Canvas taller than video (e.g. mobile portrait) -> scaled to height, cropped horizontally
          const scale = canvasHeight / videoH;
          const renderedW = videoW * scale;
          const offsetX = (renderedW - canvasWidth) / 2;
          return {
            x: (vx * renderedW - offsetX) / canvasWidth,
            y: vy,
          };
        }
      };

      // Transform landmarks with viewport projection
      const landmarks: Point3D[] = rawLandmarks.map((pt) => {
        const projected = projectCoords(pt.x, pt.y);
        return {
          x: projected.x,
          y: projected.y,
          z: pt.z,
        };
      });

      // Landmarks:
      // 0: Wrist, 4: Thumb Tip, 8: Index Tip, 12: Middle Tip, 16: Ring Tip, 20: Pinky Tip
      const rawThumb = landmarks[4];
      const rawIndex = landmarks[8];
      const wrist = landmarks[0];
      const palmCenter = {
        x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
        y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
      };

      // Smoothing index and thumb tip
      if (!this.smoothedIndexTip) {
        this.smoothedIndexTip = { x: rawIndex.x, y: rawIndex.y };
      } else {
        this.smoothedIndexTip.x += (rawIndex.x - this.smoothedIndexTip.x) * this.LERP_FACTOR;
        this.smoothedIndexTip.y += (rawIndex.y - this.smoothedIndexTip.y) * this.LERP_FACTOR;
      }

      if (!this.smoothedThumbTip) {
        this.smoothedThumbTip = { x: rawThumb.x, y: rawThumb.y };
      } else {
        this.smoothedThumbTip.x += (rawThumb.x - this.smoothedThumbTip.x) * this.LERP_FACTOR;
        this.smoothedThumbTip.y += (rawThumb.y - this.smoothedThumbTip.y) * this.LERP_FACTOR;
      }

      // Euclidean distance in 3D between thumb tip and index tip
      const dx = rawIndex.x - rawThumb.x;
      const dy = rawIndex.y - rawThumb.y;
      const dz = (rawIndex.z - rawThumb.z) * 1.2;
      const pinchDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Pinch threshold: normalized distance < 0.082
      const isPinching = pinchDistance < 0.082;
      const rawPinchNormal = Math.max(0, Math.min(1, (0.2 - pinchDistance) / 0.15));

      // Gesture detection
      const gesture = this.classifyGesture(landmarks, isPinching);

      // Rotation angle of hand (wrist to middle finger mcp)
      const angle = Math.atan2(landmarks[9].y - wrist.y, landmarks[9].x - wrist.x);

      return {
        present: true,
        handedness: handednessStr,
        confidence,
        landmarks,
        indexTip: { ...this.smoothedIndexTip },
        thumbTip: { ...this.smoothedThumbTip },
        wrist: { x: wrist.x, y: wrist.y },
        palmCenter,
        pinchDistance,
        isPinching,
        isPointing: gesture === 'point',
        isOpenPalm: gesture === 'open_palm',
        gesture,
        rawPinchNormal,
        rotationAngle: angle,
      };
    } catch (err) {
      console.warn('Frame processing issue:', err);
      return null;
    }
  }

  private classifyGesture(lm: Point3D[], isPinching: boolean): GestureType {
    if (isPinching) return 'pinch';

    // Check extended status of each finger
    // Finger is extended if tip is higher (lower y) than pip joint relative to wrist
    const isExtended = (tipIdx: number, pipIdx: number) => {
      const tipDist = Math.hypot(lm[tipIdx].x - lm[0].x, lm[tipIdx].y - lm[0].y);
      const pipDist = Math.hypot(lm[pipIdx].x - lm[0].x, lm[pipIdx].y - lm[0].y);
      return tipDist > pipDist * 1.15;
    };

    const indexExtended = isExtended(8, 6);
    const middleExtended = isExtended(12, 10);
    const ringExtended = isExtended(16, 14);
    const pinkyExtended = isExtended(20, 18);

    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return 'open_palm';
    }

    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'peace';
    }

    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'point';
    }

    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'fist';
    }

    return 'none';
  }

  /**
   * Virtual Hand Simulator for devices without camera, or when camera permission is denied
   */
  public generateSimulatedHand(
    normX: number,
    normY: number,
    isMouseDown: boolean,
    gestureOverride?: GestureType
  ): HandData {
    const isPinching = gestureOverride ? gestureOverride === 'pinch' : isMouseDown;
    const pinchOffset = isPinching ? 0.015 : 0.055;

    // Build anatomical 21 landmarks centered on normX, normY
    const wrist = { x: normX, y: normY + 0.22, z: 0 };
    const indexTip = { x: normX, y: normY, z: -0.02 };
    const thumbTip = { x: normX - pinchOffset, y: normY + pinchOffset, z: 0 };

    const landmarks: Point3D[] = [
      wrist, // 0: wrist
      { x: normX - 0.05, y: normY + 0.16, z: 0 }, // 1: thumb cmc
      { x: normX - 0.08, y: normY + 0.11, z: 0 }, // 2: thumb mcp
      { x: normX - 0.06, y: normY + 0.06, z: 0 }, // 3: thumb ip
      thumbTip, // 4: thumb tip
      { x: normX - 0.03, y: normY + 0.10, z: 0 }, // 5: index mcp
      { x: normX - 0.02, y: normY + 0.06, z: 0 }, // 6: index pip
      { x: normX - 0.01, y: normY + 0.03, z: 0 }, // 7: index dip
      indexTip, // 8: index tip
      { x: normX + 0.01, y: normY + 0.10, z: 0 }, // 9: middle mcp
      { x: normX + 0.01, y: normY + 0.05, z: 0 }, // 10: middle pip
      { x: normX + 0.01, y: normY + 0.01, z: 0 }, // 11: middle dip
      { x: normX + 0.01, y: normY - 0.02, z: 0 }, // 12: middle tip
      { x: normX + 0.04, y: normY + 0.11, z: 0 }, // 13: ring mcp
      { x: normX + 0.04, y: normY + 0.06, z: 0 }, // 14: ring pip
      { x: normX + 0.04, y: normY + 0.02, z: 0 }, // 15: ring dip
      { x: normX + 0.04, y: normY - 0.01, z: 0 }, // 16: ring tip
      { x: normX + 0.07, y: normY + 0.13, z: 0 }, // 17: pinky mcp
      { x: normX + 0.07, y: normY + 0.09, z: 0 }, // 18: pinky pip
      { x: normX + 0.07, y: normY + 0.06, z: 0 }, // 19: pinky dip
      { x: normX + 0.07, y: normY + 0.03, z: 0 }, // 20: pinky tip
    ];

    const gesture: GestureType = gestureOverride || (isPinching ? 'pinch' : 'point');

    return {
      present: true,
      handedness: 'Right',
      confidence: 0.98,
      landmarks,
      indexTip: { x: indexTip.x, y: indexTip.y },
      thumbTip: { x: thumbTip.x, y: thumbTip.y },
      wrist: { x: wrist.x, y: wrist.y },
      palmCenter: { x: normX, y: normY + 0.12 },
      pinchDistance: isPinching ? 0.02 : 0.08,
      isPinching,
      isPointing: gesture === 'point',
      isOpenPalm: gesture === 'open_palm',
      gesture,
      rawPinchNormal: isPinching ? 1 : 0,
      rotationAngle: -Math.PI / 2,
    };
  }

  public reset() {
    this.smoothedIndexTip = null;
    this.smoothedThumbTip = null;
    this.lastDetectionTime = -1;
  }
}

export const handTracker = new HandTrackerService();
