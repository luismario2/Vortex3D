/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeaponSkin } from './weaponModels';

export interface PlayerStatsSummary {
  kdRatio: number;
  matchesPlayed: number;
  wins: number;
  winRate: number;
  headshots: number;
  headshotRate: number;
  titansDefeated: number;
  favoriteWeapon: string;
  favoriteMap: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  rankTitle: string;
  avatarIcon: string;
  stats: PlayerStatsSummary;
}

export interface FriendUser {
  id: string;
  name: string;
  level: number;
  avatarIcon: string;
  rankTitle: string;
  status: 'online' | 'in_match' | 'offline';
  statusDetail: string;
  isFavorite?: boolean;
  stats: PlayerStatsSummary;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  goldReward: number;
  passXpReward: number;
  diamondReward?: number;
  isClaimed: boolean;
  type: 'daily' | 'weekly';
}

export interface PassTier {
  level: number;
  freeReward: {
    name: string;
    type: 'gold' | 'diamonds' | 'ticket' | 'skin';
    amount?: number;
    skin?: WeaponSkin;
    icon: string;
  };
  eliteReward: {
    name: string;
    type: 'gold' | 'diamonds' | 'ticket' | 'skin';
    amount?: number;
    skin?: WeaponSkin;
    icon: string;
  };
}

export interface DailyLoginDay {
  day: number;
  title: string;
  rewardType: 'gold' | 'diamonds' | 'ticket' | 'skin';
  amount?: number;
  skin?: WeaponSkin;
  isClaimed: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  category: 'skins' | 'crates' | 'vip';
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  priceType: 'gold' | 'diamonds';
  price: number;
  discountPercent?: number;
  skinId?: WeaponSkin;
  description: string;
  isPurchased?: boolean;
}

export interface EconomyState {
  gold: number;
  diamonds: number;
  royaleTickets: number;
  unlockedSkins: WeaponSkin[];
  profile: PlayerProfile;
  passLevel: number;
  passXp: number;
  passXpNeeded: number;
  hasElitePass: boolean;
  claimedFreePassTiers: number[];
  claimedElitePassTiers: number[];
  missions: Mission[];
  loginDays: DailyLoginDay[];
  currentLoginDay: number;
  purchasedShopItems: string[];
  luckRoyaleSpinsCount: number;
  luckRoyaleLuckyMeter: number; // 0 - 100 guaranteed jackpot
  friends: FriendUser[];
}

const STORAGE_KEY = 'vortex_3d_player_economy_v1';

export const DEFAULT_FRIENDS: FriendUser[] = [
  {
    id: 'VTX-4821',
    name: 'CYBER_GHOST',
    level: 32,
    avatarIcon: '💀',
    rankTitle: 'Gran Maestro ★★★',
    status: 'online',
    statusDetail: 'En el Lobby',
    isFavorite: true,
    stats: {
      kdRatio: 4.12,
      matchesPlayed: 184,
      wins: 126,
      winRate: 68.5,
      headshots: 512,
      headshotRate: 46.2,
      titansDefeated: 24,
      favoriteWeapon: 'Fusil de Plasma "Viper-9"',
      favoriteMap: 'Neon Sector',
    },
  },
  {
    id: 'VTX-3199',
    name: 'NEXUS_VALKYRIE',
    level: 27,
    avatarIcon: '⚡',
    rankTitle: 'Comandante Élite',
    status: 'in_match',
    statusDetail: 'Supervivencia - Oleada 8',
    isFavorite: true,
    stats: {
      kdRatio: 3.85,
      matchesPlayed: 142,
      wins: 94,
      winRate: 66.2,
      headshots: 420,
      headshotRate: 41.5,
      titansDefeated: 17,
      favoriteWeapon: 'Cañón de Riel "Thor-Rail"',
      favoriteMap: 'Campo Polar',
    },
  },
  {
    id: 'VTX-8804',
    name: 'TITAN_SLAYER',
    level: 40,
    avatarIcon: '🔥',
    rankTitle: 'Leyenda Apex ★★★★★',
    status: 'online',
    statusDetail: 'Listo para Escuadrón',
    stats: {
      kdRatio: 5.20,
      matchesPlayed: 310,
      wins: 245,
      winRate: 79.0,
      headshots: 980,
      headshotRate: 52.1,
      titansDefeated: 48,
      favoriteWeapon: 'Escopeta Cuántica "Scatter-X"',
      favoriteMap: 'Hangar Cyberpunk',
    },
  },
  {
    id: 'VTX-7742',
    name: 'NEON_VIPER',
    level: 23,
    avatarIcon: '🐍',
    rankTitle: 'Vanguardia Táctica',
    status: 'online',
    statusDetail: 'En Campo de Tiro',
    stats: {
      kdRatio: 3.10,
      matchesPlayed: 115,
      wins: 72,
      winRate: 62.6,
      headshots: 290,
      headshotRate: 38.0,
      titansDefeated: 12,
      favoriteWeapon: 'Fusil de Plasma "Viper-9"',
      favoriteMap: 'Neon Sector',
    },
  },
  {
    id: 'VTX-1120',
    name: 'SHADOW_BLADE',
    level: 19,
    avatarIcon: '🥷',
    rankTitle: 'Operativo Alfa',
    status: 'offline',
    statusDetail: 'Desconectado hace 45 min',
    stats: {
      kdRatio: 2.45,
      matchesPlayed: 88,
      wins: 45,
      winRate: 51.1,
      headshots: 175,
      headshotRate: 34.0,
      titansDefeated: 6,
      favoriteWeapon: 'Pistola Láser "Pulsar-7"',
      favoriteMap: 'Neon Sector',
    },
  },
];

const DEFAULT_PASS_TIERS: PassTier[] = [
  {
    level: 1,
    freeReward: { name: '500 Monedas', type: 'gold', amount: 500, icon: '🪙' },
    eliteReward: { name: '2 Tickets Royale', type: 'ticket', amount: 2, icon: '🎟️' },
  },
  {
    level: 2,
    freeReward: { name: '1 Ticket Royale', type: 'ticket', amount: 1, icon: '🎟️' },
    eliteReward: { name: '100 Diamantes', type: 'diamonds', amount: 100, icon: '💎' },
  },
  {
    level: 3,
    freeReward: { name: '1,000 Monedas', type: 'gold', amount: 1000, icon: '🪙' },
    eliteReward: { name: 'Caja Cyber Especial', type: 'gold', amount: 2500, icon: '📦' },
  },
  {
    level: 4,
    freeReward: { name: '50 Diamantes', type: 'diamonds', amount: 50, icon: '💎' },
    eliteReward: { name: '200 Diamantes', type: 'diamonds', amount: 200, icon: '💎' },
  },
  {
    level: 5,
    freeReward: { name: 'Skin Hielo de Titanio', type: 'skin', skin: 'titanium_ice', icon: '❄️' },
    eliteReward: { name: '5 Tickets Royale', type: 'ticket', amount: 5, icon: '🎟️' },
  },
  {
    level: 6,
    freeReward: { name: '1,500 Monedas', type: 'gold', amount: 1500, icon: '🪙' },
    eliteReward: { name: '300 Diamantes', type: 'diamonds', amount: 300, icon: '💎' },
  },
  {
    level: 7,
    freeReward: { name: '2 Tickets Royale', type: 'ticket', amount: 2, icon: '🎟️' },
    eliteReward: { name: 'Skin Hiper Oro', type: 'skin', skin: 'hyper_gold', icon: '👑' },
  },
  {
    level: 8,
    freeReward: { name: '2,000 Monedas', type: 'gold', amount: 2000, icon: '🪙' },
    eliteReward: { name: '400 Diamantes', type: 'diamonds', amount: 400, icon: '💎' },
  },
  {
    level: 9,
    freeReward: { name: '100 Diamantes', type: 'diamonds', amount: 100, icon: '💎' },
    eliteReward: { name: '10 Tickets Royale', type: 'ticket', amount: 10, icon: '🎟️' },
  },
  {
    level: 10,
    freeReward: { name: 'Skin Matriz Neón', type: 'skin', skin: 'neon_matrix', icon: '⚡' },
    eliteReward: { name: 'Skin Mítica Acechador del Vacío', type: 'skin', skin: 'void_stalker', icon: '🌌' },
  },
];

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'skin_cyber_samurai',
    name: 'Skin Mítica Samurai Ciber',
    category: 'skins',
    rarity: 'mythic',
    priceType: 'diamonds',
    price: 1500,
    discountPercent: 20,
    skinId: 'cyber_samurai',
    description: 'Armadura de laca negra ceremonial, aleación de oro 24K y filo carmesí resplandeciente.',
  },
  {
    id: 'skin_plasma_dragon',
    name: 'Skin Mítica Dragón de Plasma',
    category: 'skins',
    rarity: 'mythic',
    priceType: 'diamonds',
    price: 1200,
    discountPercent: 25,
    skinId: 'plasma_dragon',
    description: 'Chasis de aleación forjado en magma con pulsos térmicos e incandescencia pura.',
  },
  {
    id: 'skin_toxic_hazard',
    name: 'Skin Legendaria Biohazard Tóxico',
    category: 'skins',
    rarity: 'legendary',
    priceType: 'diamonds',
    price: 950,
    skinId: 'toxic_hazard',
    description: 'Núcleo de reacción radiactivo con bandas de peligro industrial y vapor de neón verde.',
  },
  {
    id: 'skin_solar_flare',
    name: 'Skin Legendaria Fulgor Solar',
    category: 'skins',
    rarity: 'legendary',
    priceType: 'diamonds',
    price: 850,
    skinId: 'solar_flare',
    description: 'Energía plasmática estelar pura con fulgor de corona solar dorada y chasis térmico.',
  },
  {
    id: 'skin_void_stalker',
    name: 'Skin Legendaria Acechador del Vacío',
    category: 'skins',
    rarity: 'legendary',
    priceType: 'diamonds',
    price: 850,
    skinId: 'void_stalker',
    description: 'Material cuántico ultravioleta que absorbe la radiación ambiental del combate.',
  },
  {
    id: 'skin_quantum_prism',
    name: 'Skin Épica Prisma Cuántico',
    category: 'skins',
    rarity: 'epic',
    priceType: 'gold',
    price: 18000,
    skinId: 'quantum_prism',
    description: 'Revestimiento iridiscente con refracción cromática y destellos ultravioleta.',
  },
  {
    id: 'skin_hyper_gold',
    name: 'Skin Hiper Oro 24K',
    category: 'skins',
    rarity: 'epic',
    priceType: 'gold',
    price: 15000,
    skinId: 'hyper_gold',
    description: 'Elegancia dorada militar de alta pureza con detalles carmesí reflectantes.',
  },
  {
    id: 'skin_titanium_ice',
    name: 'Skin Hielo de Titanio',
    category: 'skins',
    rarity: 'rare',
    priceType: 'gold',
    price: 8000,
    skinId: 'titanium_ice',
    description: 'Blindaje criogénico con revestimiento anti-fricción color cian polar.',
  },
  {
    id: 'crate_legendary_armory',
    name: 'Caja Arsenal Mítico 2026',
    category: 'crates',
    rarity: 'mythic',
    priceType: 'diamonds',
    price: 350,
    discountPercent: 15,
    description: 'Probabilidad alta de skins Míticas (Samurai Ciber, Dragón de Plasma) y 5 Tickets Royale.',
  },
  {
    id: 'crate_tactical_elite',
    name: 'Caja de Suministros Élite',
    category: 'crates',
    rarity: 'legendary',
    priceType: 'gold',
    price: 2500,
    description: 'Contiene Oro masivo, Diamantes Vortex y probabilidad de Skins exclusivas.',
  },
  {
    id: 'crate_royale_pack',
    name: 'Megapack 10 Tickets Royale',
    category: 'crates',
    rarity: 'epic',
    priceType: 'diamonds',
    price: 300,
    discountPercent: 30,
    description: 'Paquete especial de giros para la ruleta de la suerte Luck Royale.',
  },
  {
    id: 'bundle_cyber_ops',
    name: 'Superlote Operativo Táctico',
    category: 'vip',
    rarity: 'mythic',
    priceType: 'diamonds',
    price: 550,
    discountPercent: 40,
    description: 'Incluye 15 Tickets Royale + 6,000 Monedas de Oro + 1 Caja Arsenal Mítico.',
  },
];

const DEFAULT_MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Neutralizador Urbano',
    description: 'Elimina 15 enemigos en cualquier modo de juego',
    current: 12,
    target: 15,
    goldReward: 800,
    passXpReward: 150,
    isClaimed: false,
    type: 'daily',
  },
  {
    id: 'm2',
    title: 'Disparo Quirúrgico',
    description: 'Consigue 5 eliminaciones por tiro a la cabeza (Headshots)',
    current: 5,
    target: 5,
    goldReward: 1200,
    passXpReward: 250,
    diamondReward: 25,
    isClaimed: false,
    type: 'daily',
  },
  {
    id: 'm3',
    title: 'Sobreviviente de Oleadas',
    description: 'Resiste al menos 5 oleadas seguidas sin caer',
    current: 4,
    target: 5,
    goldReward: 1500,
    passXpReward: 200,
    isClaimed: false,
    type: 'daily',
  },
  {
    id: 'm4',
    title: 'Maestro de la Cadencia',
    description: 'Dispara 300 proyectiles de plasma o balas de cañón',
    current: 300,
    target: 300,
    goldReward: 900,
    passXpReward: 180,
    isClaimed: false,
    type: 'daily',
  },
  {
    id: 'm5',
    title: 'Cazador de Titanes',
    description: 'Inflige 2,500 de daño al Gran Ciber-Titán en su arena',
    current: 1850,
    target: 2500,
    goldReward: 4000,
    passXpReward: 500,
    diamondReward: 100,
    isClaimed: false,
    type: 'weekly',
  },
  {
    id: 'm6',
    title: 'Arsenal Completo',
    description: 'Gana combates usando al menos 2 armas distintas',
    current: 2,
    target: 2,
    goldReward: 3000,
    passXpReward: 400,
    diamondReward: 50,
    isClaimed: false,
    type: 'weekly',
  },
];

const DEFAULT_LOGIN_DAYS: DailyLoginDay[] = [
  { day: 1, title: 'Día 1', rewardType: 'gold', amount: 1000, isClaimed: true },
  { day: 2, title: 'Día 2', rewardType: 'ticket', amount: 2, isClaimed: true },
  { day: 3, title: 'Día 3', rewardType: 'diamonds', amount: 150, isClaimed: false },
  { day: 4, title: 'Día 4', rewardType: 'gold', amount: 3000, isClaimed: false },
  { day: 5, title: 'Día 5', rewardType: 'ticket', amount: 4, isClaimed: false },
  { day: 6, title: 'Día 6', rewardType: 'diamonds', amount: 300, isClaimed: false },
  { day: 7, title: 'Día 7 (Gran Premio)', rewardType: 'skin', skin: 'plasma_dragon', isClaimed: false },
];

export class PlayerEconomy {
  private static instance: PlayerEconomy | null = null;
  public state: EconomyState;

  private constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): PlayerEconomy {
    if (!PlayerEconomy.instance) {
      PlayerEconomy.instance = new PlayerEconomy();
    }
    return PlayerEconomy.instance;
  }

  private loadState(): EconomyState {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          missions: parsed.missions || DEFAULT_MISSIONS,
          loginDays: parsed.loginDays || DEFAULT_LOGIN_DAYS,
          friends: parsed.friends || DEFAULT_FRIENDS,
          profile: {
            id: 'VTX-9041-ALFA',
            name: 'VORTEX_ALFA',
            level: parsed.profile?.level || 24,
            xp: parsed.profile?.xp || 3450,
            xpToNextLevel: parsed.profile?.xpToNextLevel || 5000,
            rankTitle: parsed.profile?.rankTitle || 'Comandante Élite ★★★',
            avatarIcon: parsed.profile?.avatarIcon || '⚡',
            stats: parsed.profile?.stats || {
              kdRatio: 3.48,
              matchesPlayed: 156,
              wins: 104,
              winRate: 66.6,
              headshots: 432,
              headshotRate: 42.8,
              titansDefeated: 19,
              favoriteWeapon: 'Fusil de Plasma "Viper-9"',
              favoriteMap: 'Neon Sector',
            },
          },
        };
      }
    } catch {
      // fallback
    }

    return {
      gold: 18500,
      diamonds: 950,
      royaleTickets: 8,
      unlockedSkins: ['cyber_noir'],
      profile: {
        id: 'VTX-9041-ALFA',
        name: 'VORTEX_ALFA',
        level: 24,
        xp: 3450,
        xpToNextLevel: 5000,
        rankTitle: 'Comandante Élite ★★★',
        avatarIcon: '⚡',
        stats: {
          kdRatio: 3.48,
          matchesPlayed: 156,
          wins: 104,
          winRate: 66.6,
          headshots: 432,
          headshotRate: 42.8,
          titansDefeated: 19,
          favoriteWeapon: 'Fusil de Plasma "Viper-9"',
          favoriteMap: 'Neon Sector',
        },
      },
      passLevel: 7,
      passXp: 450,
      passXpNeeded: 800,
      hasElitePass: false,
      claimedFreePassTiers: [1, 2, 3],
      claimedElitePassTiers: [],
      missions: DEFAULT_MISSIONS,
      loginDays: DEFAULT_LOGIN_DAYS,
      currentLoginDay: 3,
      purchasedShopItems: [],
      luckRoyaleSpinsCount: 14,
      luckRoyaleLuckyMeter: 48,
      friends: DEFAULT_FRIENDS,
    };
  }

  public saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save economy state to localStorage', e);
    }
  }

  public getPassTiers(): PassTier[] {
    return DEFAULT_PASS_TIERS;
  }

  public addGold(amount: number) {
    this.state.gold += amount;
    this.saveState();
  }

  public addDiamonds(amount: number) {
    this.state.diamonds += amount;
    this.saveState();
  }

  public addTickets(amount: number) {
    this.state.royaleTickets += amount;
    this.saveState();
  }

  public unlockSkin(skin: WeaponSkin) {
    if (!this.state.unlockedSkins.includes(skin)) {
      this.state.unlockedSkins.push(skin);
      this.saveState();
    }
  }

  public unlockElitePass(): boolean {
    const cost = 499;
    if (this.state.diamonds >= cost && !this.state.hasElitePass) {
      this.state.diamonds -= cost;
      this.state.hasElitePass = true;
      this.saveState();
      return true;
    }
    return false;
  }

  public claimPassReward(tierNumber: number, isElite: boolean): boolean {
    const tier = DEFAULT_PASS_TIERS.find((t) => t.level === tierNumber);
    if (!tier || this.state.passLevel < tierNumber) return false;

    if (isElite) {
      if (!this.state.hasElitePass) return false;
      if (this.state.claimedElitePassTiers.includes(tierNumber)) return false;
      this.state.claimedElitePassTiers.push(tierNumber);
      this.applyReward(tier.eliteReward);
      this.saveState();
      return true;
    } else {
      if (this.state.claimedFreePassTiers.includes(tierNumber)) return false;
      this.state.claimedFreePassTiers.push(tierNumber);
      this.applyReward(tier.freeReward);
      this.saveState();
      return true;
    }
  }

  public claimAllPassRewards(): number {
    let claimedCount = 0;
    DEFAULT_PASS_TIERS.forEach((tier) => {
      if (tier.level <= this.state.passLevel) {
        if (!this.state.claimedFreePassTiers.includes(tier.level)) {
          this.state.claimedFreePassTiers.push(tier.level);
          this.applyReward(tier.freeReward);
          claimedCount++;
        }
        if (this.state.hasElitePass && !this.state.claimedElitePassTiers.includes(tier.level)) {
          this.state.claimedElitePassTiers.push(tier.level);
          this.applyReward(tier.eliteReward);
          claimedCount++;
        }
      }
    });
    if (claimedCount > 0) this.saveState();
    return claimedCount;
  }

  public claimMission(missionId: string): boolean {
    const mission = this.state.missions.find((m) => m.id === missionId);
    if (!mission || mission.isClaimed || mission.current < mission.target) return false;

    mission.isClaimed = true;
    this.state.gold += mission.goldReward;
    if (mission.diamondReward) this.state.diamonds += mission.diamondReward;

    // Add pass XP
    this.addPassXp(mission.passXpReward);
    this.saveState();
    return true;
  }

  public addPassXp(xp: number) {
    this.state.passXp += xp;
    while (this.state.passXp >= this.state.passXpNeeded && this.state.passLevel < 10) {
      this.state.passXp -= this.state.passXpNeeded;
      this.state.passLevel += 1;
      this.state.passXpNeeded = Math.round(this.state.passXpNeeded * 1.15);
    }
    this.saveState();
  }

  public claimDailyLogin(dayNumber: number): boolean {
    const item = this.state.loginDays.find((d) => d.day === dayNumber);
    if (!item || item.isClaimed || dayNumber > this.state.currentLoginDay) return false;

    item.isClaimed = true;
    if (item.rewardType === 'gold' && item.amount) this.state.gold += item.amount;
    if (item.rewardType === 'diamonds' && item.amount) this.state.diamonds += item.amount;
    if (item.rewardType === 'ticket' && item.amount) this.state.royaleTickets += item.amount;
    if (item.rewardType === 'skin' && item.skin) this.unlockSkin(item.skin);

    this.saveState();
    return true;
  }

  public buyShopItem(item: ShopItem): { success: boolean; reason?: string } {
    if (item.skinId && this.state.unlockedSkins.includes(item.skinId)) {
      return { success: false, reason: 'Ya posees este aspecto en tu armería' };
    }

    if (item.priceType === 'diamonds') {
      if (this.state.diamonds < item.price) {
        return { success: false, reason: 'Diamantes Vortex insuficientes' };
      }
      this.state.diamonds -= item.price;
    } else {
      if (this.state.gold < item.price) {
        return { success: false, reason: 'Monedas de Oro insuficientes' };
      }
      this.state.gold -= item.price;
    }

    if (item.skinId) {
      this.unlockSkin(item.skinId);
    } else if (item.id === 'crate_tactical_elite') {
      this.state.gold += 3500;
      this.state.royaleTickets += 2;
    } else if (item.id === 'crate_royale_pack') {
      this.state.royaleTickets += 10;
    } else if (item.id === 'crate_legendary_armory') {
      this.state.gold += 5000;
      this.state.diamonds += 100;
      this.state.royaleTickets += 5;
      if (Math.random() < 0.35) {
        this.unlockSkin('toxic_hazard');
      }
    } else if (item.id === 'bundle_cyber_ops') {
      this.state.royaleTickets += 15;
      this.state.gold += 6000;
      this.state.diamonds += 150;
      this.unlockSkin('quantum_prism');
    }

    if (!this.state.purchasedShopItems.includes(item.id)) {
      this.state.purchasedShopItems.push(item.id);
    }

    this.saveState();
    return { success: true };
  }

  public spinLuckRoyale(times: 1 | 10): {
    success: boolean;
    reason?: string;
    itemsWon: Array<{ name: string; rarity: 'rare' | 'epic' | 'legendary' | 'mythic'; icon: string; skin?: WeaponSkin }>;
  } {
    const costTickets = times;
    const costGold = times === 1 ? 800 : 7200;

    let usedCurrency: 'tickets' | 'gold' | null = null;
    if (this.state.royaleTickets >= costTickets) {
      this.state.royaleTickets -= costTickets;
      usedCurrency = 'tickets';
    } else if (this.state.gold >= costGold) {
      this.state.gold -= costGold;
      usedCurrency = 'gold';
    } else {
      return {
        success: false,
        reason: `Necesitas ${costTickets} Tickets Royale o ${costGold} Monedas`,
        itemsWon: [],
      };
    }

    const itemsWon: Array<{
      name: string;
      rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
      icon: string;
      skin?: WeaponSkin;
    }> = [];

    for (let i = 0; i < times; i++) {
      this.state.luckRoyaleSpinsCount++;
      this.state.luckRoyaleLuckyMeter = Math.min(100, this.state.luckRoyaleLuckyMeter + (times === 1 ? 2 : 2.5));

      // Check for Mythic Jackpot
      const isJackpotGuaranteed = this.state.luckRoyaleLuckyMeter >= 100;
      const roll = Math.random() * 100;

      if (isJackpotGuaranteed || roll < 5) {
        // Mythic Skin!
        const pickSamurai = Math.random() < 0.5;
        const skinToGive: WeaponSkin = pickSamurai ? 'cyber_samurai' : 'plasma_dragon';
        this.unlockSkin(skinToGive);
        this.state.luckRoyaleLuckyMeter = 0; // reset meter
        itemsWon.push({
          name: pickSamurai
            ? '¡GRAN PREMIO MÍTICO! Skin Samurai Ciber'
            : '¡GRAN PREMIO MÍTICO! Skin Dragón de Plasma',
          rarity: 'mythic',
          icon: pickSamurai ? '⚔️' : '🔥',
          skin: skinToGive,
        });
      } else if (roll < 16) {
        // Legendary Skin options
        const rollLeg = Math.random();
        let legSkin: WeaponSkin = 'void_stalker';
        let legName = 'Skin Legendaria Acechador del Vacío';
        let legIcon = '🌌';

        if (rollLeg < 0.35) {
          legSkin = 'toxic_hazard';
          legName = 'Skin Legendaria Biohazard Tóxico';
          legIcon = '☣️';
        } else if (rollLeg < 0.7) {
          legSkin = 'solar_flare';
          legName = 'Skin Legendaria Fulgor Solar';
          legIcon = '☀️';
        }

        this.unlockSkin(legSkin);
        itemsWon.push({
          name: legName,
          rarity: 'legendary',
          icon: legIcon,
          skin: legSkin,
        });
      } else if (roll < 34) {
        // Epic: Skin Prisma Cuántico, Skin Hiper Oro o 200 Diamantes
        const rollEpic = Math.random();
        if (rollEpic < 0.35 && !this.state.unlockedSkins.includes('quantum_prism')) {
          this.unlockSkin('quantum_prism');
          itemsWon.push({
            name: 'Skin Élite Prisma Cuántico',
            rarity: 'epic',
            icon: '💎',
            skin: 'quantum_prism',
          });
        } else if (rollEpic < 0.7 && !this.state.unlockedSkins.includes('hyper_gold')) {
          this.unlockSkin('hyper_gold');
          itemsWon.push({
            name: 'Skin Élite Hiper Oro 24K',
            rarity: 'epic',
            icon: '👑',
            skin: 'hyper_gold',
          });
        } else {
          this.state.diamonds += 180;
          itemsWon.push({
            name: '180 Diamantes Vortex',
            rarity: 'epic',
            icon: '💎',
          });
        }
      } else if (roll < 62) {
        // Rare: Tickets Royale Extra
        const tCount = Math.random() < 0.3 ? 2 : 1;
        this.state.royaleTickets += tCount;
        itemsWon.push({
          name: `${tCount} Ticket${tCount > 1 ? 's' : ''} Royale Extra`,
          rarity: 'rare',
          icon: '🎟️',
        });
      } else {
        // Common / Rare: Oro masivo
        const goldGain = Math.floor(Math.random() * 600) + 500;
        this.state.gold += goldGain;
        itemsWon.push({
          name: `${goldGain} Monedas de Oro`,
          rarity: 'rare',
          icon: '🪙',
        });
      }
    }

    this.saveState();
    return { success: true, itemsWon };
  }

  private applyReward(reward: PassTier['freeReward']) {
    if (reward.type === 'gold' && reward.amount) this.state.gold += reward.amount;
    if (reward.type === 'diamonds' && reward.amount) this.state.diamonds += reward.amount;
    if (reward.type === 'ticket' && reward.amount) this.state.royaleTickets += reward.amount;
    if (reward.type === 'skin' && reward.skin) this.unlockSkin(reward.skin);
  }

  // Social & Friends Methods
  public addFriendById(idInput: string): { success: boolean; message: string; friend?: FriendUser } {
    const cleanId = idInput.trim().toUpperCase();
    if (!cleanId) {
      return { success: false, message: 'Ingresa un ID de jugador válido (Ej: VTX-4821)' };
    }

    if (cleanId === this.state.profile.id || cleanId === 'VTX-9041' || cleanId === 'VTX-9041-ALFA') {
      return { success: false, message: 'No puedes agregarte a ti mismo como amigo' };
    }

    const existing = this.state.friends.find(
      (f) => f.id.toUpperCase() === cleanId || f.name.toUpperCase() === cleanId
    );
    if (existing) {
      return { success: false, message: `Ya tienes a ${existing.name} (${existing.id}) en tu lista de amigos` };
    }

    // Realistic procedural operative generation for new IDs
    const avatarList = ['🤖', '🦅', '🎯', '🐺', '⭐', '🛡️', '⚡', '🔥'];
    const titleList = ['Operativo Élite', 'Cazador Cibernético', 'Francotirador Alfa', 'Vanguardia Táctica', 'Centinela Apex'];
    const weaponList = ['Fusil de Plasma "Viper-9"', 'Cañón de Riel "Thor-Rail"', 'Escopeta Cuántica "Scatter-X"', 'Pistola Láser "Pulsar-7"'];
    const mapList = ['Neon Sector', 'Hangar Cyberpunk', 'Campo Polar'];

    const numHash = cleanId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const formattedId = cleanId.startsWith('VTX-') ? cleanId : `VTX-${cleanId}`;
    const newFriend: FriendUser = {
      id: formattedId,
      name: cleanId.startsWith('VTX-') ? `AGENTE_${cleanId.replace('VTX-', '')}` : cleanId,
      level: 16 + (numHash % 25),
      avatarIcon: avatarList[numHash % avatarList.length],
      rankTitle: titleList[numHash % titleList.length],
      status: numHash % 2 === 0 ? 'online' : 'in_match',
      statusDetail: numHash % 2 === 0 ? 'En el Lobby' : 'Supervivencia - Oleada 5',
      stats: {
        kdRatio: parseFloat((2.1 + (numHash % 32) / 10).toFixed(2)),
        matchesPlayed: 65 + (numHash % 130),
        wins: 38 + (numHash % 75),
        winRate: parseFloat((55 + (numHash % 24)).toFixed(1)),
        headshots: 140 + (numHash % 280),
        headshotRate: parseFloat((32 + (numHash % 20)).toFixed(1)),
        titansDefeated: 5 + (numHash % 16),
        favoriteWeapon: weaponList[numHash % weaponList.length],
        favoriteMap: mapList[numHash % mapList.length],
      },
    };

    this.state.friends.unshift(newFriend);
    this.saveState();
    return {
      success: true,
      message: `¡${newFriend.name} (${newFriend.id}) ha sido agregado a tu lista de amigos!`,
      friend: newFriend,
    };
  }

  public removeFriend(id: string): boolean {
    const idx = this.state.friends.findIndex((f) => f.id === id);
    if (idx !== -1) {
      this.state.friends.splice(idx, 1);
      this.saveState();
      return true;
    }
    return false;
  }

  public toggleFavoriteFriend(id: string): boolean {
    const friend = this.state.friends.find((f) => f.id === id);
    if (friend) {
      friend.isFavorite = !friend.isFavorite;
      this.saveState();
      return true;
    }
    return false;
  }

  public inviteFriendToSquad(friendId: string): { success: boolean; message: string } {
    const friend = this.state.friends.find((f) => f.id === friendId);
    if (!friend) return { success: false, message: 'Jugador no encontrado' };
    if (friend.status === 'offline') {
      return { success: false, message: `${friend.name} está desconectado en este momento` };
    }
    return { success: true, message: `¡Invitación de escuadrón enviada a ${friend.name}!` };
  }
}
