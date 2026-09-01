import React from 'react';
import {
  X,
  BookOpen,
  Heart,
  Droplets,
  Wind,
  Zap,
  Shield,
  AlertTriangle,
  Radio,
  Flame,
  CheckCircle,
} from 'lucide-react';

interface TutorialModalProps {
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-game text-slate-900 tracking-tight">How the Human Body Base Works</h3>
              <p className="text-xs text-slate-500 font-game">
                Build organs, connect blood flow, filter metabolic waste, and maintain healthy vital balance.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar text-xs leading-relaxed text-slate-600 font-game">
          {/* Section 1: The Core Loop */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <h4 className="text-sm font-bold font-game text-slate-900">
              1. The 3 Core Steps to Keep Your Body Base Alive
            </h4>
            <p>
              Your body functions as an interconnected physiological network:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1">
                <div className="text-amber-800 font-bold flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>1. Generate Nutrients & O2</span>
                </div>
                <p className="text-slate-600"><strong>Stomach</strong> breaks down food into Nutrients, and <strong>Lungs</strong> exchange Oxygen.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200 space-y-1">
                <div className="text-rose-800 font-bold flex items-center space-x-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span>2. Deliver Blood Flow</span>
                </div>
                <p className="text-slate-600"><strong>Heart</strong> pumps blood through arteries to nourish all organ systems.</p>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1">
                <div className="text-blue-800 font-bold flex items-center space-x-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>3. Clear Waste</span>
                </div>
                <p className="text-slate-600"><strong>Kidneys</strong> filter cellular metabolic waste to preserve vitality!</p>
              </div>
            </div>
          </div>

          {/* Section 2: Waste Filtration Penalty */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
            <h4 className="text-sm font-bold font-game text-rose-800 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>2. Important: Prevent Waste Overload</span>
            </h4>
            <p className="text-slate-700">
              Active organs produce metabolic waste. If you don't build or upgrade <strong className="text-slate-900">Kidneys</strong>, waste accumulates in the bloodstream.
            </p>
            <p className="text-rose-700">
              ★ If Waste levels rise into the danger zone, organs suffer damage and lose efficiency. Tap damaged organs to repair them.
            </p>
          </div>

          {/* Section 3: Raids & Defense */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <h4 className="text-sm font-bold font-game text-slate-900 flex items-center space-x-1.5">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>3. Immune Defense & Multi-System Assembly</span>
            </h4>
            <p>
              Upgrade your <strong>Brain HQ</strong> to unlock all 11 body systems and train White Blood Cells (Neutrophils, Macrophages, and Lymphocytes) to defend your base against pathogens.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl game-btn-primary font-game text-xs cursor-pointer shadow-xs flex items-center space-x-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>ENTER BASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
