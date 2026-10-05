/**
 * Biometric Holographic HUD & Hand Tracking Telemetry Display
 * Responsive and collapsible across mobile, tablet, and desktop viewports.
 */

import React, { useState, useEffect } from 'react';
import { HandData } from '../types/ar';
import { ShieldCheck, Crosshair, Activity, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { sounds } from '../utils/sound';

interface BiometricHUDProps {
  handData: HandData | null;
  isSimulated: boolean;
  onToggleSimulated: () => void;
  onOpenGuide: () => void;
  fps: number;
}

export const BiometricHUD: React.FC<BiometricHUDProps> = ({
  handData,
  isSimulated,
  onToggleSimulated,
  onOpenGuide,
  fps,
}) => {
  const isLocked = handData && handData.present;
  // Auto-collapse on small mobile screens to keep the viewport clean
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="pointer-events-none absolute top-14 sm:top-16 left-2 sm:left-4 z-15 flex flex-col gap-1.5 max-w-[220px] sm:max-w-[280px]">
      {/* Collapsed Pill Mode (Mobile First) */}
      {isCollapsed ? (
        <button
          onClick={() => {
            sounds.playHover();
            setIsCollapsed(false);
          }}
          className="pointer-events-auto glass-panel px-2.5 py-1.5 rounded-xl border border-white/10 shadow-lg text-[10px] font-mono flex items-center gap-2 hover:border-cyan-400/40 transition-all text-slate-200"
        >
          {isLocked ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
          )}
          <span className="truncate max-w-[120px]">
            {isLocked ? `${handData.handedness} Hand` : 'Scanning'}
          </span>
          <span className="text-cyan-400 font-bold">{fps}fps</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      ) : (
        /* Expanded HUD Module */
        <div className="glass-panel p-2.5 rounded-xl border border-white/10 shadow-lg text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {isLocked ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              )}
              <span className="font-mono text-[10.5px] font-semibold tracking-wider uppercase text-slate-200">
                {isLocked ? `HAND LOCKED · ${handData.handedness}` : 'SCANNING FOR HAND'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-cyan-400/90 font-medium">
                {fps} FPS
              </span>
              <button
                onClick={() => {
                  sounds.playHover();
                  setIsCollapsed(true);
                }}
                className="pointer-events-auto p-0.5 text-slate-400 hover:text-white"
                title="Collapse HUD"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dynamic Telemetry when Hand is detected */}
          {isLocked ? (
            <div className="space-y-1 pt-1 border-t border-white/5 font-mono text-[10px] text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gesture:</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold uppercase text-[9px]">
                  {handData.gesture === 'pinch'
                    ? 'PINCH (DRAW)'
                    : handData.gesture === 'point'
                    ? 'POINT (HOVER)'
                    : handData.gesture === 'open_palm'
                    ? 'OPEN PALM'
                    : handData.gesture}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pinch Depth:</span>
                <div className="w-16 sm:w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-75"
                    style={{ width: `${Math.round(handData.rawPinchNormal * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                <span>Confidence: {Math.round(handData.confidence * 100)}%</span>
                <span>21 Nodes</span>
              </div>
            </div>
          ) : (
            <div className="pt-1 border-t border-white/5 text-[10px] text-slate-400 flex flex-col gap-1">
              <p>Raise your hand in front of the camera to begin AR scanning & air drawing.</p>
            </div>
          )}

          {/* Action button row */}
          <div className="pt-1 flex items-center justify-between gap-1 pointer-events-auto">
            <button
              onClick={onToggleSimulated}
              className={`text-[9.5px] font-mono px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                isSimulated
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50'
                  : 'text-slate-400 border-white/10 hover:text-white hover:border-white/20'
              }`}
            >
              <Activity className="w-3 h-3" />
              {isSimulated ? 'Virtual Hand: ON' : 'Simulate Hand'}
            </button>

            <button
              onClick={onOpenGuide}
              className="text-[9.5px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5"
            >
              <HelpCircle className="w-3 h-3" />
              Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
