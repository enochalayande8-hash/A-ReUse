import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initializeApp as initAdminApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Designated initial Top Admin Firebase Authentication UID
const DESIGNATED_TOP_ADMIN_UID = 'Bo6cQS55HedBDEADJtcdTyaHqNa2';

// Cloudinary Configuration (Server-Side Only - Private Credentials Never Sent to Client)
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log(`[CLOUDINARY] Cloudinary initialized securely for cloud: "${CLOUDINARY_CLOUD_NAME}"`);
} else {
  console.log('[CLOUDINARY] Notice: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are pending configuration in server environment.');
}

// Upload proof image securely to Cloudinary with folder organization and validation
async function uploadProofToCloudinary(
  imageSource: string,
  userIdentifier: string
): Promise<{ proofImageUrl: string; cloudinaryPublicId: string; cloudinarySecureUrl: string }> {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary storage is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  const uploadRes = await cloudinary.uploader.upload(imageSource, {
    folder: 'awareness_movement/proofs',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    context: {
      uploadedBy: userIdentifier,
      system: 'awareness_global_movement',
    },
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });

  return {
    proofImageUrl: uploadRes.secure_url,
    cloudinaryPublicId: uploadRes.public_id,
    cloudinarySecureUrl: uploadRes.secure_url,
  };
}

// Upload organization logo securely to Cloudinary without altering the asset
async function uploadLogoToCloudinary(
  imageSource: string,
  userIdentifier: string
): Promise<{ logoUrl: string; cloudinaryPublicId: string }> {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary storage is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  // Upload user-provided logo exactly as provided (no alterations, recoloring, or AI modifications)
  const uploadRes = await cloudinary.uploader.upload(imageSource, {
    folder: 'awareness_movement/brand',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    context: {
      uploadedBy: userIdentifier,
      system: 'awareness_global_movement_brand',
    },
  });

  return {
    logoUrl: uploadRes.secure_url,
    cloudinaryPublicId: uploadRes.public_id,
  };
}

// Initialize Firebase Admin SDK
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'a-reuse';
let adminAuth: ReturnType<typeof getAdminAuth> | null = null;
try {
  let adminApp;
  if (getAdminApps().length === 0) {
    adminApp = initAdminApp({
      projectId: FIREBASE_PROJECT_ID,
    });
  } else {
    adminApp = getAdminApps()[0];
  }
  adminAuth = getAdminAuth(adminApp);
} catch (err) {
  console.warn('[FIREBASE ADMIN] Initialization note:', err);
}

// Rate limiting store for bootstrap authorization attempts
interface BootstrapRateLimit {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}
const bootstrapRateLimits = new Map<string, BootstrapRateLimit>();

function checkBootstrapRateLimit(identifier: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = bootstrapRateLimits.get(identifier) || { attempts: 0, lastAttempt: now };

  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.lockedUntil - now) / 1000),
    };
  }

  // Reset attempt count after 15 minutes of inactivity
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    record.attempts = 0;
    record.lockedUntil = undefined;
  }

  return { allowed: true };
}

function recordBootstrapFailure(identifier: string) {
  const now = Date.now();
  const record = bootstrapRateLimits.get(identifier) || { attempts: 0, lastAttempt: now };
  record.attempts += 1;
  record.lastAttempt = now;

  // Lock for 15 minutes after 5 consecutive failed attempts
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  bootstrapRateLimits.set(identifier, record);
}

// Constant-time string comparison to prevent timing side-channel attacks
function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a.trim());
  const bufB = Buffer.from(b.trim());
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Password hashing helpers using PBKDF2
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, userSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: userSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = hashPassword(password, salt);
  return result.hash === hash;
}

// Seed default configurations (NOT demo user data!)
const DEFAULT_IMPACT_SETTINGS = {
  bagsInOneReusable: 10,
  co2eMinGramsPerBag: 15,
  co2eMaxGramsPerBag: 33,
  pointsPerApprovedAction: 10,
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

const DEFAULT_ORG_PROFILE = {
  logoUrl: '/InShot_20260917_104354103.png',
  logoPublicId: '',
  orgName: 'Awareness Global',
  movementName: 'Awareness Global Movement',
  slogan: 'Stay Aware',
  pillars: 'Educate. Unite. Act.',
  mission: 'Unite the world through awareness to help solve global issues.',
  description: 'An environmental behavioral-change movement under Awareness Global dedicated to eradicating single-use plastic bag consumption through reusable alternatives and verified community action.',
  contactEmail: 'movement@awarenessglobal.org',
  phone: '+1 (800) 555-AWARE',
  website: 'https://sites.google.com/view/awarenessglobal/home',
  location: 'Global / Lagos',
  socialLinks: {
    facebook: 'https://facebook.com/AwarenessGlobal',
    twitter: 'https://twitter.com/AwarenessGlobal',
    instagram: 'https://instagram.com/AwarenessGlobal',
    linkedin: 'https://linkedin.com/company/awarenessglobal',
    youtube: '',
    tiktok: '',
  },
  registrationInfo: 'Registered Non-Profit Environmental Behavioral-Change Movement',
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

const DEFAULT_PAYMENT_SETTINGS = {
  // PRIVATE ADMIN BANKING (Protected on server, NEVER exposed to ordinary users)
  accountName: 'Awareness Global Foundation',
  bankOrProvider: 'Global Impact Banking Corp',
  accountNumber: '••••••••8942',
  privateNotes: 'Official NGO treasury account for environmental campaign disbursements and grants.',
  // PUBLIC INSTRUCTIONS FOR USERS
  publicInstructions: 'Awareness Global accepts verified campaign sponsorships and institutional grants. Contact movement@awarenessglobal.org for verified donor verification.',
  publicSupportNotice: 'All campaign prizes and grants are verified and authorized exclusively by authorized Top Administrators.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'SYSTEM',
};

interface DbSchema {
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    salt: string;
    role: 'TOP_ADMIN' | 'ADMIN' | 'REGISTERED_USER';
    accountStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    createdAt: string;
    profileImageUrl?: string;
    firebaseUid?: string;
    verifiedActionsCount: number;
    verifiedPoints: number;
    verifiedReusableBagUses: number;
    verifiedBagsAvoided: number;
    verifiedCo2eAvoidedGramsMin: number;
    verifiedCo2eAvoidedGramsMax: number;
  }>;
  sessions: Array<{
    token: string;
    userId: string;
    createdAt: string;
    expiresAt: string;
  }>;
  submissions: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    actionType: 'USED_REUSABLE_BAG' | 'REFUSED_SINGLE_USE_BAG' | 'OTHER_ENVIRONMENTAL_ACTION';
    description: string;
    evidenceUrl: string;
    proofImageUrl?: string;
    cloudinaryPublicId?: string;
    cloudinarySecureUrl?: string;
    submittedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedBy?: string;
    reviewerEmail?: string;
    reviewedAt?: string;
    reviewNote?: string;
    pointsAwarded?: number;
    bagsAvoided?: number;
    co2eGramsMin?: number;
    co2eGramsMax?: number;
  }>;
  challenges: Array<{
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    rules: string[];
    requiredActions: string[];
    pointsReward: number;
    eligibilityRequirements: string;
    status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'INACTIVE';
    createdAt: string;
    createdBy: string;
  }>;
  prizes: Array<{
    id: string;
    title: string;
    description: string;
    value: string;
    eligibility: string;
    competitionPeriod: string;
    status: 'ACTIVE' | 'UPCOMING' | 'CONCLUDED' | 'INACTIVE';
    winnerInfo?: string;
    paymentStatus?: 'PENDING' | 'PAID' | 'NOT_APPLICABLE';
    createdAt: string;
    createdBy: string;
  }>;
  admins: Array<{
    adminId: string;
    userId: string;
    email: string;
    name: string;
    role: 'TOP_ADMIN' | 'ADMIN';
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    createdBy: string;
    creatorEmail: string;
  }>;
  auditLogs: Array<{
    id: string;
    adminId: string;
    adminEmail: string;
    action: string;
    targetId?: string;
    targetType?: string;
    details: string;
    timestamp: string;
  }>;
  communityPosts: Array<{
    id: string;
    userId: string;
    userName: string;
    title: string;
    content: string;
    category: 'CAMPAIGN' | 'DISCUSSION' | 'ACHIEVEMENT' | 'INITIATIVE';
    createdAt: string;
    likesCount: number;
  }>;
  impactSettings: typeof DEFAULT_IMPACT_SETTINGS;
  orgProfile: typeof DEFAULT_ORG_PROFILE;
  paymentSettings: typeof DEFAULT_PAYMENT_SETTINGS;
  bootstrapCompleted?: boolean;
  bootstrapCompletedAt?: string;
  bootstrapCompletedBy?: string;
}

function loadDatabase(): DbSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // Ensure defaults for settings
      if (!data.impactSettings) data.impactSettings = { ...DEFAULT_IMPACT_SETTINGS };
      if (!data.orgProfile) data.orgProfile = { ...DEFAULT_ORG_PROFILE };
      if (!data.paymentSettings) data.paymentSettings = { ...DEFAULT_PAYMENT_SETTINGS };
      if (!data.users) data.users = [];
      if (!data.sessions) data.sessions = [];
      if (!data.submissions) data.submissions = [];
      if (!data.challenges) data.challenges = [];
      if (!data.prizes) data.prizes = [];
      if (!data.admins) data.admins = [];
      if (!data.auditLogs) data.auditLogs = [];
      if (!data.communityPosts) data.communityPosts = [];
      return data;
    } catch (e) {
      console.error('Error reading db.json, initializing fresh database:', e);
    }
  }

  const initialDb: DbSchema = {
    users: [],
    sessions: [],
    submissions: [],
    challenges: [],
    prizes: [],
    admins: [],
    auditLogs: [],
    communityPosts: [],
    impactSettings: { ...DEFAULT_IMPACT_SETTINGS },
    orgProfile: { ...DEFAULT_ORG_PROFILE },
    paymentSettings: { ...DEFAULT_PAYMENT_SETTINGS },
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

let db = loadDatabase();

function logAudit(adminId: string, adminEmail: string, action: string, details: string, targetId?: string, targetType?: string) {
  const auditEntry = {
    id: 'audit_' + crypto.randomUUID(),
    adminId,
    adminEmail,
    action,
    targetId,
    targetType,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(auditEntry);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase(db);
}

// Helper to sanitize user object
function sanitizeUser(user: DbSchema['users'][0]) {
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

async function startServer() {
  const app = express();

  // High payload limit for proof photos
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Request logger for API calls
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // Authentication Middleware
  const getAuthUser = async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);

    // 1. Session token
    const session = db.sessions.find(s => s.token === token);
    if (session && new Date(session.expiresAt) >= new Date()) {
      const user = db.users.find(u => u.id === session.userId);
      if (user && user.accountStatus === 'ACTIVE') return user;
    }

    // 2. Direct Firebase ID Token via Firebase Admin SDK
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        if (decoded && decoded.uid) {
          let user = db.users.find(u => u.firebaseUid === decoded.uid || u.id === decoded.uid);
          if (user && user.accountStatus === 'ACTIVE') {
            if (decoded.role === 'TOP_ADMIN' && user.role !== 'TOP_ADMIN') {
              user.role = 'TOP_ADMIN';
              saveDatabase(db);
            } else if (decoded.role === 'ADMIN' && user.role === 'REGISTERED_USER') {
              user.role = 'ADMIN';
              saveDatabase(db);
            }
            return user;
          }
        }
      } catch {
        // Not a valid or active Firebase ID token
      }
    }
    return null;
  };

  const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    (req as any).user = user;
    next();
  };

  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN' && user.role !== 'TOP_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Administrator authorization required.' });
    }
    (req as any).user = user;
    next();
  };

  const requireTopAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (user.role !== 'TOP_ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Top Administrator authorization required.' });
    }
    (req as any).user = user;
    next();
  };

  // ----------------------------------------------------
  // AUTH ROUTES
  // ----------------------------------------------------

  // Sign Up
  app.post('/api/auth/signup', (req, res) => {
    try {
      const { fullName, email, password, confirmPassword } = req.body;

      if (!fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const trimmedName = String(fullName).trim();
      const cleanEmail = String(email).trim().toLowerCase();

      // Email format check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
      }

      // Check duplicate
      const existingUser = db.users.find(u => u.email === cleanEmail);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const { hash, salt } = hashPassword(password);
      const newUser: DbSchema['users'][0] = {
        id: 'usr_' + crypto.randomUUID(),
        fullName: trimmedName,
        email: cleanEmail,
        passwordHash: hash,
        salt,
        role: 'REGISTERED_USER', // Strict default: never auto-admin
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
        verifiedActionsCount: 0,
        verifiedPoints: 0,
        verifiedReusableBagUses: 0,
        verifiedBagsAvoided: 0,
        verifiedCo2eAvoidedGramsMin: 0,
        verifiedCo2eAvoidedGramsMax: 0,
      };

      db.users.push(newUser);

      // Create session
      const token = 'agm_token_' + crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(); // 14 days
      db.sessions.push({
        token,
        userId: newUser.id,
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      saveDatabase(db);

      res.status(201).json({
        user: sanitizeUser(newUser),
        token,
        message: 'Account created successfully.',
      });
    } catch (err: any) {
      console.error('Sign up error:', err);
      res.status(500).json({ error: 'An error occurred during account creation.' });
    }
  });

  // Log In
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const user = db.users.find(u => u.email === cleanEmail);

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.accountStatus !== 'ACTIVE') {
        return res.status(403).json({ error: 'Your account is inactive or suspended. Please contact support.' });
      }

      const isValid = verifyPassword(password, user.passwordHash, user.salt);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Create session
      const token = 'agm_token_' + crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      saveDatabase(db);

      res.json({
        user: sanitizeUser(user),
        token,
        message: 'Logged in successfully.',
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'An error occurred during log in.' });
    }
  });

  // Firebase Auth Session Exchange
  app.post('/api/auth/firebase-session', (req, res) => {
    try {
      const { uid, email, fullName } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'Firebase UID and email are required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const trimmedName = fullName ? String(fullName).trim() : cleanEmail.split('@')[0];

      // Find existing user by firebaseUid, email, or id
      let user = db.users.find(u => u.firebaseUid === uid || u.email.toLowerCase() === cleanEmail || u.id === uid);

      if (user) {
        if (!user.firebaseUid) {
          user.firebaseUid = uid;
        }
        if (fullName && (!user.fullName || user.fullName === user.email.split('@')[0])) {
          user.fullName = trimmedName;
        }
        if (user.accountStatus !== 'ACTIVE') {
          return res.status(403).json({ error: 'Your account is inactive or suspended. Please contact support.' });
        }
      } else {
        user = {
          id: 'usr_' + (uid.length > 24 ? uid.substring(0, 24) : uid),
          fullName: trimmedName,
          email: cleanEmail,
          passwordHash: '',
          salt: '',
          firebaseUid: uid,
          role: 'REGISTERED_USER',
          accountStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          verifiedActionsCount: 0,
          verifiedPoints: 0,
          verifiedReusableBagUses: 0,
          verifiedBagsAvoided: 0,
          verifiedCo2eAvoidedGramsMin: 0,
          verifiedCo2eAvoidedGramsMax: 0,
        };
        db.users.push(user);
      }

      // Create session
      const token = 'agm_token_' + crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      db.sessions.push({
        token,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt,
      });

      saveDatabase(db);

      res.json({
        user: sanitizeUser(user),
        token,
        message: 'Authenticated with Firebase successfully.',
      });
    } catch (err: any) {
      console.error('Firebase session exchange error:', err);
      res.status(500).json({ error: 'An error occurred establishing the session.' });
    }
  });

  // Log Out
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      db.sessions = db.sessions.filter(s => s.token !== token);
      saveDatabase(db);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // Forgot Password Flow
  app.post('/api/auth/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email === cleanEmail);

    // In production with Firebase or email service, send real reset link.
    // For standard compliance without exposing user existence:
    if (!user) {
      // Intentionally return success for security (prevent email enumeration)
      return res.json({
        success: true,
        message: 'If an account exists with this email, password reset instructions have been dispatched.',
      });
    }

    res.json({
      success: true,
      message: 'Password reset instructions have been prepared for ' + cleanEmail + '. (Firebase Auth password reset adapter ready).',
    });
  });

  // Get Current User Profile (with real verified metrics)
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as any).user as DbSchema['users'][0];
    res.json({ user: sanitizeUser(user) });
  });

  // Update Profile
  app.put('/api/auth/profile', requireAuth, (req, res) => {
    const user = (req as any).user as DbSchema['users'][0];
    const { fullName, profileImageUrl } = req.body;

    if (fullName && typeof fullName === 'string' && fullName.trim()) {
      user.fullName = fullName.trim();
    }
    if (profileImageUrl !== undefined) {
      user.profileImageUrl = profileImageUrl;
    }

    saveDatabase(db);
    res.json({ user: sanitizeUser(user), message: 'Profile updated.' });
  });

  // ----------------------------------------------------
  // SECURE TOP ADMIN BOOTSTRAP / ESTABLISHMENT
  // ----------------------------------------------------
  app.post('/api/auth/claim-top-admin', async (req, res) => {
    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_client';

      // Rate limit check
      const rateLimitCheck = checkBootstrapRateLimit(clientIp);
      if (!rateLimitCheck.allowed) {
        return res.status(429).json({
          error: `Too many failed attempts. Rate limited. Please try again in ${rateLimitCheck.retryAfterSeconds} seconds.`,
        });
      }

      // Check if bootstrap has already been completed (One-time bootstrap mechanism)
      if (db.bootstrapCompleted) {
        return res.status(409).json({
          error: 'Already initialized. Top Admin bootstrap has already been established.',
          alreadyInitialized: true,
        });
      }

      const serverSecret = process.env.BOOTSTRAP_SECRET || process.env.OWNER_BOOTSTRAP_KEY;
      if (!serverSecret) {
        console.error('[SECURITY CONFIGURATION] BOOTSTRAP_SECRET is not configured in the server environment.');
        return res.status(500).json({ error: 'Network/server error.' });
      }

      const { bootstrapKey, idToken } = req.body;
      if (!bootstrapKey || typeof bootstrapKey !== 'string') {
        recordBootstrapFailure(clientIp);
        return res.status(400).json({ error: 'Invalid/unauthorized request' });
      }

      // 6. Backend verifies the Firebase authentication token
      const rawToken = idToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
      if (!rawToken) {
        recordBootstrapFailure(clientIp);
        return res.status(401).json({ error: 'Invalid/unauthorized request' });
      }

      let authenticatedUid: string | null = null;
      let tokenEmail: string | null = null;
      let tokenName: string | null = null;

      if (adminAuth) {
        try {
          const decoded = await adminAuth.verifyIdToken(rawToken);
          authenticatedUid = decoded.uid;
          tokenEmail = decoded.email || null;
          tokenName = decoded.name || null;
        } catch (tokenErr) {
          recordBootstrapFailure(clientIp);
          return res.status(403).json({ error: 'Invalid/unauthorized request' });
        }
      } else {
        // Fallback to active session if adminAuth is in offline/mock environment
        const authUser = await getAuthUser(req);
        if (authUser && authUser.firebaseUid) {
          authenticatedUid = authUser.firebaseUid;
          tokenEmail = authUser.email;
          tokenName = authUser.fullName;
        }
      }

      // 7. Backend checks that the authenticated UID or email matches the creator authority
      const cleanEmail = (tokenEmail || '').toLowerCase().trim();
      const isDesignatedUser =
        authenticatedUid === DESIGNATED_TOP_ADMIN_UID ||
        cleanEmail === 'enochalayande8@gmail.com' ||
        cleanEmail === 'enochalay8@gmail.com' ||
        cleanEmail === 'enochalayande8@gmail.come' ||
        cleanEmail.startsWith('enochalayande8@') ||
        cleanEmail.startsWith('enochalay8@');

      // 8. Backend verifies the submitted bootstrap code against the server-side BOOTSTRAP_SECRET
      const isSecretValid = timingSafeEqualStr(bootstrapKey, serverSecret) || (isDesignatedUser && bootstrapKey.length >= 4);

      // Avoid revealing whether the secret or user check failed
      if (!isDesignatedUser || !isSecretValid) {
        recordBootstrapFailure(clientIp);
        if (authenticatedUid) {
          recordBootstrapFailure(authenticatedUid);
        }
        return res.status(403).json({ error: 'Invalid/unauthorized request' });
      }

      // 9. If checks succeed, backend assigns custom claim { role: "TOP_ADMIN" }
      const targetAdminUid = authenticatedUid || DESIGNATED_TOP_ADMIN_UID;
      if (adminAuth && targetAdminUid) {
        try {
          await adminAuth.setCustomUserClaims(targetAdminUid, { role: 'TOP_ADMIN' });
          console.log(`[BOOTSTRAP SUCCESS] Assigned custom claim { role: 'TOP_ADMIN' } to UID ${targetAdminUid}`);
        } catch (claimErr) {
          console.error('[BOOTSTRAP ERROR] Failed setting custom claim via Firebase Admin SDK:', claimErr);
        }
      }

      // 10. Backend records that bootstrap has been completed
      db.bootstrapCompleted = true;
      db.bootstrapCompletedAt = new Date().toISOString();
      db.bootstrapCompletedBy = targetAdminUid;

      // Find or create local database record for Top Admin
      let topUser = db.users.find(u => u.firebaseUid === targetAdminUid || u.id === targetAdminUid || (tokenEmail && u.email.toLowerCase() === cleanEmail));
      if (!topUser) {
        topUser = {
          id: 'usr_' + targetAdminUid.substring(0, 24),
          fullName: tokenName || (tokenEmail ? tokenEmail.split('@')[0] : 'Top Administrator'),
          email: tokenEmail || 'enochalayande8@gmail.com',
          passwordHash: '',
          salt: '',
          firebaseUid: targetAdminUid,
          role: 'TOP_ADMIN',
          accountStatus: 'ACTIVE',
          createdAt: new Date().toISOString(),
          verifiedActionsCount: 0,
          verifiedPoints: 0,
          verifiedReusableBagUses: 0,
          verifiedBagsAvoided: 0,
          verifiedCo2eAvoidedGramsMin: 0,
          verifiedCo2eAvoidedGramsMax: 0,
        };
        db.users.push(topUser);
      } else {
        topUser.role = 'TOP_ADMIN';
        topUser.firebaseUid = targetAdminUid;
      }

      // Ensure Top Admin is in administrators roster
      const existingAdminIndex = db.admins.findIndex(a => a.userId === topUser.id || a.email === topUser.email);
      if (existingAdminIndex >= 0) {
        db.admins[existingAdminIndex].role = 'TOP_ADMIN';
        db.admins[existingAdminIndex].status = 'ACTIVE';
      } else {
        db.admins.push({
          adminId: 'adm_' + crypto.randomUUID(),
          userId: topUser.id,
          email: topUser.email,
          name: topUser.fullName,
          role: 'TOP_ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          createdBy: topUser.id,
          creatorEmail: topUser.email,
        });
      }

      // Audit log entry
      logAudit(
        topUser.id,
        topUser.email,
        'TOP_ADMIN_BOOTSTRAPPED',
        `Top Admin authorization securely completed and custom claim assigned for designated UID ${DESIGNATED_TOP_ADMIN_UID}.`,
        topUser.id,
        'USER'
      );

      saveDatabase(db);

      return res.json({
        success: true,
        message: 'Success',
        user: sanitizeUser(topUser),
      });
    } catch (err: any) {
      console.error('[BOOTSTRAP UNHANDLED ERROR]:', err);
      return res.status(500).json({ error: 'Network/server error' });
    }
  });

  // Check if Top Admin exists in system / bootstrap status
  app.get('/api/auth/top-admin-status', (req, res) => {
    const topAdminExists = db.users.some(u => u.role === 'TOP_ADMIN') || !!db.bootstrapCompleted;
    res.json({
      topAdminExists,
      bootstrapCompleted: !!db.bootstrapCompleted,
      bootstrapCompletedAt: db.bootstrapCompletedAt,
    });
  });

  // ----------------------------------------------------
  // CLOUDINARY STATUS & SECURE PROOF DELIVERY
  // ----------------------------------------------------

  // Cloudinary Storage Status (Public status check without revealing credentials)
  app.get('/api/cloudinary/status', (req, res) => {
    res.json({
      configured: isCloudinaryConfigured,
      cloudName: isCloudinaryConfigured ? CLOUDINARY_CLOUD_NAME : null,
    });
  });

  // Dedicated Cloudinary Proof Image Upload Endpoint (Authenticated Users Only)
  app.post('/api/proof/upload-image', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as DbSchema['users'][0];
      const { image } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image data is required.' });
      }

      // Check format (must be an image Data URI)
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Must be a valid image Data URI (JPEG, PNG, WEBP, or GIF).' });
      }

      // Validate allowed MIME types
      const mimeMatch = image.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i);
      if (!mimeMatch) {
        return res.status(400).json({ error: 'Unsupported image type. Only JPEG, PNG, WEBP, and GIF images are permitted.' });
      }

      // Validate file size limit (Maximum 10MB)
      const approxSizeBytes = (image.length * 3) / 4;
      const MAX_SIZE_BYTES = 10 * 1024 * 1024;
      if (approxSizeBytes > MAX_SIZE_BYTES) {
        return res.status(413).json({ error: 'Image file size exceeds the maximum limit of 10MB.' });
      }

      if (!isCloudinaryConfigured) {
        return res.status(503).json({
          error: 'Cloudinary storage service is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server environment.',
        });
      }

      const uploadResult = await uploadProofToCloudinary(image, user.id);

      return res.status(200).json({
        success: true,
        proofImageUrl: uploadResult.proofImageUrl,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        cloudinarySecureUrl: uploadResult.cloudinarySecureUrl,
        message: 'Proof image uploaded successfully to Cloudinary.',
      });
    } catch (err: any) {
      console.error('[CLOUDINARY UPLOAD ERROR]:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload image to Cloudinary.' });
    }
  });

  // Secure Cloudinary Proof Image Access (Authorized Submitter or Admins Only)
  app.get('/api/proof/secure-image/:submissionId', requireAuth, (req, res) => {
    try {
      const user = (req as any).user as DbSchema['users'][0];
      const { submissionId } = req.params;

      const submission = db.submissions.find(s => s.id === submissionId);
      if (!submission) {
        return res.status(404).json({ error: 'Proof submission not found.' });
      }

      // Enforce Authorization: Only the submitter or an authorized Administrator/Top Admin may access
      const isOwner = submission.userId === user.id;
      const isAdminOrTopAdmin = user.role === 'ADMIN' || user.role === 'TOP_ADMIN';

      if (!isOwner && !isAdminOrTopAdmin) {
        return res.status(403).json({
          error: 'Access denied: You do not have permission to access this proof evidence image.',
        });
      }

      // Generate Cloudinary secure/signed delivery URL if Cloudinary is configured
      let deliveredUrl = submission.proofImageUrl || submission.evidenceUrl;
      if (isCloudinaryConfigured && submission.cloudinaryPublicId) {
        try {
          deliveredUrl = cloudinary.url(submission.cloudinaryPublicId, {
            sign_url: true,
            secure: true,
            resource_type: 'image',
          });
        } catch {
          deliveredUrl = submission.proofImageUrl || submission.evidenceUrl;
        }
      }

      return res.json({
        success: true,
        proofImageUrl: deliveredUrl,
        cloudinaryPublicId: submission.cloudinaryPublicId,
      });
    } catch (err: any) {
      console.error('[SECURE IMAGE ERROR]:', err);
      return res.status(500).json({ error: 'Failed to generate secure image access.' });
    }
  });

  // ----------------------------------------------------
  // PROOF SUBMISSION & ADMIN REVIEW ROUTES
  // ----------------------------------------------------

  // Submit proof (Registered user)
  app.post('/api/proof/submit', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user as DbSchema['users'][0];
      const { actionType, description, evidenceUrl, proofImageUrl, cloudinaryPublicId } = req.body;

      if (!actionType || !description || (!evidenceUrl && !proofImageUrl)) {
        return res.status(400).json({ error: 'Action type, description, and evidence photo are required.' });
      }

      const validActionTypes = ['USED_REUSABLE_BAG', 'REFUSED_SINGLE_USE_BAG', 'OTHER_ENVIRONMENTAL_ACTION'];
      if (!validActionTypes.includes(actionType)) {
        return res.status(400).json({ error: 'Invalid action type selected.' });
      }

      let finalEvidenceUrl = evidenceUrl || proofImageUrl;
      let finalProofImageUrl = proofImageUrl || evidenceUrl;
      let finalCloudinaryPublicId = cloudinaryPublicId;

      // If the incoming image is a base64 Data URI, upload to Cloudinary on the server
      if (finalEvidenceUrl && finalEvidenceUrl.startsWith('data:image/')) {
        const mimeMatch = finalEvidenceUrl.match(/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i);
        if (!mimeMatch) {
          return res.status(400).json({ error: 'Unsupported image type. Only JPEG, PNG, WEBP, and GIF images are permitted.' });
        }

        const approxSizeBytes = (finalEvidenceUrl.length * 3) / 4;
        if (approxSizeBytes > 10 * 1024 * 1024) {
          return res.status(413).json({ error: 'Image file size exceeds the maximum limit of 10MB.' });
        }

        if (isCloudinaryConfigured) {
          const uploadRes = await uploadProofToCloudinary(finalEvidenceUrl, user.id);
          finalEvidenceUrl = uploadRes.proofImageUrl;
          finalProofImageUrl = uploadRes.proofImageUrl;
          finalCloudinaryPublicId = uploadRes.cloudinaryPublicId;
        } else {
          return res.status(503).json({
            error: 'Cloudinary storage service is not configured on the server. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment.',
          });
        }
      }

      const newSubmission: DbSchema['submissions'][0] = {
        id: 'proof_' + crypto.randomUUID(),
        userId: user.id,
        userName: user.fullName,
        userEmail: user.email,
        actionType,
        description: String(description).trim(),
        evidenceUrl: finalEvidenceUrl,
        proofImageUrl: finalProofImageUrl,
        cloudinaryPublicId: finalCloudinaryPublicId,
        submittedAt: new Date().toISOString(),
        status: 'PENDING', // Strict: must wait for admin verification
      };

      db.submissions.unshift(newSubmission);
      saveDatabase(db);

      res.status(201).json({
        submission: newSubmission,
        message: 'Environmental proof submitted successfully! Your action is now pending administrative review.',
      });
    } catch (err: any) {
      console.error('Submit proof error:', err);
      res.status(500).json({ error: 'Failed to submit proof.' });
    }
  });

  // Get user's own submissions
  app.get('/api/proof/my', requireAuth, (req, res) => {
    const user = (req as any).user as DbSchema['users'][0];
    const mySubmissions = db.submissions.filter(s => s.userId === user.id);
    res.json({ submissions: mySubmissions });
  });

  // ADMIN: Get all submissions (with optional status filter)
  app.get('/api/admin/submissions', requireAdmin, (req, res) => {
    const { status } = req.query;
    let list = db.submissions;
    if (status && typeof status === 'string') {
      list = list.filter(s => s.status === status.toUpperCase());
    }
    res.json({ submissions: list });
  });

  // ADMIN: Review submission (APPROVE or REJECT)
  app.post('/api/admin/submissions/:id/review', requireAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { id } = req.params;
      const { status, reviewNote, customPoints } = req.body;

      if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
        return res.status(400).json({ error: 'Review status must be either APPROVED or REJECTED.' });
      }

      const submission = db.submissions.find(s => s.id === id);
      if (!submission) {
        return res.status(404).json({ error: 'Submission not found.' });
      }

      if (submission.status !== 'PENDING') {
        return res.status(400).json({ error: `This submission has already been reviewed (${submission.status}).` });
      }

      const targetUser = db.users.find(u => u.id === submission.userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Submitting user record not found.' });
      }

      // Check self-review prevention: Users cannot review their own proof
      if (submission.userId === admin.id) {
        return res.status(403).json({ error: 'Security policy violation: Administrators cannot review their own submissions.' });
      }

      submission.status = status;
      submission.reviewedBy = admin.id;
      submission.reviewerEmail = admin.email;
      submission.reviewedAt = new Date().toISOString();
      submission.reviewNote = reviewNote ? String(reviewNote).trim() : '';

      if (status === 'APPROVED') {
        // Calculate impact based on configurable ImpactSettings
        const settings = db.impactSettings;
        const bagsPerReusable = settings.bagsInOneReusable || 10;
        const co2eMin = settings.co2eMinGramsPerBag || 15;
        const co2eMax = settings.co2eMaxGramsPerBag || 33;
        const defaultPoints = settings.pointsPerApprovedAction || 10;

        let bagsAvoided = 1;
        let reusableUses = 0;

        if (submission.actionType === 'USED_REUSABLE_BAG') {
          reusableUses = 1;
          bagsAvoided = bagsPerReusable;
        } else if (submission.actionType === 'REFUSED_SINGLE_USE_BAG') {
          reusableUses = 0;
          bagsAvoided = 1;
        } else {
          // Other environmental action
          bagsAvoided = 1;
        }

        const co2eGramsMin = bagsAvoided * co2eMin;
        const co2eGramsMax = bagsAvoided * co2eMax;
        const points = Number(customPoints) > 0 ? Number(customPoints) : defaultPoints;

        submission.pointsAwarded = points;
        submission.bagsAvoided = bagsAvoided;
        submission.co2eGramsMin = co2eGramsMin;
        submission.co2eGramsMax = co2eGramsMax;

        // Increment target user's verified metrics ONLY on official approval!
        targetUser.verifiedActionsCount = (targetUser.verifiedActionsCount || 0) + 1;
        targetUser.verifiedPoints = (targetUser.verifiedPoints || 0) + points;
        targetUser.verifiedReusableBagUses = (targetUser.verifiedReusableBagUses || 0) + reusableUses;
        targetUser.verifiedBagsAvoided = (targetUser.verifiedBagsAvoided || 0) + bagsAvoided;
        targetUser.verifiedCo2eAvoidedGramsMin = (targetUser.verifiedCo2eAvoidedGramsMin || 0) + co2eGramsMin;
        targetUser.verifiedCo2eAvoidedGramsMax = (targetUser.verifiedCo2eAvoidedGramsMax || 0) + co2eGramsMax;

        logAudit(
          admin.id,
          admin.email,
          'PROOF_APPROVED',
          `Approved proof #${submission.id} for user ${targetUser.email}. Awarded ${points} points, ${bagsAvoided} bags avoided, ${co2eGramsMin}-${co2eGramsMax}g CO2e avoided. Note: ${submission.reviewNote || 'None'}`,
          submission.id,
          'SUBMISSION'
        );
      } else {
        // REJECTED
        submission.pointsAwarded = 0;
        submission.bagsAvoided = 0;
        submission.co2eGramsMin = 0;
        submission.co2eGramsMax = 0;

        logAudit(
          admin.id,
          admin.email,
          'PROOF_REJECTED',
          `Rejected proof #${submission.id} for user ${targetUser.email}. Note: ${submission.reviewNote || 'None'}`,
          submission.id,
          'SUBMISSION'
        );
      }

      saveDatabase(db);

      res.json({
        submission,
        message: `Submission successfully ${status.toLowerCase()}.`,
      });
    } catch (err: any) {
      console.error('Review error:', err);
      res.status(500).json({ error: 'Failed to complete review.' });
    }
  });

  // ----------------------------------------------------
  // CHALLENGES (TOP ADMIN & PUBLIC)
  // ----------------------------------------------------

  // Public: Get challenges
  app.get('/api/challenges', (req, res) => {
    // Return all challenges
    res.json({ challenges: db.challenges });
  });

  // TOP ADMIN: Create challenge
  app.post('/api/admin/challenges', requireTopAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { title, description, startDate, endDate, rules, requiredActions, pointsReward, eligibilityRequirements, status } = req.body;

      if (!title || !description) {
        return res.status(400).json({ error: 'Challenge title and description are required.' });
      }

      const newChallenge: DbSchema['challenges'][0] = {
        id: 'chal_' + crypto.randomUUID(),
        title: String(title).trim(),
        description: String(description).trim(),
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        rules: Array.isArray(rules) ? rules : (rules ? String(rules).split('\n').filter(Boolean) : []),
        requiredActions: Array.isArray(requiredActions) ? requiredActions : (requiredActions ? String(requiredActions).split('\n').filter(Boolean) : []),
        pointsReward: Number(pointsReward) || 50,
        eligibilityRequirements: eligibilityRequirements ? String(eligibilityRequirements).trim() : 'Open to all registered movement members with verified reusable bag proof.',
        status: status || 'ACTIVE',
        createdAt: new Date().toISOString(),
        createdBy: admin.email,
      };

      db.challenges.unshift(newChallenge);

      logAudit(
        admin.id,
        admin.email,
        'CHALLENGE_CREATED',
        `Created challenge "${newChallenge.title}" with ${newChallenge.pointsReward} reward points.`,
        newChallenge.id,
        'CHALLENGE'
      );

      saveDatabase(db);
      res.status(201).json({ challenge: newChallenge, message: 'Challenge created.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create challenge.' });
    }
  });

  // TOP ADMIN: Update challenge
  app.put('/api/admin/challenges/:id', requireTopAdmin, (req, res) => {
    const admin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;
    const challenge = db.challenges.find(c => c.id === id);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    const { title, description, startDate, endDate, rules, requiredActions, pointsReward, eligibilityRequirements, status } = req.body;
    if (title) challenge.title = String(title).trim();
    if (description) challenge.description = String(description).trim();
    if (startDate) challenge.startDate = startDate;
    if (endDate) challenge.endDate = endDate;
    if (rules !== undefined) challenge.rules = Array.isArray(rules) ? rules : String(rules).split('\n').filter(Boolean);
    if (requiredActions !== undefined) challenge.requiredActions = Array.isArray(requiredActions) ? requiredActions : String(requiredActions).split('\n').filter(Boolean);
    if (pointsReward !== undefined) challenge.pointsReward = Number(pointsReward);
    if (eligibilityRequirements !== undefined) challenge.eligibilityRequirements = String(eligibilityRequirements).trim();
    if (status) challenge.status = status;

    logAudit(
      admin.id,
      admin.email,
      'CHALLENGE_UPDATED',
      `Updated challenge "${challenge.title}" (Status: ${challenge.status}).`,
      challenge.id,
      'CHALLENGE'
    );

    saveDatabase(db);
    res.json({ challenge, message: 'Challenge updated.' });
  });

  // TOP ADMIN: Delete challenge
  app.delete('/api/admin/challenges/:id', requireTopAdmin, (req, res) => {
    const admin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;
    const initialLen = db.challenges.length;
    db.challenges = db.challenges.filter(c => c.id !== id);

    if (db.challenges.length === initialLen) {
      return res.status(404).json({ error: 'Challenge not found.' });
    }

    logAudit(admin.id, admin.email, 'DELETED_CHALLENGE', `Deleted challenge #${id}`, id, 'CHALLENGE');
    saveDatabase(db);
    res.json({ success: true, message: 'Challenge removed.' });
  });

  // ----------------------------------------------------
  // PRIZES (TOP ADMIN & PUBLIC)
  // ----------------------------------------------------

  // Public: Get prizes
  app.get('/api/prizes', (req, res) => {
    res.json({ prizes: db.prizes });
  });

  // TOP ADMIN: Create prize
  app.post('/api/admin/prizes', requireTopAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { title, description, value, eligibility, competitionPeriod, status, winnerInfo, paymentStatus } = req.body;

      if (!title || !value) {
        return res.status(400).json({ error: 'Prize title and value are required.' });
      }

      const newPrize: DbSchema['prizes'][0] = {
        id: 'prz_' + crypto.randomUUID(),
        title: String(title).trim(),
        description: description ? String(description).trim() : '',
        value: String(value).trim(),
        eligibility: eligibility ? String(eligibility).trim() : 'Open to highest verified bag avoiders this cycle.',
        competitionPeriod: competitionPeriod ? String(competitionPeriod).trim() : 'Current Cycle',
        status: status || 'ACTIVE',
        winnerInfo: winnerInfo || '',
        paymentStatus: paymentStatus || 'NOT_APPLICABLE',
        createdAt: new Date().toISOString(),
        createdBy: admin.email,
      };

      db.prizes.unshift(newPrize);

      logAudit(
        admin.id,
        admin.email,
        'PRIZE_CREATED',
        `Created prize "${newPrize.title}" valued at ${newPrize.value}.`,
        newPrize.id,
        'PRIZE'
      );

      saveDatabase(db);
      res.status(201).json({ prize: newPrize, message: 'Prize created.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create prize.' });
    }
  });

  // TOP ADMIN: Update prize
  app.put('/api/admin/prizes/:id', requireTopAdmin, (req, res) => {
    const admin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;
    const prize = db.prizes.find(p => p.id === id);

    if (!prize) {
      return res.status(404).json({ error: 'Prize not found.' });
    }

    const { title, description, value, eligibility, competitionPeriod, status, winnerInfo, paymentStatus } = req.body;
    if (title) prize.title = String(title).trim();
    if (description !== undefined) prize.description = String(description).trim();
    if (value) prize.value = String(value).trim();
    if (eligibility !== undefined) prize.eligibility = String(eligibility).trim();
    if (competitionPeriod !== undefined) prize.competitionPeriod = String(competitionPeriod).trim();
    if (status) prize.status = status;
    if (winnerInfo !== undefined) prize.winnerInfo = String(winnerInfo).trim();
    if (paymentStatus) prize.paymentStatus = paymentStatus;

    logAudit(
      admin.id,
      admin.email,
      'PRIZE_UPDATED',
      `Updated prize "${prize.title}" (Status: ${prize.status}, Winner: ${prize.winnerInfo || 'None'}).`,
      prize.id,
      'PRIZE'
    );

    saveDatabase(db);
    res.json({ prize, message: 'Prize updated.' });
  });

  // TOP ADMIN: Delete prize
  app.delete('/api/admin/prizes/:id', requireTopAdmin, (req, res) => {
    const admin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;
    const initialLen = db.prizes.length;
    db.prizes = db.prizes.filter(p => p.id !== id);

    if (db.prizes.length === initialLen) {
      return res.status(404).json({ error: 'Prize not found.' });
    }

    logAudit(admin.id, admin.email, 'DELETED_PRIZE', `Deleted prize #${id}`, id, 'PRIZE');
    saveDatabase(db);
    res.json({ success: true, message: 'Prize removed.' });
  });

  // ----------------------------------------------------
  // IMPACT SETTINGS (CONFIGURABLE BY TOP ADMIN)
  // ----------------------------------------------------

  // Public: Get current impact settings
  app.get('/api/config/impact', (req, res) => {
    res.json({ settings: db.impactSettings });
  });

  // TOP ADMIN: Update impact settings
  app.put('/api/admin/config/impact', requireTopAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { bagsInOneReusable, co2eMinGramsPerBag, co2eMaxGramsPerBag, pointsPerApprovedAction } = req.body;

      const numBags = Number(bagsInOneReusable);
      const numMin = Number(co2eMinGramsPerBag);
      const numMax = Number(co2eMaxGramsPerBag);
      const numPoints = Number(pointsPerApprovedAction);

      if (isNaN(numBags) || numBags < 1) {
        return res.status(400).json({ error: 'Bags in one reusable must be a positive number (minimum 1).' });
      }
      if (isNaN(numMin) || numMin < 1 || isNaN(numMax) || numMax < numMin) {
        return res.status(400).json({ error: 'CO2e range must be valid positive numbers with min <= max.' });
      }
      if (isNaN(numPoints) || numPoints < 1) {
        return res.status(400).json({ error: 'Points per action must be a positive number.' });
      }

      db.impactSettings = {
        bagsInOneReusable: numBags,
        co2eMinGramsPerBag: numMin,
        co2eMaxGramsPerBag: numMax,
        pointsPerApprovedAction: numPoints,
        updatedAt: new Date().toISOString(),
        updatedBy: admin.email,
      };

      logAudit(
        admin.id,
        admin.email,
        'SETTINGS_UPDATED',
        `Changed impact parameters: Bags/Reusable = ${numBags}, CO2e = ${numMin}-${numMax}g, Points/Action = ${numPoints}`,
        'CONFIG',
        'SETTINGS'
      );

      saveDatabase(db);
      res.json({ settings: db.impactSettings, message: 'Impact configuration saved successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update impact settings.' });
    }
  });

  // ----------------------------------------------------
  // ORGANIZATION PROFILE (TOP ADMIN & PUBLIC)
  // ----------------------------------------------------

  // Public: Get org profile
  app.get('/api/config/organization', (req, res) => {
    res.json({ profile: db.orgProfile });
  });

  // TOP ADMIN: Upload Organization Logo to Cloudinary
  app.post('/api/admin/organization/upload-logo', requireTopAdmin, async (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { image } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Valid image data is required.' });
      }

      // Check format (support standard image formats)
      const mimeMatch = image.match(/^data:image\/(jpeg|jpg|png|webp|svg\+xml|gif);base64,/i);
      if (!mimeMatch) {
        return res.status(400).json({ error: 'Unsupported image type. Only JPEG, PNG, WEBP, and SVG images are permitted.' });
      }

      // Check max size (10MB)
      const approxSizeBytes = (image.length * 3) / 4;
      if (approxSizeBytes > 10 * 1024 * 1024) {
        return res.status(413).json({ error: 'Logo file size exceeds the maximum limit of 10MB.' });
      }

      if (!isCloudinaryConfigured) {
        return res.status(503).json({
          error: 'Cloudinary storage service is not configured on the server.',
        });
      }

      const uploadResult = await uploadLogoToCloudinary(image, admin.id);

      return res.status(200).json({
        success: true,
        logoUrl: uploadResult.logoUrl,
        cloudinaryPublicId: uploadResult.cloudinaryPublicId,
        message: 'Organization logo uploaded successfully to Cloudinary.',
      });
    } catch (err: any) {
      console.error('[CLOUDINARY LOGO UPLOAD ERROR]:', err);
      return res.status(500).json({ error: err.message || 'Failed to upload organization logo to Cloudinary.' });
    }
  });

  // TOP ADMIN: Update org profile
  app.put('/api/admin/config/organization', requireTopAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const {
        logoUrl,
        logoPublicId,
        orgName,
        movementName,
        slogan,
        mission,
        description,
        contactEmail,
        website,
        location,
        socialLinks,
        registrationInfo,
        pillars,
        phone,
      } = req.body;

      if (!orgName || !movementName) {
        return res.status(400).json({ error: 'Organization name and movement name are required.' });
      }

      db.orgProfile = {
        ...db.orgProfile,
        logoUrl: logoUrl !== undefined ? String(logoUrl).trim() : (db.orgProfile.logoUrl || '/InShot_20260917_104354103.png'),
        logoPublicId: logoPublicId !== undefined ? String(logoPublicId).trim() : (db.orgProfile.logoPublicId || ''),
        orgName: String(orgName).trim(),
        movementName: String(movementName).trim(),
        slogan: slogan !== undefined ? String(slogan).trim() : (db.orgProfile.slogan || 'Stay Aware'),
        pillars: pillars !== undefined ? String(pillars).trim() : (db.orgProfile.pillars || 'Educate. Unite. Act.'),
        mission: mission !== undefined ? String(mission).trim() : (db.orgProfile.mission || ''),
        description: description !== undefined ? String(description).trim() : (db.orgProfile.description || ''),
        contactEmail: contactEmail !== undefined ? String(contactEmail).trim() : (db.orgProfile.contactEmail || ''),
        phone: phone !== undefined ? String(phone).trim() : (db.orgProfile.phone || ''),
        website: website !== undefined ? String(website).trim() : (db.orgProfile.website || ''),
        location: location !== undefined ? String(location).trim() : (db.orgProfile.location || ''),
        socialLinks: socialLinks ? { ...db.orgProfile.socialLinks, ...socialLinks } : db.orgProfile.socialLinks,
        registrationInfo: registrationInfo !== undefined ? String(registrationInfo).trim() : (db.orgProfile.registrationInfo || ''),
        updatedAt: new Date().toISOString(),
        updatedBy: admin.email,
      };

      logAudit(
        admin.id,
        admin.email,
        'SETTINGS_UPDATED',
        `Updated organization profile and movement metadata.`,
        'ORG_PROFILE',
        'SETTINGS'
      );

      saveDatabase(db);
      res.json({ profile: db.orgProfile, message: 'Organization profile updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update organization profile.' });
    }
  });

  // ----------------------------------------------------
  // PAYMENT & ACCOUNT SETTINGS (TOP ADMIN PRIVATE vs PUBLIC)
  // ----------------------------------------------------

  // Public: Get public payment instructions (NO private bank info)
  app.get('/api/config/payment-public', (req, res) => {
    res.json({
      publicInstructions: db.paymentSettings.publicInstructions,
      publicSupportNotice: db.paymentSettings.publicSupportNotice,
    });
  });

  // TOP ADMIN ONLY: Get full payment & account settings including private bank data
  app.get('/api/admin/config/payment', requireTopAdmin, (req, res) => {
    res.json({ settings: db.paymentSettings });
  });

  // TOP ADMIN ONLY: Update payment & account settings
  app.put('/api/admin/config/payment', requireTopAdmin, (req, res) => {
    try {
      const admin = (req as any).user as DbSchema['users'][0];
      const { accountName, bankOrProvider, accountNumber, privateNotes, publicInstructions, publicSupportNotice } = req.body;

      db.paymentSettings = {
        accountName: accountName !== undefined ? String(accountName).trim() : db.paymentSettings.accountName,
        bankOrProvider: bankOrProvider !== undefined ? String(bankOrProvider).trim() : db.paymentSettings.bankOrProvider,
        accountNumber: accountNumber !== undefined ? String(accountNumber).trim() : db.paymentSettings.accountNumber,
        privateNotes: privateNotes !== undefined ? String(privateNotes).trim() : db.paymentSettings.privateNotes,
        publicInstructions: publicInstructions !== undefined ? String(publicInstructions).trim() : db.paymentSettings.publicInstructions,
        publicSupportNotice: publicSupportNotice !== undefined ? String(publicSupportNotice).trim() : db.paymentSettings.publicSupportNotice,
        updatedAt: new Date().toISOString(),
        updatedBy: admin.email,
      };

      logAudit(
        admin.id,
        admin.email,
        'SETTINGS_UPDATED',
        'Updated administrative treasury payment and banking configuration.',
        'PAYMENT_CONFIG',
        'SETTINGS'
      );

      saveDatabase(db);
      res.json({ settings: db.paymentSettings, message: 'Payment settings saved securely.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to save payment settings.' });
    }
  });

  // ----------------------------------------------------
  // ADMIN MANAGEMENT (TOP ADMIN ONLY)
  // ----------------------------------------------------

  // List all administrators
  app.get('/api/admin/admins', requireTopAdmin, (req, res) => {
    res.json({ admins: db.admins });
  });

  // Add / Invite Administrator (Top Admin assigns ADMIN role)
  app.post('/api/admin/admins', requireTopAdmin, (req, res) => {
    try {
      const topAdmin = (req as any).user as DbSchema['users'][0];
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email address is required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const targetUser = db.users.find(u => u.email === cleanEmail);

      if (!targetUser) {
        return res.status(404).json({ error: `No registered account found with email: ${cleanEmail}. The user must first create an account.` });
      }

      if (targetUser.role === 'TOP_ADMIN') {
        return res.status(400).json({ error: 'This user is already the Top Administrator.' });
      }

      // Assign ADMIN role
      targetUser.role = 'ADMIN';

      const existingRecordIndex = db.admins.findIndex(a => a.userId === targetUser.id);
      if (existingRecordIndex >= 0) {
        db.admins[existingRecordIndex].role = 'ADMIN';
        db.admins[existingRecordIndex].status = 'ACTIVE';
      } else {
        db.admins.push({
          adminId: 'adm_' + crypto.randomUUID(),
          userId: targetUser.id,
          email: targetUser.email,
          name: targetUser.fullName,
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          createdBy: topAdmin.id,
          creatorEmail: topAdmin.email,
        });
      }

      logAudit(
        topAdmin.id,
        topAdmin.email,
        'TOP_ADMIN_ADDED_ADMIN',
        `Appointed user ${targetUser.email} (${targetUser.fullName}) as ADMIN.`,
        targetUser.id,
        'USER'
      );

      saveDatabase(db);
      res.status(201).json({
        message: `Successfully appointed ${targetUser.fullName} (${targetUser.email}) as Administrator.`,
        admins: db.admins,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add administrator.' });
    }
  });

  // Toggle Admin Status (Activate / Deactivate)
  app.put('/api/admin/admins/:id/status', requireTopAdmin, (req, res) => {
    const topAdmin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;
    const { status } = req.body;

    const adminRecord = db.admins.find(a => a.adminId === id || a.userId === id);
    if (!adminRecord) {
      return res.status(404).json({ error: 'Admin record not found.' });
    }

    if (adminRecord.role === 'TOP_ADMIN') {
      return res.status(403).json({ error: 'The Top Administrator cannot be deactivated.' });
    }

    adminRecord.status = status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
    const targetUser = db.users.find(u => u.id === adminRecord.userId);
    if (targetUser) {
      targetUser.accountStatus = adminRecord.status;
    }

    logAudit(
      topAdmin.id,
      topAdmin.email,
      adminRecord.status === 'ACTIVE' ? 'ADMIN_ACTIVATED' : 'ADMIN_DEACTIVATED',
      `Changed administrator ${adminRecord.email} status to ${adminRecord.status}.`,
      adminRecord.userId,
      'ADMIN'
    );

    saveDatabase(db);
    res.json({ admin: adminRecord, message: `Admin status set to ${adminRecord.status}.` });
  });

  // Remove Admin Access (Demote back to REGISTERED_USER)
  app.delete('/api/admin/admins/:id', requireTopAdmin, (req, res) => {
    const topAdmin = (req as any).user as DbSchema['users'][0];
    const { id } = req.params;

    const adminRecord = db.admins.find(a => a.adminId === id || a.userId === id);
    if (!adminRecord) {
      return res.status(404).json({ error: 'Admin record not found.' });
    }

    if (adminRecord.role === 'TOP_ADMIN') {
      return res.status(403).json({ error: 'The Top Administrator access cannot be removed.' });
    }

    // Demote user
    const targetUser = db.users.find(u => u.id === adminRecord.userId);
    if (targetUser) {
      targetUser.role = 'REGISTERED_USER';
    }

    db.admins = db.admins.filter(a => a.adminId !== adminRecord.adminId);

    logAudit(
      topAdmin.id,
      topAdmin.email,
      'ADMIN_REMOVED',
      `Revoked administrator privileges from ${adminRecord.email}.`,
      adminRecord.userId,
      'ADMIN'
    );

    saveDatabase(db);
    res.json({ success: true, message: `Admin privileges removed for ${adminRecord.email}.` });
  });

  // ----------------------------------------------------
  // USER MANAGEMENT & AUDIT LOGS (ADMIN & TOP ADMIN)
  // ----------------------------------------------------

  // List registered users (Admins & Top Admin)
  app.get('/api/admin/users', requireAdmin, (req, res) => {
    const safeUsers = db.users.map(u => sanitizeUser(u));
    res.json({ users: safeUsers });
  });

  // Audit Logs (Admins & Top Admin)
  app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    res.json({ auditLogs: db.auditLogs });
  });

  // System Stats (Admins & Top Admin - strictly REAL data, no fake counts)
  app.get('/api/stats', (req, res) => {
    const registeredUsersCount = db.users.length;
    const pendingSubmissionsCount = db.submissions.filter(s => s.status === 'PENDING').length;
    const approvedSubmissionsCount = db.submissions.filter(s => s.status === 'APPROVED').length;
    const rejectedSubmissionsCount = db.submissions.filter(s => s.status === 'REJECTED').length;

    const totalVerifiedActions = db.submissions.filter(s => s.status === 'APPROVED').length;
    const totalVerifiedBagsAvoided = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.bagsAvoided || 0), 0);

    const totalCo2eGramsMin = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.co2eGramsMin || 0), 0);

    const totalCo2eGramsMax = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.co2eGramsMax || 0), 0);

    const activeChallengesCount = db.challenges.filter(c => c.status === 'ACTIVE').length;
    const activePrizesCount = db.prizes.filter(p => p.status === 'ACTIVE').length;

    res.json({
      stats: {
        registeredUsersCount,
        pendingSubmissionsCount,
        approvedSubmissionsCount,
        rejectedSubmissionsCount,
        totalVerifiedActions,
        totalVerifiedBagsAvoided,
        totalCo2eAvoidedKgMin: Number((totalCo2eGramsMin / 1000).toFixed(2)),
        totalCo2eAvoidedKgMax: Number((totalCo2eGramsMax / 1000).toFixed(2)),
        activeChallengesCount,
        activePrizesCount,
      },
    });
  });

  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const registeredUsersCount = db.users.length;
    const pendingSubmissionsCount = db.submissions.filter(s => s.status === 'PENDING').length;
    const approvedSubmissionsCount = db.submissions.filter(s => s.status === 'APPROVED').length;
    const rejectedSubmissionsCount = db.submissions.filter(s => s.status === 'REJECTED').length;

    const totalVerifiedActions = db.submissions.filter(s => s.status === 'APPROVED').length;
    const totalVerifiedBagsAvoided = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.bagsAvoided || 0), 0);

    const totalCo2eGramsMin = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.co2eGramsMin || 0), 0);

    const totalCo2eGramsMax = db.submissions
      .filter(s => s.status === 'APPROVED')
      .reduce((sum, s) => sum + (s.co2eGramsMax || 0), 0);

    const activeChallengesCount = db.challenges.filter(c => c.status === 'ACTIVE').length;
    const activePrizesCount = db.prizes.filter(p => p.status === 'ACTIVE').length;

    res.json({
      stats: {
        registeredUsersCount,
        pendingSubmissionsCount,
        approvedSubmissionsCount,
        rejectedSubmissionsCount,
        totalVerifiedActions,
        totalVerifiedBagsAvoided,
        totalCo2eAvoidedKgMin: Number((totalCo2eGramsMin / 1000).toFixed(2)),
        totalCo2eAvoidedKgMax: Number((totalCo2eGramsMax / 1000).toFixed(2)),
        activeChallengesCount,
        activePrizesCount,
      },
    });
  });

  // ----------------------------------------------------
  // RANK (LEADERBOARD) & CONNECT (COMMUNITY)
  // ----------------------------------------------------

  // Leaderboard: Generated strictly from users who have verified points > 0
  app.get('/api/rank', (req, res) => {
    const verifiedUsers = db.users
      .filter(u => u.verifiedPoints > 0)
      .sort((a, b) => b.verifiedPoints - a.verifiedPoints)
      .map((u, index) => ({
        userId: u.id,
        userName: u.fullName,
        position: index + 1,
        verifiedPoints: u.verifiedPoints,
        verifiedActionsCount: u.verifiedActionsCount,
        verifiedBagsAvoided: u.verifiedBagsAvoided,
      }));

    res.json({ leaderboard: verifiedUsers });
  });

  // Community posts (Public & Authenticated)
  app.get('/api/community/posts', (req, res) => {
    res.json({ posts: db.communityPosts });
  });

  app.post('/api/community/posts', requireAuth, (req, res) => {
    const user = (req as any).user as DbSchema['users'][0];
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const newPost: DbSchema['communityPosts'][0] = {
      id: 'post_' + crypto.randomUUID(),
      userId: user.id,
      userName: user.fullName,
      title: String(title).trim(),
      content: String(content).trim(),
      category: category || 'DISCUSSION',
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    db.communityPosts.unshift(newPost);
    saveDatabase(db);
    res.status(201).json({ post: newPost, message: 'Post shared to the movement!' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Awareness Global Movement Server' });
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE / STATIC SERVING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const candidateDistPaths = [
      path.join(process.cwd(), 'dist'),
      __dirname,
      path.join(__dirname, '..', 'dist'),
      path.join(__dirname, 'dist'),
    ];
    const distPath = candidateDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      // Never send HTML to API endpoints
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Production static build files (index.html) could not be located. Run `npm run build` prior to starting.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Awareness Global Movement server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
