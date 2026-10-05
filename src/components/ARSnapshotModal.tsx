/**
 * AR Snapshot Modal for saving, previewing, and downloading artwork
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Download, X, Share2, Sparkles, Check } from 'lucide-react';
import { sounds } from '../utils/sound';

interface ARSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export const ARSnapshotModal: React.FC<ARSnapshotModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
}) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fire confetti burst
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f5ff', '#a855f7', '#f43f5e', '#10b981', '#ffffff'],
        });
      } catch {
        // safe catch
      }
    }
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    sounds.playSelect();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `draw-with-your-hand-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    sounds.playSelect();
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-panel rounded-2xl border border-cyan-500/30 overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-display font-semibold text-white text-sm">
              AR Snapshot Captured
            </span>
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

        {/* Image Preview Container */}
        <div className="relative p-4 flex items-center justify-center bg-slate-900/60 max-h-[70vh] overflow-hidden">
          <img
            src={imageUrl}
            alt="AR Hand Artwork Snapshot"
            className="rounded-xl border border-white/10 max-h-[60vh] object-contain shadow-2xl"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-slate-900/40">
          <span className="font-mono text-xs text-slate-400">
            Augmented Reality composite rendered at high resolution
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass-button text-slate-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
