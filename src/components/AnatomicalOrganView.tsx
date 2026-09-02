import React from 'react';
import { OrganType } from '../types';

interface AnatomicalOrganProps {
  type: OrganType;
  level?: number;
  isDestroyed?: boolean;
  isNecrotic?: boolean;
  isUpgrading?: boolean;
  isSelected?: boolean;
  className?: string;
  size?: number; // width/height in px (default 96)
  showDetails?: boolean;
}

export const AnatomicalOrganView: React.FC<AnatomicalOrganProps> = ({
  type,
  level = 1,
  isDestroyed = false,
  isNecrotic = false,
  isUpgrading = false,
  isSelected = false,
  className = '',
  size = 96,
  showDetails = true,
}) => {
  const getFilterStyle = () => {
    if (isDestroyed) {
      return 'grayscale contrast-125 brightness-75 drop-shadow-[0_4px_12px_rgba(225,29,72,0.4)] opacity-75';
    }
    if (isNecrotic) {
      return 'sepia hue-rotate-270 brightness-90 drop-shadow-[0_4px_12px_rgba(217,119,6,0.5)]';
    }
    if (isSelected) {
      return 'drop-shadow-[0_0_14px_rgba(37,99,235,0.75)] filter';
    }
    return 'drop-shadow-[0_6px_10px_rgba(0,0,0,0.12)] hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)] transition-all';
  };

  const renderOrganSVG = () => {
    switch (type) {
      case 'HEART_CARDIO':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full animate-[pulse_1.2s_ease-in-out_infinite]"
            style={{ transformOrigin: '50% 55%' }}
          >
            <defs>
              <linearGradient id="aortaGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
              <linearGradient id="venaCavaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="ventricleGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e11d48" />
                <stop offset="50%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#881337" />
              </linearGradient>
              <radialGradient id="atriumL" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#9f1239" />
              </radialGradient>
            </defs>

            {/* Superior Vena Cava (Deoxygenated Blue) */}
            <path
              d="M36 12 C36 8, 46 8, 46 12 L46 36 C42 36, 38 35, 36 34 Z"
              fill="url(#venaCavaGrad)"
              stroke="#075985"
              strokeWidth="1.5"
            />
            {/* Vena Cava Inflow Branch */}
            <ellipse cx="41" cy="11" rx="5" ry="2.5" fill="#38bdf8" />

            {/* Aortic Arch & 3 Branches (Oxygenated Red) */}
            {/* Brachiocephalic, Common Carotid, Subclavian arteries */}
            <rect x="52" y="6" width="4" height="12" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
            <rect x="59" y="4" width="4.5" height="14" rx="2" fill="#f87171" stroke="#991b1b" strokeWidth="1" />
            <rect x="66" y="8" width="4" height="11" rx="2" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />

            {/* Aorta Arch curve */}
            <path
              d="M48 28 C48 14, 75 14, 76 30 C76 34, 73 40, 70 44 L60 40 C63 36, 65 30, 60 25 C56 22, 52 24, 52 28 Z"
              fill="url(#aortaGrad)"
              stroke="#991b1b"
              strokeWidth="1.5"
            />

            {/* Pulmonary Trunk & Arteries (Cyan-Blue Branch) */}
            <path
              d="M50 32 L68 46 C60 49, 48 45, 45 40 Z"
              fill="#0284c7"
              stroke="#0369a1"
              strokeWidth="1"
            />

            {/* Right Atrium (Anatomical Right, visual left) */}
            <path
              d="M30 36 C24 40, 24 56, 34 62 C38 60, 42 54, 42 44 C42 38, 38 34, 30 36 Z"
              fill="url(#atriumL)"
              stroke="#881337"
              strokeWidth="1.5"
            />

            {/* Left Atrium & Auricle (Anatomical Left, visual right) */}
            <path
              d="M72 38 C84 42, 86 56, 78 64 C74 62, 70 54, 68 46 C68 40, 70 38, 72 38 Z"
              fill="url(#atriumL)"
              stroke="#881337"
              strokeWidth="1.5"
            />

            {/* Main Ventricles Body (Apex pointing down-left) */}
            <path
              d="M32 58 C26 72, 38 98, 52 108 C58 112, 64 110, 68 100 C78 84, 84 70, 78 56 C68 62, 42 62, 32 58 Z"
              fill="url(#ventricleGrad)"
              stroke="#4c0519"
              strokeWidth="2"
            />

            {/* Anterior Interventricular Sulcus (Groove separating Left & Right Ventricles) */}
            <path
              d="M54 59 Q52 80 54 107"
              stroke="#4c0519"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {/* Coronary Arteries (Red branches) & Cardiac Veins (Blue) */}
            <path
              d="M53 62 Q45 70 40 76 M52 74 Q44 80 42 88"
              stroke="#fca5a5"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M55 64 Q62 72 68 76 M55 78 Q64 86 63 94"
              stroke="#38bdf8"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Muscle Highlights / 3D sheen */}
            <path
              d="M36 68 C34 76, 38 90, 46 98"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx="54" cy="106" r="3" fill="#fda4af" opacity="0.6" />
          </svg>
        );

      case 'LUNGS_RESP':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full animate-[pulse_2.4s_ease-in-out_infinite]"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="lungPink" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>
              <linearGradient id="tracheaCartilage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>

            {/* Trachea (Windpipe with Cartilage Rings) */}
            <rect x="55" y="8" width="10" height="28" rx="2" fill="url(#tracheaCartilage)" stroke="#0284c7" strokeWidth="1.5" />
            {/* Cartilage Ring Lines */}
            <line x1="55" y1="12" x2="65" y2="12" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="55" y1="17" x2="65" y2="17" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="55" y1="22" x2="65" y2="22" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="55" y1="27" x2="65" y2="27" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="55" y1="32" x2="65" y2="32" stroke="#0369a1" strokeWidth="1.5" />

            {/* Carina / Bronchi Bifurcation */}
            <path
              d="M55 36 L44 48 M65 36 L76 48"
              stroke="#0284c7"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Right Lung (3 Lobes: Superior, Middle, Inferior) */}
            <path
              d="M48 38 C38 34, 22 42, 18 60 C14 74, 18 96, 32 104 C44 110, 50 102, 50 86 C50 68, 52 50, 48 38 Z"
              fill="url(#lungPink)"
              stroke="#831843"
              strokeWidth="2"
            />
            {/* Fissure lines on Right Lung */}
            <path d="M20 64 Q35 68 49 60" stroke="#831843" strokeWidth="1.2" fill="none" opacity="0.7" />
            <path d="M24 82 Q38 82 48 76" stroke="#831843" strokeWidth="1.2" fill="none" opacity="0.7" />

            {/* Left Lung (2 Lobes with Cardiac Notch for Heart) */}
            <path
              d="M72 38 C82 34, 98 42, 102 60 C106 74, 102 96, 88 104 C76 110, 72 102, 70 86 C66 74, 62 66, 68 54 C70 46, 70 42, 72 38 Z"
              fill="url(#lungPink)"
              stroke="#831843"
              strokeWidth="2"
            />
            {/* Oblique Fissure on Left Lung */}
            <path d="M72 58 Q85 70 100 78" stroke="#831843" strokeWidth="1.2" fill="none" opacity="0.7" />

            {/* Bronchial Tree internal network (white/light cyan branching) */}
            {/* Right Bronchial branches */}
            <path d="M44 48 Q34 56 28 66 M34 56 Q32 48 26 48 M34 56 Q38 72 36 86" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Left Bronchial branches */}
            <path d="M76 48 Q86 56 92 66 M86 56 Q88 48 94 48 M86 56 Q82 72 84 86" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" fill="none" />

            {/* Alveolar luster clusters */}
            <circle cx="28" cy="90" r="3" fill="#fbcfe8" opacity="0.6" />
            <circle cx="92" cy="90" r="3" fill="#fbcfe8" opacity="0.6" />
            <circle cx="34" cy="48" r="2.5" fill="#fbcfe8" opacity="0.6" />
            <circle cx="86" cy="48" r="2.5" fill="#fbcfe8" opacity="0.6" />
          </svg>
        );

      case 'BRAIN_CNS':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="brainCortex" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d8b4fe" />
                <stop offset="40%" stopColor="#c084fc" />
                <stop offset="80%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
              <radialGradient id="cerebellum" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#e9d5ff" />
                <stop offset="100%" stopColor="#9333ea" />
              </radialGradient>
            </defs>

            {/* Brainstem / Medulla Oblongata & Pons */}
            <path
              d="M58 84 C56 94, 54 104, 56 112 L64 112 C66 104, 64 94, 62 84 Z"
              fill="#c084fc"
              stroke="#581c87"
              strokeWidth="2"
            />
            <line x1="56" y1="96" x2="64" y2="96" stroke="#6b21a8" strokeWidth="1.5" />

            {/* Cerebellum (Bottom Rear Lobes with fine folia stripes) */}
            <path
              d="M62 76 C74 76, 88 78, 92 88 C94 96, 86 104, 74 102 C66 100, 62 90, 62 76 Z"
              fill="url(#cerebellum)"
              stroke="#581c87"
              strokeWidth="2"
            />
            {/* Cerebellar folia striations */}
            <path d="M66 84 Q78 84 88 88 M66 90 Q76 92 84 96 M64 96 Q72 98 78 100" stroke="#6b21a8" strokeWidth="1" fill="none" />

            {/* Main Cerebral Hemispheres / Convolutions */}
            <path
              d="M56 22 C36 20, 18 36, 16 56 C14 74, 26 86, 44 88 C50 88, 54 84, 58 84 C62 84, 68 84, 76 80 C96 74, 106 58, 102 42 C98 24, 78 20, 56 22 Z"
              fill="url(#brainCortex)"
              stroke="#581c87"
              strokeWidth="2.5"
            />

            {/* Deep Sulci & Gyri (Brain folds & grooves) */}
            {/* Frontal lobe gyri */}
            <path
              d="M26 44 C34 40, 42 46, 50 42 C56 38, 48 30, 42 30"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M22 58 C30 54, 38 60, 46 56 C52 52, 48 46, 42 46"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Parietal & Occipital gyri */}
            <path
              d="M54 28 C62 26, 74 30, 78 38 C82 46, 72 48, 64 46"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M56 46 C66 44, 78 48, 86 44 C92 42, 94 52, 88 58"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            {/* Temporal lobe gyri */}
            <path
              d="M34 72 C42 68, 52 72, 60 68 C68 64, 76 68, 84 66"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M28 72 C32 80, 44 80, 48 76"
              stroke="#581c87"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Glowing Synaptic Sparks */}
            <circle cx="36" cy="38" r="2" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2s' }} />
            <circle cx="78" cy="42" r="2" fill="#ffffff" className="animate-ping" style={{ animationDuration: '2.5s' }} />
            <circle cx="56" cy="62" r="2" fill="#ffffff" className="animate-ping" style={{ animationDuration: '1.8s' }} />
          </svg>
        );

      case 'STOMACH_DIGEST':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="stomachGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
              <radialGradient id="rugaeFolds" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="100%" stopColor="#ea580c" />
              </radialGradient>
            </defs>

            {/* Esophagus tube leading into stomach */}
            <path
              d="M44 8 C44 18, 48 24, 52 28 L60 26 C56 22, 54 16, 54 8 Z"
              fill="#fb923c"
              stroke="#9a3412"
              strokeWidth="1.5"
            />

            {/* J-Shaped Stomach Body (Fundus, Greater Curvature, Lesser Curvature, Pylorus) */}
            <path
              d="M52 28 C38 24, 24 36, 22 56 C20 78, 30 98, 54 104 C74 108, 92 98, 94 80 C96 68, 86 64, 76 64 C66 64, 54 62, 52 50 C50 40, 56 32, 60 26 Z"
              fill="url(#stomachGrad)"
              stroke="#7c2d12"
              strokeWidth="2.5"
            />

            {/* Duodenum exit pipeline */}
            <path
              d="M90 76 C96 74, 104 76, 108 84 L102 90 C98 84, 94 82, 88 84 Z"
              fill="#fdba74"
              stroke="#9a3412"
              strokeWidth="1.5"
            />

            {/* Internal Rugae Folds (Wavy gastric lining textures) */}
            <path
              d="M32 50 Q42 56 36 70 Q42 82 50 90"
              stroke="#fed7aa"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M44 48 Q54 60 48 76 Q54 86 66 94"
              stroke="#fed7aa"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />
            <path
              d="M38 72 Q48 76 44 86"
              stroke="#ffedd5"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* Gastric Juices bubbling sheen */}
            <circle cx="56" cy="88" r="3" fill="#fef08a" opacity="0.6" className="animate-pulse" />
            <circle cx="70" cy="80" r="2.5" fill="#fef08a" opacity="0.6" className="animate-pulse" />
          </svg>
        );

      case 'INTESTINE_DIGEST':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="intestineGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#9f1239" />
              </linearGradient>
            </defs>

            {/* Intricately Coiled Small Intestine loops (Jejunum & Ileum) */}
            {/* Back loops shadow layer */}
            <path
              d="M30 40 Q45 28 60 38 Q75 48 90 38 Q98 55 86 68 Q70 60 55 72 Q35 60 26 50 Z"
              fill="#be123c"
              opacity="0.6"
            />

            {/* Main looped intestinal tubes with villi ripples */}
            <path
              d="M26 36 C36 26, 54 26, 64 34 C74 42, 88 34, 94 44 C100 54, 92 68, 82 66 C72 64, 64 74, 52 70 C40 66, 32 76, 26 66 C20 56, 16 46, 26 36 Z"
              fill="url(#intestineGrad)"
              stroke="#881337"
              strokeWidth="2.5"
            />
            <path
              d="M28 62 C38 52, 54 58, 64 50 C74 42, 86 52, 92 64 C96 76, 88 88, 76 86 C64 84, 56 94, 44 92 C32 90, 24 82, 28 68 Z"
              fill="url(#intestineGrad)"
              stroke="#881337"
              strokeWidth="2.5"
            />
            <path
              d="M36 82 C46 76, 60 84, 70 78 C80 72, 86 82, 82 92 C78 100, 64 104, 52 100 C40 96, 30 92, 36 82 Z"
              fill="url(#intestineGrad)"
              stroke="#881337"
              strokeWidth="2"
            />

            {/* Mesenteric blood vessel branching (Red & Blue capillaries) */}
            <path d="M50 48 Q60 58 70 54 M45 66 Q58 72 65 68 M40 84 Q52 86 62 82" stroke="#fecdd3" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M54 52 Q62 62 58 74" stroke="#bae6fd" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        );

      case 'COLON_DIGEST':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="colonGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* Inverted U-shaped Large Intestine (Cecum, Ascending, Transverse, Descending Colon, Rectum) with Haustra pouches */}
            {/* Cecum & Appendix (Bottom Left) */}
            <path
              d="M26 84 C20 84, 18 96, 26 100 C32 100, 36 94, 34 84 Z"
              fill="url(#colonGrad)"
              stroke="#451a03"
              strokeWidth="2"
            />
            {/* Appendix tail */}
            <path d="M22 96 Q14 104 18 110" stroke="#78350f" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Ascending Colon (Left side upward) */}
            <path
              d="M24 84 C18 70, 18 46, 26 34 C30 28, 38 28, 42 34 C46 46, 44 70, 36 84 Z"
              fill="url(#colonGrad)"
              stroke="#451a03"
              strokeWidth="2"
            />

            {/* Transverse Colon (Arch across top) */}
            <path
              d="M26 34 C40 22, 78 22, 92 34 C98 40, 94 48, 86 46 C74 38, 44 38, 34 46 C26 46, 22 40, 26 34 Z"
              fill="url(#colonGrad)"
              stroke="#451a03"
              strokeWidth="2"
            />

            {/* Descending & Sigmoid Colon (Right side downward to Rectum) */}
            <path
              d="M92 34 C100 46, 100 70, 94 84 C90 92, 80 96, 72 96 C64 96, 62 106, 62 114 L54 114 C54 104, 58 90, 70 86 C82 82, 86 64, 82 46 Z"
              fill="url(#colonGrad)"
              stroke="#451a03"
              strokeWidth="2"
            />

            {/* Haustra pouch segments / Teniae Coli band (Center ribbon) */}
            <path d="M30 42 Q36 44 32 54 M28 62 Q34 64 30 74" stroke="#fde68a" strokeWidth="1.5" fill="none" />
            <path d="M42 34 Q54 38 66 34 Q78 38 88 34" stroke="#fef3c7" strokeWidth="2" fill="none" />
            <path d="M88 52 Q84 62 90 72" stroke="#fde68a" strokeWidth="1.5" fill="none" />
          </svg>
        );

      case 'KIDNEY_EXCRET':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="kidneyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="50%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#450a0a" />
              </linearGradient>
              <linearGradient id="cortexGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#b91c1c" />
              </linearGradient>
            </defs>

            {/* Left Kidney (Outer bean-shape) */}
            <path
              d="M34 26 C16 32, 14 68, 22 86 C28 100, 44 102, 50 92 C54 84, 48 76, 46 64 C44 52, 48 44, 46 36 C44 28, 40 24, 34 26 Z"
              fill="url(#kidneyGrad)"
              stroke="#450a0a"
              strokeWidth="2"
            />

            {/* Right Kidney (Opposite orientation) */}
            <path
              d="M86 26 C104 32, 106 68, 98 86 C92 100, 76 102, 70 92 C66 84, 72 76, 74 64 C76 52, 72 44, 74 36 C76 28, 80 24, 86 26 Z"
              fill="url(#kidneyGrad)"
              stroke="#450a0a"
              strokeWidth="2"
            />

            {/* Renal Hilum & Vessels (Red Renal Artery, Blue Renal Vein, Yellow Ureter) */}
            {/* Left Kidney vessels */}
            <path d="M46 54 L60 52" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M46 62 L60 60" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
            <path d="M46 72 Q56 82 54 112" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Right Kidney vessels */}
            <path d="M74 54 L60 52" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
            <path d="M74 62 L60 60" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
            <path d="M74 72 Q64 82 66 112" stroke="#eab308" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Internal Medulla Pyramids highlight */}
            <path d="M26 46 Q32 54 28 64 Q34 74 30 84" stroke="#fca5a5" strokeWidth="1.5" fill="none" opacity="0.6" />
            <path d="M94 46 Q88 54 92 64 Q86 74 90 84" stroke="#fca5a5" strokeWidth="1.5" fill="none" opacity="0.6" />
          </svg>
        );

      case 'LIVER_METABOLIC':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="liverGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="40%" stopColor="#9a3412" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
              <linearGradient id="gallbladder" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#84cc16" />
                <stop offset="100%" stopColor="#4d7c0f" />
              </linearGradient>
            </defs>

            {/* Massive Triangular Liver Wedge (Large Right Lobe & Smaller Left Lobe) */}
            <path
              d="M20 54 C16 38, 40 28, 64 26 C90 24, 108 34, 106 50 C104 68, 88 88, 62 92 C38 96, 24 82, 20 54 Z"
              fill="url(#liverGrad)"
              stroke="#431407"
              strokeWidth="2.5"
            />

            {/* Falciform Ligament dividing Right & Left Lobes */}
            <path
              d="M62 26 C64 42, 60 62, 54 92"
              stroke="#fed7aa"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Gallbladder (Green pear-shaped bile sac peeking underneath) */}
            <path
              d="M48 82 C44 86, 44 96, 50 98 C56 100, 58 92, 54 84 Z"
              fill="url(#gallbladder)"
              stroke="#365314"
              strokeWidth="1.5"
            />

            {/* Hepatic Portal Vein & Hepatic Artery branching into liver tissue */}
            <path d="M54 62 L42 50 M54 62 L66 52 M54 62 L52 74" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <path d="M56 64 L48 54 M56 64 L68 56" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        );

      case 'BLADDER_EXCRET':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="bladderGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            {/* Ureters entering from kidneys */}
            <path d="M30 18 Q36 36 44 48" stroke="#eab308" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M90 18 Q84 36 76 48" stroke="#eab308" strokeWidth="3" fill="none" strokeLinecap="round" />

            {/* Spherical Muscular Detrusor Dome */}
            <path
              d="M38 48 C24 58, 26 86, 42 100 C52 108, 68 108, 78 100 C94 86, 96 58, 82 48 C72 38, 48 38, 38 48 Z"
              fill="url(#bladderGrad)"
              stroke="#075985"
              strokeWidth="2.5"
            />

            {/* Urethral exit neck */}
            <path d="M56 106 L56 116 L64 116 L64 106" fill="#0284c7" stroke="#075985" strokeWidth="2" />

            {/* Liquid / urine fluid level highlight */}
            <path
              d="M34 76 Q60 84 86 76 Q78 96 60 98 Q42 96 34 76 Z"
              fill="#fde047"
              opacity="0.5"
            />
            <path d="M42 58 Q60 62 78 58" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
          </svg>
        );

      case 'PANCREAS_DIGEST':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="pancreasGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>

            {/* Elongated Leaf-Shaped Pancreas (Head nestled in duodenum, Tail pointing left) */}
            <path
              d="M20 54 C36 44, 70 42, 90 48 C102 52, 106 64, 102 74 C96 84, 84 84, 72 78 C54 70, 32 72, 20 62 C14 58, 14 54, 20 54 Z"
              fill="url(#pancreasGrad)"
              stroke="#854d0e"
              strokeWidth="2"
            />

            {/* Pancreatic Duct (Main duct with herring-bone side branches) */}
            <path
              d="M24 58 Q60 58 96 64"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path d="M38 52 L42 58 M46 64 L50 58 M60 52 L64 58 M70 64 L74 58 M82 54 L86 64" stroke="#ffffff" strokeWidth="1.2" />

            {/* Lobular acinar surface texture */}
            <circle cx="34" cy="52" r="2.5" fill="#ca8a04" opacity="0.6" />
            <circle cx="56" cy="48" r="3" fill="#ca8a04" opacity="0.6" />
            <circle cx="78" cy="52" r="2.5" fill="#ca8a04" opacity="0.6" />
            <circle cx="92" cy="68" r="3" fill="#ca8a04" opacity="0.6" />
          </svg>
        );

      case 'THYROID_ENDOCRINE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="thyroidGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="50%" stopColor="#db2777" />
                <stop offset="100%" stopColor="#9d174d" />
              </linearGradient>
            </defs>

            {/* Trachea rings in background */}
            <rect x="52" y="20" width="16" height="80" rx="3" fill="#bae6fd" stroke="#0284c7" strokeWidth="1.5" opacity="0.8" />
            <line x1="52" y1="35" x2="68" y2="35" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="52" y1="50" x2="68" y2="50" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="52" y1="65" x2="68" y2="65" stroke="#0369a1" strokeWidth="1.5" />
            <line x1="52" y1="80" x2="68" y2="80" stroke="#0369a1" strokeWidth="1.5" />

            {/* Butterfly-shaped Thyroid (Left Lobe, Isthmus Bridge, Right Lobe) */}
            {/* Left Lobe */}
            <path
              d="M52 54 C46 36, 26 34, 24 54 C22 74, 38 88, 52 74 Z"
              fill="url(#thyroidGrad)"
              stroke="#831843"
              strokeWidth="2"
            />
            {/* Right Lobe */}
            <path
              d="M68 54 C74 36, 94 34, 96 54 C98 74, 82 88, 68 74 Z"
              fill="url(#thyroidGrad)"
              stroke="#831843"
              strokeWidth="2"
            />
            {/* Isthmus Connecting Bridge across trachea */}
            <path
              d="M48 62 Q60 66 72 62 Q60 74 48 62 Z"
              fill="url(#thyroidGrad)"
              stroke="#831843"
              strokeWidth="1.5"
            />

            {/* Glandular sparkle glow */}
            <circle cx="34" cy="56" r="2" fill="#ffffff" opacity="0.8" />
            <circle cx="86" cy="56" r="2" fill="#ffffff" opacity="0.8" />
          </svg>
        );

      case 'ADRENAL_ENDOCRINE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="adrenalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#a16207" />
              </linearGradient>
            </defs>

            {/* Kidney top pole for context */}
            <path
              d="M24 74 C24 58, 44 54, 60 56 C76 54, 96 58, 96 74 C96 98, 24 98, 24 74 Z"
              fill="#991b1b"
              stroke="#450a0a"
              strokeWidth="2"
              opacity="0.85"
            />

            {/* Pair of Golden-Orange Triangular Adrenal Caps */}
            {/* Left Adrenal Cap */}
            <path
              d="M34 52 C30 40, 44 26, 52 34 C54 44, 46 54, 34 52 Z"
              fill="url(#adrenalGrad)"
              stroke="#713f12"
              strokeWidth="2"
            />
            {/* Right Adrenal Cap */}
            <path
              d="M86 52 C90 40, 76 26, 68 34 C66 44, 74 54, 86 52 Z"
              fill="url(#adrenalGrad)"
              stroke="#713f12"
              strokeWidth="2"
            />

            {/* Adrenaline hormone flare rays */}
            <path d="M52 24 L52 14 M36 28 L28 20 M68 28 L76 20" stroke="#eab308" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
          </svg>
        );

      case 'BONE_MARROW_IMMUNE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="boneHard" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <radialGradient id="redMarrow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="60%" stopColor="#be123c" />
                <stop offset="100%" stopColor="#881337" />
              </radialGradient>
            </defs>

            {/* Femur Bone Head (Epiphysis top) */}
            <path
              d="M34 24 C28 14, 44 8, 52 16 C60 8, 76 14, 70 24 L66 44 L38 44 Z"
              fill="url(#boneHard)"
              stroke="#64748b"
              strokeWidth="2"
            />

            {/* Bone Shaft (Diaphysis) with Cutaway Window revealing Red Spongy Marrow */}
            <path
              d="M38 44 L38 88 L66 88 L66 44 Z"
              fill="url(#boneHard)"
              stroke="#64748b"
              strokeWidth="2"
            />

            {/* Cutaway Window (Red Active Hematopoietic Marrow) */}
            <rect x="42" y="46" width="20" height="38" rx="4" fill="url(#redMarrow)" stroke="#881337" strokeWidth="1.5" />

            {/* Spongy trabecular bone lattice & Stem cells */}
            <circle cx="48" cy="54" r="2" fill="#ffffff" />
            <circle cx="56" cy="62" r="2.5" fill="#ffffff" />
            <circle cx="47" cy="72" r="2" fill="#ffffff" />
            <circle cx="57" cy="76" r="2" fill="#ffffff" />

            {/* Epiphysis Bottom */}
            <path
              d="M38 88 L34 104 C28 114, 44 118, 52 110 C60 118, 76 114, 70 104 L66 88 Z"
              fill="url(#boneHard)"
              stroke="#64748b"
              strokeWidth="2"
            />
          </svg>
        );

      case 'SPLEEN_IMMUNE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="spleenGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#7e22ce" />
                <stop offset="100%" stopColor="#581c87" />
              </linearGradient>
            </defs>

            {/* Purple Oval Spleen (Coffee-bean convex shape) */}
            <path
              d="M34 26 C18 36, 18 84, 38 100 C58 112, 88 98, 92 74 C96 50, 84 28, 64 22 C52 18, 42 20, 34 26 Z"
              fill="url(#spleenGrad)"
              stroke="#3b0764"
              strokeWidth="2.5"
            />

            {/* Splenic Hilum notch & Artery/Vein entering */}
            <path d="M50 48 Q62 60 74 60" stroke="#f43f5e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M54 54 Q64 66 72 70" stroke="#38bdf8" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* White Pulp / Lymphoid follicle nodes */}
            <circle cx="44" cy="46" r="3" fill="#e9d5ff" opacity="0.7" />
            <circle cx="48" cy="74" r="3.5" fill="#e9d5ff" opacity="0.7" />
            <circle cx="70" cy="42" r="3" fill="#e9d5ff" opacity="0.7" />
            <circle cx="74" cy="80" r="2.5" fill="#e9d5ff" opacity="0.7" />
          </svg>
        );

      case 'THYMUS_IMMUNE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="thymusGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>

            {/* Bilobed Lymphoid Gland (Right and Left Lobes meeting at midline) */}
            <path
              d="M58 24 C44 26, 32 38, 30 60 C28 82, 40 96, 56 102 C58 90, 58 40, 58 24 Z"
              fill="url(#thymusGrad)"
              stroke="#064e3b"
              strokeWidth="2"
            />
            <path
              d="M62 24 C76 26, 88 38, 90 60 C92 82, 80 96, 64 102 C62 90, 62 40, 62 24 Z"
              fill="url(#thymusGrad)"
              stroke="#064e3b"
              strokeWidth="2"
            />

            {/* Cortical & Medullary lobules pattern */}
            <circle cx="44" cy="52" r="3" fill="#a7f3d0" opacity="0.7" />
            <circle cx="42" cy="74" r="3.5" fill="#a7f3d0" opacity="0.7" />
            <circle cx="76" cy="52" r="3" fill="#a7f3d0" opacity="0.7" />
            <circle cx="78" cy="74" r="3.5" fill="#a7f3d0" opacity="0.7" />
          </svg>
        );

      case 'LYMPH_NODE_IMMUNE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="lymphGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="50%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#115e59" />
              </linearGradient>
            </defs>

            {/* Afferent Lymphatic Vessels entering */}
            <path d="M26 30 L40 44 M58 18 L58 34 M90 30 L76 44" stroke="#5eead4" strokeWidth="2.5" strokeLinecap="round" />

            {/* Kidney-bean shaped Lymph Node Capsule */}
            <path
              d="M40 38 C24 46, 22 76, 36 92 C50 104, 76 102, 88 88 C98 74, 96 48, 80 38 C68 30, 52 30, 40 38 Z"
              fill="url(#lymphGrad)"
              stroke="#042f2e"
              strokeWidth="2.5"
            />

            {/* Efferent vessel exiting hilum */}
            <path d="M60 98 L60 114" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" />

            {/* Germinal Centers / Lymphatic Follicles */}
            <circle cx="44" cy="56" r="4" fill="#ccfbf1" opacity="0.8" />
            <circle cx="62" cy="52" r="4.5" fill="#ccfbf1" opacity="0.8" />
            <circle cx="76" cy="62" r="4" fill="#ccfbf1" opacity="0.8" />
            <circle cx="56" cy="74" r="4.5" fill="#ccfbf1" opacity="0.8" />
          </svg>
        );

      case 'SKELETON_RIBCAGE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="boneRibs" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#94a3b8" />
              </linearGradient>
            </defs>

            {/* Sternum / Breastbone (Manubrium, Body, Xiphoid process) */}
            <path
              d="M54 18 L66 18 L64 28 L62 76 L58 84 L56 76 L54 28 Z"
              fill="url(#boneRibs)"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* True & False Curved Rib Arches */}
            {/* Rib 1 */}
            <path d="M54 22 C34 16, 20 28, 26 36 C34 42, 46 38, 54 30" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M66 22 C86 16, 100 28, 94 36 C86 42, 74 38, 66 30" stroke="#cbd5e1" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Rib 2 */}
            <path d="M54 36 C28 32, 14 46, 22 58 C32 64, 46 56, 56 46" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M66 36 C92 32, 106 46, 98 58 C88 64, 74 56, 64 46" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Rib 3 */}
            <path d="M56 50 C26 48, 12 66, 22 80 C32 86, 48 76, 58 62" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M64 50 C94 48, 108 66, 98 80 C88 86, 72 76, 62 62" stroke="#e2e8f0" strokeWidth="3" fill="none" strokeLinecap="round" />
            {/* Rib 4 (Bottom floating rib arch) */}
            <path d="M58 66 C32 68, 20 86, 32 98" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M62 66 C88 68, 100 86, 88 98" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        );

      case 'MUSCLE_TISSUE':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="muscleFiber" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>

            {/* Striated Skeletal Muscle Bundle / Dome Diaphragm */}
            <path
              d="M20 70 C24 38, 56 26, 96 42 C104 68, 92 96, 60 98 C36 100, 18 90, 20 70 Z"
              fill="url(#muscleFiber)"
              stroke="#7f1d1d"
              strokeWidth="2.5"
            />

            {/* Striated Muscle Fascicle Lines */}
            <path d="M28 54 Q56 42 88 56" stroke="#fecaca" strokeWidth="2" fill="none" />
            <path d="M24 68 Q56 56 94 70" stroke="#fee2e2" strokeWidth="2" fill="none" />
            <path d="M28 82 Q56 72 88 84" stroke="#fecaca" strokeWidth="2" fill="none" />

            {/* Tendon Connections (White fibrous ends) */}
            <path d="M18 70 C14 62, 14 78, 18 70 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
            <path d="M96 42 C104 38, 106 50, 96 42 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          </svg>
        );

      case 'SPINAL_CORD':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="spinalNerve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>

            {/* Central Neural Tube */}
            <rect x="52" y="10" width="16" height="100" rx="6" fill="url(#spinalNerve)" stroke="#854d0e" strokeWidth="2" />

            {/* Spinal Nerve Root Pairs (Branching symmetrically) */}
            <path d="M52 24 L24 16 M68 24 L96 16" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 42 L20 36 M68 42 L100 36" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 60 L18 58 M68 60 L102 58" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 78 L22 82 M68 78 L98 82" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
            <path d="M52 96 L28 104 M68 96 L92 104" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />

            {/* Action potential pulses */}
            <circle cx="60" cy="30" r="3" fill="#ffffff" className="animate-ping" style={{ animationDuration: '1.2s' }} />
            <circle cx="60" cy="70" r="3" fill="#ffffff" className="animate-ping" style={{ animationDuration: '1.6s' }} />
          </svg>
        );

      case 'TRACHEA_RESP':
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="tracheaBlue" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>

            {/* Larynx / Voice box at top */}
            <polygon points="46,12 74,12 68,26 52,26" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.5" />

            {/* Cartilage C-Rings Tube */}
            <rect x="50" y="26" width="20" height="52" rx="4" fill="url(#tracheaBlue)" stroke="#0284c7" strokeWidth="2" />

            {/* Horizontal Cartilage Ribs */}
            <line x1="50" y1="34" x2="70" y2="34" stroke="#0369a1" strokeWidth="2" />
            <line x1="50" y1="42" x2="70" y2="42" stroke="#0369a1" strokeWidth="2" />
            <line x1="50" y1="50" x2="70" y2="50" stroke="#0369a1" strokeWidth="2" />
            <line x1="50" y1="58" x2="70" y2="58" stroke="#0369a1" strokeWidth="2" />
            <line x1="50" y1="66" x2="70" y2="66" stroke="#0369a1" strokeWidth="2" />

            {/* Bifurcation into Left & Right Primary Bronchi */}
            <path d="M50 78 L26 106 M70 78 L94 106" stroke="#0284c7" strokeWidth="7" strokeLinecap="round" />
            <path d="M50 78 L26 106 M70 78 L94 106" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
          </svg>
        );

      case 'SKIN_INTEGUMENT':
      default:
        return (
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full"
            style={{ transformOrigin: '50% 50%' }}
          >
            <defs>
              <linearGradient id="skinLayers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fed7aa" />
                <stop offset="40%" stopColor="#fdba74" />
                <stop offset="80%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
            </defs>

            {/* Stratified Epidermal & Dermal Barrier Block */}
            <rect x="20" y="32" width="80" height="56" rx="8" fill="url(#skinLayers)" stroke="#c2410c" strokeWidth="2" />

            {/* Stratum Corneum top layer ridges */}
            <path d="M22 44 Q35 40 50 44 Q65 48 80 44 Q90 40 98 44" stroke="#ffedd5" strokeWidth="2" fill="none" />
            <path d="M22 58 Q35 54 50 58 Q65 62 80 58 Q90 54 98 58" stroke="#fdba74" strokeWidth="2" fill="none" />

            {/* Hair Shaft & Follicle */}
            <path d="M60 20 L60 52 Q60 68 54 74" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="54" cy="74" r="4" fill="#9a3412" />

            {/* Sweat gland pore */}
            <path d="M38 40 Q44 60 40 76 Q36 84 42 86" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
          </svg>
        );
    }
  };

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`relative select-none flex items-center justify-center transition-all ${getFilterStyle()} ${className}`}
    >
      {renderOrganSVG()}
    </div>
  );
};
