import {
  User,
  ProofSubmission,
  Challenge,
  Prize,
  ImpactSettings,
  OrganizationProfile,
  PaymentSettings,
  AdminUserRecord,
  AuditLog,
  CommunityPost,
  LeaderboardEntry,
  SystemStats,
} from '../types';

const TOKEN_KEY = 'agm_auth_token';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || response.statusText || 'An error occurred';
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  firebaseSession: (payload: { uid: string; email: string; fullName?: string; idToken?: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/firebase-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  signup: (payload: { fullName: string; email: string; password: string; confirmPassword: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  getMe: () =>
    request<{ user: User }>('/api/auth/me'),

  updateProfile: (payload: { fullName?: string; profileImageUrl?: string }) =>
    request<{ user: User; message: string }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  claimTopAdmin: (bootstrapKey: string, idToken?: string) =>
    request<{ success: boolean; message: string; user: User; alreadyInitialized?: boolean }>('/api/auth/claim-top-admin', {
      method: 'POST',
      body: JSON.stringify({ bootstrapKey, idToken }),
    }),

  getTopAdminStatus: () =>
    request<{ topAdminExists: boolean }>('/api/auth/top-admin-status'),

  // Proof Submissions & Cloudinary Uploads
  uploadProofImage: (image: string) =>
    request<{ success: boolean; proofImageUrl: string; cloudinaryPublicId?: string; message?: string }>('/api/proof/upload-image', {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  submitProof: (payload: {
    actionType: string;
    description: string;
    evidenceUrl: string;
    proofImageUrl?: string;
    cloudinaryPublicId?: string;
  }) =>
    request<{ submission: ProofSubmission; message: string }>('/api/proof/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getSecureImageUrl: (submissionId: string) =>
    request<{ success: boolean; proofImageUrl: string; cloudinaryPublicId?: string }>(`/api/proof/secure-image/${submissionId}`),

  getMySubmissions: () =>
    request<{ submissions: ProofSubmission[] }>('/api/proof/my'),

  // Admin Proof Reviews
  getAdminSubmissions: (status?: string) => {
    const url = status ? `/api/admin/submissions?status=${encodeURIComponent(status)}` : '/api/admin/submissions';
    return request<{ submissions: ProofSubmission[] }>(url);
  },

  reviewSubmission: (id: string, payload: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string; customPoints?: number }) =>
    request<{ submission: ProofSubmission; message: string }>(`/api/admin/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Challenges
  getChallenges: () =>
    request<{ challenges: Challenge[] }>('/api/challenges'),

  createChallenge: (payload: Partial<Challenge>) =>
    request<{ challenge: Challenge; message: string }>('/api/admin/challenges', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateChallenge: (id: string, payload: Partial<Challenge>) =>
    request<{ challenge: Challenge; message: string }>(`/api/admin/challenges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteChallenge: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/challenges/${id}`, {
      method: 'DELETE',
    }),

  // Prizes
  getPrizes: () =>
    request<{ prizes: Prize[] }>('/api/prizes'),

  createPrize: (payload: Partial<Prize>) =>
    request<{ prize: Prize; message: string }>('/api/admin/prizes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePrize: (id: string, payload: Partial<Prize>) =>
    request<{ prize: Prize; message: string }>(`/api/admin/prizes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deletePrize: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/prizes/${id}`, {
      method: 'DELETE',
    }),

  // Configuration & Figures
  getImpactSettings: () =>
    request<{ settings: ImpactSettings }>('/api/config/impact'),

  updateImpactSettings: (payload: Partial<ImpactSettings>) =>
    request<{ settings: ImpactSettings; message: string }>('/api/admin/config/impact', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getOrgProfile: () =>
    request<{ profile: OrganizationProfile }>('/api/config/organization'),

  updateOrgProfile: (payload: Partial<OrganizationProfile>) =>
    request<{ profile: OrganizationProfile; message: string }>('/api/admin/config/organization', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadOrgLogo: (image: string) =>
    request<{ success: boolean; logoUrl: string; cloudinaryPublicId?: string; message?: string }>('/api/admin/organization/upload-logo', {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  // Payment
  getPublicPaymentInfo: () =>
    request<{ publicInstructions: string; publicSupportNotice: string }>('/api/config/payment-public'),

  getAdminPaymentSettings: () =>
    request<{ settings: PaymentSettings }>('/api/admin/config/payment'),

  updateAdminPaymentSettings: (payload: Partial<PaymentSettings>) =>
    request<{ settings: PaymentSettings; message: string }>('/api/admin/config/payment', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Admin Management
  getAdmins: () =>
    request<{ admins: AdminUserRecord[] }>('/api/admin/admins'),

  addAdmin: (email: string) =>
    request<{ message: string; admins: AdminUserRecord[] }>('/api/admin/admins', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  setAdminStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    request<{ admin: AdminUserRecord; message: string }>(`/api/admin/admins/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  removeAdmin: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/admins/${id}`, {
      method: 'DELETE',
    }),

  // Users & Stats
  getRegisteredUsers: () =>
    request<{ users: User[] }>('/api/admin/users'),

  getAuditLogs: () =>
    request<{ auditLogs: AuditLog[] }>('/api/admin/audit-logs'),

  getSystemStats: () =>
    request<{ stats: SystemStats }>('/api/stats'),

  // Rank & Community
  getLeaderboard: () =>
    request<{ leaderboard: LeaderboardEntry[] }>('/api/rank'),

  getCommunityPosts: () =>
    request<{ posts: CommunityPost[] }>('/api/community/posts'),

  createCommunityPost: (payload: { title: string; content: string; category: string }) =>
    request<{ post: CommunityPost; message: string }>('/api/community/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
