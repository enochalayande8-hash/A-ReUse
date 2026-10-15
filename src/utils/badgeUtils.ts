import { User } from '../types';

export interface MovementBadge {
  id: string;
  name: string;
  description: string;
  requirement: string;
  category: 'MILESTONE' | 'IMPACT' | 'HABIT' | 'STEWARDSHIP';
  iconType: 'sparkles' | 'award' | 'leaf' | 'shield' | 'crown' | 'bag' | 'earth' | 'flame';
  isUnlocked: (user: Partial<User>) => boolean;
  getProgress: (user: Partial<User>) => { current: number; target: number; unit: string };
}

export const ALL_MOVEMENT_BADGES: MovementBadge[] = [
  {
    id: 'inaugural_action',
    name: 'Inaugural Action',
    description: 'Submitted and verified your first photographic proof of reusable bag action.',
    requirement: '1 verified action',
    category: 'MILESTONE',
    iconType: 'sparkles',
    isUnlocked: (u) => (u.verifiedActionsCount || 0) >= 1,
    getProgress: (u) => ({
      current: Math.min(u.verifiedActionsCount || 0, 1),
      target: 1,
      unit: 'action',
    }),
  },
  {
    id: 'plastic_reducer_10',
    name: 'Plastic Reducer',
    description: 'Prevented 10 or more single-use plastic bags from entering ecosystems and waterways.',
    requirement: '10 bags avoided',
    category: 'IMPACT',
    iconType: 'award',
    isUnlocked: (u) => (u.verifiedBagsAvoided || 0) >= 10,
    getProgress: (u) => ({
      current: Math.min(u.verifiedBagsAvoided || 0, 10),
      target: 10,
      unit: 'bags',
    }),
  },
  {
    id: 'habit_pioneer_5',
    name: 'Habit Pioneer',
    description: 'Logged 5 or more verified shopping trips using sustainable reusable alternatives.',
    requirement: '5 reusable bag outings',
    category: 'HABIT',
    iconType: 'bag',
    isUnlocked: (u) => (u.verifiedReusableBagUses || 0) >= 5,
    getProgress: (u) => ({
      current: Math.min(u.verifiedReusableBagUses || 0, 5),
      target: 5,
      unit: 'trips',
    }),
  },
  {
    id: 'eco_vanguard_25',
    name: 'Eco Vanguard',
    description: 'Diverted 25+ plastic bags through persistent habit adoption at local stores.',
    requirement: '25 bags avoided',
    category: 'IMPACT',
    iconType: 'leaf',
    isUnlocked: (u) => (u.verifiedBagsAvoided || 0) >= 25,
    getProgress: (u) => ({
      current: Math.min(u.verifiedBagsAvoided || 0, 25),
      target: 25,
      unit: 'bags',
    }),
  },
  {
    id: 'half_century_50',
    name: '50 Bags Guardian',
    description: 'Stopped 50+ single-use plastic bags from landfills, beaches, and drainage channels.',
    requirement: '50 bags avoided',
    category: 'IMPACT',
    iconType: 'shield',
    isUnlocked: (u) => (u.verifiedBagsAvoided || 0) >= 50,
    getProgress: (u) => ({
      current: Math.min(u.verifiedBagsAvoided || 0, 50),
      target: 50,
      unit: 'bags',
    }),
  },
  {
    id: 'century_hero_100',
    name: 'Century Hero',
    description: 'Triple-digit milestone: 100+ single-use plastic bags permanently avoided!',
    requirement: '100 bags avoided',
    category: 'IMPACT',
    iconType: 'flame',
    isUnlocked: (u) => (u.verifiedBagsAvoided || 0) >= 100,
    getProgress: (u) => ({
      current: Math.min(u.verifiedBagsAvoided || 0, 100),
      target: 100,
      unit: 'bags',
    }),
  },
  {
    id: 'carbon_mitigator',
    name: 'Carbon Mitigator',
    description: 'Prevented over 500 grams of CO₂e emissions through reusable practices.',
    requirement: '0.5 kg CO₂e offset or 5 actions',
    category: 'IMPACT',
    iconType: 'earth',
    isUnlocked: (u) => (u.verifiedCo2eAvoidedGramsMin || 0) >= 500 || (u.verifiedActionsCount || 0) >= 5,
    getProgress: (u) => ({
      current: Math.min(u.verifiedCo2eAvoidedGramsMin || 0, 500),
      target: 500,
      unit: 'g CO₂e',
    }),
  },
  {
    id: 'movement_steward',
    name: 'Movement Steward',
    description: 'Appointed administrator or top administrator guiding movement governance & verification.',
    requirement: 'Admin or Top Admin appointment',
    category: 'STEWARDSHIP',
    iconType: 'crown',
    isUnlocked: (u) => u.role === 'TOP_ADMIN' || u.role === 'ADMIN',
    getProgress: (u) => ({
      current: u.role === 'TOP_ADMIN' || u.role === 'ADMIN' ? 1 : 0,
      target: 1,
      unit: 'role',
    }),
  },
];

export function getUserBadges(user: Partial<User>) {
  const earned: MovementBadge[] = [];
  const locked: MovementBadge[] = [];

  for (const badge of ALL_MOVEMENT_BADGES) {
    if (badge.isUnlocked(user)) {
      earned.push(badge);
    } else {
      locked.push(badge);
    }
  }

  return { earned, locked };
}
