export type UserRole = 'TOP_ADMIN' | 'ADMIN' | 'REGISTERED_USER';

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  profileImageUrl?: string;
  firebaseUid?: string;
  verifiedActionsCount: number;
  verifiedPoints: number;
  verifiedReusableBagUses: number;
  verifiedBagsAvoided: number;
  verifiedCo2eAvoidedGramsMin: number;
  verifiedCo2eAvoidedGramsMax: number;
}

export type ActionType = 
  | 'USED_REUSABLE_BAG' 
  | 'REFUSED_SINGLE_USE_BAG' 
  | 'OTHER_ENVIRONMENTAL_ACTION';

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ProofSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  actionType: ActionType;
  description: string;
  evidenceUrl: string; // Cloudinary secure delivery or storage URL
  proofImageUrl?: string; // Standard Cloudinary proof image reference
  cloudinaryPublicId?: string; // Cloudinary resource public identifier
  cloudinarySecureUrl?: string; // Signed / secure Cloudinary URL
  submittedAt: string;
  status: SubmissionStatus;
  reviewedBy?: string;
  reviewerEmail?: string;
  reviewedAt?: string;
  reviewNote?: string;
  pointsAwarded?: number;
  bagsAvoided?: number;
  co2eGramsMin?: number;
  co2eGramsMax?: number;
}

export type ChallengeStatus = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'INACTIVE';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  rules: string[];
  requiredActions: string[];
  pointsReward: number;
  eligibilityRequirements: string;
  status: ChallengeStatus;
  createdAt: string;
  createdBy: string;
}

export type PrizeStatus = 'ACTIVE' | 'UPCOMING' | 'CONCLUDED' | 'INACTIVE';

export interface Prize {
  id: string;
  title: string;
  description: string;
  value: string;
  eligibility: string;
  competitionPeriod: string;
  status: PrizeStatus;
  winnerInfo?: string;
  paymentStatus?: 'PENDING' | 'PAID' | 'NOT_APPLICABLE';
  createdAt: string;
  createdBy: string;
}

export interface ImpactSettings {
  bagsInOneReusable: number; // default: 10
  co2eMinGramsPerBag: number; // default: 15
  co2eMaxGramsPerBag: number; // default: 33
  pointsPerApprovedAction: number; // default: 10
  updatedAt: string;
  updatedBy: string;
}

export interface OrganizationProfile {
  logoUrl?: string;
  logoPublicId?: string;
  orgName: string;
  movementName: string;
  slogan: string;
  mission: string;
  description: string;
  contactEmail: string;
  website: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  location: string;
  registrationInfo?: string;
  pillars?: string;
  phone?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PaymentSettings {
  // PRIVATE ADMIN DATA (Never exposed to ordinary users)
  accountName: string;
  bankOrProvider: string;
  accountNumber: string;
  privateNotes: string;
  // PUBLIC PAYMENT DATA (Intentionally shown to users when public campaign/prize instructions apply)
  publicInstructions: string;
  publicSupportNotice: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminUserRecord {
  adminId: string;
  userId: string;
  email: string;
  name: string;
  role: 'TOP_ADMIN' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  createdBy: string;
  creatorEmail: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details: string;
  timestamp: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  title: string;
  content: string;
  category: 'CAMPAIGN' | 'DISCUSSION' | 'ACHIEVEMENT' | 'INITIATIVE';
  createdAt: string;
  likesCount: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  position: number;
  verifiedPoints: number;
  verifiedActionsCount: number;
  verifiedBagsAvoided: number;
}

export interface SystemStats {
  registeredUsersCount: number;
  pendingSubmissionsCount: number;
  approvedSubmissionsCount: number;
  rejectedSubmissionsCount: number;
  totalVerifiedActions: number;
  totalVerifiedBagsAvoided: number;
  totalCo2eAvoidedKgMin: number;
  totalCo2eAvoidedKgMax: number;
  activeChallengesCount: number;
  activePrizesCount: number;
}
