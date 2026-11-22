export type TimeOfDay = 'day' | 'sunset' | 'night' | 'blood_moon';

export interface AnimalSpawnCounts {
  lions: number;
  tigers: number;
  wolves: number;
  crocodiles: number;
  bears: number;
  boars: number;
  deer: number;
  mammoths: number;
  tortoises: number;
  snakes: number;
  sharks: number;
  mermaids: number;
}

export interface CustomSpawnsConfig {
  tanks: number;
  helicopters: number;
  sharks: number;
  lions: number;
}

export interface LiveGameConfig {
  // Combat & Physics
  playerMaxHp: number;
  playerSpeed: number;
  jumpForce: number;
  gravity: number;
  enemyBotHp: number;
  enemyBotDamage: number;
  weaponDamageMultiplier: number;
  unlimitedAmmo: boolean;

  // Vehicles, Ships & Creatures
  jeepHp: number;
  carHp: number;
  bikeHp: number;
  horseHp: number;
  sharkWhaleHp: number;
  vehicleHpMultiplier: number;
  boatSpeedMultiplier: number;
  creatureSpeedMultiplier: number;

  // Tribal Island & Wildlife
  tribalWarriorHp: number;
  tribalArrowDamage: number;
  captureEscapeSeconds: number;
  animalSpawnCounts: AnimalSpawnCounts;
  customSpawns: CustomSpawnsConfig;
  fruitHealAmount: number;

  // Economy & World
  coinRewardMultiplier: number;
  lobbyBotCount: number;
  safeZoneSpeedMultiplier: number;
  timeOfDay: TimeOfDay;
  globalBannerMessage: string;
}

export interface LiveConfigPatch {
  playerMaxHp?: number;
  playerSpeed?: number;
  jumpForce?: number;
  gravity?: number;
  enemyBotHp?: number;
  enemyBotDamage?: number;
  weaponDamageMultiplier?: number;
  unlimitedAmmo?: boolean;
  jeepHp?: number;
  carHp?: number;
  bikeHp?: number;
  horseHp?: number;
  sharkWhaleHp?: number;
  vehicleHpMultiplier?: number;
  boatSpeedMultiplier?: number;
  creatureSpeedMultiplier?: number;
  tribalWarriorHp?: number;
  tribalArrowDamage?: number;
  captureEscapeSeconds?: number;
  animalSpawnCounts?: Partial<AnimalSpawnCounts>;
  customSpawns?: Partial<CustomSpawnsConfig>;
  fruitHealAmount?: number;
  coinRewardMultiplier?: number;
  lobbyBotCount?: number;
  safeZoneSpeedMultiplier?: number;
  timeOfDay?: TimeOfDay;
  globalBannerMessage?: string;
}

export interface LiveConfigVersionEntry {
  version: string;
  updatedAt: string;
  summary: string;
  patch: LiveConfigPatch;
  config: LiveGameConfig;
}

export interface ConfigDiffItem {
  key: string;
  before: unknown;
  after: unknown;
}

export const DEFAULT_ANIMAL_SPAWN_COUNTS: AnimalSpawnCounts = {
  lions: 3,
  tigers: 3,
  wolves: 3,
  crocodiles: 5,
  bears: 2,
  boars: 3,
  deer: 4,
  mammoths: 2,
  tortoises: 3,
  snakes: 8,
  sharks: 4,
  mermaids: 4,
};

export const DEFAULT_CUSTOM_SPAWNS: CustomSpawnsConfig = {
  tanks: 0,
  helicopters: 0,
  sharks: 0,
  lions: 0,
};

export const DEFAULT_LIVE_GAME_CONFIG: LiveGameConfig = {
  playerMaxHp: 100,
  playerSpeed: 12.2,
  jumpForce: 15.2,
  gravity: 36,
  enemyBotHp: 75,
  enemyBotDamage: 1.0,
  weaponDamageMultiplier: 1.0,
  unlimitedAmmo: false,

  jeepHp: 1500,
  carHp: 1000,
  bikeHp: 650,
  horseHp: 800,
  sharkWhaleHp: 900,
  vehicleHpMultiplier: 1.0,
  boatSpeedMultiplier: 1.0,
  creatureSpeedMultiplier: 1.0,

  tribalWarriorHp: 90,
  tribalArrowDamage: 16,
  captureEscapeSeconds: 3.0,
  animalSpawnCounts: { ...DEFAULT_ANIMAL_SPAWN_COUNTS },
  customSpawns: { ...DEFAULT_CUSTOM_SPAWNS },
  fruitHealAmount: 15,

  coinRewardMultiplier: 1.0,
  lobbyBotCount: 49,
  safeZoneSpeedMultiplier: 1.0,
  timeOfDay: 'day',
  globalBannerMessage: '',
};

function clampNum(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  return Math.round(clampNum(v, fallback, min, max));
}

export function normalizeLiveGameConfig(raw?: Partial<LiveGameConfig> | null): LiveGameConfig {
  const r = raw ?? {};
  const ac = r.animalSpawnCounts ?? ({} as Partial<AnimalSpawnCounts>);
  const cs = r.customSpawns ?? ({} as Partial<CustomSpawnsConfig>);
  const validTimes: TimeOfDay[] = ['day', 'sunset', 'night', 'blood_moon'];
  const tod = validTimes.includes(r.timeOfDay as TimeOfDay) ? (r.timeOfDay as TimeOfDay) : 'day';

  return {
    playerMaxHp: clampInt(r.playerMaxHp, DEFAULT_LIVE_GAME_CONFIG.playerMaxHp, 25, 9999),
    playerSpeed: clampNum(r.playerSpeed, DEFAULT_LIVE_GAME_CONFIG.playerSpeed, 4, 40),
    jumpForce: clampNum(r.jumpForce, DEFAULT_LIVE_GAME_CONFIG.jumpForce, 6, 45),
    gravity: clampNum(r.gravity, DEFAULT_LIVE_GAME_CONFIG.gravity, 8, 80),
    enemyBotHp: clampInt(r.enemyBotHp, DEFAULT_LIVE_GAME_CONFIG.enemyBotHp, 10, 5000),
    enemyBotDamage: clampNum(r.enemyBotDamage, DEFAULT_LIVE_GAME_CONFIG.enemyBotDamage, 0.1, 10),
    weaponDamageMultiplier: clampNum(
      r.weaponDamageMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.weaponDamageMultiplier,
      0.1,
      20
    ),
    unlimitedAmmo: Boolean(r.unlimitedAmmo ?? DEFAULT_LIVE_GAME_CONFIG.unlimitedAmmo),

    jeepHp: clampInt(r.jeepHp, DEFAULT_LIVE_GAME_CONFIG.jeepHp, 100, 99999),
    carHp: clampInt(r.carHp, DEFAULT_LIVE_GAME_CONFIG.carHp, 100, 99999),
    bikeHp: clampInt(r.bikeHp, DEFAULT_LIVE_GAME_CONFIG.bikeHp, 100, 99999),
    horseHp: clampInt(r.horseHp, DEFAULT_LIVE_GAME_CONFIG.horseHp, 100, 99999),
    sharkWhaleHp: clampInt(r.sharkWhaleHp, DEFAULT_LIVE_GAME_CONFIG.sharkWhaleHp, 100, 99999),
    vehicleHpMultiplier: clampNum(
      r.vehicleHpMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.vehicleHpMultiplier,
      0.2,
      20
    ),
    boatSpeedMultiplier: clampNum(
      r.boatSpeedMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.boatSpeedMultiplier,
      0.3,
      5
    ),
    creatureSpeedMultiplier: clampNum(
      r.creatureSpeedMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.creatureSpeedMultiplier,
      0.3,
      5
    ),

    tribalWarriorHp: clampInt(r.tribalWarriorHp, DEFAULT_LIVE_GAME_CONFIG.tribalWarriorHp, 15, 2500),
    tribalArrowDamage: clampInt(
      r.tribalArrowDamage,
      DEFAULT_LIVE_GAME_CONFIG.tribalArrowDamage,
      2,
      200
    ),
    captureEscapeSeconds: clampNum(
      r.captureEscapeSeconds,
      DEFAULT_LIVE_GAME_CONFIG.captureEscapeSeconds,
      1,
      15
    ),
    animalSpawnCounts: {
      lions: clampInt(ac.lions, DEFAULT_ANIMAL_SPAWN_COUNTS.lions, 0, 16),
      tigers: clampInt(ac.tigers, DEFAULT_ANIMAL_SPAWN_COUNTS.tigers, 0, 16),
      wolves: clampInt(ac.wolves, DEFAULT_ANIMAL_SPAWN_COUNTS.wolves, 0, 16),
      crocodiles: clampInt(ac.crocodiles, DEFAULT_ANIMAL_SPAWN_COUNTS.crocodiles, 0, 16),
      bears: clampInt(ac.bears, DEFAULT_ANIMAL_SPAWN_COUNTS.bears, 0, 12),
      boars: clampInt(ac.boars, DEFAULT_ANIMAL_SPAWN_COUNTS.boars, 0, 16),
      deer: clampInt(ac.deer, DEFAULT_ANIMAL_SPAWN_COUNTS.deer, 0, 16),
      mammoths: clampInt(ac.mammoths, DEFAULT_ANIMAL_SPAWN_COUNTS.mammoths, 0, 10),
      tortoises: clampInt(ac.tortoises, DEFAULT_ANIMAL_SPAWN_COUNTS.tortoises, 0, 14),
      snakes: clampInt(ac.snakes, DEFAULT_ANIMAL_SPAWN_COUNTS.snakes, 0, 24),
      sharks: clampInt(ac.sharks, DEFAULT_ANIMAL_SPAWN_COUNTS.sharks, 0, 12),
      mermaids: clampInt(ac.mermaids, DEFAULT_ANIMAL_SPAWN_COUNTS.mermaids, 0, 8),
    },
    customSpawns: {
      tanks: clampInt(cs.tanks, DEFAULT_CUSTOM_SPAWNS.tanks, 0, 16),
      helicopters: clampInt(cs.helicopters, DEFAULT_CUSTOM_SPAWNS.helicopters, 0, 16),
      sharks: clampInt(cs.sharks, DEFAULT_CUSTOM_SPAWNS.sharks, 0, 16),
      lions: clampInt(cs.lions, DEFAULT_CUSTOM_SPAWNS.lions, 0, 16),
    },
    fruitHealAmount: clampInt(r.fruitHealAmount, DEFAULT_LIVE_GAME_CONFIG.fruitHealAmount, 5, 100),

    coinRewardMultiplier: clampNum(
      r.coinRewardMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.coinRewardMultiplier,
      0.25,
      20
    ),
    lobbyBotCount: clampInt(r.lobbyBotCount, DEFAULT_LIVE_GAME_CONFIG.lobbyBotCount, 2, 49),
    safeZoneSpeedMultiplier: clampNum(
      r.safeZoneSpeedMultiplier,
      DEFAULT_LIVE_GAME_CONFIG.safeZoneSpeedMultiplier,
      0.25,
      5
    ),
    timeOfDay: tod,
    globalBannerMessage:
      typeof r.globalBannerMessage === 'string' ? r.globalBannerMessage.trim().slice(0, 140) : '',
  };
}

export function applyConfigPatch(base: LiveGameConfig, patch?: LiveConfigPatch | null): LiveGameConfig {
  if (!patch) return normalizeLiveGameConfig(base);
  return normalizeLiveGameConfig({
    ...base,
    ...patch,
    animalSpawnCounts: {
      ...base.animalSpawnCounts,
      ...(patch.animalSpawnCounts || {}),
    },
    customSpawns: {
      ...base.customSpawns,
      ...(patch.customSpawns || {}),
    },
  });
}

export function computeConfigDiff(prev: LiveGameConfig, next: LiveGameConfig): ConfigDiffItem[] {
  const diffs: ConfigDiffItem[] = [];
  const topKeys = Object.keys(DEFAULT_LIVE_GAME_CONFIG) as Array<keyof LiveGameConfig>;
  for (const k of topKeys) {
    if (k === 'animalSpawnCounts') {
      const aKeys = Object.keys(DEFAULT_ANIMAL_SPAWN_COUNTS) as Array<keyof AnimalSpawnCounts>;
      for (const ak of aKeys) {
        if (prev.animalSpawnCounts[ak] !== next.animalSpawnCounts[ak]) {
          diffs.push({
            key: `animalSpawnCounts.${ak}`,
            before: prev.animalSpawnCounts[ak],
            after: next.animalSpawnCounts[ak],
          });
        }
      }
    } else if (k === 'customSpawns') {
      const cKeys = Object.keys(DEFAULT_CUSTOM_SPAWNS) as Array<keyof CustomSpawnsConfig>;
      for (const ck of cKeys) {
        if (prev.customSpawns[ck] !== next.customSpawns[ck]) {
          diffs.push({
            key: `customSpawns.${ck}`,
            before: prev.customSpawns[ck],
            after: next.customSpawns[ck],
          });
        }
      }
    } else if (prev[k] !== next[k]) {
      diffs.push({
        key: k,
        before: prev[k],
        after: next[k],
      });
    }
  }
  return diffs;
}

export function extractBannerFromPrompt(prompt: string): string | null {
  const colonDirect = prompt.match(/(?:^|\s)banner\s*:\s*(.{2,140})$/i);
  if (colonDirect) return colonDirect[1].replace(/^["'`]|["'`]$/g, '').trim();
  const quoted = prompt.match(/(?:banner|message|announcement|event|alert)\s*(?:to|:|=|reading|saying)?\s*["'`]([^"'`]{2,140})["'`]/i);
  if (quoted) return quoted[1].trim();
  const direct = prompt.match(/set\s+(?:global\s+)?banner\s+(?:message\s+)?to\s+(.{2,120})$/i);
  if (direct) return direct[1].replace(/["'`]/g, '').trim();
  return null;
}

export function parseNaturalLanguageGamePatch(
  prompt: string,
  current: LiveGameConfig
): { patch: LiveConfigPatch; summary: string } {
  const low = prompt.toLowerCase();
  const patch: LiveConfigPatch = {};
  const animalPatch: Partial<AnimalSpawnCounts> = {};
  const spawnPatch: Partial<CustomSpawnsConfig> = {};
  const notes: string[] = [];

  if (/\breset\b|\bdefault\b|\brestore defaults\b/.test(low)) {
    return {
      patch: {
        ...DEFAULT_LIVE_GAME_CONFIG,
        animalSpawnCounts: { ...DEFAULT_ANIMAL_SPAWN_COUNTS },
        customSpawns: { ...DEFAULT_CUSTOM_SPAWNS },
      },
      summary: 'Reset all gameplay, vehicle, wildlife, custom spawns, and world parameters to default values.',
    };
  }

  // Unlimited / Infinite Ammo
  if (/infinite\s*ammo|unlimited\s*ammo|no\s*reload/.test(low)) {
    patch.unlimitedAmmo = true;
    notes.push('Enabled unlimited ammo');
  } else if (/limited\s*ammo|normal\s*ammo|disable\s*unlimited\s*ammo/.test(low)) {
    patch.unlimitedAmmo = false;
    notes.push('Restored standard magazine ammo');
  }

  // Indestructible / Custom Vehicle & Mount HP
  const vehicleHpDirect = low.match(/vehicle\s*(?:max\s*)?hp\s*(?:to|=|:)?\s*(\d{2,5})/i);
  const playerHpDirect = low.match(/(?:player|my|hero)\s*(?:max\s*)?hp\s*(?:to|=|:)?\s*(\d{2,5})/i);
  const botHpDirect = low.match(/(?:bot|enemy|enemies)\s*(?:max\s*)?hp\s*(?:to|=|:)?\s*(\d{1,5})/i);
  const hpNumMatch = low.match(/(?:to|=)?\s*(\d{2,5})\s*hp/);
  const explicitHp = hpNumMatch ? Number(hpNumMatch[1]) : null;

  if (playerHpDirect) {
    patch.playerMaxHp = Number(playerHpDirect[1]);
    notes.push(`Player Max HP = ${patch.playerMaxHp}`);
  }
  if (botHpDirect) {
    patch.enemyBotHp = Number(botHpDirect[1]);
    notes.push(`Enemy Bot HP = ${patch.enemyBotHp}`);
  }
  if (vehicleHpDirect) {
    const vhp = Number(vehicleHpDirect[1]);
    patch.carHp = vhp;
    patch.bikeHp = Math.max(100, Math.round(vhp * 0.75));
    patch.jeepHp = Math.max(100, Math.round(vhp * 1.15));
    patch.vehicleHpMultiplier = Math.max(0.25, Math.min(20, Number((vhp / 450).toFixed(2))));
    notes.push(`Vehicle HP = ${vhp} (x${patch.vehicleHpMultiplier})`);
  } else if (/indestructible|invincible|god\s*mode\s*vehicle|unbreakable/.test(low)) {
    const val = explicitHp ?? 9999;
    if (/car/.test(low)) {
      patch.carHp = val;
      notes.push(`Car HP set to ${val}`);
    }
    if (/bike/.test(low)) {
      patch.bikeHp = val;
      notes.push(`Bike HP set to ${val}`);
    }
    if (/jeep|buggy|4x4/.test(low)) {
      patch.jeepHp = val;
      notes.push(`Jeep HP set to ${val}`);
    }
    if (/horse/.test(low)) {
      patch.horseHp = val;
      notes.push(`Horse HP set to ${val}`);
    }
    if (/shark|whale|marine/.test(low)) {
      patch.sharkWhaleHp = val;
      notes.push(`Shark/Whale HP set to ${val}`);
    }
    if (/vehicle|all|transport/.test(low) || (!/car|bike|jeep|horse|shark|whale/.test(low))) {
      patch.carHp = val;
      patch.bikeHp = val;
      patch.jeepHp = val;
      patch.vehicleHpMultiplier = Math.max(1, Math.min(20, Math.round(val / 450)));
      notes.push(`All land vehicles set to ${val} HP`);
    }
  } else if (explicitHp !== null) {
    if (/car/.test(low)) {
      patch.carHp = explicitHp;
      notes.push(`Car HP = ${explicitHp}`);
    } else if (/bike/.test(low)) {
      patch.bikeHp = explicitHp;
      notes.push(`Bike HP = ${explicitHp}`);
    } else if (/jeep|buggy/.test(low)) {
      patch.jeepHp = explicitHp;
      notes.push(`Jeep HP = ${explicitHp}`);
    } else if (/horse/.test(low)) {
      patch.horseHp = explicitHp;
      notes.push(`Horse HP = ${explicitHp}`);
    } else if (/shark|whale/.test(low)) {
      patch.sharkWhaleHp = explicitHp;
      notes.push(`Shark/Whale HP = ${explicitHp}`);
    } else if (/tribal|warrior|villager/.test(low)) {
      patch.tribalWarriorHp = explicitHp;
      notes.push(`Tribal Warrior HP = ${explicitHp}`);
    } else if (/bot|enemy|enemies/.test(low) && !botHpDirect) {
      patch.enemyBotHp = explicitHp;
      notes.push(`Enemy Bot HP = ${explicitHp}`);
    } else if (/player|my\s*hp|max\s*hp/.test(low) && !playerHpDirect) {
      patch.playerMaxHp = explicitHp;
      notes.push(`Player Max HP = ${explicitHp}`);
    }
  }

  // Time of Day & Lighting
  if (/blood\s*moon/.test(low)) {
    patch.timeOfDay = 'blood_moon';
    notes.push('World lighting changed to Blood Moon');
  } else if (/night|midnight|dark\s*mode/.test(low)) {
    patch.timeOfDay = 'night';
    notes.push('World lighting changed to Night');
  } else if (/sunset|dusk|golden\s*hour|evening/.test(low)) {
    patch.timeOfDay = 'sunset';
    notes.push('World lighting changed to Sunset');
  } else if (/daytime|daylight|sunny|morning|\bday\b/.test(low)) {
    patch.timeOfDay = 'day';
    notes.push('World lighting changed to Day');
  }

  // Coin Multiplier
  const multMatch = low.match(/(\d+(?:\.\d+)?)\s*x|x\s*(\d+(?:\.\d+)?)/);
  const multNum = multMatch ? Number(multMatch[1] || multMatch[2]) : null;
  const coinMultSpecific = low.match(/coins?\s*(?:x\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*x)/);
  if (coinMultSpecific) {
    const val = Number(coinMultSpecific[1] || coinMultSpecific[2]);
    patch.coinRewardMultiplier = val;
    notes.push(`Coin rewards set to ${val}x`);
  } else if (/double\s*coin|2x\s*coin|coins?\s*x2/.test(low)) {
    patch.coinRewardMultiplier = 2;
    notes.push('Coin rewards set to 2x');
  } else if (/triple\s*coin|3x\s*coin/.test(low)) {
    patch.coinRewardMultiplier = 3;
    notes.push('Coin rewards set to 3x');
  } else if (/coin/.test(low) && multNum) {
    patch.coinRewardMultiplier = multNum;
    notes.push(`Coin rewards set to ${multNum}x`);
  }

  // Speed & Physics
  const speedMultSpecific = low.match(/speed\s*(?:x\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*x)|(\d+(?:\.\d+)?)\s*x\s*speed/);
  const jumpMultSpecific = low.match(/jump\s*(?:x\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*x)|(\d+(?:\.\d+)?)\s*x\s*jump/);

  if (/low\s*gravity|moon\s*gravity|space\s*gravity/.test(low)) {
    patch.gravity = 16;
    patch.jumpForce = 22;
    notes.push('Moon gravity (16) + High Jump (22)');
  } else if (jumpMultSpecific) {
    const jf = Number(jumpMultSpecific[1] || jumpMultSpecific[2] || jumpMultSpecific[3]);
    patch.jumpForce = Math.max(6, Math.min(45, Math.round(DEFAULT_LIVE_GAME_CONFIG.jumpForce * jf)));
    notes.push(`Jump force x${jf} (${patch.jumpForce})`);
  } else if (/high\s*jump|super\s*jump|mega\s*jump/.test(low)) {
    patch.jumpForce = 24;
    notes.push('Super jump force = 24');
  }
  if (speedMultSpecific) {
    const sf = Number(speedMultSpecific[1] || speedMultSpecific[2] || speedMultSpecific[3]);
    patch.playerSpeed = Math.max(4, Math.min(40, Math.round(DEFAULT_LIVE_GAME_CONFIG.playerSpeed * sf)));
    notes.push(`Player speed x${sf} (${patch.playerSpeed})`);
  } else if (/super\s*speed|turbo\s*player|fast\s*run|2x\s*speed/.test(low)) {
    patch.playerSpeed = 20;
    notes.push('Player speed boosted to 20');
  }
  if (/fast\s*boat|turbo\s*boat|boat\s*speed|ship\s*speed/.test(low)) {
    patch.boatSpeedMultiplier = multNum || 1.8;
    notes.push(`Boat speed x${patch.boatSpeedMultiplier}`);
  }
  if (/creature\s*speed|shark\s*speed|whale\s*speed/.test(low)) {
    patch.creatureSpeedMultiplier = multNum || 1.8;
    notes.push(`Sea creature speed x${patch.creatureSpeedMultiplier}`);
  }
  if (/safe\s*zone|storm|circle/.test(low) && /fast|quick|2x|double|speed/.test(low)) {
    patch.safeZoneSpeedMultiplier = multNum || 2.0;
    notes.push(`Safe Zone shrink speed x${patch.safeZoneSpeedMultiplier}`);
  }

  // Weapon Damage
  if (/one\s*shot|insta\s*kill|1\s*shot/.test(low)) {
    patch.weaponDamageMultiplier = 4.0;
    notes.push('Weapon damage boosted 4x');
  } else if (/damage|gun/.test(low) && (multNum || /double/.test(low))) {
    patch.weaponDamageMultiplier = multNum || 2.0;
    notes.push(`Weapon damage x${patch.weaponDamageMultiplier}`);
  }

  // Tribal / Wildlife Spawns
  if (/shark/.test(low) && (/double|2x|more|triple|3x|\d+/.test(low))) {
    const f = /triple|3x/.test(low) ? 3 : /double|2x/.test(low) ? 2 : multNum || 2;
    animalPatch.sharks = Math.min(12, Math.round(current.animalSpawnCounts.sharks * f));
    notes.push(`Sharks count -> ${animalPatch.sharks}`);
  }
  if (/lion/.test(low) && (/double|2x|more|triple|3x/.test(low))) {
    const f = /triple|3x/.test(low) ? 3 : /double|2x/.test(low) ? 2 : multNum || 2;
    animalPatch.lions = Math.min(16, Math.round(current.animalSpawnCounts.lions * f));
    notes.push(`Lions count -> ${animalPatch.lions}`);
  }
  if (/snake|cobra|viper/.test(low) && (/double|2x|more|triple|3x/.test(low))) {
    const f = /triple|3x/.test(low) ? 3 : /double|2x/.test(low) ? 2 : multNum || 2;
    animalPatch.snakes = Math.min(24, Math.round(current.animalSpawnCounts.snakes * f));
    notes.push(`Snakes count -> ${animalPatch.snakes}`);
  }
  if (/crocodile|croc/.test(low) && (/double|2x|more|triple|3x/.test(low))) {
    const f = /triple|3x/.test(low) ? 3 : /double|2x/.test(low) ? 2 : multNum || 2;
    animalPatch.crocodiles = Math.min(16, Math.round(current.animalSpawnCounts.crocodiles * f));
    notes.push(`Crocodiles count -> ${animalPatch.crocodiles}`);
  }
  if (/mermaid/.test(low) && (/double|2x|more|triple|3x/.test(low))) {
    const f = /triple|3x/.test(low) ? 3 : /double|2x/.test(low) ? 2 : multNum || 2;
    animalPatch.mermaids = Math.min(8, Math.round(current.animalSpawnCounts.mermaids * f));
    notes.push(`Mermaids count -> ${animalPatch.mermaids}`);
  }
  if (/tribal\s*(?:arrow|spear)\s*damage/.test(low)) {
    const dm = low.match(/(\d{1,3})/);
    if (dm) {
      patch.tribalArrowDamage = Number(dm[1]);
      notes.push(`Tribal spear/arrow damage = ${patch.tribalArrowDamage}`);
    }
  }
  if (/fruit\s*heal/.test(low)) {
    const fm = low.match(/(\d{1,3})/);
    if (fm) {
      patch.fruitHealAmount = Number(fm[1]);
      notes.push(`Fruit heal = +${patch.fruitHealAmount} HP`);
    }
  }
  if (/escape\s*seconds|rope/.test(low)) {
    const rm = low.match(/(\d+(?:\.\d+)?)\s*s/);
    if (rm) {
      patch.captureEscapeSeconds = Number(rm[1]);
      notes.push(`Rope struggle escape = ${patch.captureEscapeSeconds}s`);
    }
  }

  // Banner message extraction
  const banner = extractBannerFromPrompt(prompt);
  if (banner) {
    patch.globalBannerMessage = banner;
    notes.push(`Global banner set: "${banner}"`);
  } else if (/clear\s*banner|remove\s*banner|no\s*banner/.test(low)) {
    patch.globalBannerMessage = '';
    notes.push('Cleared global banner');
  }

  if (Object.keys(animalPatch).length > 0) {
    patch.animalSpawnCounts = animalPatch;
  }
  if (Object.keys(spawnPatch).length > 0) {
    patch.customSpawns = spawnPatch;
  }

  // Auto-generate friendly event banner if a theme event was prompted
  if (!patch.globalBannerMessage && notes.length === 0) {
    const clean = prompt.trim().slice(0, 90);
    patch.globalBannerMessage = clean ? `LIVE EVENT: ${clean}` : 'LIVE UPDATE ACTIVE';
    notes.push(`Published live event banner: "${patch.globalBannerMessage}"`);
  }

  return {
    patch,
    summary: notes.join(' · ') || 'Generated live configuration update.',
  };
}
