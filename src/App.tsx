/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameState, PlayerStats, GameMode } from './game/gameEngine';
import { MapId } from './game/arena';
import { Lobby } from './components/Lobby';
import { HUD } from './components/HUD';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('lobby');
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    ammo: 32,
    maxAmmo: 32,
    reserveAmmo: 180,
    isReloading: false,
    score: 0,
    kills: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    wave: 1,
    maxWave: 10,
    combo: 0,
    comboTimer: 0,
  });

  useEffect(() => {
    if (!mountRef.current) return;

    // Initialize Game Engine once
    const engine = new GameEngine(mountRef.current);
    engineRef.current = engine;

    // Listen to engine state updates
    engine.onStateChange = (state) => {
      setGameState(state);
    };

    engine.onStatsUpdate = (newStats) => {
      setStats({ ...newStats });
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleDeploy = (mode: GameMode, mapId: MapId) => {
    if (engineRef.current) {
      engineRef.current.startDeployment(mode, mapId);
    }
  };

  const handleReturnToLobby = () => {
    if (engineRef.current) {
      engineRef.current.setState('lobby');
    }
  };

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.startDeployment(
        engineRef.current.currentMode,
        engineRef.current.currentMap
      );
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white select-none font-sans">
      {/* 1. Dedicated Isolated 3D Canvas Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* 2. Full Lobby Interface */}
      {gameState === 'lobby' && (
        <Lobby
          engine={engineRef.current}
          onDeploy={handleDeploy}
        />
      )}

      {/* 3. In-Game HUD Overlay & Modals */}
      {gameState !== 'lobby' && engineRef.current && (
        <HUD
          engine={engineRef.current}
          stats={stats}
          onReturnToLobby={handleReturnToLobby}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
