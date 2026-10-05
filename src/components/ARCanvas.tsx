/**
 * Augmented Reality Canvas Engine
 * Real-time rendering of hand skeleton, air brush strokes, neon shaders, stencils, and particles.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  HandData,
  DrawingToolType,
  DrawingStroke,
  Particle,
  StencilTemplate,
  Point2D,
} from '../types/ar';
import { HAND_CONNECTIONS, handTracker } from '../services/handTracker';
import { STENCILS } from '../utils/stencils';
import { sounds } from '../utils/sound';

interface ARCanvasProps {
  currentTool: DrawingToolType;
  currentColor: string;
  currentSize: number;
  currentStamp: string;
  selectedStencilId: string;
  drawMode: 'pinch' | 'point';
  showSkeleton: boolean;
  isMirrored: boolean;
  isSimulated: boolean;
  onHandUpdate: (data: HandData | null) => void;
  onFpsUpdate: (fps: number) => void;
  onContainerRectUpdate: (rect: DOMRect | null) => void;
  strokes: DrawingStroke[];
  setStrokes: React.Dispatch<React.SetStateAction<DrawingStroke[]>>;
  snapshotTrigger: number;
  onSnapshotReady: (dataUrl: string) => void;
}

export const ARCanvas: React.FC<ARCanvasProps> = ({
  currentTool,
  currentColor,
  currentSize,
  currentStamp,
  selectedStencilId,
  drawMode,
  showSkeleton,
  isMirrored,
  isSimulated,
  onHandUpdate,
  onFpsUpdate,
  onContainerRectUpdate,
  strokes,
  setStrokes,
  snapshotTrigger,
  onSnapshotReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastIndexPosRef = useRef<Point2D | null>(null);
  const strokesRef = useRef<DrawingStroke[]>(strokes);

  // Keep strokesRef in sync
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Simulated hand interaction (mouse / touch)
  const simulatedPosRef = useRef<Point2D>({ x: 0.5, y: 0.5 });
  const isSimulatedMouseDownRef = useRef<boolean>(false);

  // Performance tracking
  const frameCountRef = useRef<number>(0);
  const lastFpsTimeRef = useRef<number>(performance.now());

  // Camera stream status
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        setCameraError(null);
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err: unknown) {
        console.warn('Camera access unavailable:', err);
        setCameraError(
          'Webcam unavailable. Interactive Virtual Hand Simulator is activated!'
        );
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Initialize MediaPipe hand landmarker
  useEffect(() => {
    handTracker.initialize();
  }, []);

  // Update container bounding rect on resize
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        onContainerRectUpdate(containerRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [onContainerRectUpdate]);

  // Handle snapshot composite request
  useEffect(() => {
    if (snapshotTrigger === 0) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;

    // Create high-res composite offscreen canvas
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // 1. Draw video background if available
    if (video && video.readyState >= 2 && cameraActive) {
      ctx.save();
      if (isMirrored) {
        ctx.translate(offscreen.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      ctx.restore();
    } else {
      // Sleek cyber dark background if no camera
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    }

    // 2. Composite AR drawings
    ctx.drawImage(canvas, 0, 0);

    // 3. Cyber Brand Watermark
    ctx.save();
    ctx.font = '600 16px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(0, 245, 255, 0.85)';
    ctx.fillText('Draw With Your Hand', 24, offscreen.height - 28);
    ctx.font = '400 12px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(
      `Spatial Air Canvas · ${new Date().toLocaleDateString()}`,
      24,
      offscreen.height - 12
    );
    ctx.restore();

    onSnapshotReady(offscreen.toDataURL('image/png'));
  }, [snapshotTrigger, isMirrored, cameraActive, onSnapshotReady]);

  // Add spark particles
  const addParticles = useCallback(
    (x: number, y: number, color: string, count: number = 3) => {
      const hexColor =
        color === 'rainbow'
          ? `hsl(${Math.random() * 360}, 100%, 65%)`
          : color;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: hexColor,
          alpha: 1,
          size: Math.random() * 4 + 2,
          decay: Math.random() * 0.03 + 0.02,
          rotation: Math.random() * Math.PI * 2,
        });
      }
    },
    []
  );

  // Eraser helper
  const eraseNearPoint = useCallback(
    (x: number, y: number, radius: number = 32) => {
      setStrokes((prev) => {
        const next = prev
          .map((stroke) => {
            const filteredPoints = stroke.points.filter((pt) => {
              const dist = Math.hypot(pt.x - x, pt.y - y);
              return dist > radius;
            });
            return { ...stroke, points: filteredPoints };
          })
          .filter((stroke) => stroke.points.length > 0);
        strokesRef.current = next;
        return next;
      });
    },
    [setStrokes]
  );

  // Main AR Render & Hand Tracking Loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      // Ensure canvas internal resolution matches display resolution
      if (
        canvas.width !== canvas.clientWidth ||
        canvas.height !== canvas.clientHeight
      ) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      const width = canvas.width;
      const height = canvas.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear overlay canvas
      ctx.clearRect(0, 0, width, height);

      // FPS calculation
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsTimeRef.current >= 1000) {
        onFpsUpdate(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      // 1. Acquire Hand Landmarks (Real or Simulated)
      let handData: HandData | null = null;

      if (!isSimulated && video && video.readyState >= 2 && cameraActive) {
        handData = handTracker.processVideoFrame(video, isMirrored, width, height);
      }

      // If simulated mode is on or camera not detecting, use virtual hand
      if (isSimulated || (!handData && !cameraActive)) {
        handData = handTracker.generateSimulatedHand(
          simulatedPosRef.current.x,
          simulatedPosRef.current.y,
          isSimulatedMouseDownRef.current
        );
      }

      onHandUpdate(handData);

      // 2. Render Stencil Template (if active)
      if (selectedStencilId && selectedStencilId !== 'none') {
        const stencil = STENCILS.find((s) => s.id === selectedStencilId);
        if (stencil && stencil.points.length > 1) {
          ctx.save();
          ctx.beginPath();
          stencil.points.forEach((pt, idx) => {
            const sx = pt.x * width;
            const sy = pt.y * height;
            if (idx === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          });
          ctx.setLineDash([8, 8]);
          ctx.lineDashOffset = -now * 0.02; // animated flow
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = 'rgba(0, 245, 255, 0.4)';
          ctx.shadowColor = '#00f5ff';
          ctx.shadowBlur = 12;
          ctx.stroke();

          // Pulsing nodes along stencil points
          stencil.points.forEach((pt) => {
            ctx.beginPath();
            ctx.arc(pt.x * width, pt.y * height, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#00f5ff';
            ctx.fill();
          });
          ctx.restore();
        }
      }

      // 3. Render Completed Air Brush Strokes
      strokesRef.current.forEach((stroke) => {
        if (!stroke.points || stroke.points.length === 0) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'neon') {
          // Neon Glow Shader
          ctx.shadowColor = stroke.color === 'rainbow' ? '#ff00aa' : stroke.color;
          ctx.shadowBlur = stroke.size * 1.5;
          ctx.lineWidth = stroke.size;
          ctx.strokeStyle = stroke.color;
          ctx.globalAlpha = 0.85;

          ctx.beginPath();
          stroke.points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          // Bright white neon core
          ctx.shadowBlur = 4;
          ctx.lineWidth = Math.max(2, stroke.size * 0.35);
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        } else if (stroke.tool === 'ink') {
          // Calligraphy Ink Ribbon
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 6;
          ctx.lineWidth = stroke.size;
          ctx.strokeStyle = stroke.color;
          ctx.beginPath();
          stroke.points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else {
              const prev = stroke.points[i - 1];
              const midX = (prev.x + pt.x) / 2;
              const midY = (prev.y + pt.y) / 2;
              ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
            }
          });
          ctx.stroke();
        } else if (stroke.tool === 'rainbow') {
          // Spectral Rainbow Trail
          ctx.shadowBlur = 10;
          for (let i = 1; i < stroke.points.length; i++) {
            const p1 = stroke.points[i - 1];
            const p2 = stroke.points[i];
            const hue = (i * 8 + now * 0.05) % 360;
            ctx.strokeStyle = `hsl(${hue}, 100%, 65%)`;
            ctx.shadowColor = `hsl(${hue}, 100%, 65%)`;
            ctx.lineWidth = stroke.size;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        } else if (stroke.tool === 'laser') {
          // Precision Laser Beam
          ctx.shadowColor = stroke.color;
          ctx.shadowBlur = 16;
          ctx.lineWidth = stroke.size;
          ctx.strokeStyle = stroke.color;
          ctx.beginPath();
          stroke.points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        } else if (stroke.tool === 'stamp') {
          // AR Emoji Stamp (permanent after pinch release)
          const emoji = stroke.stampEmoji || '⭐';
          const stampPx = Math.max(30, stroke.size * 2.6);
          ctx.font = `${stampPx}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = stroke.color === 'rainbow' ? '#00f5ff' : stroke.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = stroke.color === 'rainbow' ? '#ffffff' : stroke.color;
          stroke.points.forEach((pt) => {
            ctx.fillText(emoji, pt.x, pt.y);
          });
        } else if (stroke.tool === 'sparkle') {
          // Permanent AR Star Sparkles (No round icons/circles, pure stars with bright center and faded edges)
          const baseColor = stroke.color === 'rainbow' ? '#f59e0b' : stroke.color;
          const radius = Math.max(16, stroke.size * 2);

          // Render each permanent celestial star
          stroke.points.forEach((pt, i) => {
            ctx.save();
            ctx.translate(pt.x, pt.y);

            // Subtle rotation so each star has a natural sparkling orientation
            const rot = ((pt.timestamp || i * 149) % 360) * (Math.PI / 180);
            ctx.rotate(rot);

            const s = radius * (0.85 + ((i % 4) * 0.12));

            // Helper to draw a crisp 4-pointed concave diamond star
            const drawStarShape = (starSize: number) => {
              ctx.beginPath();
              ctx.moveTo(0, -starSize);
              ctx.quadraticCurveTo(0, 0, starSize, 0);
              ctx.quadraticCurveTo(0, 0, 0, starSize);
              ctx.quadraticCurveTo(0, 0, -starSize, 0);
              ctx.quadraticCurveTo(0, 0, 0, -starSize);
              ctx.closePath();
            };

            // Star gradient: Bright luminous white center, softly fading at the sides and tips
            const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 1.5);
            starGrad.addColorStop(0, '#ffffff'); // pure bright white center
            starGrad.addColorStop(0.2, '#ffffff');
            starGrad.addColorStop(0.45, baseColor);
            starGrad.addColorStop(0.8, baseColor);
            starGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)'); // faded tips/sides

            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 12;

            // 1. Primary 4-point diamond star
            ctx.fillStyle = starGrad;
            ctx.globalAlpha = 0.95;
            drawStarShape(s * 1.5);
            ctx.fill();

            // 2. Secondary diagonal 4-point star (creates an 8-point celestial starburst)
            ctx.save();
            ctx.rotate(Math.PI / 4);
            ctx.globalAlpha = 0.65;
            drawStarShape(s * 0.85);
            ctx.fill();
            ctx.restore();

            // 3. Extra-bright star core in the very center (star-shaped, NOT round)
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.globalAlpha = 1;
            drawStarShape(s * 0.45);
            ctx.fill();
            ctx.restore();

            ctx.restore();
          });
        }

        ctx.restore();
      });

      // 4. Update and Render Stardust Particles
      if (particlesRef.current.length > 0) {
        ctx.save();
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;
          p.rotation += 0.05;

          if (p.alpha <= 0) return false;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.globalAlpha = p.alpha;

          // Draw small 4-point star sparkle
          ctx.beginPath();
          const s = p.size;
          ctx.moveTo(0, -s);
          ctx.lineTo(s * 0.3, -s * 0.3);
          ctx.lineTo(s, 0);
          ctx.lineTo(s * 0.3, s * 0.3);
          ctx.lineTo(0, s);
          ctx.lineTo(-s * 0.3, s * 0.3);
          ctx.lineTo(-s, 0);
          ctx.lineTo(-s * 0.3, -s * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          return true;
        });
        ctx.restore();
      }

      // 5. Hand Tracking Telemetry & Air Drawing Handling
      if (handData && handData.present) {
        const fingerX = handData.indexTip.x * width;
        const fingerY = handData.indexTip.y * height;
        const thumbX = handData.thumbTip.x * width;
        const thumbY = handData.thumbTip.y * height;

        // Determine drawing trigger condition:
        // In 'pinch' mode: drawing occurs when thumb & index finger are pinched together
        // In 'point' mode: drawing occurs when index is pointing
        const shouldDraw =
          drawMode === 'pinch'
            ? handData.isPinching
            : handData.isPointing && !handData.isOpenPalm;

        // Handle Air Eraser tool (ONLY when eraser tool is selected)
        if (currentTool === 'eraser') {
          if (shouldDraw) {
            eraseNearPoint(fingerX, fingerY, currentSize * 2.5);
            // Visual eraser ripple ring
            ctx.save();
            ctx.beginPath();
            ctx.arc(fingerX, fingerY, currentSize * 2.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
          }
        } else if (shouldDraw) {
          // Drawing or Stamping active!
          if (!isDrawingRef.current) {
            // Stroke starting
            isDrawingRef.current = true;
            sounds.playPinch(true);

            const newStroke: DrawingStroke = {
              id: `${Date.now()}-${Math.random()}`,
              tool: currentTool,
              color: currentColor,
              size: currentSize,
              stampEmoji: currentStamp,
              points: [
                {
                  x: fingerX,
                  y: fingerY,
                  pressure: handData.rawPinchNormal,
                  timestamp: now,
                },
              ],
            };
            currentStrokeRef.current = newStroke;
            strokesRef.current = [...strokesRef.current, newStroke];
            setStrokes((prev) => [...prev, newStroke]);
          } else if (currentStrokeRef.current) {
            const activeStroke = currentStrokeRef.current;

            if (currentTool === 'stamp') {
              // For stamp tool, only drop an additional stamp if moved by at least 42px
              const lastPt = activeStroke.points[activeStroke.points.length - 1];
              const dist = Math.hypot(fingerX - lastPt.x, fingerY - lastPt.y);
              if (dist >= 42) {
                activeStroke.points.push({
                  x: fingerX,
                  y: fingerY,
                  pressure: handData.rawPinchNormal,
                  timestamp: now,
                });
                sounds.playSelect();
                strokesRef.current = strokesRef.current.map((s) =>
                  s.id === activeStroke.id ? { ...activeStroke } : s
                );
                setStrokes((prev) =>
                  prev.map((s) => (s.id === activeStroke.id ? { ...activeStroke } : s))
                );
              }
            } else if (currentTool === 'sparkle') {
              // For permanent sparkles, drop a new starburst every 14px
              const lastPt = activeStroke.points[activeStroke.points.length - 1];
              const dist = Math.hypot(fingerX - lastPt.x, fingerY - lastPt.y);
              if (dist >= 14) {
                activeStroke.points.push({
                  x: fingerX,
                  y: fingerY,
                  pressure: handData.rawPinchNormal,
                  timestamp: now,
                });
                addParticles(fingerX, fingerY, currentColor, 1);
                strokesRef.current = strokesRef.current.map((s) =>
                  s.id === activeStroke.id ? { ...activeStroke } : s
                );
                setStrokes((prev) =>
                  prev.map((s) => (s.id === activeStroke.id ? { ...activeStroke } : s))
                );
              }
            } else {
              // Regular continuous brush stroke (neon, ink, rainbow, laser)
              activeStroke.points.push({
                x: fingerX,
                y: fingerY,
                pressure: handData.rawPinchNormal,
                timestamp: now,
              });

              strokesRef.current = strokesRef.current.map((s) =>
                s.id === activeStroke.id ? { ...activeStroke } : s
              );
              setStrokes((prev) =>
                prev.map((s) => (s.id === activeStroke.id ? { ...activeStroke } : s))
              );
            }
          }
        } else {
          // Drawing released
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            currentStrokeRef.current = null;
            sounds.playPinch(false);
          }
        }

        lastIndexPosRef.current = { x: fingerX, y: fingerY };

        // 6. Augmented Reality Skeleton HUD Overlay
        if (showSkeleton && handData.landmarks.length >= 21) {
          ctx.save();

          // Render cyber bone connections
          HAND_CONNECTIONS.forEach(([i1, i2]) => {
            const p1 = handData.landmarks[i1];
            const p2 = handData.landmarks[i2];
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
            ctx.shadowColor = '#00f5ff';
            ctx.shadowBlur = 6;
            ctx.stroke();
          });

          // Render glowing joint nodes
          handData.landmarks.forEach((lm, idx) => {
            const lx = lm.x * width;
            const ly = lm.y * height;
            ctx.beginPath();
            const isTip = [4, 8, 12, 16, 20].includes(idx);
            const r = isTip ? 4.5 : 3;
            ctx.arc(lx, ly, r, 0, Math.PI * 2);
            ctx.fillStyle = isTip ? '#ffffff' : '#00f5ff';
            ctx.shadowColor = isTip ? '#ffffff' : '#00f5ff';
            ctx.shadowBlur = 8;
            ctx.fill();
          });

          // Biometric Palm Radar Ring
          const palmX = handData.palmCenter.x * width;
          const palmY = handData.palmCenter.y * height;
          ctx.beginPath();
          ctx.arc(palmX, palmY, 22, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 245, 255, 0.35)';
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.restore();
        }

        // 7. Interactive Fingertip Target Reticle & Pinch Radar
        ctx.save();

        // Line connecting thumb and index tip
        ctx.beginPath();
        ctx.moveTo(fingerX, fingerY);
        ctx.lineTo(thumbX, thumbY);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = handData.isPinching
          ? 'rgba(0, 245, 255, 0.9)'
          : 'rgba(255, 255, 255, 0.25)';
        ctx.stroke();

        // Dynamic pinch radar circle around index finger
        const pinchVisualRadius = Math.max(12, handData.pinchDistance * width * 0.4);
        ctx.beginPath();
        ctx.arc(fingerX, fingerY, pinchVisualRadius, 0, Math.PI * 2);
        ctx.strokeStyle = handData.isPinching ? '#00f5ff' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = handData.isPinching ? 2.5 : 1.5;
        ctx.shadowColor = '#00f5ff';
        ctx.shadowBlur = handData.isPinching ? 14 : 4;
        ctx.stroke();

        // Fingertip center reticle
        ctx.beginPath();
        ctx.arc(fingerX, fingerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = handData.isPinching
          ? '#ffffff'
          : currentColor === 'rainbow'
          ? '#00f5ff'
          : currentColor;
        ctx.fill();

        ctx.restore();
      }
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    currentTool,
    currentColor,
    currentSize,
    currentStamp,
    selectedStencilId,
    drawMode,
    showSkeleton,
    isMirrored,
    isSimulated,
    cameraActive,
    strokes,
    setStrokes,
    addParticles,
    eraseNearPoint,
    onHandUpdate,
    onFpsUpdate,
  ]);

  // Mouse & Touch simulation handlers for Virtual Hand mode
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isSimulatedMouseDownRef.current = true;
    updateSimulatedPos(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updateSimulatedPos(e);
  };

  const handlePointerUp = () => {
    isSimulatedMouseDownRef.current = false;
  };

  const updateSimulatedPos = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    simulatedPosRef.current = { x, y };
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full h-full overflow-hidden bg-slate-950 touch-none"
    >
      {/* Underlying Webcam Stream */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          cameraActive ? 'opacity-100' : 'opacity-0'
        } ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Cyber Grid Background if camera is inactive */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          <div className="glass-panel p-6 rounded-2xl max-w-md border border-cyan-500/20 shadow-2xl relative z-10">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center mx-auto mb-3 text-cyan-400">
              <span className="text-xl">🖐️</span>
            </div>
            <h3 className="font-display text-lg font-semibold text-white mb-1">
              Virtual Hand Simulator Active
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Move your mouse or finger across the screen to position the hand. Click or press and drag to pinch and air-paint, or tap on the floating AR tools!
            </p>
            {cameraError && (
              <p className="text-[11px] text-amber-300/80 font-mono bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
                {cameraError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* AR Canvas Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
      />
    </div>
  );
};
