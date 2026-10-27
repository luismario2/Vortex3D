/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Activity,
  Crosshair as CrosshairIcon,
  RotateCcw,
  Home,
  Play,
  Skull,
  Award,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import { GameEngine, PlayerStats, FloatingText } from '../game/gameEngine';
import { WeaponId, WEAPON_REGISTRY } from '../game/weaponModels';
import { soundManager } from '../game/audio';

interface HUDProps {
  engine: GameEngine;
  stats: PlayerStats;
  onReturnToLobby: () => void;
  onRestart: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  engine,
  stats,
  onReturnToLobby,
  onRestart,
}) => {
  // Visual Hit-Marker Feedback State
  const [activeHitmarker, setActiveHitmarker] = useState<{
    id: number;
    isHeadshot: boolean;
    isKill: boolean;
    damage: number;
    time: number;
  } | null>(null);
  const [reticlePopups, setReticlePopups] = useState<Array<{
    id: number;
    text: string;
    isHeadshot: boolean;
    isKill: boolean;
    offsetX: number;
    offsetY: number;
  }>>([]);
  const [screenHitVignette, setScreenHitVignette] = useState<'normal' | 'crit' | null>(null);
  const hitTimeoutRef = useRef<number | null>(null);
  const vignetteTimeoutRef = useRef<number | null>(null);
  const nextHitIdRef = useRef(1);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Mobile Action States
  const [isFiring, setIsFiring] = useState(false);
  const [isADS, setIsADS] = useState(false);
  const [isCrouched, setIsCrouched] = useState(false);

  // 1. Virtual Joystick State for Character Movement
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState({ x: 90, y: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const JOYSTICK_MAX_RADIUS = 50;

  // 2. Touch-Drag Area State for Camera Panning
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef({ x: 0, y: 0 });
  const isMouseDraggingLookRef = useRef(false);

  useEffect(() => {
    // Engine callback for ADS synchronization
    engine.onADSChange = (ads) => {
      setIsADS(ads);
    };

    // Engine callback for visual hit feedback on successful enemy/target hits
    engine.onHitFeedback = (isHeadshot, damage, isKill) => {
      const hitId = nextHitIdRef.current++;
      const now = Date.now();

      // 1. Activate Visual 4-Tick Tactical Hitmarker
      setActiveHitmarker({
        id: hitId,
        isHeadshot,
        isKill,
        damage,
        time: now,
      });

      if (hitTimeoutRef.current) {
        clearTimeout(hitTimeoutRef.current);
      }
      hitTimeoutRef.current = window.setTimeout(() => {
        setActiveHitmarker(null);
      }, isKill ? 280 : isHeadshot ? 230 : 170);

      // 2. Reticle Damage Floating Tag
      const newPopup = {
        id: hitId,
        text: isKill ? `KILL +${damage}` : isHeadshot ? `CRIT ${damage}` : `${damage}`,
        isHeadshot,
        isKill,
        offsetX: 24 + (Math.random() - 0.5) * 12,
        offsetY: -16 + (Math.random() - 0.5) * 14,
      };

      setReticlePopups(prev => [...prev.slice(-3), newPopup]);
      setTimeout(() => {
        setReticlePopups(prev => prev.filter(p => p.id !== hitId));
      }, 550);

      // 3. Screen Border Vignette Feedback Flash
      setScreenHitVignette(isHeadshot || isKill ? 'crit' : 'normal');
      if (vignetteTimeoutRef.current) {
        clearTimeout(vignetteTimeoutRef.current);
      }
      vignetteTimeoutRef.current = window.setTimeout(() => {
        setScreenHitVignette(null);
      }, 120);
    };

    const interval = setInterval(() => {
      if (engine.floatingTexts && engine.floatingTexts.length > 0) {
        setFloatingTexts([...engine.floatingTexts]);
      } else {
        setFloatingTexts([]);
      }
    }, 40);

    return () => {
      clearInterval(interval);
      if (hitTimeoutRef.current) clearTimeout(hitTimeoutRef.current);
      if (vignetteTimeoutRef.current) clearTimeout(vignetteTimeoutRef.current);
    };
  }, [engine]);

  const activeWeapon = WEAPON_REGISTRY[engine.currentWeaponId];
  const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));
  const isLowHealth = stats.health < 30;

  // ==========================================
  // VIRTUAL JOYSTICK LOGIC (CHARACTER MOVEMENT)
  // ==========================================
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;

    // Use current center or touch origin
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    const originX = rect ? rect.left + rect.width / 2 : touch.clientX;
    const originY = rect ? rect.top + rect.height / 2 : touch.clientY;

    setJoystickOrigin({ x: originX, y: originY });
    setJoystickActive(true);
    updateJoystickPosition(touch.clientX, touch.clientY, originX, originY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        updateJoystickPosition(touch.clientX, touch.clientY, joystickOrigin.x, joystickOrigin.y);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setKnobOffset({ x: 0, y: 0 });
        engine.moveInput.set(0, 0);
        engine.isMobileRunning = false;
        break;
      }
    }
  };

  const updateJoystickPosition = (clientX: number, clientY: number, originX: number, originY: number) => {
    const dx = clientX - originX;
    const dy = clientY - originY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let clampedX = dx;
    let clampedY = dy;
    if (dist > JOYSTICK_MAX_RADIUS) {
      clampedX = (dx / dist) * JOYSTICK_MAX_RADIUS;
      clampedY = (dy / dist) * JOYSTICK_MAX_RADIUS;
    }

    setKnobOffset({ x: clampedX, y: clampedY });

    // Normalize input between -1 and 1
    const normX = clampedX / JOYSTICK_MAX_RADIUS;
    const normY = clampedY / JOYSTICK_MAX_RADIUS;

    // Forward to 3D engine physics
    engine.moveInput.set(normX, -normY);
    engine.isMobileRunning = dist > JOYSTICK_MAX_RADIUS * 0.78;
  };

  // Joystick Mouse Support (for desktop testing/hybrid use)
  const handleJoystickMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = joystickBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    setJoystickOrigin({ x: originX, y: originY });
    setJoystickActive(true);

    const onMouseMove = (ev: MouseEvent) => {
      updateJoystickPosition(ev.clientX, ev.clientY, originX, originY);
    };

    const onMouseUp = () => {
      setJoystickActive(false);
      setKnobOffset({ x: 0, y: 0 });
      engine.moveInput.set(0, 0);
      engine.isMobileRunning = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ==========================================
  // TOUCH-DRAG AREA FOR CAMERA PANNING (LOOK)
  // ==========================================
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current !== null) return;
    // Don't intercept if touching on interactive buttons
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive]')) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Make sure this touch is not the joystick touch
      if (touch.identifier !== joystickTouchIdRef.current) {
        lookTouchIdRef.current = touch.identifier;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        break;
      }
    }
  };

  const handleLookTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sens = 0.0052 * engine.settings.mouseSensitivity;
        const invert = engine.settings.invertY ? -1 : 1;
        engine.rotateLook(-dx * sens, -dy * sens * invert);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  // Mouse Drag Fallback for Camera Panning
  const handleLookMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive]')) return;

    isMouseDraggingLookRef.current = true;
    lastLookPosRef.current = { x: e.clientX, y: e.clientY };

    const onMouseMove = (ev: MouseEvent) => {
      if (!isMouseDraggingLookRef.current) return;
      const dx = ev.clientX - lastLookPosRef.current.x;
      const dy = ev.clientY - lastLookPosRef.current.y;
      lastLookPosRef.current = { x: ev.clientX, y: ev.clientY };

      const sens = 0.0035 * engine.settings.mouseSensitivity;
      const invert = engine.settings.invertY ? -1 : 1;
      engine.rotateLook(-dx * sens, -dy * sens * invert);
    };

    const onMouseUp = () => {
      isMouseDraggingLookRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Action Button Triggers
  const handleFireStart = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsFiring(true);
    engine.setFiring(true);
  };

  const handleFireEnd = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setIsFiring(false);
    engine.setFiring(false);
  };

  const handleJump = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    engine.triggerJump();
  };

  const handleToggleADS = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    const next = engine.toggleADS();
    setIsADS(next);
  };

  const handleToggleCrouch = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    const next = engine.toggleCrouch();
    setIsCrouched(next);
  };

  const handleReload = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    engine.startReload();
  };

  const handleSwitchWeapon = (id: WeaponId, e: React.SyntheticEvent) => {
    e.stopPropagation();
    engine.switchWeapon(id);
  };

  // Render Crosshair
  // Render Crosshair & Precision ADS Optical Sights
  const renderCrosshair = () => {
    // 1. High-Magnification Sniper Scope for Thor-Rail
    if (isADS && engine.currentWeaponId === 'thor_rail') {
      return (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-10 animate-in fade-in duration-100">
          {/* Black Vignette Scope Body with circular glass lens opening */}
          <div className="absolute inset-0 bg-black/92 [mask-image:radial-gradient(circle_at_center,transparent_38%,black_44%)]" />

          {/* Optical Scope Bezel */}
          <div className="w-[72vmin] h-[72vmin] rounded-full border-2 border-cyan-400/60 shadow-[0_0_60px_rgba(6,182,212,0.45)] relative flex items-center justify-center overflow-hidden">
            {/* Subtle blue/cyan glass tint */}
            <div className="absolute inset-0 bg-cyan-500/5 rounded-full" />

            {/* Scope Full Crosshairs */}
            <div className="absolute w-full h-[1.5px] bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <div className="absolute h-full w-[1.5px] bg-cyan-400/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />

            {/* Mil-dot Elevation and Windage Ticks */}
            {[-120, -80, -40, 40, 80, 120].map(offset => (
              <React.Fragment key={offset}>
                <div
                  className="absolute w-3 h-[1px] bg-cyan-300/90"
                  style={{ transform: `translateY(${offset}px)` }}
                />
                <div
                  className="absolute h-3 w-[1px] bg-cyan-300/90"
                  style={{ transform: `translateX(${offset}px)` }}
                />
              </React.Fragment>
            ))}

            {/* Center Precision Target Dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse" />

            {/* Tactical Scope Telemetry */}
            <div className="absolute top-6 text-[10px] font-mono font-black text-cyan-400 tracking-widest uppercase bg-zinc-950/70 px-3 py-1 rounded border border-cyan-500/40">
              THOR-RAIL // 8.0X MAGNIFICACIÓN
            </div>
            <div className="absolute bottom-6 flex items-center gap-5 text-[10px] font-mono text-cyan-300/85 font-bold bg-zinc-950/70 px-3 py-1 rounded border border-cyan-500/40">
              <span>ELEV: 0.0</span>
              <span className="text-rose-400 font-black">PRECISIÓN: 100%</span>
              <span>ESTADO: FIJADO</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. Precision Holographic Reflex Sight for Rifles & Pistols during ADS
    if (isADS) {
      return (
        <div className="relative flex items-center justify-center animate-in zoom-in-90 duration-75">
          {/* Peripheral depth-of-field focus vignette */}
          <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_25%,rgba(0,0,0,0.55)_85%)]" />

          {/* Central Precision Illuminated Reticle */}
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] z-10" />

          {/* Concentric Reflex Ring with Compass Notches */}
          <div className="absolute w-10 h-10 rounded-full border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.7)] flex items-center justify-center">
            <div className="absolute -top-1 w-1 h-2 bg-cyan-300" />
            <div className="absolute -bottom-1 w-1 h-2 bg-cyan-300" />
            <div className="absolute -left-1 h-1 w-2 bg-cyan-300" />
            <div className="absolute -right-1 h-1 w-2 bg-cyan-300" />
          </div>

          {/* Outer Aim Brackets */}
          <div className="absolute w-16 h-16 border border-dashed border-cyan-400/40 rounded-full" />
        </div>
      );
    }

    // 3. Hipfire Crosshairs
    const style = engine.settings.crosshairStyle;
    const color = engine.settings.crosshairColor;

    if (style === 'dot') {
      return (
        <div
          className="w-2.5 h-2.5 rounded-full shadow-sm"
          style={{ backgroundColor: color }}
        />
      );
    }

    if (style === 'circle') {
      return (
        <div
          className="w-6 h-6 rounded-full border-2 border-dashed"
          style={{ borderColor: color }}
        />
      );
    }

    if (style === 'diamond') {
      return (
        <div
          className="w-3.5 h-3.5 rotate-45 border-2"
          style={{ borderColor: color }}
        />
      );
    }

    // Classic Tactical Cross
    return (
      <div className="relative w-7 h-7 flex items-center justify-center">
        <div className="absolute w-2 h-0.5 left-0" style={{ backgroundColor: color }} />
        <div className="absolute w-2 h-0.5 right-0" style={{ backgroundColor: color }} />
        <div className="absolute h-2 w-0.5 top-0" style={{ backgroundColor: color }} />
        <div className="absolute h-2 w-0.5 bottom-0" style={{ backgroundColor: color }} />
        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
      </div>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 touch-none">
      {/* 1. Low Health Red Damage Vignette */}
      {isLowHealth && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(239,68,68,0.45)_100%)] animate-pulse" />
      )}

      {/* 2. Visual Hit Border / Vignette Feedback Flash */}
      {screenHitVignette && (
        <div
          className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-150 ${
            screenHitVignette === 'crit'
              ? 'shadow-[inset_0_0_80px_rgba(239,68,68,0.5)]'
              : 'shadow-[inset_0_0_50px_rgba(6,182,212,0.35)]'
          }`}
        />
      )}

      {/* 3. Floating Damage / Score Texts in 3D Space */}
      {floatingTexts.map((f, idx) => (
        <div
          key={`ft_${f.id}_${idx}`}
          className="absolute font-black tracking-wider text-sm pointer-events-none transition-transform"
          style={{
            left: `${f.x}px`,
            top: `${f.y}px`,
            color: f.color,
            opacity: f.opacity,
            transform: `translate(-50%, -50%) scale(${f.isCrit ? 1.4 : 1.0})`,
            textShadow: '0 0 8px rgba(0,0,0,0.9), 0 0 15px currentColor',
          }}
        >
          {f.isCrit && '★ '}
          {f.text}
        </div>
      ))}

      {/* 4. Center Crosshair, Tactical 4-Tick Hitmarker & Kill Feedback */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {renderCrosshair()}

        {/* Dynamic Tactical 4-Tick Hitmarker Feedback */}
        {activeHitmarker && (
          <div
            key={`hm_${activeHitmarker.id}`}
            className="absolute pointer-events-none flex items-center justify-center animate-in zoom-in-75 duration-75"
          >
            {/* Impact Shockwave Ring */}
            <div
              className={`absolute rounded-full border pointer-events-none animate-ping ${
                activeHitmarker.isKill
                  ? 'w-16 h-16 border-rose-500 opacity-90'
                  : activeHitmarker.isHeadshot
                  ? 'w-14 h-14 border-red-400 opacity-80'
                  : 'w-11 h-11 border-cyan-300 opacity-70'
              }`}
            />

            {/* Tactical 4-Tick Angled Crosshairs (Hitmarker) */}
            <svg
              className={`transition-transform duration-75 ${
                activeHitmarker.isKill
                  ? 'w-14 h-14 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.95)]'
                  : activeHitmarker.isHeadshot
                  ? 'w-12 h-12 scale-105 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]'
                  : 'w-10 h-10 drop-shadow-[0_0_5px_rgba(56,189,248,0.9)]'
              }`}
              viewBox="0 0 60 60"
              fill="none"
            >
              {/* Top-Left Tick */}
              <line
                x1="18"
                y1="18"
                x2="25"
                y2="25"
                stroke={activeHitmarker.isKill ? '#f43f5e' : activeHitmarker.isHeadshot ? '#ef4444' : '#ffffff'}
                strokeWidth={activeHitmarker.isKill ? '3.5' : activeHitmarker.isHeadshot ? '3.0' : '2.5'}
                strokeLinecap="round"
              />
              {/* Top-Right Tick */}
              <line
                x1="42"
                y1="18"
                x2="35"
                y2="25"
                stroke={activeHitmarker.isKill ? '#f43f5e' : activeHitmarker.isHeadshot ? '#ef4444' : '#ffffff'}
                strokeWidth={activeHitmarker.isKill ? '3.5' : activeHitmarker.isHeadshot ? '3.0' : '2.5'}
                strokeLinecap="round"
              />
              {/* Bottom-Left Tick */}
              <line
                x1="18"
                y1="42"
                x2="25"
                y2="35"
                stroke={activeHitmarker.isKill ? '#f43f5e' : activeHitmarker.isHeadshot ? '#ef4444' : '#ffffff'}
                strokeWidth={activeHitmarker.isKill ? '3.5' : activeHitmarker.isHeadshot ? '3.0' : '2.5'}
                strokeLinecap="round"
              />
              {/* Bottom-Right Tick */}
              <line
                x1="42"
                y1="42"
                x2="35"
                y2="35"
                stroke={activeHitmarker.isKill ? '#f43f5e' : activeHitmarker.isHeadshot ? '#ef4444' : '#ffffff'}
                strokeWidth={activeHitmarker.isKill ? '3.5' : activeHitmarker.isHeadshot ? '3.0' : '2.5'}
                strokeLinecap="round"
              />

              {/* Extra Ring for Lethal Kill */}
              {activeHitmarker.isKill && (
                <circle
                  cx="30"
                  cy="30"
                  r="15"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  className="animate-spin"
                  style={{ animationDuration: '3s' }}
                />
              )}
            </svg>

            {/* Headshot Skull Icon in Center */}
            {activeHitmarker.isHeadshot && (
              <div className="absolute text-rose-500 animate-pulse pointer-events-none">
                <Skull className="w-5 h-5 drop-shadow-[0_0_8px_rgba(244,63,94,1)]" />
              </div>
            )}
          </div>
        )}

        {/* Reticle Floating Damage Numbers */}
        {reticlePopups.map(p => (
          <div
            key={`popup_${p.id}`}
            className={`absolute font-mono font-black pointer-events-none select-none transition-all duration-500 ease-out ${
              p.isKill
                ? 'text-sm text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,1)] scale-110'
                : p.isHeadshot
                ? 'text-xs text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,1)] scale-105'
                : 'text-xs text-cyan-200 drop-shadow-[0_0_5px_rgba(6,182,212,0.85)]'
            }`}
            style={{
              transform: `translate(${p.offsetX}px, ${p.offsetY}px)`,
              opacity: 0.95,
            }}
          >
            {p.text}
          </div>
        ))}

        {/* Kill Confirmation Banner below Reticle */}
        {activeHitmarker?.isKill && (
          <div className="absolute top-1/2 mt-12 flex items-center gap-1.5 px-3 py-1 bg-red-950/85 border border-red-500 text-red-200 rounded-md font-mono text-xs font-black tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.8)] uppercase animate-bounce pointer-events-none">
            <Skull className="w-3.5 h-3.5 text-red-400" />
            <span>BLANCO ELIMINADO</span>
          </div>
        )}
      </div>

      {/* 4. Touch-Drag Area for Camera Panning (Full Right & Center Area) */}
      <div
        className="absolute inset-0 pointer-events-auto z-0 touch-none select-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        onMouseDown={handleLookMouseDown}
      />

      {/* 5. Top Header & Mobile Gauge Status Clusters */}
      <div className="absolute top-4 inset-x-0 flex items-start justify-between px-4 sm:px-6 pointer-events-none z-20">
        {/* Top-Left: Health & Shield Gauges (PUBG/COD Mobile standard position) */}
        <div className="flex flex-col gap-1.5 w-48 sm:w-56 bg-zinc-950/85 border border-zinc-800/80 p-2.5 rounded-xl shadow-xl pointer-events-auto">
          {/* Shield */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-0.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Shield className="w-3 h-3" />
                ESCUDO
              </span>
              <span className="text-white tabular-nums">
                {stats.shield} <span className="text-zinc-500">/ {stats.maxShield}</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-200"
                style={{ width: `${shieldPercent}%` }}
              />
            </div>
          </div>

          {/* Health */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-0.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <Activity className="w-3 h-3" />
                SALUD
              </span>
              <span className="text-white tabular-nums">
                {stats.health} <span className="text-zinc-500">/ {stats.maxHealth}</span>
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-200 ${
                  isLowHealth ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Center: Wave & Score Readout */}
        <div className="flex flex-col items-center">
          <div className="bg-zinc-950/90 border border-zinc-800 px-4 py-1.5 rounded-lg flex items-center gap-3 shadow-xl">
            {engine.currentMode === 'firing_range' ? (
              <span className="text-xs font-black text-cyan-400 font-mono tracking-wider">
                CAMPO DE TIRO
              </span>
            ) : engine.currentMode === 'boss_titans' ? (
              <span className="text-xs font-black text-rose-500 font-mono tracking-wider animate-pulse">
                CIBER-TITÁN
              </span>
            ) : (
              <span className="text-xs font-black text-white font-mono tracking-wider">
                OLEADA <span className="text-cyan-400">{stats.wave}</span>/{stats.maxWave}
              </span>
            )}

            <div className="border-l border-zinc-800 pl-3 font-mono">
              <span className="text-sm font-black text-cyan-400 tabular-nums">
                {stats.score.toLocaleString()}
              </span>
            </div>

            {stats.combo > 1 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 font-mono font-bold text-[10px] rounded">
                x{stats.combo}
              </span>
            )}
          </div>
        </div>

        {/* Top-Right: Tactical Ammo & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Ammo badge */}
          <div className="bg-zinc-950/85 border border-zinc-800 px-3 py-1.5 rounded-lg font-mono flex items-center gap-2">
            <span
              className={`text-lg font-black tabular-nums leading-none ${
                stats.ammo <= 4 ? 'text-rose-500 animate-pulse' : 'text-cyan-400'
              }`}
            >
              {stats.ammo}
            </span>
            <span className="text-xs text-zinc-500 font-bold">/ {stats.reserveAmmo}</span>
          </div>

          <button
            data-interactive="true"
            onClick={() => engine.setState('paused')}
            className="px-3 py-2 bg-zinc-950/85 hover:bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-bold text-zinc-300 rounded-lg cursor-pointer"
          >
            PAUSA
          </button>
        </div>
      </div>

      {/* 6. Virtual Joystick (Bottom-Left) for Character Movement */}
      <div
        ref={joystickBaseRef}
        data-interactive="true"
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        onMouseDown={handleJoystickMouseDown}
        className="absolute bottom-8 left-8 w-36 h-36 rounded-full border-2 border-cyan-400/40 bg-zinc-950/40 backdrop-blur-none flex items-center justify-center pointer-events-auto z-20 touch-none shadow-[0_0_20px_rgba(6,182,212,0.25)] select-none cursor-pointer"
      >
        {/* Guide Rings and Cardinal Marks */}
        <div className="w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-cyan-500/30" />
        </div>
        <div className="absolute top-1 text-[9px] font-mono text-cyan-400/60 font-bold">▲</div>
        <div className="absolute bottom-1 text-[9px] font-mono text-cyan-400/60 font-bold">▼</div>
        <div className="absolute left-1 text-[9px] font-mono text-cyan-400/60 font-bold">◄</div>
        <div className="absolute right-1 text-[9px] font-mono text-cyan-400/60 font-bold">►</div>

        {/* Draggable Analog Knob */}
        <div
          className={`absolute w-14 h-14 rounded-full border-2 transition-transform duration-75 flex items-center justify-center ${
            joystickActive
              ? 'bg-gradient-to-tr from-cyan-500 to-sky-300 border-white shadow-[0_0_20px_rgba(6,182,212,0.9)] scale-105'
              : 'bg-zinc-900/80 border-cyan-400/60 shadow-md'
          }`}
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          }}
        >
          <div className={`w-3.5 h-3.5 rounded-full ${joystickActive ? 'bg-cyan-950' : 'bg-cyan-400'}`} />
        </div>
      </div>

      {/* 7. Ergonomic Mobile Action Buttons (Bottom-Right) */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2.5 pointer-events-none z-20">
        {/* Quick Weapon Switch Chips */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {(['viper_9', 'thor_rail', 'scatter_x', 'pulsar_7'] as WeaponId[]).map(wId => {
            const isSel = engine.currentWeaponId === wId;
            return (
              <button
                key={wId}
                data-interactive="true"
                onTouchStart={e => handleSwitchWeapon(wId, e)}
                onClick={e => handleSwitchWeapon(wId, e)}
                className={`px-2.5 py-1 rounded-md border font-mono font-black text-[10px] active:scale-95 transition-all cursor-pointer ${
                  isSel
                    ? 'border-cyan-400 bg-cyan-500/30 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'border-zinc-800 bg-zinc-950/70 text-zinc-400'
                }`}
              >
                {wId === 'viper_9' ? 'VIPER' : wId === 'thor_rail' ? 'THOR' : wId === 'scatter_x' ? 'SCAT' : 'PULS'}
              </button>
            );
          })}

          <button
            data-interactive="true"
            onTouchStart={handleReload}
            onClick={handleReload}
            className="w-10 h-10 rounded-full bg-zinc-900/85 border border-zinc-700 text-cyan-300 flex items-center justify-center active:scale-95 shadow-md cursor-pointer"
            title="Recargar arma"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Secondary Actions: Crouch, ADS / Zoom, Jump */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Crouch Toggle */}
          <button
            data-interactive="true"
            onTouchStart={handleToggleCrouch}
            onClick={handleToggleCrouch}
            className={`w-12 h-12 rounded-full border flex items-center justify-center active:scale-95 shadow-lg transition-all cursor-pointer ${
              isCrouched
                ? 'border-cyan-400 bg-cyan-500/40 text-white'
                : 'border-zinc-700 bg-zinc-950/80 text-zinc-300'
            }`}
            title="Agacharse"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          {/* ADS / Mira Zoom */}
          <button
            data-interactive="true"
            onTouchStart={handleToggleADS}
            onClick={handleToggleADS}
            className={`w-14 h-14 rounded-full border-2 font-mono font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-xl transition-all cursor-pointer ${
              isADS
                ? 'border-cyan-400 bg-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.7)]'
                : 'border-zinc-700 bg-zinc-950/80 text-zinc-300'
            }`}
            title="Apuntar con la mira"
          >
            <CrosshairIcon className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">MIRA</span>
          </button>

          {/* Jump Button */}
          <button
            data-interactive="true"
            onTouchStart={handleJump}
            onClick={handleJump}
            className="w-14 h-14 rounded-full bg-zinc-900/90 border-2 border-zinc-600 text-white font-mono font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer"
            title="Salto propulsado"
          >
            <ArrowUp className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] mt-0.5">SALTO</span>
          </button>
        </div>

        {/* Giant Primary FIRE Button */}
        <button
          data-interactive="true"
          onTouchStart={handleFireStart}
          onTouchEnd={handleFireEnd}
          onMouseDown={handleFireStart}
          onMouseUp={handleFireEnd}
          className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center pointer-events-auto transition-transform active:scale-90 shadow-2xl cursor-pointer ${
            isFiring
              ? 'border-white bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.9)] scale-95'
              : 'border-cyan-400 bg-gradient-to-tr from-cyan-600 via-sky-500 to-cyan-400 text-black shadow-[0_0_25px_rgba(6,182,212,0.7)]'
          }`}
          title="Disparar arma"
        >
          <CrosshairIcon className="w-9 h-9 stroke-[2.5]" />
          <span className="font-mono font-black text-xs tracking-wider uppercase mt-0.5">
            FUEGO
          </span>
        </button>
      </div>

      {/* 8. Pause Modal */}
      {engine.state === 'paused' && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center pointer-events-auto p-4 z-50">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col gap-4 text-center shadow-2xl">
            <h2 className="text-xl font-black text-white tracking-widest uppercase">
              SIMULACIÓN EN PAUSA
            </h2>
            <p className="text-xs font-mono text-zinc-400">
              Operativo en modo de espera táctico.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  engine.setState('playing');
                  soundManager.playUIClick();
                }}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-widest uppercase rounded flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" />
                REANUDAR COMBATE
              </button>

              <button
                onClick={() => {
                  onRestart();
                  soundManager.playUIClick();
                }}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                REINICIAR MISIÓN
              </button>

              <button
                onClick={() => {
                  onReturnToLobby();
                  soundManager.playUIClick();
                }}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                VOLVER AL LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Game Over Modal */}
      {engine.state === 'game_over' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto p-4 z-50">
          <div className="w-full max-w-md bg-zinc-950 border border-rose-900/60 rounded-xl p-6 flex flex-col gap-4 text-center shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <div className="w-14 h-14 bg-rose-950/60 border border-rose-500/50 rounded-full flex items-center justify-center mx-auto text-rose-500">
              <Skull className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-mono text-rose-400 font-bold tracking-widest uppercase">
                FALLO DE MISIÓN
              </span>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                OPERATIVO CAÍDO
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 font-mono text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">PUNTUACIÓN</span>
                <span className="text-white font-bold tabular-nums text-sm">{stats.score}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">BAJAS</span>
                <span className="text-cyan-400 font-bold tabular-nums text-sm">{stats.kills}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">TIROS A LA CABEZA</span>
                <span className="text-amber-400 font-bold tabular-nums text-sm">{stats.headshots}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">OLEADA ALCANZADA</span>
                <span className="text-white font-bold tabular-nums text-sm">{stats.wave}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onRestart();
                  soundManager.playUIClick();
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs tracking-wider uppercase rounded flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              >
                <RotateCcw className="w-4 h-4" />
                REINTENTAR
              </button>

              <button
                onClick={() => {
                  onReturnToLobby();
                  soundManager.playUIClick();
                }}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                LOBBY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Victory Modal */}
      {engine.state === 'victory' && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto p-4 z-50">
          <div className="w-full max-w-md bg-zinc-950 border border-cyan-500/60 rounded-xl p-6 flex flex-col gap-4 text-center shadow-[0_0_35px_rgba(6,182,212,0.4)]">
            <div className="w-14 h-14 bg-cyan-950/60 border border-cyan-400 rounded-full flex items-center justify-center mx-auto text-cyan-400">
              <Award className="w-7 h-7" />
            </div>

            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold tracking-widest uppercase">
                MISIÓN COMPLETADA CON ÉXITO
              </span>
              <h2 className="text-2xl font-black text-white tracking-widest uppercase">
                VICTORIA TÁCTICA
              </h2>
            </div>

            <p className="text-xs font-mono text-zinc-300">
              Todas las amenazas han sido neutralizadas en el sector.
            </p>

            <div className="grid grid-cols-2 gap-2 text-left bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 font-mono text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px]">PUNTOS TOTALES</span>
                <span className="text-cyan-400 font-bold tabular-nums text-sm">{stats.score}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">BAJAS NEUTRALIZADAS</span>
                <span className="text-white font-bold tabular-nums text-sm">{stats.kills}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">PRECISIÓN</span>
                <span className="text-emerald-400 font-bold tabular-nums text-sm">
                  {stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 100}%
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">RECOMPENSA XP</span>
                <span className="text-amber-400 font-bold tabular-nums text-sm">+5,000 XP</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onRestart();
                  soundManager.playUIClick();
                }}
                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs tracking-wider uppercase rounded flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.5)]"
              >
                <RotateCcw className="w-4 h-4" />
                JUGAR DE NUEVO
              </button>

              <button
                onClick={() => {
                  onReturnToLobby();
                  soundManager.playUIClick();
                }}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded flex items-center justify-center gap-2 border border-zinc-800 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                VOLVER AL LOBBY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
