/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { ARCanvas } from './components/ARCanvas';
import { AROverlayTools } from './components/AROverlayTools';
import { BiometricHUD } from './components/BiometricHUD';
import { ARSnapshotModal } from './components/ARSnapshotModal';
import { GestureGuideModal } from './components/GestureGuideModal';
import { DrawingStroke, DrawingToolType, HandData } from './types/ar';
import { sounds } from './utils/sound';

export default function App() {
  // Tool & Canvas State
  const [currentTool, setCurrentTool] = useState<DrawingToolType>('neon');
  const [currentColor, setCurrentColor] = useState<string>('#00f5ff');
  const [currentSize, setCurrentSize] = useState<number>(12);
  const [currentStamp, setCurrentStamp] = useState<string>('⭐');
  const [selectedStencilId, setSelectedStencilId] = useState<string>('none');
  const [drawMode, setDrawMode] = useState<'pinch' | 'point'>('pinch');
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Hand tracking telemetry
  const [handData, setHandData] = useState<HandData | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  // Strokes & Undo/Redo History
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const historyRef = useRef<DrawingStroke[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Modals & Snapshot State
  const [snapshotTrigger, setSnapshotTrigger] = useState<number>(0);
  const [snapshotImage, setSnapshotImage] = useState<string | null>(null);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  // Record history snapshot when stroke count changes
  const lastStrokesCountRef = useRef<number>(0);
  if (strokes.length !== lastStrokesCountRef.current) {
    if (strokes.length > lastStrokesCountRef.current) {
      // Add to history
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push([...strokes]);
      historyIndexRef.current = historyRef.current.length - 1;
    }
    lastStrokesCountRef.current = strokes.length;
  }

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current] || [];
      setStrokes([...prev]);
      lastStrokesCountRef.current = prev.length;
    } else if (historyIndexRef.current === 0) {
      historyIndexRef.current = -1;
      setStrokes([]);
      lastStrokesCountRef.current = 0;
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current] || [];
      setStrokes([...next]);
      lastStrokesCountRef.current = next.length;
    }
  }, []);

  const handleClear = useCallback(() => {
    if (strokes.length > 0) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push([]);
      historyIndexRef.current = historyRef.current.length - 1;
      setStrokes([]);
      lastStrokesCountRef.current = 0;
    }
  }, [strokes.length]);

  const handleSnapshot = useCallback(() => {
    setSnapshotTrigger((prev) => prev + 1);
  }, []);

  const handleSnapshotReady = useCallback((dataUrl: string) => {
    setSnapshotImage(dataUrl);
    setIsSnapshotOpen(true);
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.setEnabled(next);
  }, [soundEnabled]);

  return (
    <div className="relative w-full h-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-950 select-none">
      {/* Augmented Reality Canvas & Webcam Layer */}
      <ARCanvas
        currentTool={currentTool}
        currentColor={currentColor}
        currentSize={currentSize}
        currentStamp={currentStamp}
        selectedStencilId={selectedStencilId}
        drawMode={drawMode}
        showSkeleton={showSkeleton}
        isMirrored={isMirrored}
        isSimulated={isSimulated}
        onHandUpdate={setHandData}
        onFpsUpdate={setFps}
        onContainerRectUpdate={setContainerRect}
        strokes={strokes}
        setStrokes={setStrokes}
        snapshotTrigger={snapshotTrigger}
        onSnapshotReady={handleSnapshotReady}
      />

      {/* Floating Holographic Biometric HUD */}
      <BiometricHUD
        handData={handData}
        isSimulated={isSimulated}
        onToggleSimulated={() => setIsSimulated((prev) => !prev)}
        onOpenGuide={() => setIsGuideOpen(true)}
        fps={fps}
      />

      {/* Floating AR Spatial Interactive Tools directly inside camera viewport */}
      <AROverlayTools
        currentTool={currentTool}
        currentColor={currentColor}
        currentSize={currentSize}
        currentStamp={currentStamp}
        selectedStencilId={selectedStencilId}
        onSelectTool={setCurrentTool}
        onSelectColor={setCurrentColor}
        onSelectSize={setCurrentSize}
        onSelectStamp={setCurrentStamp}
        onSelectStencil={setSelectedStencilId}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onSnapshot={handleSnapshot}
        canUndo={historyIndexRef.current >= 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
        drawMode={drawMode}
        onToggleDrawMode={() =>
          setDrawMode((prev) => (prev === 'pinch' ? 'point' : 'pinch'))
        }
        showSkeleton={showSkeleton}
        onToggleSkeleton={() => setShowSkeleton((prev) => !prev)}
        isMirrored={isMirrored}
        onToggleMirror={() => setIsMirrored((prev) => !prev)}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        indexFingertip={handData && handData.present ? handData.indexTip : null}
        isPinching={Boolean(handData?.isPinching)}
        containerRect={containerRect}
      />

      {/* High-Resolution AR Photo Snapshot Modal */}
      <ARSnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        imageUrl={snapshotImage}
      />

      {/* Air Gestures & Air-Tap Guide Modal */}
      <GestureGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
