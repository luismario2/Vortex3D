/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  RotateCcw,
  Shield,
  ArrowUp,
  Maximize2,
  ChevronDown,
} from 'lucide-react';
import { GameEngine } from '../game/gameEngine';
import { WeaponId, WEAPON_REGISTRY } from '../game/weaponModels';

interface AndroidTouchControllerProps {
  engine: GameEngine;
}

export const AndroidTouchController: React.FC<AndroidTouchControllerProps> = ({ engine }) => {
  // Joystick State
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickOrigin, setJoystickOrigin] = useState({ x: 90, y: 0 });
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  // Button States
  const [isFiring, setIsFiring] = useState(false);
  const [isADS, setIsADS] = useState(false);
  const [isCrouched, setIsCrouched] = useState(false);

  // Touch tracking refs
  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const JOYSTICK_MAX_RADIUS = 55;

  // 1. Touch Start Handler
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (engine.state !== 'playing') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;

      // Left Zone (Walk Joystick): Left 48% of screen
      if (touch.clientX < screenW * 0.48 && touch.clientY > screenH * 0.25) {
        if (joystickTouchIdRef.current === null) {
          joystickTouchIdRef.current = touch.identifier;
          setJoystickOrigin({ x: touch.clientX, y: touch.clientY });
          setKnobPos({ x: 0, y: 0 });
          setJoystickActive(true);
          engine.moveInput.set(0, 0);
        }
      }
      // Right Zone (Look & Aim swipe): Right 52% of screen
      else if (touch.clientX >= screenW * 0.48) {
        // If not already tracking look touch
        if (lookTouchIdRef.current === null) {
          // Check if touch is on an interactive button
          const target = document.elementFromPoint(touch.clientX, touch.clientY);
          if (target && target.closest('[data-touch-action]')) {
            // Let the button handle it
            continue;
          }
          lookTouchIdRef.current = touch.identifier;
          lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  }, [engine]);

  // 2. Touch Move Handler
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (engine.state !== 'playing') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Update Joystick
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickOrigin.x;
        const dy = touch.clientY - joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let clampedX = dx;
        let clampedY = dy;
        if (dist > JOYSTICK_MAX_RADIUS) {
          clampedX = (dx / dist) * JOYSTICK_MAX_RADIUS;
          clampedY = (dy / dist) * JOYSTICK_MAX_RADIUS;
        }

        setKnobPos({ x: clampedX, y: clampedY });

        // Normalize to -1..1
        const normX = clampedX / JOYSTICK_MAX_RADIUS;
        const normY = clampedY / JOYSTICK_MAX_RADIUS;

        // Set engine analog vector
        engine.moveInput.set(normX, -normY);

        // Auto sprint if pushed hard forward
        engine.isMobileRunning = dist > JOYSTICK_MAX_RADIUS * 0.78;
      }

      // Update Camera Look Swipe (Right Thumb)
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        // Android Touch Sensitivity
        const sens = 0.0048 * engine.settings.mouseSensitivity;
        const invert = engine.settings.invertY ? -1 : 1;

        // Rotate yaw & pitch
        engine.rotateLook(-dx * sens, -dy * sens * invert);
      }
    }
  }, [engine, joystickOrigin]);

  // 3. Touch End / Cancel Handler
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        engine.moveInput.set(0, 0);
        engine.isMobileRunning = false;
      }

      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
      }
    }
  }, [engine]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Action Button Handlers
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

  const handleQuickWeapon = (id: WeaponId, e: React.SyntheticEvent) => {
    e.stopPropagation();
    engine.switchWeapon(id);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto select-none touch-none z-20"
      style={{ WebkitUserSelect: 'none' }}
    >
      {/* 1. Left Thumb Analog Joystick UI */}
      {joystickActive ? (
        <div
          className="absolute pointer-events-none transition-opacity duration-150"
          style={{
            left: `${joystickOrigin.x}px`,
            top: `${joystickOrigin.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Outer Ring */}
          <div className="w-32 h-32 rounded-full border-2 border-cyan-400/40 bg-zinc-950/40 backdrop-blur-none flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <div className="w-20 h-20 rounded-full border border-cyan-500/20" />
          </div>

          {/* Inner Floating Knob */}
          <div
            className="absolute top-1/2 left-1/2 w-14 h-14 -mt-7 -ml-7 rounded-full bg-gradient-to-tr from-cyan-500 to-sky-300 border-2 border-white shadow-[0_0_15px_rgba(6,182,212,0.8)] flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-cyan-950/80" />
          </div>
        </div>
      ) : (
        /* Idle Joystick Hint Guide */
        <div className="absolute bottom-16 left-12 w-28 h-28 rounded-full border-2 border-dashed border-cyan-400/30 bg-zinc-950/20 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-cyan-400" />
          </div>
          <span className="text-[10px] font-mono text-cyan-300/70 font-bold mt-1 uppercase tracking-wider">
            CAMINAR
          </span>
        </div>
      )}

      {/* 2. Right Half Aiming / Swipe to Look Hint */}
      <div className="absolute top-20 right-28 pointer-events-none text-right opacity-40">
        <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest block">
          DESLIZA AQUÍ PARA GIRAR
        </span>
      </div>

      {/* 3. Right Thumb Ergonomic Action Buttons */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Top Mini Buttons Row: Reload & Weapon Switch */}
        <div className="flex items-center gap-2">
          {(['viper_9', 'thor_rail', 'scatter_x', 'pulsar_7'] as WeaponId[]).map(wId => {
            const isSel = engine.currentWeaponId === wId;
            return (
              <button
                key={wId}
                data-touch-action="weapon"
                onTouchStart={e => handleQuickWeapon(wId, e)}
                onClick={e => handleQuickWeapon(wId, e)}
                className={`px-2.5 py-1.5 rounded-lg border font-mono font-black text-[10px] active:scale-95 transition-all ${
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
            data-touch-action="reload"
            onTouchStart={handleReload}
            onClick={handleReload}
            className="w-11 h-11 rounded-full bg-zinc-900/85 border border-zinc-700 text-cyan-300 flex items-center justify-center active:scale-95 shadow-lg"
            title="Recargar arma"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Tactical Middle Row: ADS Zoom & Crouch */}
        <div className="flex items-center gap-3">
          {/* Crouch Toggle */}
          <button
            data-touch-action="crouch"
            onTouchStart={handleToggleCrouch}
            onClick={handleToggleCrouch}
            className={`w-13 h-13 rounded-full border font-mono font-bold text-xs flex items-center justify-center active:scale-95 shadow-lg transition-all ${
              isCrouched
                ? 'border-cyan-400 bg-cyan-500/40 text-white'
                : 'border-zinc-700 bg-zinc-950/80 text-zinc-300'
            }`}
            title="Agacharse"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          {/* ADS / Scope Zoom Button */}
          <button
            data-touch-action="ads"
            onTouchStart={handleToggleADS}
            onClick={handleToggleADS}
            className={`w-15 h-15 rounded-full border-2 font-mono font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-xl transition-all ${
              isADS
                ? 'border-cyan-400 bg-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.7)]'
                : 'border-zinc-700 bg-zinc-950/80 text-zinc-300'
            }`}
            title="Apuntar con la mira"
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-[9px] mt-0.5">MIRA</span>
          </button>

          {/* Jump Button */}
          <button
            data-touch-action="jump"
            onTouchStart={handleJump}
            onClick={handleJump}
            className="w-15 h-15 rounded-full bg-zinc-900/90 border-2 border-zinc-600 text-white font-mono font-black text-xs flex flex-col items-center justify-center active:scale-95 shadow-xl"
            title="Salto propulsado"
          >
            <ArrowUp className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] mt-0.5">SALTO</span>
          </button>
        </div>

        {/* Primary Giant FIRE Button */}
        <button
          data-touch-action="fire"
          onTouchStart={handleFireStart}
          onTouchEnd={handleFireEnd}
          onMouseDown={handleFireStart}
          onMouseUp={handleFireEnd}
          className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-transform active:scale-90 shadow-2xl cursor-pointer ${
            isFiring
              ? 'border-white bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.9)] scale-95'
              : 'border-cyan-400 bg-gradient-to-tr from-cyan-600 via-sky-500 to-cyan-400 text-black shadow-[0_0_25px_rgba(6,182,212,0.7)]'
          }`}
          title="Disparar arma"
        >
          <Crosshair className="w-9 h-9 stroke-[2.5]" />
          <span className="font-mono font-black text-xs tracking-wider uppercase mt-0.5">
            FUEGO
          </span>
        </button>
      </div>
    </div>
  );
};
