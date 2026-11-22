import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  AVATAR_PRESETS,
  DEFAULT_AVATAR_PRESET_ID,
  estimateDataUrlBytes,
  getAvatarPreset,
  isCustomPhotoUrl,
  presetIdToAvatarUrl,
  processAvatarImageFile,
  resolvePresetId,
} from '../game/avatars';

/* -------------------------------------------------------------------------- */
/* Crisp Stylized 3D/Vector SVG Artwork for All 16 Built-In Warrior Presets   */
/* -------------------------------------------------------------------------- */
const WarriorPresetArt: React.FC<{ presetId: string }> = ({ presetId }) => {
  const preset = getAvatarPreset(presetId);
  const gradId = `bg_${preset.id}`;

  const renderCharacter = () => {
    switch (preset.id) {
      case 'commando_alpha':
        return (
          <>
            {/* Tactical shoulders */}
            <rect x="26" y="114" width="108" height="46" rx="18" fill="#166534" />
            <rect x="52" y="114" width="56" height="46" fill="#14532d" />
            <rect x="34" y="124" width="20" height="8" rx="3" fill="#4ade80" opacity="0.65" />
            <rect x="106" y="124" width="20" height="8" rx="3" fill="#4ade80" opacity="0.65" />
            {/* Blocky head */}
            <rect x="44" y="46" width="72" height="70" rx="14" fill="#d6a57c" />
            {/* Tactical green helmet */}
            <path d="M36 68 C36 30, 124 30, 124 68 L120 76 L40 76 Z" fill="#15803d" />
            <path d="M44 44 L116 44 L112 58 L48 58 Z" fill="#22c55e" opacity="0.35" />
            <rect x="66" y="34" width="28" height="10" rx="3" fill="#052e16" />
            {/* Green tactical visor */}
            <rect x="46" y="68" width="68" height="22" rx="7" fill="#064e3b" stroke="#4ade80" strokeWidth="2.5" />
            <rect x="52" y="73" width="56" height="8" rx="4" fill="#34d399" opacity="0.85" />
            <rect x="58" y="74" width="18" height="3" rx="1.5" fill="#ecfdf5" opacity="0.8" />
            {/* Chin strap & determined expression */}
            <rect x="68" y="100" width="24" height="5" rx="2.5" fill="#7c4a2d" />
            <path d="M44 88 L50 112 M116 88 L110 112" stroke="#14532d" strokeWidth="4" strokeLinecap="round" />
          </>
        );

      case 'cyber_neon_striker':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#0f172a" />
            <path d="M44 114 L80 144 L116 114" fill="none" stroke="#22d3ee" strokeWidth="4" />
            {/* Cyber helmet */}
            <rect x="42" y="38" width="76" height="78" rx="16" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
            {/* Glowing neon visor */}
            <path d="M46 66 L114 66 L108 86 L52 86 Z" fill="#083344" stroke="#22d3ee" strokeWidth="2.5" />
            <rect x="54" y="72" width="22" height="7" rx="3.5" fill="#67e8f9" />
            <rect x="84" y="72" width="22" height="7" rx="3.5" fill="#67e8f9" />
            {/* Lower cyber respirator */}
            <polygon points="56,94 104,94 96,112 64,112" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <line x1="66" y1="100" x2="94" y2="100" stroke="#22d3ee" strokeWidth="2.5" />
            <line x1="70" y1="106" x2="90" y2="106" stroke="#22d3ee" strokeWidth="2.5" />
            {/* Side cyber antennae */}
            <rect x="34" y="60" width="8" height="28" rx="4" fill="#22d3ee" />
            <rect x="118" y="60" width="8" height="28" rx="4" fill="#22d3ee" />
          </>
        );

      case 'golden_emperor':
        return (
          <>
            {/* Royal golden armor */}
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#b45309" />
            <path d="M44 114 L80 154 L116 114 Z" fill="#f59e0b" />
            <circle cx="80" cy="132" r="8" fill="#dc2626" stroke="#fef08a" strokeWidth="2.5" />
            {/* Golden face plate */}
            <rect x="44" y="48" width="72" height="68" rx="14" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />
            {/* Royal Crown */}
            <polygon points="40,56 46,24 64,42 80,18 96,42 114,24 120,56" fill="#fde047" stroke="#b45309" strokeWidth="2.5" />
            <circle cx="80" cy="40" r="5.5" fill="#ef4444" />
            <circle cx="56" cy="46" r="4" fill="#38bdf8" />
            <circle cx="104" cy="46" r="4" fill="#38bdf8" />
            {/* Imperial visor slit */}
            <rect x="52" y="72" width="56" height="16" rx="6" fill="#451a03" />
            <rect x="58" y="77" width="16" height="6" rx="3" fill="#fef08a" />
            <rect x="86" y="77" width="16" height="6" rx="3" fill="#fef08a" />
            <rect x="66" y="96" width="28" height="12" rx="4" fill="#d97706" />
          </>
        );

      case 'shadow_ninja':
        return (
          <>
            <rect x="26" y="114" width="108" height="46" rx="18" fill="#18181b" />
            <path d="M42 118 L118 156 M118 118 L42 156" stroke="#991b1b" strokeWidth="5" opacity="0.7" />
            {/* Stealth black hood */}
            <rect x="40" y="34" width="80" height="84" rx="22" fill="#18181b" stroke="#3f3f46" strokeWidth="2.5" />
            {/* Red headband & trailing ribbon */}
            <rect x="38" y="54" width="84" height="11" rx="4" fill="#dc2626" />
            <path d="M118 58 L142 48 L138 62 L146 72 L118 65 Z" fill="#b91c1c" />
            {/* Eye slit */}
            <rect x="48" y="68" width="64" height="20" rx="8" fill="#09090b" />
            {/* Glowing crimson ninja eyes */}
            <polygon points="56,74 74,78 58,83" fill="#f43f5e" />
            <polygon points="104,74 86,78 102,83" fill="#f43f5e" />
            {/* Face wrap lines */}
            <path d="M46 98 Q80 108 114 98" fill="none" stroke="#27272a" strokeWidth="4" />
          </>
        );

      case 'tribal_island_chief':
        return (
          <>
            {/* Tribal cape & necklace */}
            <rect x="26" y="114" width="108" height="46" rx="18" fill="#7c2d12" />
            <path d="M46 118 Q80 142 114 118" fill="none" stroke="#facc15" strokeWidth="5" strokeDasharray="6 6" />
            {/* Feathered war headdress */}
            <ellipse cx="42" cy="48" rx="9" ry="26" transform="rotate(-32 42 48)" fill="#ef4444" />
            <ellipse cx="58" cy="34" rx="9" ry="26" transform="rotate(-14 58 34)" fill="#facc15" />
            <ellipse cx="80" cy="28" rx="10" ry="28" fill="#22c55e" />
            <ellipse cx="102" cy="34" rx="9" ry="26" transform="rotate(14 102 34)" fill="#f97316" />
            <ellipse cx="118" cy="48" rx="9" ry="26" transform="rotate(32 118 48)" fill="#38bdf8" />
            {/* Head */}
            <rect x="44" y="48" width="72" height="68" rx="16" fill="#9a5b32" />
            {/* Tribal headband */}
            <rect x="42" y="54" width="76" height="12" rx="4" fill="#fbbf24" />
            <path d="M48 60 L58 55 L68 65 L78 55 L88 65 L98 55 L110 60" fill="none" stroke="#7c2d12" strokeWidth="3" />
            {/* Eyes & war face paint */}
            <rect x="54" y="74" width="16" height="8" rx="4" fill="#fffbeb" />
            <circle cx="62" cy="78" r="3" fill="#1c1917" />
            <rect x="90" y="74" width="16" height="8" rx="4" fill="#fffbeb" />
            <circle cx="98" cy="78" r="3" fill="#1c1917" />
            <line x1="48" y1="88" x2="64" y2="92" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <line x1="112" y1="88" x2="96" y2="92" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
            <line x1="50" y1="96" x2="64" y2="99" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
            <line x1="110" y1="96" x2="96" y2="99" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
            <rect x="68" y="102" width="24" height="5" rx="2.5" fill="#431407" />
          </>
        );

      case 'swat_police_captain':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#1e3a8a" />
            <rect x="52" y="114" width="56" height="46" fill="#0f172a" />
            {/* Gold police shield badge */}
            <polygon points="104,122 116,126 114,140 104,146 94,140 92,126" fill="#facc15" stroke="#fef08a" strokeWidth="1.5" />
            {/* Face & Navy Tactical Helmet */}
            <rect x="44" y="48" width="72" height="68" rx="14" fill="#e2b490" />
            <path d="M36 68 C36 28, 124 28, 124 68 L120 74 L40 74 Z" fill="#172554" stroke="#60a5fa" strokeWidth="2" />
            {/* Helmet police badge */}
            <polygon points="80,36 88,41 86,52 80,56 74,52 72,41" fill="#fbbf24" />
            {/* Tinted tactical shield visor */}
            <rect x="44" y="68" width="72" height="22" rx="6" fill="#0f172a" stroke="#60a5fa" strokeWidth="2.5" />
            <rect x="50" y="73" width="60" height="7" rx="3" fill="#3b82f6" opacity="0.65" />
            {/* Tactical mic & balaclava */}
            <rect x="46" y="92" width="68" height="24" rx="8" fill="#1e293b" />
            <path d="M40 88 Q44 104 68 104" fill="none" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="70" cy="104" r="4" fill="#38bdf8" />
          </>
        );

      case 'special_forces_sniper':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#166534" />
            {/* Ghillie leaf hood */}
            <path d="M32 108 C28 32, 132 32, 128 108 Z" fill="#14532d" />
            <circle cx="42" cy="52" r="10" fill="#3f6212" />
            <circle cx="118" cy="52" r="10" fill="#3f6212" />
            <circle cx="80" cy="34" r="11" fill="#4d7c0f" />
            <circle cx="58" cy="40" r="9" fill="#15803d" />
            <circle cx="102" cy="40" r="9" fill="#15803d" />
            {/* Masked face */}
            <rect x="48" y="54" width="64" height="60" rx="14" fill="#1f2937" />
            {/* Left tactical eye */}
            <rect x="54" y="72" width="18" height="10" rx="4" fill="#d6a57c" />
            <circle cx="63" cy="77" r="3" fill="#0f172a" />
            {/* Right glowing rangefinder scope monocle */}
            <circle cx="96" cy="77" r="13" fill="#052e16" stroke="#84cc16" strokeWidth="3" />
            <circle cx="96" cy="77" r="6" fill="#a3e635" />
            <line x1="86" y1="77" x2="106" y2="77" stroke="#052e16" strokeWidth="1.5" />
            <line x1="96" y1="67" x2="96" y2="87" stroke="#052e16" strokeWidth="1.5" />
            {/* Camo scarf */}
            <rect x="46" y="94" width="68" height="22" rx="8" fill="#365314" />
          </>
        );

      case 'sky_eagle_rider':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#78350f" />
            <path d="M46 114 Q80 132 114 114" fill="#fef3c7" />
            {/* Golden Winged Crest */}
            <path d="M40 54 L16 34 L28 60 L18 72 L44 68 Z" fill="#fbbf24" />
            <path d="M120 54 L144 34 L132 60 L142 72 L116 68 Z" fill="#fbbf24" />
            {/* Aviator cap & face */}
            <rect x="44" y="44" width="72" height="72" rx="18" fill="#eab696" />
            <path d="M40 66 C40 30, 120 30, 120 66 Z" fill="#451a03" />
            {/* Aviator Goggles */}
            <rect x="42" y="64" width="76" height="22" rx="10" fill="#1e293b" />
            <circle cx="62" cy="75" r="12" fill="#38bdf8" stroke="#f59e0b" strokeWidth="3.5" />
            <circle cx="98" cy="75" r="12" fill="#38bdf8" stroke="#f59e0b" strokeWidth="3.5" />
            <path d="M56 71 L64 71" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M92 71 L100 71" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M68 100 Q80 107 92 100" fill="none" stroke="#7c2d12" strokeWidth="3.5" strokeLinecap="round" />
          </>
        );

      case 'deep_sea_diver':
        return (
          <>
            {/* Ocean blue diving suit */}
            <rect x="24" y="116" width="112" height="44" rx="18" fill="#0284c7" />
            <rect x="44" y="110" width="72" height="14" rx="6" fill="#f59e0b" stroke="#fde047" strokeWidth="2" />
            {/* Bubbles */}
            <circle cx="28" cy="40" r="6" fill="#67e8f9" opacity="0.55" />
            <circle cx="132" cy="36" r="8" fill="#67e8f9" opacity="0.45" />
            <circle cx="126" cy="58" r="4" fill="#a5f3fc" opacity="0.6" />
            {/* Glass Diving Dome */}
            <circle cx="80" cy="74" r="40" fill="#083344" stroke="#67e8f9" strokeWidth="4" />
            {/* Inner face inside dome */}
            <rect x="54" y="54" width="52" height="44" rx="12" fill="#d6a57c" />
            <rect x="56" y="64" width="48" height="16" rx="6" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="2" />
            <circle cx="69" cy="72" r="3.5" fill="#0f172a" />
            <circle cx="91" cy="72" r="3.5" fill="#0f172a" />
            {/* Glass reflection arc */}
            <path d="M52 50 A 30 30 0 0 1 94 42" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
          </>
        );

      case 'volcano_dragon_knight':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#292524" />
            <path d="M44 116 L80 148 L116 116" fill="none" stroke="#f97316" strokeWidth="4" />
            {/* Dragon horns */}
            <path d="M44 54 L22 22 L56 40 Z" fill="#f97316" />
            <path d="M116 54 L138 22 L104 40 Z" fill="#f97316" />
            {/* Flame-forged obsidian helmet */}
            <polygon points="44,44 80,32 116,44 118,104 80,120 42,104" fill="#1c1917" stroke="#ef4444" strokeWidth="2.5" />
            {/* Lava glowing T-visor */}
            <path d="M52 68 L108 68 L102 82 L86 82 L86 106 L74 106 L74 82 L58 82 Z" fill="#f97316" />
            <path d="M56 72 L104 72 L100 78 L83 78 L83 102 L77 102 L77 78 L60 78 Z" fill="#fef08a" />
          </>
        );

      case 'arctic_wolf':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#e2e8f0" />
            <rect x="48" y="122" width="24" height="14" rx="4" fill="#94a3b8" opacity="0.55" />
            <rect x="92" y="132" width="20" height="12" rx="4" fill="#94a3b8" opacity="0.55" />
            {/* Snow-camo wolf ears & hood */}
            <polygon points="40,56 46,24 68,46" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
            <polygon points="120,56 114,24 92,46" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
            <rect x="38" y="42" width="84" height="76" rx="22" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2.5" />
            {/* Inner winter mask */}
            <rect x="48" y="64" width="64" height="44" rx="12" fill="#1e293b" />
            {/* Frost-blue wolf eyes */}
            <polygon points="56,74 74,77 58,83" fill="#38bdf8" />
            <polygon points="104,74 86,77 102,83" fill="#38bdf8" />
            {/* White frost scarf */}
            <rect x="44" y="94" width="72" height="22" rx="10" fill="#e2e8f0" />
          </>
        );

      case 'tank_commander':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#365314" />
            <rect x="64" y="114" width="32" height="46" fill="#1a2e05" />
            {/* Face */}
            <rect x="46" y="48" width="68" height="68" rx="14" fill="#d6a57c" />
            {/* Armored Tanker Beret */}
            <path d="M36 58 C38 30, 114 26, 126 52 L114 64 L40 62 Z" fill="#1f2937" stroke="#a3e635" strokeWidth="2" />
            <circle cx="62" cy="48" r="5" fill="#eab308" />
            {/* Heavy Tanker Headset */}
            <rect x="34" y="64" width="13" height="30" rx="6" fill="#334155" stroke="#a3e635" strokeWidth="2" />
            <rect x="113" y="64" width="13" height="30" rx="6" fill="#334155" stroke="#a3e635" strokeWidth="2" />
            {/* Sunglasses & mic */}
            <rect x="52" y="70" width="24" height="14" rx="4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            <rect x="84" y="70" width="24" height="14" rx="4" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
            <line x1="76" y1="76" x2="84" y2="76" stroke="#cbd5e1" strokeWidth="2.5" />
            <path d="M40 88 Q48 104 72 102" fill="none" stroke="#94a3b8" strokeWidth="3.5" />
            <circle cx="74" cy="102" r="4" fill="#1e293b" />
          </>
        );

      case 'pirate_admiral':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#7f1d1d" />
            <rect x="68" y="114" width="24" height="46" fill="#fef3c7" />
            <circle cx="56" cy="130" r="4" fill="#facc15" />
            <circle cx="104" cy="130" r="4" fill="#facc15" />
            {/* Face & beard */}
            <rect x="46" y="54" width="68" height="62" rx="14" fill="#d6a57c" />
            <path d="M48 92 Q80 124 112 92 L112 108 Q80 128 48 108 Z" fill="#292524" />
            {/* Captain Tricorn Hat */}
            <path d="M24 58 Q80 18 136 58 L122 66 L38 66 Z" fill="#18181b" stroke="#facc15" strokeWidth="3" />
            <circle cx="80" cy="46" r="7" fill="#f8fafc" />
            <circle cx="77" cy="45" r="1.8" fill="#18181b" />
            <circle cx="83" cy="45" r="1.8" fill="#18181b" />
            {/* Eyepatch & sharp eye */}
            <line x1="48" y1="68" x2="112" y2="86" stroke="#18181b" strokeWidth="3.5" />
            <circle cx="96" cy="79" r="10" fill="#09090b" stroke="#facc15" strokeWidth="2" />
            <circle cx="64" cy="78" r="4.5" fill="#18181b" />
            <path d="M68 100 Q80 106 92 98" fill="none" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" />
          </>
        );

      case 'medic_specialist':
        return (
          <>
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#f8fafc" />
            <rect x="74" y="122" width="12" height="28" rx="2" fill="#ef4444" />
            <rect x="66" y="130" width="28" height="12" rx="2" fill="#ef4444" />
            {/* Face */}
            <rect x="44" y="48" width="72" height="68" rx="14" fill="#e2b490" />
            {/* White/Red Rescue Helmet */}
            <path d="M36 68 C36 28, 124 28, 124 68 L120 74 L40 74 Z" fill="#f8fafc" stroke="#ef4444" strokeWidth="2.5" />
            {/* Red medical cross on helmet */}
            <rect x="75" y="38" width="10" height="24" rx="2" fill="#ef4444" />
            <rect x="68" y="45" width="24" height="10" rx="2" fill="#ef4444" />
            {/* Clear rescue goggles */}
            <rect x="48" y="70" width="64" height="18" rx="7" fill="#e0f2fe" stroke="#ef4444" strokeWidth="2" />
            <circle cx="65" cy="79" r="3.5" fill="#0f172a" />
            <circle cx="95" cy="79" r="3.5" fill="#0f172a" />
            {/* Rescue mask */}
            <rect x="52" y="94" width="56" height="20" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          </>
        );

      case 'hazmat_bio_trooper':
        return (
          <>
            {/* Yellow hazmat suit */}
            <rect x="24" y="114" width="112" height="46" rx="18" fill="#eab308" />
            <rect x="46" y="114" width="68" height="12" fill="#18181b" />
            {/* Yellow sealed hood */}
            <rect x="38" y="34" width="84" height="84" rx="24" fill="#facc15" stroke="#a16207" strokeWidth="3" />
            {/* Dark panoramic gas-mask lens */}
            <rect x="48" y="54" width="64" height="32" rx="10" fill="#09090b" stroke="#fde047" strokeWidth="2.5" />
            <path d="M54 62 L78 62" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
            {/* Dual radiation filters */}
            <circle cx="60" cy="100" r="11" fill="#27272a" stroke="#facc15" strokeWidth="2.5" />
            <circle cx="100" cy="100" r="11" fill="#27272a" stroke="#facc15" strokeWidth="2.5" />
            <rect x="72" y="92" width="16" height="16" rx="4" fill="#18181b" />
            <circle cx="60" cy="100" r="4" fill="#fde047" />
            <circle cx="100" cy="100" r="4" fill="#fde047" />
          </>
        );

      case 'mech_robot_unit_01':
      default:
        return (
          <>
            {/* Metallic android chassis */}
            <rect x="24" y="114" width="112" height="46" rx="16" fill="#64748b" />
            <rect x="54" y="122" width="52" height="24" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="80" cy="134" r="6" fill="#38bdf8" />
            {/* Antenna */}
            <line x1="80" y1="18" x2="80" y2="38" stroke="#94a3b8" strokeWidth="4" />
            <circle cx="80" cy="16" r="5" fill="#38bdf8" />
            {/* Silver android head */}
            <rect x="40" y="38" width="80" height="78" rx="14" fill="#cbd5e1" stroke="#475569" strokeWidth="3" />
            <rect x="48" y="46" width="64" height="12" rx="4" fill="#94a3b8" />
            {/* Digital optic screen */}
            <rect x="48" y="64" width="64" height="24" rx="6" fill="#020617" stroke="#38bdf8" strokeWidth="2.5" />
            <circle cx="66" cy="76" r="6" fill="#38bdf8" />
            <circle cx="94" cy="76" r="6" fill="#38bdf8" />
            {/* Speaker grille */}
            <rect x="58" y="96" width="44" height="12" rx="4" fill="#334155" />
            <line x1="66" y1="98" x2="66" y2="106" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="75" y1="98" x2="75" y2="106" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="85" y1="98" x2="85" y2="106" stroke="#94a3b8" strokeWidth="2.5" />
            <line x1="94" y1="98" x2="94" y2="106" stroke="#94a3b8" strokeWidth="2.5" />
          </>
        );
    }
  };

  return (
    <svg viewBox="0 0 160 160" className="h-full w-full select-none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={preset.bgFrom} />
          <stop offset="100%" stopColor={preset.bgTo} />
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill={`url(#${gradId})`} />
      {/* Subtle tactical radial highlight */}
      <circle cx="80" cy="54" r="56" fill={preset.ringColor} opacity="0.14" />
      {renderCharacter()}
    </svg>
  );
};

/* -------------------------------------------------------------------------- */
/* Universal Reusable PlayerAvatar Component (Photo OR 16 Warrior Presets)    */
/* -------------------------------------------------------------------------- */
export const PlayerAvatar: React.FC<{
  avatarUrl?: string;
  avatarIcon?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded';
  className?: string;
}> = ({
  avatarUrl,
  avatarIcon,
  alt = 'Player Avatar',
  size = 'md',
  shape = 'circle',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const sizeClass =
    size === 'xs'
      ? 'h-5 w-5'
      : size === 'sm'
        ? 'h-8 w-8'
        : size === 'lg'
          ? 'h-14 w-14'
          : size === 'xl'
            ? 'h-24 w-24'
            : 'h-10 w-10';
  const radiusClass =
    shape === 'circle'
      ? 'rounded-full'
      : size === 'xs'
        ? 'rounded-md'
        : size === 'lg' || size === 'xl'
          ? 'rounded-2xl'
          : 'rounded-xl';

  const hasPhoto = isCustomPhotoUrl(avatarUrl) && !imgFailed;
  const presetId = resolvePresetId(
    avatarUrl && avatarUrl.startsWith('preset:') ? avatarUrl : avatarIcon
  );
  const preset = getAvatarPreset(presetId);

  return (
    <div
      className={`relative shrink-0 overflow-hidden border border-white/20 bg-slate-900 shadow-md ${sizeClass} ${radiusClass} ${className}`}
      style={{
        boxShadow: hasPhoto ? undefined : `0 0 0 1px ${preset.ringColor}40`,
      }}
    >
      {hasPhoto ? (
        <img
          src={avatarUrl}
          alt={alt}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <WarriorPresetArt presetId={preset.id} />
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Upgraded Custom Profile Photo & 16 Warrior Avatar Presets Modal            */
/* -------------------------------------------------------------------------- */
interface ProfilePhotoModalProps {
  open: boolean;
  currentAvatarUrl?: string;
  currentAvatarIcon?: string;
  playerName: string;
  busy?: boolean;
  onSave: (payload: { avatarUrl: string; avatarIcon: string }) => Promise<void> | void;
  onClose: () => void;
}

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  open,
  currentAvatarUrl,
  currentAvatarIcon,
  playerName,
  busy = false,
  onSave,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftUrl, setDraftUrl] = useState<string>('');
  const [draftIcon, setDraftIcon] = useState<string>(DEFAULT_AVATAR_PRESET_ID);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoInfo, setPhotoInfo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initialIcon = resolvePresetId(
      currentAvatarUrl && currentAvatarUrl.startsWith('preset:')
        ? currentAvatarUrl
        : currentAvatarIcon
    );
    const initialUrl = isCustomPhotoUrl(currentAvatarUrl)
      ? currentAvatarUrl!
      : presetIdToAvatarUrl(initialIcon);
    setDraftUrl(initialUrl);
    setDraftIcon(initialIcon);
    setError(null);
    if (isCustomPhotoUrl(initialUrl)) {
      const kb = Math.max(1, Math.round((estimateDataUrlBytes(initialUrl) / 1024) * 10) / 10);
      setPhotoInfo(`Custom Photo · 160×160 JPEG (${kb} KB)`);
    } else {
      setPhotoInfo(null);
    }
  }, [open, currentAvatarUrl, currentAvatarIcon]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isCustomSelected = isCustomPhotoUrl(draftUrl);
  const selectedPreset = getAvatarPreset(draftIcon);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const { dataUrl, sizeKb } = await processAvatarImageFile(file);
      setDraftUrl(dataUrl);
      setPhotoInfo(`Custom Photo Ready · 160×160 JPEG (${sizeKb} KB)`);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Please select a valid photo file.'
      );
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setError(null);
    setPhotoInfo(null);
    setDraftIcon(presetId);
    setDraftUrl(presetIdToAvatarUrl(presetId));
  };

  const handleResetAvatar = () => {
    setError(null);
    setPhotoInfo(null);
    setDraftIcon(DEFAULT_AVATAR_PRESET_ID);
    setDraftUrl(presetIdToAvatarUrl(DEFAULT_AVATAR_PRESET_ID));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-cyan-400/35 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                CUSTOM PROFILE PHOTO &amp; AVATAR PICKER
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Customize Fighter Avatar
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Live Circular Preview + Universal Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className={`flex flex-col sm:flex-row items-center gap-4 rounded-2xl border p-4 transition ${
              dragOver
                ? 'border-cyan-400 bg-cyan-500/15'
                : 'border-white/10 bg-slate-950/75'
            }`}
          >
            {/* Live Circular Preview */}
            <div className="relative shrink-0">
              <div className="rounded-full p-1 bg-gradient-to-br from-cyan-400 via-blue-500 to-emerald-400 shadow-lg shadow-cyan-500/25">
                <PlayerAvatar
                  avatarUrl={draftUrl}
                  avatarIcon={draftIcon}
                  alt={playerName}
                  size="xl"
                  shape="circle"
                  className="border-2 border-slate-950"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-950 bg-cyan-400 text-slate-950 shadow-lg transition hover:bg-cyan-300"
                title="Upload Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Preview Meta & Upload CTA */}
            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-sm font-black text-white truncate">{playerName}</span>
                  {isCustomSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> CUSTOM PHOTO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-black text-cyan-300">
                      <Sparkles className="h-3 w-3" /> {selectedPreset.name}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {isCustomSelected
                    ? photoInfo || 'Auto center-cropped to 160×160 JPEG (< 35 KB).'
                    : selectedPreset.subtitle}
                </p>
              </div>

              {/* Hidden Universal File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-950 shadow-md transition hover:brightness-110 disabled:opacity-50"
                >
                  {processing ? (
                    <Upload className="h-4 w-4 animate-bounce" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span>{processing ? 'Converting Photo...' : 'UPLOAD MY OWN PHOTO'}</span>
                </button>
                <span className="text-[10px] font-semibold text-slate-500">
                  JPG, PNG, WEBP, GIF, BMP, HEIC or Camera · Up to 15 MB
                </span>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* 16 Built-In Warrior & Action Avatar Presets Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                16 Built-In Warrior &amp; Action Avatars
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                Tap any fighter to preview
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {AVATAR_PRESETS.map((preset) => {
                const isActive = !isCustomSelected && draftIcon === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`group relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
                      isActive
                        ? 'border-cyan-400 bg-cyan-500/15 shadow-lg shadow-cyan-500/15'
                        : 'border-white/10 bg-slate-950/65 hover:border-white/25 hover:bg-slate-800/70'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                    <PlayerAvatar
                      avatarIcon={preset.id}
                      alt={preset.name}
                      size="lg"
                      shape="circle"
                      className={isActive ? 'ring-2 ring-cyan-400' : 'group-hover:scale-105 transition'}
                    />
                    <div className="min-w-0 w-full">
                      <div className="truncate text-[11px] font-black text-white">
                        {preset.name}
                      </div>
                      <div className="line-clamp-1 text-[9px] text-slate-400">
                        {preset.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/10 bg-slate-950/90 px-5 py-3.5">
          <button
            type="button"
            disabled={busy || processing}
            onClick={handleResetAvatar}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-800 px-4 py-2.5 text-xs font-bold uppercase text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> RESET AVATAR
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || processing}
              onClick={() =>
                onSave({
                  avatarUrl: draftUrl || presetIdToAvatarUrl(draftIcon),
                  avatarIcon: draftIcon,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg transition hover:brightness-110 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{busy ? 'Saving...' : 'SAVE PROFILE PHOTO'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
