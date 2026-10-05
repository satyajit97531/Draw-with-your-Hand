/**
 * Interactive Gesture & Air-Tap Guide Modal
 */

import React from 'react';
import { X, Hand, Sparkles, Crosshair, Palette, Eraser } from 'lucide-react';
import { sounds } from '../utils/sound';

interface GestureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GestureGuideModal: React.FC<GestureGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white text-base">
                How to Air-Draw & Tap AR Tools
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Spatial Gesture Manual
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playHover();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white glass-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions Grid */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Hand Scanning */}
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 shrink-0 text-sm font-bold">
              1
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Hand Recognition & Scanning
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hold your hand up within the camera frame, palm facing forward. The biometric radar will lock onto 21 hand landmarks with real-time holographic bone tracking.
              </p>
            </div>
          </div>

          {/* Step 2: Tapping on Tools in Camera */}
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shrink-0">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2">
                Tapping Floating Camera Tools
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300">
                  Key Feature
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Extend your index finger and hover over any floating tool pod or color sphere present in the camera viewport. A radial dwell circle will charge up, or pinch your fingers while over the tool to activate it with sound feedback! You can also tap the screen directly.
              </p>
            </div>
          </div>

          {/* Step 3: Air Drawing */}
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Pinch & Air Paint
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pinch your thumb and index fingertip together like holding a magic wand. Move your hand in 3D air to lay down glowing neon light ribbons, calligraphy ink, or sparkling particle trails!
              </p>
            </div>
          </div>

          {/* Step 4: Gestures & Eraser */}
          <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-900/60 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0">
              <Eraser className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-0.5">
                Open Palm Air Eraser & Shortcuts
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Spread all 5 fingers in an Open Palm gesture to wipe away strokes, or select the Air Eraser tool. Switch between <span className="text-cyan-300 font-mono">Pinch to Draw</span> and <span className="text-purple-300 font-mono">Point to Draw</span> anytime using the top bar.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-900/40 flex justify-end">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
          >
            Start Air Drawing
          </button>
        </div>
      </div>
    </div>
  );
};
