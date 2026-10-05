/**
 * Floating AR Spatial Interactive Tools overlay inside the camera viewport.
 * Fully responsive across Mobile (portrait & landscape), Tablet, and Desktop.
 * Tracks fingertip collision for air dwell tapping, pinch tapping, and physical screen tapping.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  PenTool,
  Eraser,
  Flame,
  RotateCcw,
  RotateCw,
  Trash2,
  Camera,
  Hand,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Palette,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  Zap,
} from 'lucide-react';
import { DrawingToolType, Point2D } from '../types/ar';
import { sounds } from '../utils/sound';

export interface AROverlayToolsProps {
  currentTool: DrawingToolType;
  currentColor: string;
  currentSize: number;
  currentStamp: string;
  selectedStencilId: string;
  onSelectTool: (tool: DrawingToolType) => void;
  onSelectColor: (color: string) => void;
  onSelectSize: (size: number) => void;
  onSelectStamp: (stamp: string) => void;
  onSelectStencil: (stencilId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSnapshot: () => void;
  canUndo: boolean;
  canRedo: boolean;
  drawMode: 'pinch' | 'point';
  onToggleDrawMode: () => void;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  isMirrored: boolean;
  onToggleMirror: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  indexFingertip: Point2D | null;
  isPinching: boolean;
  containerRect: DOMRect | null;
}

const COLORS = [
  { id: '#00f5ff', label: 'Cyber Cyan', bg: 'bg-[#00f5ff]' },
  { id: '#f43f5e', label: 'Neon Rose', bg: 'bg-[#f43f5e]' },
  { id: '#a855f7', label: 'Electric Violet', bg: 'bg-[#a855f7]' },
  { id: '#10b981', label: 'Emerald Acid', bg: 'bg-[#10b981]' },
  { id: '#f59e0b', label: 'Solar Gold', bg: 'bg-[#f59e0b]' },
  { id: '#ffffff', label: 'Starlight White', bg: 'bg-white' },
  { id: 'rainbow', label: 'Spectral Rainbow', bg: 'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400' },
];

const SIZES = [
  { size: 5, label: 'Thin' },
  { size: 12, label: 'Med' },
  { size: 24, label: 'Bold' },
];

const STAMPS = ['⭐', '💖', '🔥', '⚡', '👑', '🌸'];

const TOOLS_CONFIG: Array<{ id: DrawingToolType; label: string; icon: React.ReactNode }> = [
  { id: 'neon', label: 'Neon Ribbon', icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'ink', label: 'Fluid Ink', icon: <PenTool className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'rainbow', label: 'Spectral Trail', icon: <Palette className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'sparkle', label: 'Stardust', icon: <Flame className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'laser', label: 'Laser Beam', icon: <Zap className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { id: 'stamp', label: 'AR Stamp', icon: <span className="text-sm">⭐</span> },
  { id: 'eraser', label: 'Air Eraser', icon: <Eraser className="w-4 h-4 sm:w-5 sm:h-5" /> },
];

export const AROverlayTools: React.FC<AROverlayToolsProps> = ({
  currentTool,
  currentColor,
  currentSize,
  currentStamp,
  selectedStencilId,
  onSelectTool,
  onSelectColor,
  onSelectSize,
  onSelectStamp,
  onSelectStencil,
  onUndo,
  onRedo,
  onClear,
  onSnapshot,
  canUndo,
  canRedo,
  drawMode,
  onToggleDrawMode,
  showSkeleton,
  onToggleSkeleton,
  isMirrored,
  onToggleMirror,
  soundEnabled,
  onToggleSound,
  indexFingertip,
  isPinching,
  containerRect,
}) => {
  // Mobile Quick Menu Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Mobile Bottom Tab (tools, colors, settings)
  const [mobileTab, setMobileTab] = useState<'tools' | 'colors' | 'sizes'>('tools');

  // Elements registered for Air Dwell & Pinch collision
  const registeredTargetsRef = useRef<Map<string, { rect: DOMRect; onTrigger: () => void }>>(new Map());
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState<number>(0);
  const dwellStartTimeRef = useRef<number | null>(null);
  const lastTriggeredTargetRef = useRef<string | null>(null);
  const DWELL_DURATION = 380; // ms for air finger dwell activation

  // Monitor index finger collision with AR buttons
  useEffect(() => {
    if (!indexFingertip || !containerRect) {
      setHoveredTargetId(null);
      setDwellProgress(0);
      dwellStartTimeRef.current = null;
      lastTriggeredTargetRef.current = null;
      return;
    }

    // Convert normalized index fingertip to pixel coordinates in viewport
    const fingerScreenX = containerRect.left + indexFingertip.x * containerRect.width;
    const fingerScreenY = containerRect.top + indexFingertip.y * containerRect.height;

    let matchedId: string | null = null;
    let matchedCallback: (() => void) | null = null;

    registeredTargetsRef.current.forEach((item, id) => {
      const { rect, onTrigger } = item;
      // Proximity check with expanded padding for effortless air hovering
      const padding = 14;
      if (
        fingerScreenX >= rect.left - padding &&
        fingerScreenX <= rect.right + padding &&
        fingerScreenY >= rect.top - padding &&
        fingerScreenY <= rect.bottom + padding
      ) {
        matchedId = id;
        matchedCallback = onTrigger;
      }
    });

    if (matchedId) {
      if (hoveredTargetId !== matchedId) {
        setHoveredTargetId(matchedId);
        setDwellProgress(0);
        dwellStartTimeRef.current = performance.now();
        sounds.playHover();
      } else if (dwellStartTimeRef.current) {
        const elapsed = performance.now() - dwellStartTimeRef.current;
        const progress = Math.min(1, elapsed / DWELL_DURATION);
        setDwellProgress(progress);

        // Immediate pinch trigger while hovering over button
        const shouldTrigger = isPinching || progress >= 1;

        if (shouldTrigger && lastTriggeredTargetRef.current !== matchedId) {
          lastTriggeredTargetRef.current = matchedId;
          sounds.playSelect();
          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.(35);
          }
          if (matchedCallback) {
            (matchedCallback as () => void)();
          }
          // Reset dwell after successful activation
          dwellStartTimeRef.current = performance.now() + 300;
          setDwellProgress(1);
        }
      }
    } else {
      setHoveredTargetId(null);
      setDwellProgress(0);
      dwellStartTimeRef.current = null;
      lastTriggeredTargetRef.current = null;
    }
  }, [indexFingertip, isPinching, containerRect, hoveredTargetId]);

  // Helper to register air-target element
  const registerTarget = (id: string, onTrigger: () => void) => (el: HTMLElement | null) => {
    if (el) {
      const rect = el.getBoundingClientRect();
      registeredTargetsRef.current.set(id, { rect, onTrigger });
    } else {
      registeredTargetsRef.current.delete(id);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-2 sm:p-4 md:p-5 overflow-hidden">
      {/* 1. TOP RESPONSIVE HEADER BAR */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2">
          <div className="glass-panel flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] shrink-0">
            <div className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xs sm:text-sm font-semibold tracking-wide text-white whitespace-nowrap">
                Draw With Your Hand
              </span>
              <span className="hidden sm:inline font-mono text-[9px] sm:text-[10px] text-cyan-200/70 tracking-tight">
                SPATIAL AIR CANVAS
              </span>
            </div>
          </div>
        </div>

        {/* Center Quick Controls (Visible on Tablet & Desktop) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Draw Mode Switcher */}
          <button
            ref={registerTarget('action-drawmode', onToggleDrawMode)}
            onClick={() => {
              sounds.playSelect();
              onToggleDrawMode();
            }}
            title={drawMode === 'pinch' ? 'Pinch to Draw' : 'Point to Draw'}
            className={`pointer-events-auto relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              drawMode === 'pinch'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">
              {drawMode === 'pinch' ? 'Pinch to Draw' : 'Point to Draw'}
            </span>
          </button>

          {/* Stencil Presets */}
          <div className="relative pointer-events-auto">
            <select
              value={selectedStencilId}
              onChange={(e) => {
                sounds.playSelect();
                onSelectStencil(e.target.value);
              }}
              className="glass-panel text-xs font-medium text-slate-200 px-2.5 py-1.5 rounded-xl border border-white/15 focus:outline-none focus:border-cyan-400 cursor-pointer appearance-none pr-7"
            >
              <option value="none" className="bg-slate-900 text-white">Free Air</option>
              <option value="star" className="bg-slate-900 text-white">★ Star</option>
              <option value="heart" className="bg-slate-900 text-white">♥ Heart</option>
              <option value="crown" className="bg-slate-900 text-white">♛ Crown</option>
              <option value="infinity" className="bg-slate-900 text-white">∞ Infinity</option>
            </select>
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">
              ▼
            </div>
          </div>

          {/* Skeleton Overlay */}
          <button
            ref={registerTarget('action-skeleton', onToggleSkeleton)}
            onClick={() => {
              sounds.playSelect();
              onToggleSkeleton();
            }}
            title="Toggle Skeleton Overlay"
            className={`pointer-events-auto p-2 rounded-xl border text-xs transition-all ${
              showSkeleton
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                : 'glass-button text-slate-400 border-white/10'
            }`}
          >
            {showSkeleton ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Mirror Camera */}
          <button
            ref={registerTarget('action-mirror', onToggleMirror)}
            onClick={() => {
              sounds.playSelect();
              onToggleMirror();
            }}
            title={isMirrored ? 'Mirrored (Selfie)' : 'Normal View'}
            className="pointer-events-auto p-2 glass-button text-slate-300 rounded-xl"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Audio SFX */}
          <button
            onClick={() => {
              onToggleSound();
              sounds.playSelect();
            }}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            className="pointer-events-auto p-2 glass-button text-slate-300 rounded-xl"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Actions: Undo, Redo, Capture & Mobile Settings Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Undo */}
          <button
            ref={registerTarget('action-undo', onUndo)}
            disabled={!canUndo}
            onClick={() => {
              sounds.playHover();
              onUndo();
            }}
            title="Undo"
            className={`pointer-events-auto p-1.5 sm:p-2 rounded-xl border text-xs transition-all ${
              canUndo
                ? 'glass-button text-slate-200 border-white/20'
                : 'opacity-30 text-slate-500 border-transparent cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Redo */}
          <button
            ref={registerTarget('action-redo', onRedo)}
            disabled={!canRedo}
            onClick={() => {
              sounds.playHover();
              onRedo();
            }}
            title="Redo"
            className={`pointer-events-auto p-1.5 sm:p-2 rounded-xl border text-xs transition-all ${
              canRedo
                ? 'glass-button text-slate-200 border-white/20'
                : 'opacity-30 text-slate-500 border-transparent cursor-not-allowed'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Clear Button (Visible on md+, or via mobile menu) */}
          <button
            ref={registerTarget('action-clear', onClear)}
            onClick={() => {
              sounds.playClear();
              onClear();
            }}
            title="Clear Canvas"
            className="hidden md:flex pointer-events-auto p-2 glass-button text-rose-400 hover:text-rose-300 hover:border-rose-400/50 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Snapshot Button */}
          <button
            ref={registerTarget('action-snapshot', onSnapshot)}
            onClick={() => {
              sounds.playShutter();
              onSnapshot();
            }}
            title="Capture AR Artwork"
            className="pointer-events-auto flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Capture</span>
          </button>

          {/* Mobile Menu Trigger Button (< md) */}
          <button
            onClick={() => {
              sounds.playSelect();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            title="Settings & Tools"
            className="md:hidden pointer-events-auto p-1.5 sm:p-2 glass-button text-cyan-300 rounded-xl border border-cyan-500/30"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE SETTINGS DRAWER (< md) */}
      {mobileMenuOpen && (
        <div className="md:hidden pointer-events-auto fixed inset-x-3 top-16 z-40 glass-panel p-3.5 rounded-2xl border border-cyan-500/30 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <span className="font-mono text-xs font-semibold text-cyan-300 tracking-wider">
              SPATIAL SETTINGS
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            {/* Draw Mode */}
            <button
              onClick={() => {
                onToggleDrawMode();
                sounds.playSelect();
              }}
              className={`p-2 rounded-xl border flex items-center gap-2 justify-center ${
                drawMode === 'pinch'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50'
                  : 'bg-purple-500/20 text-purple-300 border-purple-400/50'
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>{drawMode === 'pinch' ? 'Pinch to Draw' : 'Point to Draw'}</span>
            </button>

            {/* Skeleton Overlay */}
            <button
              onClick={() => {
                onToggleSkeleton();
                sounds.playSelect();
              }}
              className={`p-2 rounded-xl border flex items-center gap-2 justify-center ${
                showSkeleton
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'glass-button text-slate-300'
              }`}
            >
              {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showSkeleton ? 'Skeleton: ON' : 'Skeleton: OFF'}</span>
            </button>

            {/* Mirror Camera */}
            <button
              onClick={() => {
                onToggleMirror();
                sounds.playSelect();
              }}
              className="p-2 rounded-xl glass-button text-slate-200 flex items-center gap-2 justify-center"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>{isMirrored ? 'Mirrored (Selfie)' : 'Normal View'}</span>
            </button>

            {/* Sound FX */}
            <button
              onClick={() => {
                onToggleSound();
                sounds.playSelect();
              }}
              className="p-2 rounded-xl glass-button text-slate-200 flex items-center gap-2 justify-center"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'SFX Audio: ON' : 'SFX: Muted'}</span>
            </button>
          </div>

          {/* Stencils & Clear Canvas Row */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
            <select
              value={selectedStencilId}
              onChange={(e) => {
                onSelectStencil(e.target.value);
                sounds.playSelect();
              }}
              className="flex-1 glass-panel text-xs text-slate-200 px-2.5 py-1.5 rounded-xl border border-white/10"
            >
              <option value="none" className="bg-slate-900 text-white">Free Air</option>
              <option value="star" className="bg-slate-900 text-white">★ Cosmic Star</option>
              <option value="heart" className="bg-slate-900 text-white">♥ Neon Heart</option>
              <option value="crown" className="bg-slate-900 text-white">♛ Imperial Crown</option>
              <option value="infinity" className="bg-slate-900 text-white">∞ Quantum Infinity</option>
            </select>

            <button
              onClick={() => {
                onClear();
                sounds.playClear();
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-xl text-rose-400 glass-button flex items-center gap-1.5 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DESKTOP & TABLET LANDSCAPE: SIDE DOCKS (Hidden on Mobile) */}
      <div className="hidden md:flex relative flex-1 items-center justify-between my-2 pointer-events-none">
        {/* LEFT AR SPATIAL DOCK: Color Spheres */}
        <div className="pointer-events-auto flex flex-col gap-2.5 glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
          <div className="text-[10px] font-mono tracking-wider text-slate-400 text-center uppercase">
            Color
          </div>
          {COLORS.map((col) => {
            const isSelected = currentColor === col.id;
            const isHovered = hoveredTargetId === `color-${col.id}`;
            return (
              <button
                key={col.id}
                ref={registerTarget(`color-${col.id}`, () => onSelectColor(col.id))}
                onClick={() => {
                  sounds.playSelect();
                  onSelectColor(col.id);
                }}
                title={col.label}
                className={`relative w-8 h-8 rounded-full ${col.bg} transition-all duration-200 flex items-center justify-center ${
                  isSelected
                    ? 'ring-4 ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg'
                    : 'hover:scale-105 opacity-85 hover:opacity-100'
                }`}
              >
                {isHovered && (
                  <svg className="absolute -inset-1.5 w-11 h-11 pointer-events-none -rotate-90">
                    <circle
                      cx="22"
                      cy="22"
                      r="19"
                      fill="none"
                      stroke="#00f5ff"
                      strokeWidth="2.5"
                      strokeDasharray="119.4"
                      strokeDashoffset={119.4 * (1 - dwellProgress)}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-slate-950 shadow-inner" />
                )}
              </button>
            );
          })}
        </div>

        {/* RIGHT AR SPATIAL DOCK: Drawing Tools */}
        <div className="pointer-events-auto flex flex-col gap-2 glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
          <div className="text-[10px] font-mono tracking-wider text-slate-400 text-center uppercase">
            Tool
          </div>
          {TOOLS_CONFIG.map((t) => {
            const isSelected = currentTool === t.id;
            const isHovered = hoveredTargetId === `tool-${t.id}`;
            return (
              <button
                key={t.id}
                ref={registerTarget(`tool-${t.id}`, () => onSelectTool(t.id))}
                onClick={() => {
                  sounds.playSelect();
                  onSelectTool(t.id);
                }}
                title={t.label}
                className={`relative p-2.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.7)] font-bold'
                    : 'glass-button text-slate-300'
                }`}
              >
                {isHovered && (
                  <svg className="absolute -inset-1 w-11 h-11 pointer-events-none -rotate-90">
                    <circle
                      cx="22"
                      cy="22"
                      r="19"
                      fill="none"
                      stroke="#00f5ff"
                      strokeWidth="2.5"
                      strokeDasharray="119.4"
                      strokeDashoffset={119.4 * (1 - dwellProgress)}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {t.id === 'stamp' ? (
                  <span className="text-sm leading-none block">{currentStamp}</span>
                ) : (
                  t.icon
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MOBILE ADAPTIVE BOTTOM CONTROLS (< md) */}
      <div className="md:hidden pointer-events-auto flex flex-col gap-2 w-full mt-auto">
        {/* Mobile Tabbed Strip */}
        <div className="glass-panel p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col gap-2">
          {/* Segmented Switcher */}
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 px-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sounds.playHover();
                  setMobileTab('tools');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'tools'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Brushes
              </button>
              <button
                onClick={() => {
                  sounds.playHover();
                  setMobileTab('colors');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'colors'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Colors
              </button>
              <button
                onClick={() => {
                  sounds.playHover();
                  setMobileTab('sizes');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'sizes'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Size & Stamps
              </button>
            </div>

            {/* Gesture state pill */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
              <span className={`w-1.5 h-1.5 rounded-full ${isPinching ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'}`} />
              <span>{isPinching ? 'DRAW' : 'HOVER'}</span>
            </div>
          </div>

          {/* Tab 1: Tools Horizontal Row */}
          {mobileTab === 'tools' && (
            <div className="flex items-center justify-between gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {TOOLS_CONFIG.map((t) => {
                const isSelected = currentTool === t.id;
                const isHovered = hoveredTargetId === `mob-tool-${t.id}`;
                return (
                  <button
                    key={t.id}
                    ref={registerTarget(`mob-tool-${t.id}`, () => onSelectTool(t.id))}
                    onClick={() => {
                      sounds.playSelect();
                      onSelectTool(t.id);
                    }}
                    className={`relative p-2 rounded-xl transition-all shrink-0 flex flex-col items-center gap-1 min-w-[44px] ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                        : 'glass-button text-slate-300'
                    }`}
                  >
                    {isHovered && (
                      <div className="absolute inset-0 rounded-xl border border-cyan-400" />
                    )}
                    {t.id === 'stamp' ? (
                      <span className="text-sm leading-none block">{currentStamp}</span>
                    ) : (
                      t.icon
                    )}
                    <span className="text-[8.5px] font-mono uppercase truncate max-w-[44px]">
                      {t.id}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 2: Colors Horizontal Row */}
          {mobileTab === 'colors' && (
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
              {COLORS.map((col) => {
                const isSelected = currentColor === col.id;
                const isHovered = hoveredTargetId === `mob-col-${col.id}`;
                return (
                  <button
                    key={col.id}
                    ref={registerTarget(`mob-col-${col.id}`, () => onSelectColor(col.id))}
                    onClick={() => {
                      sounds.playSelect();
                      onSelectColor(col.id);
                    }}
                    className={`relative w-8 h-8 rounded-full ${col.bg} transition-all duration-200 shrink-0 flex items-center justify-center ${
                      isSelected
                        ? 'ring-4 ring-offset-2 ring-offset-slate-950 scale-110 shadow-lg'
                        : 'opacity-85'
                    }`}
                  >
                    {isHovered && (
                      <div className="absolute -inset-1 rounded-full border border-cyan-400" />
                    )}
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-slate-950 shadow-inner" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 3: Sizes & Stamps */}
          {mobileTab === 'sizes' && (
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s.size}
                    ref={registerTarget(`mob-size-${s.size}`, () => onSelectSize(s.size))}
                    onClick={() => {
                      sounds.playSelect();
                      onSelectSize(s.size);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                      currentSize === s.size
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-semibold'
                        : 'text-slate-400 hover:text-white glass-button'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {STAMPS.slice(0, 4).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      sounds.playSelect();
                      onSelectStamp(st);
                      onSelectTool('stamp');
                    }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-all ${
                      currentTool === 'stamp' && currentStamp === st
                        ? 'bg-rose-500/30 ring-1 ring-rose-400'
                        : 'glass-button'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. DESKTOP BOTTOM BAR (Visible on md+) */}
      <div className="hidden md:flex items-center justify-between gap-3 pointer-events-none">
        {/* Stroke Width Selector */}
        <div className="pointer-events-auto flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
          <span className="text-[10px] font-mono text-slate-400 mr-1">SIZE</span>
          {SIZES.map((s) => (
            <button
              key={s.size}
              ref={registerTarget(`size-${s.size}`, () => onSelectSize(s.size))}
              onClick={() => {
                sounds.playSelect();
                onSelectSize(s.size);
              }}
              className={`relative px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                currentSize === s.size
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {hoveredTargetId === `size-${s.size}` && (
                <div
                  className="absolute inset-0 rounded-lg border border-cyan-400"
                  style={{ opacity: dwellProgress }}
                />
              )}
              {s.label}
            </button>
          ))}
        </div>

        {/* If Stamp Tool is active, show stamp emoji bar */}
        {currentTool === 'stamp' && (
          <div className="pointer-events-auto flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-xl border border-rose-500/30 shadow-lg animate-in fade-in zoom-in-95 duration-200">
            {STAMPS.map((st) => (
              <button
                key={st}
                ref={registerTarget(`stamp-${st}`, () => onSelectStamp(st))}
                onClick={() => {
                  sounds.playSelect();
                  onSelectStamp(st);
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-base transition-all ${
                  currentStamp === st
                    ? 'bg-rose-500/30 ring-1 ring-rose-400 scale-110'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {/* Spatial Status Pill */}
        <div className="glass-panel px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-mono text-[11px] text-cyan-200/80 tracking-wide">
            {isPinching ? 'PINCH ACTIVE · DRAWING' : 'HOVER TO TAP TOOLS'}
          </span>
        </div>
      </div>
    </div>
  );
};
