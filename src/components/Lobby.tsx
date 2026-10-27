/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCw,
  Sliders,
  Shield,
  Zap,
  Target,
  Flame,
  Check,
  Eye,
  X,
  ChevronRight,
  Crosshair,
  ShoppingBag,
  Sparkles,
  Trophy,
  Calendar,
  Gift,
  Lock,
  Plus,
  Compass,
  Users,
  UserPlus,
  UserCheck,
  Copy,
  Trash2,
  Star,
  Search,
  Share2,
} from 'lucide-react';
import { GameEngine, GameMode, GameSettings } from '../game/gameEngine';
import { WeaponId, WeaponSkin, WEAPON_REGISTRY } from '../game/weaponModels';
import { MapId, MAP_CONFIGS } from '../game/arena';
import { soundManager } from '../game/audio';
import { PlayerEconomy, SHOP_ITEMS, ShopItem, FriendUser, PlayerProfile } from '../game/playerEconomy';

interface LobbyProps {
  engine: GameEngine | null;
  onDeploy: (mode: GameMode, mapId: MapId) => void;
}

type ModalType =
  | 'shop'
  | 'luck_royale'
  | 'vortex_pass'
  | 'missions'
  | 'events'
  | 'armory'
  | 'modes'
  | 'settings'
  | 'friends'
  | 'profile'
  | null;

export const Lobby: React.FC<LobbyProps> = ({ engine, onDeploy }) => {
  const economy = PlayerEconomy.getInstance();
  const [ecoState, setEcoState] = useState({ ...economy.state });

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('waves');
  const [selectedMap, setSelectedMap] = useState<MapId>('neon_sector');

  // Armory selections
  const [weaponId, setWeaponId] = useState<WeaponId>(engine?.currentWeaponId || 'viper_9');
  const [skin, setSkin] = useState<WeaponSkin>(engine?.currentSkin || 'cyber_noir');
  const [hasSilencer, setHasSilencer] = useState(engine?.hasSilencer || false);
  const [hasLaser, setHasLaser] = useState(engine?.hasLaser ?? true);

  // Luck Royale animation states
  const [isSpinning, setIsSpinning] = useState(false);
  const [wonPrizes, setWonPrizes] = useState<Array<{ name: string; rarity: string; icon: string; skin?: WeaponSkin }> | null>(null);
  const [royaleTheme, setRoyaleTheme] = useState<'samurai' | 'dragon'>('samurai');

  // Shop filter
  const [shopCategory, setShopCategory] = useState<'all' | 'skins' | 'crates' | 'vip'>('all');
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);

  // Missions Tab
  const [missionTab, setMissionTab] = useState<'daily' | 'weekly'>('daily');

  // Social & Friends state
  const [socialTab, setSocialTab] = useState<'friends' | 'active' | 'add'>('friends');
  const [friendSearchId, setFriendSearchId] = useState('');
  const [friendNotification, setFriendNotification] = useState<string | null>(null);
  const [inspectedUser, setInspectedUser] = useState<FriendUser | PlayerProfile | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(
    engine?.settings || {
      graphicsQuality: 'high',
      mouseSensitivity: 1.0,
      invertY: false,
      fov: 75,
      crosshairStyle: 'cross',
      crosshairColor: '#00f0ff',
      masterVolume: 1.0,
      sfxVolume: 0.8,
      musicVolume: 0.35,
      soundMuted: false,
    }
  );

  const activeWeapon = WEAPON_REGISTRY[weaponId];

  // Refresh local state when economy updates
  const syncEconomy = () => {
    setEcoState({ ...economy.state });
  };

  const handleWeaponChange = (id: WeaponId) => {
    setWeaponId(id);
    if (engine) {
      engine.currentWeaponId = id;
      engine.rebuildWeaponMesh();
    }
    soundManager.playWeaponEquip();
  };

  const handleSkinChange = (newSkin: WeaponSkin) => {
    setSkin(newSkin);
    if (engine) {
      engine.setWeaponSkin(newSkin);
    }
    soundManager.playWeaponEquip();
  };

  const handleSilencerToggle = () => {
    const next = !hasSilencer;
    setHasSilencer(next);
    if (engine) {
      engine.hasSilencer = next;
      engine.rebuildWeaponMesh();
    }
    soundManager.playUIClick();
  };

  const handleLaserToggle = () => {
    const next = !hasLaser;
    setHasLaser(next);
    if (engine) {
      engine.hasLaser = next;
      engine.rebuildWeaponMesh();
    }
    soundManager.playUIClick();
  };

  const handleInspectWeapon = () => {
    if (engine) {
      engine.inspectWeapon();
    }
    soundManager.playWeaponEquip();
  };

  // Spin Luck Royale
  const handleSpinRoyale = (times: 1 | 10) => {
    if (isSpinning) return;
    soundManager.playUIClick();

    const result = economy.spinLuckRoyale(times);
    if (!result.success) {
      alert(result.reason || 'Recursos insuficientes para girar la ruleta');
      return;
    }

    setIsSpinning(true);
    let tickCount = 0;
    const interval = setInterval(() => {
      soundManager.playSpinTick(1 + (tickCount % 4) * 0.15);
      tickCount++;
      if (tickCount > 14) {
        clearInterval(interval);
        setIsSpinning(false);
        syncEconomy();
        setWonPrizes(result.itemsWon);
        soundManager.playJackpotFanfare();

        // If a skin was won, preview it
        const firstSkinWon = result.itemsWon.find((p) => p.skin);
        if (firstSkinWon && firstSkinWon.skin && engine) {
          handleSkinChange(firstSkinWon.skin);
        }
      }
    }, 90);
  };

  // Buy Shop Item
  const handleBuyShopItem = (item: ShopItem) => {
    soundManager.playUIClick();
    const res = economy.buyShopItem(item);
    if (res.success) {
      soundManager.playJackpotFanfare();
      syncEconomy();
      setPurchaseNotice(`¡Adquirido con éxito: ${item.name}!`);
      setTimeout(() => setPurchaseNotice(null), 3000);
      if (item.skinId) {
        handleSkinChange(item.skinId);
      }
    } else {
      setPurchaseNotice(res.reason || 'No se pudo completar la compra');
      setTimeout(() => setPurchaseNotice(null), 3000);
    }
  };

  // Claim Mission
  const handleClaimMission = (id: string) => {
    soundManager.playUIClick();
    const ok = economy.claimMission(id);
    if (ok) {
      soundManager.playJackpotFanfare();
      syncEconomy();
    }
  };

  // Claim Pass Tier
  const handleClaimPassTier = (tier: number, isElite: boolean) => {
    soundManager.playUIClick();
    const ok = economy.claimPassReward(tier, isElite);
    if (ok) {
      soundManager.playJackpotFanfare();
      syncEconomy();
    }
  };

  // Claim All Pass Rewards
  const handleClaimAllPass = () => {
    soundManager.playUIClick();
    const count = economy.claimAllPassRewards();
    if (count > 0) {
      soundManager.playJackpotFanfare();
      syncEconomy();
    }
  };

  // Unlock Elite Pass
  const handleUnlockElitePass = () => {
    soundManager.playUIClick();
    const ok = economy.unlockElitePass();
    if (ok) {
      soundManager.playJackpotFanfare();
      syncEconomy();
    } else {
      alert('Necesitas 499 Diamantes Vortex para activar el Pase Élite.');
    }
  };

  // Claim Daily Login
  const handleClaimLoginDay = (day: number) => {
    soundManager.playUIClick();
    const ok = economy.claimDailyLogin(day);
    if (ok) {
      soundManager.playJackpotFanfare();
      syncEconomy();
    }
  };

  // Social & Friends Handlers
  const handleAddFriend = (idToAdd?: string) => {
    const targetId = idToAdd || friendSearchId;
    soundManager.playUIClick();
    const res = economy.addFriendById(targetId);
    setFriendNotification(res.message);
    if (res.success) {
      soundManager.playJackpotFanfare();
      syncEconomy();
      setFriendSearchId('');
    }
    setTimeout(() => setFriendNotification(null), 3500);
  };

  const handleRemoveFriend = (id: string) => {
    soundManager.playUIClick();
    economy.removeFriend(id);
    syncEconomy();
  };

  const handleToggleFavorite = (id: string) => {
    soundManager.playUIClick();
    economy.toggleFavoriteFriend(id);
    syncEconomy();
  };

  const handleInviteFriend = (id: string) => {
    soundManager.playUIClick();
    const res = economy.inviteFriendToSquad(id);
    setFriendNotification(res.message);
    setTimeout(() => setFriendNotification(null), 3500);
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(true);
    soundManager.playUIClick();
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenProfile = (user: FriendUser | PlayerProfile) => {
    soundManager.playUIClick();
    setInspectedUser(user);
    setActiveModal('profile');
  };

  // Count online friends
  const onlineFriendsCount = ecoState.friends.filter((f) => f.status !== 'offline').length;

  // Count unclaimed missions
  const pendingMissionsCount = ecoState.missions.filter(
    (m) => !m.isClaimed && m.current >= m.target
  ).length;

  const getModeLabel = () => {
    if (selectedMode === 'waves') return 'Supervivencia (10 Oleadas)';
    if (selectedMode === 'boss_titans') return 'Duelo Ciber-Titán';
    return 'Campo de Tiro';
  };

  // Skin metadata labels
  const getSkinName = (s: WeaponSkin) => {
    switch (s) {
      case 'cyber_samurai':
        return 'Samurai Ciber (Mítica)';
      case 'plasma_dragon':
        return 'Dragón de Plasma (Mítica)';
      case 'toxic_hazard':
        return 'Biohazard Tóxico (Legendaria)';
      case 'solar_flare':
        return 'Fulgor Solar (Legendaria)';
      case 'void_stalker':
        return 'Acechador del Vacío (Legendaria)';
      case 'quantum_prism':
        return 'Prisma Cuántico (Épica)';
      case 'hyper_gold':
        return 'Hiper Oro 24K (Épica)';
      case 'titanium_ice':
        return 'Hielo de Titanio (Rara)';
      case 'neon_matrix':
        return 'Matriz Neón';
      case 'cyber_noir':
      default:
        return 'Ciber Noir Estándar';
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 pointer-events-none select-none overflow-hidden font-sans">
      {/* ======================================================== */}
      {/* TOP HEADER: Player Profile, Logo & Currencies            */}
      {/* ======================================================== */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Player Profile Card (Clickable to view detailed stats dossier) */}
        <button
          onClick={() => handleOpenProfile(ecoState.profile)}
          className="flex items-center gap-2.5 bg-zinc-950/85 hover:bg-zinc-900 border border-zinc-800/90 hover:border-cyan-500/50 rounded-2xl px-3 py-2 backdrop-blur-md shadow-2xl cursor-pointer transition-all active:scale-95 group text-left"
          title="Ver mi perfil y estadísticas"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
            <span>{ecoState.profile.avatarIcon}</span>
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 text-[9px] font-mono font-black bg-cyan-400 text-black rounded-md">
              {ecoState.profile.level}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black text-white tracking-wide group-hover:text-cyan-300 transition-colors">
                {ecoState.profile.name}
              </span>
              <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                ÉLITE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 sm:w-28 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{
                    width: `${(ecoState.profile.xp / ecoState.profile.xpToNextLevel) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {ecoState.profile.xp}/{ecoState.profile.xpToNextLevel} XP
              </span>
            </div>
          </div>
        </button>

        {/* Center: Sleek Brand Logo */}
        <div className="hidden md:flex flex-col items-center">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-white uppercase font-sans">
              VORTEX 3D
            </h1>
          </div>
          <span className="text-[9px] font-mono tracking-widest text-cyan-400/80 uppercase font-semibold">
            CYBER TACTICAL BATTLE OPS
          </span>
        </div>

        {/* Right: Currencies, Social & Settings */}
        <div className="flex items-center gap-2">
          {/* Gold Coins (Monedas) */}
          <div className="flex items-center gap-1.5 bg-zinc-950/85 border border-zinc-800/90 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-lg">
            <span className="text-base leading-none">🪙</span>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-400">
              {ecoState.gold.toLocaleString()}
            </span>
          </div>

          {/* Diamonds (Diamantes) */}
          <div className="flex items-center gap-1.5 bg-zinc-950/85 border border-cyan-500/40 rounded-xl px-2.5 py-1.5 backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <span className="text-base leading-none">💎</span>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-300">
              {ecoState.diamonds.toLocaleString()}
            </span>
            <button
              onClick={() => {
                soundManager.playUIClick();
                setActiveModal('shop');
              }}
              className="w-4 h-4 rounded-full bg-cyan-400/20 hover:bg-cyan-400/40 text-cyan-300 flex items-center justify-center text-[10px] font-bold cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Royale Tickets */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950/85 border border-purple-500/40 rounded-xl px-2.5 py-1.5 backdrop-blur-md">
            <span className="text-base leading-none">🎟️</span>
            <span className="text-xs sm:text-sm font-mono font-extrabold text-purple-300">
              {ecoState.royaleTickets}
            </span>
          </div>

          {/* Social / Friends Button */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              setActiveModal(activeModal === 'friends' ? null : 'friends');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur-md text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 shadow-md ${
              activeModal === 'friends'
                ? 'border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                : 'border-zinc-800 bg-zinc-950/85 text-zinc-300 hover:border-teal-400/60 hover:text-white'
            }`}
            title="Amigos y Jugadores Activos"
          >
            <Users className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">AMIGOS</span>
            {onlineFriendsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              setActiveModal(activeModal === 'settings' ? null : 'settings');
            }}
            className="p-2 bg-zinc-950/85 border border-zinc-800/90 rounded-xl hover:border-cyan-400 text-zinc-300 hover:text-white backdrop-blur-md cursor-pointer transition-all active:scale-95"
            title="Ajustes"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LEFT NAVIGATION COLUMN: Full Battle Royale Menu Tabs      */}
      {/* ======================================================== */}
      <div className="my-auto pointer-events-auto flex flex-col gap-2 w-36 sm:w-44">
        {/* 1. TIENDA */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'shop' ? null : 'shop');
          }}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'shop'
              ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/10 border-amber-400 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-amber-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span>TIENDA</span>
        </button>

        {/* 2. LUCK ROYALE */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'luck_royale' ? null : 'luck_royale');
          }}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'luck_royale'
              ? 'bg-gradient-to-r from-red-500/30 to-orange-600/10 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-red-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
            <Flame className="w-4 h-4 animate-bounce" />
          </div>
          <span>LUCK ROYALE</span>
          {/* Pulsing Hot Badge */}
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-red-600 to-orange-500 text-[8px] font-black tracking-widest text-white rounded-md shadow-[0_0_8px_rgba(239,68,68,0.8)]">
            HOT
          </span>
        </button>

        {/* 3. VORTEX PASS */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'vortex_pass' ? null : 'vortex_pass');
          }}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'vortex_pass'
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/10 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-cyan-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="flex flex-col text-left">
            <span>VORTEX PASS</span>
            <span className="text-[9px] text-cyan-400 font-bold">NIVEL {ecoState.passLevel}</span>
          </div>
        </button>

        {/* 4. MISIONES */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'missions' ? null : 'missions');
          }}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'missions'
              ? 'bg-gradient-to-r from-emerald-500/30 to-green-600/10 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-emerald-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <Target className="w-4 h-4" />
          </div>
          <span>MISIONES</span>
          {pendingMissionsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-black text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
              {pendingMissionsCount}
            </span>
          )}
        </button>

        {/* 5. EVENTOS */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'events' ? null : 'events');
          }}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'events'
              ? 'bg-gradient-to-r from-purple-500/30 to-pink-600/10 border-purple-400 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-purple-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
            <Gift className="w-4 h-4" />
          </div>
          <span>EVENTOS</span>
        </button>

        {/* 6. ARMERÍA */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'armory' ? null : 'armory');
          }}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'armory'
              ? 'bg-gradient-to-r from-sky-500/30 to-cyan-600/10 border-sky-400 text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-sky-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
            <Shield className="w-4 h-4" />
          </div>
          <span>ARMERÍA</span>
        </button>

        {/* 7. AMIGOS / SOCIAL */}
        <button
          onClick={() => {
            soundManager.playUIClick();
            setActiveModal(activeModal === 'friends' ? null : 'friends');
          }}
          className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-md text-xs font-mono font-extrabold tracking-wider transition-all cursor-pointer group shadow-lg ${
            activeModal === 'friends'
              ? 'bg-gradient-to-r from-teal-500/30 to-cyan-600/10 border-teal-400 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.3)]'
              : 'bg-zinc-950/80 border-zinc-800 text-zinc-300 hover:border-teal-400/60 hover:text-white'
          }`}
        >
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <span>AMIGOS</span>
          {onlineFriendsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-emerald-500 text-black text-[9px] font-black rounded-full flex items-center justify-center">
              {onlineFriendsCount}
            </span>
          )}
        </button>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM AREA: Active 3D Weapon Tag & Deploy / Play Button */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-end sm:items-end justify-between gap-4 pointer-events-auto">
        {/* Left Side: Active Weapon Badge on Pedestal & Inspect action */}
        <div className="bg-zinc-950/85 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 backdrop-blur-md shadow-2xl flex flex-col gap-2 min-w-[240px] sm:min-w-[280px]">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                {activeWeapon.category}
              </span>
              <h2 className="text-sm sm:text-base font-black text-white">{activeWeapon.name}</h2>
            </div>
            <span className="text-[10px] font-mono font-extrabold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
              {getSkinName(skin)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleInspectWeapon}
              className="flex-1 py-2 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 rounded-xl text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              INSPECCIONAR 3D
            </button>
            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>Gira 360°</span>
            </div>
          </div>
        </div>

        {/* Right Side: Game Mode Card & Giant Start Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Mode Card */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              setActiveModal('modes');
            }}
            className="flex items-center gap-3 bg-zinc-950/90 border border-zinc-800/90 hover:border-cyan-400/80 rounded-2xl px-4 py-3 backdrop-blur-md text-left cursor-pointer transition-all active:scale-95 shadow-xl group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                MODO DE JUEGO
              </span>
              <span className="text-xs sm:text-sm font-black text-white block">
                {getModeLabel()}
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                {MAP_CONFIGS[selectedMap].name}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          </button>

          {/* Giant Radiant Deploy / Play Button */}
          <button
            onClick={() => {
              soundManager.playUIClick();
              onDeploy(selectedMode, selectedMap);
            }}
            className="w-full sm:w-64 py-4 px-6 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 hover:brightness-110 text-black font-black text-lg tracking-widest uppercase rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.7)] flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.98] animate-pulse"
            style={{ animationDuration: '3s' }}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>JUGAR</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: TIENDA (Shop)                                     */}
      {/* ======================================================== */}
      {activeModal === 'shop' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-amber-500/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.2)] flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">
                    TIENDA CIBERNÉTICA
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Skins Míticas, Cajas de Suministros y Recursos Tácticos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message */}
            {purchaseNotice && (
              <div className="px-4 py-2 bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs rounded-xl text-center animate-fade-in font-bold">
                {purchaseNotice}
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShopCategory('all')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  shopCategory === 'all'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                TODOS
              </button>
              <button
                onClick={() => setShopCategory('skins')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  shopCategory === 'skins'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                SKINS MÍTICAS & ARMAS
              </button>
              <button
                onClick={() => setShopCategory('crates')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  shopCategory === 'crates'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                CAJAS DE SUMINISTROS
              </button>
              <button
                onClick={() => setShopCategory('vip')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  shopCategory === 'vip'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                LOTES VIP
              </button>
            </div>

            {/* Item Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-1">
              {SHOP_ITEMS.filter((item) =>
                shopCategory === 'all' ? true : item.category === shopCategory
              ).map((item) => {
                const isOwned = item.skinId && ecoState.unlockedSkins.includes(item.skinId);
                const isSelected = item.skinId && skin === item.skinId;

                return (
                  <div
                    key={item.id}
                    className={`relative bg-zinc-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                      item.rarity === 'mythic'
                        ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
                        : item.rarity === 'legendary'
                        ? 'border-purple-500/50'
                        : item.rarity === 'epic'
                        ? 'border-amber-500/50'
                        : 'border-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${
                            item.rarity === 'mythic'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : item.rarity === 'legendary'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                              : item.rarity === 'epic'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                          }`}
                        >
                          {item.rarity.toUpperCase()}
                        </span>
                        {item.discountPercent && (
                          <span className="text-[10px] font-mono font-black text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                            -{item.discountPercent}%
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-black text-white">{item.name}</h4>
                      <p className="text-[11px] font-mono text-zinc-400 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    {/* Preview on 3D turntable */}
                    {item.skinId && (
                      <button
                        onClick={() => {
                          handleSkinChange(item.skinId!);
                        }}
                        className={`w-full py-1.5 px-3 rounded-xl text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {isSelected ? 'PREVISUALIZANDO EN 3D' : 'PROBAR EN 3D'}
                      </button>
                    )}

                    {/* Price and Buy Button */}
                    <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-1 font-mono font-bold text-sm">
                        {item.priceType === 'diamonds' ? (
                          <>
                            <span>💎</span>
                            <span className="text-cyan-300">{item.price}</span>
                          </>
                        ) : (
                          <>
                            <span>🪙</span>
                            <span className="text-amber-400">{item.price.toLocaleString()}</span>
                          </>
                        )}
                      </div>

                      {isOwned ? (
                        <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-mono font-black flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> EN POSESIÓN
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyShopItem(item)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                        >
                          COMPRAR
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LUCK ROYALE (Ruleta de la Suerte)                  */}
      {/* ======================================================== */}
      {activeModal === 'luck_royale' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-3xl bg-zinc-950 border border-red-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(239,68,68,0.25)] flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Flame className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white tracking-wide">
                      LUCK ROYALE VORTEX
                    </h3>
                    <span className="px-2 py-0.5 bg-red-600 text-white font-mono text-[9px] font-black rounded uppercase">
                      TEMPORADA DE FUEGO
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    Gira la ruleta y gana la Skin Mítica "Dragón de Plasma" y recompensas legendarias
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Roulette Theme Selector Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRoyaleTheme('samurai');
                  soundManager.playUIClick();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  royaleTheme === 'samurai'
                    ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-black shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚔️</span>
                <span>RULETA SAMURAI CIBER</span>
                <span className="text-[9px] bg-black/40 text-amber-300 px-1.5 py-0.2 rounded font-bold">NUEVO</span>
              </button>

              <button
                onClick={() => {
                  setRoyaleTheme('dragon');
                  soundManager.playUIClick();
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  royaleTheme === 'dragon'
                    ? 'bg-gradient-to-r from-orange-500 via-red-600 to-amber-500 text-black shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <span>🔥</span>
                <span>RULETA DRAGÓN DE PLASMA</span>
              </button>
            </div>

            {/* Jackpot Showcase Banner */}
            <div className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
              royaleTheme === 'samurai'
                ? 'bg-gradient-to-r from-red-950/90 via-zinc-900 to-amber-950/80 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
                : 'bg-gradient-to-r from-orange-950/90 via-zinc-900 to-red-950/80 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            }`}>
              <div className="flex flex-col gap-1.5 text-center sm:text-left">
                <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest">
                  ★ GRAN PREMIO MÍTICO GARANTIZADO ★
                </span>
                <h4 className="text-2xl font-black text-white">
                  {royaleTheme === 'samurai' ? 'FUSIL SAMURAI CIBER' : 'FUSIL DRAGÓN DE PLASMA'}
                </h4>
                <p className="text-xs font-mono text-zinc-300 max-w-md">
                  {royaleTheme === 'samurai'
                    ? 'Armadura de laca negra ceremonial, aleación de oro 24K y filo de katana carmesí resplandeciente.'
                    : 'Chasis térmico forjado a 4,000°C con núcleo de plasma activo y fulgor de fuego carmesí.'}
                </p>

                {/* Direct 3D preview button */}
                <button
                  onClick={() => {
                    handleSkinChange(royaleTheme === 'samurai' ? 'cyber_samurai' : 'plasma_dragon');
                  }}
                  className="w-fit mt-1 py-1 px-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-mono font-bold text-white flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>PROBAR PREMIO EN EL LOBBY 3D</span>
                </button>
              </div>

              {/* Lucky Meter */}
              <div className="flex flex-col items-center bg-black/60 border border-white/10 rounded-xl p-3 min-w-[180px]">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                  MEDIDOR DE SUERTE
                </span>
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden my-1.5 border border-amber-500/30">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-300 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    style={{ width: `${ecoState.luckRoyaleLuckyMeter}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-black text-amber-400">
                  {Math.round(ecoState.luckRoyaleLuckyMeter)} / 100 LUCKY
                </span>
              </div>
            </div>

            {/* Spin Visual Wheel Representation */}
            <div className="relative py-4 flex items-center justify-center">
              <div
                className={`relative w-44 h-44 rounded-full border-4 border-amber-500/60 bg-gradient-to-tr from-red-950/70 via-zinc-900 to-amber-950/70 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.35)] ${
                  isSpinning ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: isSpinning ? '0.4s' : '0s' }}
              >
                <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/40" />
                <div className="text-4xl">{royaleTheme === 'samurai' ? '⚔️' : '🔥'}</div>
                <div className="absolute -top-3 w-6 h-6 bg-amber-500 rotate-45 shadow-[0_0_10px_rgba(245,158,11,1)]" />
              </div>
            </div>

            {/* Spin Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <button
                disabled={isSpinning}
                onClick={() => handleSpinRoyale(1)}
                className="w-full sm:w-60 py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-red-500/50 hover:border-red-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="text-xs font-mono font-black text-white">1 GIRO</span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 mt-0.5">
                  <span>1 🎟️ ó</span>
                  <span className="text-amber-400 font-bold">800 🪙</span>
                </div>
              </button>

              <button
                disabled={isSpinning}
                onClick={() => handleSpinRoyale(10)}
                className="w-full sm:w-64 py-3.5 px-4 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 hover:brightness-110 text-white rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-[0_0_25px_rgba(239,68,68,0.5)] disabled:opacity-50"
              >
                <span className="text-xs font-mono font-black tracking-wider">
                  10 GIROS (AHORRA 10%)
                </span>
                <div className="flex items-center gap-1.5 text-xs font-mono text-white/90 mt-0.5 font-bold">
                  <span>10 🎟️ ó</span>
                  <span className="text-amber-300">7,200 🪙</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINNER POPUP MODAL (When Luck Royale Finishes) */}
      {wonPrizes && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 pointer-events-auto">
          <div className="w-full max-w-lg bg-zinc-950 border border-red-500 rounded-3xl p-6 text-center shadow-[0_0_80px_rgba(239,68,68,0.4)] flex flex-col items-center gap-4 animate-scale-in">
            <Sparkles className="w-10 h-10 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <h3 className="text-2xl font-black text-white">¡RECOMPENSAS DESBLOQUEADAS!</h3>
            <p className="text-xs font-mono text-zinc-400">
              Tus artículos obtenidos han sido añadidos a tu armería y balance.
            </p>

            <div className="w-full grid grid-cols-2 gap-2 my-2 max-h-60 overflow-y-auto pr-1">
              {wonPrizes.map((p, idx) => (
                <div
                  key={idx}
                  className={`bg-zinc-900 border rounded-xl p-2.5 flex items-center gap-2.5 text-left ${
                    p.rarity === 'mythic'
                      ? 'border-red-500 bg-red-950/40 text-red-300'
                      : p.rarity === 'legendary'
                      ? 'border-purple-500 text-purple-300'
                      : 'border-zinc-800 text-white'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <span className="text-xs font-black block leading-tight">{p.name}</span>
                    <span className="text-[9px] font-mono font-bold uppercase opacity-80">
                      {p.rarity}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                soundManager.playUIClick();
                setWonPrizes(null);
              }}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 text-white font-black text-sm uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
            >
              ¡RECLAMAR Y CONTINUAR!
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VORTEX PASS (Pase de Batalla)                      */}
      {/* ======================================================== */}
      {activeModal === 'vortex_pass' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-5xl bg-zinc-950 border border-cyan-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-white tracking-wide">
                      VORTEX PASS // TEMPORADA 4
                    </h3>
                    {ecoState.hasElitePass ? (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-mono text-[9px] font-black rounded uppercase">
                        PASE ÉLITE ACTIVADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 font-mono text-[9px] font-black rounded uppercase">
                        PASE GRATUITO
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    Avanza de nivel jugando y desbloquea armas, skins míticas y oro
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClaimAllPass}
                  className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                >
                  RECLAMAR TODO
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Level Bar & Elite Pass Activation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex flex-col items-center justify-center text-white font-black shadow-lg">
                  <span className="text-[9px] font-mono opacity-80 leading-none">LVL</span>
                  <span className="text-lg leading-none">{ecoState.passLevel}</span>
                </div>
                <div className="flex-1 sm:w-64">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-zinc-300 font-bold">Progreso de Temporada</span>
                    <span className="text-cyan-400 font-bold">
                      {ecoState.passXp} / {ecoState.passXpNeeded} XP
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (ecoState.passXp / ecoState.passXpNeeded) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {!ecoState.hasElitePass && (
                <button
                  onClick={handleUnlockElitePass}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 hover:brightness-110 text-black text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 active:scale-95"
                >
                  <span>DESBLOQUEAR PASE ÉLITE (499 💎)</span>
                </button>
              )}
            </div>

            {/* Horizontal Battle Pass Tier Track */}
            <div className="overflow-x-auto pb-4 pt-2">
              <div className="flex items-center gap-3 min-w-max">
                {economy.getPassTiers().map((tier) => {
                  const isLevelReached = ecoState.passLevel >= tier.level;
                  const isFreeClaimed = ecoState.claimedFreePassTiers.includes(tier.level);
                  const isEliteClaimed = ecoState.claimedElitePassTiers.includes(tier.level);

                  return (
                    <div
                      key={tier.level}
                      className={`w-36 flex flex-col gap-2 rounded-2xl p-2.5 border backdrop-blur-md transition-all ${
                        isLevelReached
                          ? 'bg-zinc-900/90 border-cyan-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                      }`}
                    >
                      {/* FREE REWARD */}
                      <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2 text-center flex flex-col items-center gap-1">
                        <span className="text-[9px] font-mono text-zinc-400 uppercase font-bold">
                          GRATIS
                        </span>
                        <span className="text-2xl">{tier.freeReward.icon}</span>
                        <span className="text-[10px] font-bold text-white leading-tight h-6 flex items-center">
                          {tier.freeReward.name}
                        </span>
                        {isFreeClaimed ? (
                          <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Reclamado
                          </span>
                        ) : isLevelReached ? (
                          <button
                            onClick={() => handleClaimPassTier(tier.level, false)}
                            className="w-full py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[9px] font-black rounded-lg cursor-pointer"
                          >
                            RECLAMAR
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-500">Bloqueado</span>
                        )}
                      </div>

                      {/* LEVEL BADGE */}
                      <div className="py-1 bg-zinc-800/90 rounded-lg text-center font-mono font-black text-xs text-cyan-400">
                        NIVEL {tier.level}
                      </div>

                      {/* ELITE REWARD */}
                      <div
                        className={`border rounded-xl p-2 text-center flex flex-col items-center gap-1 ${
                          ecoState.hasElitePass
                            ? 'bg-amber-950/30 border-amber-500/50'
                            : 'bg-zinc-950/80 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-amber-400 uppercase font-black">
                            ÉLITE
                          </span>
                          {!ecoState.hasElitePass && <Lock className="w-2.5 h-2.5 text-zinc-500" />}
                        </div>
                        <span className="text-2xl">{tier.eliteReward.icon}</span>
                        <span className="text-[10px] font-bold text-amber-300 leading-tight h-6 flex items-center">
                          {tier.eliteReward.name}
                        </span>
                        {isEliteClaimed ? (
                          <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Reclamado
                          </span>
                        ) : isLevelReached && ecoState.hasElitePass ? (
                          <button
                            onClick={() => handleClaimPassTier(tier.level, true)}
                            className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black rounded-lg cursor-pointer"
                          >
                            RECLAMAR
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono text-zinc-500">Bloqueado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MISIONES (Missions)                               */}
      {/* ======================================================== */}
      {activeModal === 'missions' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-3xl bg-zinc-950 border border-emerald-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(16,185,129,0.25)] flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">
                    MISIONES DE COMBATE
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Completa objetivos tácticos y reclama Oro, Diamantes y XP de Pase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Daily vs Weekly Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMissionTab('daily')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  missionTab === 'daily'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                MISIONES DIARIAS
              </button>
              <button
                onClick={() => setMissionTab('weekly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  missionTab === 'weekly'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                MISIONES SEMANALES
              </button>
            </div>

            {/* Missions List */}
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1">
              {ecoState.missions
                .filter((m) => m.type === missionTab)
                .map((m) => {
                  const isCompleted = m.current >= m.target;

                  return (
                    <div
                      key={m.id}
                      className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{m.title}</h4>
                          <span className="text-[10px] font-mono text-zinc-400">
                            ({m.current}/{m.target})
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-400 mt-0.5">{m.description}</p>

                        {/* Progress Bar */}
                        <div className="w-full sm:w-80 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full bg-emerald-400"
                            style={{
                              width: `${Math.min(100, (m.current / m.target) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Rewards & Claim Button */}
                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-amber-400 font-bold">+{m.goldReward} 🪙</span>
                          <span className="text-cyan-400 font-bold">+{m.passXpReward} XP</span>
                          {m.diamondReward && (
                            <span className="text-cyan-300 font-bold">
                              +{m.diamondReward} 💎
                            </span>
                          )}
                        </div>

                        {m.isClaimed ? (
                          <span className="px-3 py-1.5 bg-zinc-800 text-zinc-500 rounded-xl text-xs font-mono font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> RECLAMADO
                          </span>
                        ) : isCompleted ? (
                          <button
                            onClick={() => handleClaimMission(m.id)}
                            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 animate-pulse"
                          >
                            RECLAMAR
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-zinc-950 text-zinc-500 border border-zinc-800 rounded-xl text-[10px] font-mono">
                            EN PROGRESO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EVENTOS (Events & 7-Day Login)                    */}
      {/* ======================================================== */}
      {activeModal === 'events' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-purple-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(168,85,247,0.25)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">
                    CENTRO DE EVENTOS CIBERNÉTICOS
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Premios diarios de inicio de sesión y desafíos de arena
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 7-Day Login Calendar Track */}
            <div>
              <span className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest block mb-2">
                CALENDARIO DE 7 DÍAS // RECOMPENSAS DIARIAS
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {ecoState.loginDays.map((d) => {
                  const isToday = d.day === ecoState.currentLoginDay;
                  const isAvailable = d.day <= ecoState.currentLoginDay && !d.isClaimed;

                  return (
                    <div
                      key={d.day}
                      className={`rounded-2xl p-3 flex flex-col items-center justify-between text-center border transition-all ${
                        isToday
                          ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                          : d.isClaimed
                          ? 'bg-zinc-900/60 border-zinc-800 opacity-60'
                          : 'bg-zinc-900/90 border-zinc-800'
                      }`}
                    >
                      <span className="text-[10px] font-mono font-black text-zinc-400">
                        {d.title}
                      </span>
                      <div className="text-3xl my-2">
                        {d.rewardType === 'gold'
                          ? '🪙'
                          : d.rewardType === 'diamonds'
                          ? '💎'
                          : d.rewardType === 'ticket'
                          ? '🎟️'
                          : '🔥'}
                      </div>
                      <span className="text-xs font-bold text-white mb-2 leading-tight">
                        {d.rewardType === 'skin' ? 'Skin Mítica' : `${d.amount}`}
                      </span>

                      {d.isClaimed ? (
                        <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Reclamado
                        </span>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleClaimLoginDay(d.day)}
                          className="w-full py-1 bg-purple-500 hover:bg-purple-400 text-black text-[10px] font-black rounded-lg cursor-pointer transition-all active:scale-95 animate-pulse"
                        >
                          RECLAMAR
                        </button>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-500">Próximamente</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special Active Events Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-gradient-to-r from-red-950/40 to-zinc-900 border border-red-500/30 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-mono font-bold rounded">
                    EVENTO ESPECIAL
                  </span>
                  <h4 className="text-base font-black text-white mt-1">CACERÍA DE TITANES</h4>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    Inflige daño a los Titanes en la arena para recibir 100 Diamantes adicionales y 4,000 de Oro.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Recompensa: 💎 100 + 🪙 4,000</span>
                  <span className="text-red-400 font-bold">Activo</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-950/40 to-zinc-900 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-mono font-bold rounded">
                    BONIFICACIÓN ACTIVA
                  </span>
                  <h4 className="text-base font-black text-white mt-1">FIN DE SEMANA 2X EXP</h4>
                  <p className="text-xs font-mono text-zinc-400 mt-1">
                    Todas las victorias en Supervivencia otorgan el doble de experiencia para tu Vortex Pass.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold">Multiplicador: 2.0x</span>
                  <span className="text-emerald-400 font-bold">Vigente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ARMERÍA (Armory Customization)                    */}
      {/* ======================================================== */}
      {activeModal === 'armory' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-4xl bg-zinc-950 border border-sky-500/40 rounded-3xl p-5 shadow-[0_0_60px_rgba(56,189,248,0.25)] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-wide">
                    ARMERÍA TÁCTICA 3D
                  </h3>
                  <p className="text-xs font-mono text-zinc-400">
                    Selecciona tu arma principal, equipa skins desbloqueadas y aditamentos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Weapon Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(WEAPON_REGISTRY) as WeaponId[]).map((id) => {
                const w = WEAPON_REGISTRY[id];
                const isSelected = weaponId === id;

                return (
                  <button
                    key={id}
                    onClick={() => handleWeaponChange(id)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase block opacity-80">
                      {w.category}
                    </span>
                    <span className="text-xs font-black block mt-0.5">{w.name}</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 mt-1 block">
                      {w.damage} DMG
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Weapon Stats Display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">DAÑO</span>
                <div className="text-base font-black text-white">{activeWeapon.damage}</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (activeWeapon.damage / 200) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">CADENCIA</span>
                <div className="text-base font-black text-white">{activeWeapon.fireRate} /s</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (activeWeapon.fireRate / 10) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">CARGADOR</span>
                <div className="text-base font-black text-white">{activeWeapon.magazineSize} BALAS</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (activeWeapon.magazineSize / 40) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">RECARGA</span>
                <div className="text-base font-black text-white">{activeWeapon.reloadTime}s</div>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-1">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.min(100, (activeWeapon.reloadTime / 3) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Skins Customization */}
            <div>
              <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest block mb-2">
                ASPECTOS Y SKINS DE CAMUFLAJE
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {(
                  [
                    'cyber_noir',
                    'titanium_ice',
                    'neon_matrix',
                    'hyper_gold',
                    'quantum_prism',
                    'void_stalker',
                    'solar_flare',
                    'toxic_hazard',
                    'plasma_dragon',
                    'cyber_samurai',
                  ] as WeaponSkin[]
                ).map((s) => {
                  const isUnlocked = ecoState.unlockedSkins.includes(s);
                  const isEquipped = skin === s;

                  return (
                    <div
                      key={s}
                      className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 transition-all ${
                        isEquipped
                          ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                          : isUnlocked
                          ? 'bg-zinc-900 border-zinc-800'
                          : 'bg-zinc-950/60 border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{getSkinName(s)}</span>
                        {!isUnlocked && <Lock className="w-3.5 h-3.5 text-zinc-500" />}
                      </div>

                      {isEquipped ? (
                        <span className="py-1 px-2 bg-sky-500/30 text-sky-300 text-[10px] font-mono font-bold rounded-lg text-center flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> EQUIPADO
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSkinChange(s)}
                          className="py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono font-bold rounded-lg cursor-pointer transition-all"
                        >
                          EQUIPAR
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveModal('shop');
                          }}
                          className="py-1 px-2 bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold rounded-lg cursor-pointer"
                        >
                          VER EN TIENDA
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactical Attachments */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleSilencerToggle}
                className={`flex-1 w-full py-2.5 px-4 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                  hasSilencer
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <span>SILENCIADOR TÁCTICO</span>
                <span>{hasSilencer ? 'EQUIPADO (+SIGILO)' : 'DESACTIVADO'}</span>
              </button>

              <button
                onClick={handleLaserToggle}
                className={`flex-1 w-full py-2.5 px-4 rounded-xl border text-xs font-mono font-bold flex items-center justify-between cursor-pointer transition-all ${
                  hasLaser
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                <span>MÓDULO LÁSER HOLO</span>
                <span>{hasLaser ? 'EQUIPADO (+PRECISIÓN)' : 'DESACTIVADO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: SELECCIÓN DE MODO Y ESCENARIO                     */}
      {/* ======================================================== */}
      {activeModal === 'modes' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-lg bg-zinc-950 border border-cyan-500/40 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  CONFIGURACIÓN DE COMBATE
                </span>
                <h3 className="text-lg font-black text-white">ELIGE MODO Y ESCENARIO</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode selection */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 block font-semibold">
                MODO DE JUEGO
              </label>
              <div className="flex flex-col gap-2">
                {[
                  {
                    id: 'waves' as GameMode,
                    name: 'Supervivencia (10 Oleadas)',
                    desc: 'Oleadas progresivas de drones y androides ciber-mutantes.',
                    icon: Shield,
                  },
                  {
                    id: 'boss_titans' as GameMode,
                    name: 'Duelo Ciber-Titán',
                    desc: 'Enfréntate a colosos acorazados de 5,000 HP con misiles guiados.',
                    icon: Flame,
                  },
                  {
                    id: 'target_range' as GameMode,
                    name: 'Campo de Tiro Táctico',
                    desc: 'Prueba de puntería, cálculo de caída de bala y retroceso sin daño.',
                    icon: Target,
                  },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMode(m.id);
                        soundManager.playUIClick();
                      }}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/20 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                      <div>
                        <div className="font-bold text-sm text-white">{m.name}</div>
                        <div className="text-xs font-mono text-zinc-400 mt-0.5">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map selection */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2 block font-semibold">
                MAPA / ESCENARIO
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.keys(MAP_CONFIGS) as MapId[]).map((mapId) => {
                  const m = MAP_CONFIGS[mapId];
                  const isSelected = selectedMap === mapId;
                  return (
                    <button
                      key={mapId}
                      onClick={() => {
                        setSelectedMap(mapId);
                        soundManager.playUIClick();
                      }}
                      className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-mono">{m.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
            >
              CONFIRMAR ELECCIÓN
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AJUSTES (Settings)                                */}
      {/* ======================================================== */}
      {activeModal === 'settings' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 pointer-events-auto">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  AJUSTES DEL SISTEMA
                </span>
                <h3 className="text-lg font-black text-white">OPCIONES GENERALES</h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quality */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1 block">
                CALIDAD GRÁFICA
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as GameSettings['graphicsQuality'][]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      const next = { ...settings, graphicsQuality: q };
                      setSettings(next);
                      if (engine) engine.setGraphicsQuality(q);
                    }}
                    className={`py-2 text-xs font-mono font-bold rounded-xl border uppercase cursor-pointer transition-all ${
                      settings.graphicsQuality === q
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {q === 'low' ? 'Baja' : q === 'medium' ? 'Media' : 'Alta (60FPS)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Crosshairs */}
            <div>
              <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1 block">
                ESTILO DE MIRA TÁCTICA
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['cross', 'dot', 'circle', 'circle_dot'] as GameSettings['crosshairStyle'][]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setSettings({ ...settings, crosshairStyle: st })}
                      className={`py-2 text-xs font-mono font-bold rounded-xl border uppercase cursor-pointer ${
                        settings.crosshairStyle === st
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Audio Volumes */}
            <div className="flex flex-col gap-2">
              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                  <span>VOLUMEN GENERAL</span>
                  <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const next = { ...settings, masterVolume: val };
                    setSettings(next);
                    soundManager.setVolumes(val, next.sfxVolume, next.musicVolume, next.soundMuted);
                  }}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
                  <span>EFECTOS DE DISPARO (SFX)</span>
                  <span>{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const next = { ...settings, sfxVolume: val };
                    setSettings(next);
                    soundManager.setVolumes(next.masterVolume, val, next.musicVolume, next.soundMuted);
                  }}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
            >
              GUARDAR Y SALIR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
