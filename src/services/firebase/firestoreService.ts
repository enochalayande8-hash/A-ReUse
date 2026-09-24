import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDocFromServer,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  User,
  ProofSubmission,
  Challenge,
  Prize,
  CommunityPost,
  ImpactSettings,
  OrganizationProfile,
  DEFAULT_ORGANIZATION_PROFILE,
  PaymentSettings,
  LeaderboardEntry,
  AdminUserRecord,
} from '../../types';

/**
 * Validates connection to Firestore server on application load safely
 */
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) {
    console.warn('[Firestore] Database instance not initialized.');
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Live server connection established.');
    return true;
  } catch (error: any) {
    if (
      error?.code === 'unavailable' ||
      (error instanceof Error &&
        (error.message.includes('the client is offline') ||
         error.message.includes('unavailable') ||
         error.message.includes('Could not reach Cloud Firestore')))
    ) {
      console.warn('[Firestore] Backend connection initializing or offline mode active.');
      return false;
    }
    // Any other response (e.g., permission-denied for test doc) means backend was reached successfully
    return true;
  }
}

// ----------------------------------------------------
// USERS COLLECTION
// ----------------------------------------------------

export async function saveUserToFirestore(user: User): Promise<void> {
  if (!db || !user?.id) return;
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
      fullName: user.fullName,
      email: user.email,
      role: user.role || 'REGISTERED_USER',
      accountStatus: user.accountStatus || 'ACTIVE',
      createdAt: user.createdAt || new Date().toISOString(),
      verifiedActionsCount: user.verifiedActionsCount || 0,
      verifiedPoints: user.verifiedPoints || 0,
      verifiedReusableBagUses: user.verifiedReusableBagUses || 0,
      verifiedBagsAvoided: user.verifiedBagsAvoided || 0,
      verifiedCo2eAvoidedGramsMin: user.verifiedCo2eAvoidedGramsMin || 0,
      verifiedCo2eAvoidedGramsMax: user.verifiedCo2eAvoidedGramsMax || 0,
      ...(user.profileImageUrl ? { profileImageUrl: user.profileImageUrl } : {}),
      ...(user.firebaseUid ? { firebaseUid: user.firebaseUid } : {}),
    }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] Note on saving user doc to Firestore:', err);
  }
}

export async function getUserFromFirestore(userId: string): Promise<User | null> {
  if (!db || !userId) return null;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as User;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] getUser error:', err);
    return null;
  }
}

export function subscribeToUserDoc(userId: string, callback: (user: Partial<User> | null) => void) {
  if (!db || !userId) return () => {};
  try {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as User);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('[Firestore] User doc listener error:', err);
    });
  } catch {
    return () => {};
  }
}

// ----------------------------------------------------
// SUBMISSIONS COLLECTION
// ----------------------------------------------------

export async function createSubmissionInFirestore(submission: ProofSubmission): Promise<void> {
  if (!db || !submission?.id) return;
  try {
    const subRef = doc(db, 'submissions', submission.id);
    await setDoc(subRef, {
      id: submission.id,
      userId: submission.userId,
      userName: submission.userName,
      userEmail: submission.userEmail,
      actionType: submission.actionType,
      description: submission.description,
      evidenceUrl: submission.evidenceUrl,
      ...(submission.proofImageUrl ? { proofImageUrl: submission.proofImageUrl } : {}),
      ...(submission.cloudinaryPublicId ? { cloudinaryPublicId: submission.cloudinaryPublicId } : {}),
      ...(submission.cloudinarySecureUrl ? { cloudinarySecureUrl: submission.cloudinarySecureUrl } : {}),
      submittedAt: submission.submittedAt,
      status: submission.status,
      ...(submission.reviewedBy ? { reviewedBy: submission.reviewedBy } : {}),
      ...(submission.reviewerEmail ? { reviewerEmail: submission.reviewerEmail } : {}),
      ...(submission.reviewedAt ? { reviewedAt: submission.reviewedAt } : {}),
      ...(submission.reviewNote ? { reviewNote: submission.reviewNote } : {}),
      ...(submission.pointsAwarded !== undefined ? { pointsAwarded: submission.pointsAwarded } : {}),
      ...(submission.bagsAvoided !== undefined ? { bagsAvoided: submission.bagsAvoided } : {}),
      ...(submission.co2eGramsMin !== undefined ? { co2eGramsMin: submission.co2eGramsMin } : {}),
      ...(submission.co2eGramsMax !== undefined ? { co2eGramsMax: submission.co2eGramsMax } : {}),
    });
  } catch (err) {
    console.warn('[Firestore] createSubmission error:', err);
  }
}

export async function fetchUserSubmissionsFromFirestore(userId: string): Promise<ProofSubmission[]> {
  if (!db || !userId) return [];
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, 'submissions'), where('userId', '==', userId)));
    } catch {
      snap = await getDocs(collection(db, 'submissions'));
    }
    const results = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as ProofSubmission))
      .filter((s) => s.userId === userId);
    return results.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  } catch (err) {
    console.warn('[Firestore] fetchUserSubmissions error:', err);
    return [];
  }
}

// ----------------------------------------------------
// CHALLENGES COLLECTION
// ----------------------------------------------------

export async function fetchChallengesFromFirestore(): Promise<Challenge[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'challenges'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Challenge));
  } catch (err) {
    console.warn('[Firestore] fetchChallenges error:', err);
    return [];
  }
}

export async function saveChallengeToFirestore(challenge: Challenge): Promise<void> {
  if (!db || !challenge?.id) return;
  try {
    const cRef = doc(db, 'challenges', challenge.id);
    await setDoc(cRef, challenge, { merge: true });
  } catch (err) {
    console.warn('[Firestore] saveChallenge error:', err);
  }
}

// ----------------------------------------------------
// PRIZES COLLECTION
// ----------------------------------------------------

export async function fetchPrizesFromFirestore(): Promise<Prize[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'prizes'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Prize));
  } catch (err) {
    console.warn('[Firestore] fetchPrizes error:', err);
    return [];
  }
}

export async function savePrizeToFirestore(prize: Prize): Promise<void> {
  if (!db || !prize?.id) return;
  try {
    const pRef = doc(db, 'prizes', prize.id);
    await setDoc(pRef, prize, { merge: true });
  } catch (err) {
    console.warn('[Firestore] savePrize error:', err);
  }
}

// ----------------------------------------------------
// COMMUNITY POSTS COLLECTION
// ----------------------------------------------------

export async function fetchCommunityPostsFromFirestore(): Promise<CommunityPost[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityPost));
  } catch (err) {
    console.warn('[Firestore] fetchCommunityPosts error:', err);
    return [];
  }
}

export async function addCommunityPostToFirestore(post: CommunityPost): Promise<void> {
  if (!db || !post?.id) return;
  try {
    const postRef = doc(db, 'communityPosts', post.id);
    await setDoc(postRef, post);
  } catch (err) {
    console.warn('[Firestore] addCommunityPost error:', err);
  }
}

// ----------------------------------------------------
// SETTINGS COLLECTION
// ----------------------------------------------------

export async function saveSettingToFirestore(key: string, data: any): Promise<void> {
  if (!db || !key) return;
  try {
    const sRef = doc(db, 'settings', key);
    await setDoc(sRef, data, { merge: true });
  } catch (err) {
    console.warn('[Firestore] saveSetting error:', err);
  }
}

export async function fetchSettingFromFirestore<T>(key: string): Promise<T | null> {
  if (!db || !key) return null;
  try {
    const sRef = doc(db, 'settings', key);
    const snap = await getDoc(sRef);
    if (snap.exists()) {
      return snap.data() as T;
    }
    return null;
  } catch (err) {
    console.warn('[Firestore] fetchSetting error:', err);
    return null;
  }
}

export async function saveOrgProfileToFirestore(profile: OrganizationProfile): Promise<void> {
  return saveSettingToFirestore('orgProfile', profile);
}

export async function fetchOrgProfileFromFirestore(): Promise<OrganizationProfile> {
  const profile = await fetchSettingFromFirestore<OrganizationProfile>('orgProfile');
  if (profile && profile.orgName) {
    return profile;
  }
  // Automatically seed and return default profile if none exists yet
  saveOrgProfileToFirestore(DEFAULT_ORGANIZATION_PROFILE).catch(() => {});
  return DEFAULT_ORGANIZATION_PROFILE;
}

// ----------------------------------------------------
// ADMIN SUBMISSIONS MANAGEMENT
// ----------------------------------------------------

export async function fetchAdminSubmissionsFromFirestore(statusFilter?: string): Promise<ProofSubmission[]> {
  if (!db) return [];
  try {
    let snap;
    if (statusFilter && statusFilter !== 'ALL') {
      try {
        snap = await getDocs(query(collection(db, 'submissions'), where('status', '==', statusFilter)));
      } catch (errFilter) {
        console.warn('[Firestore] Status query failed, falling back to full collection read:', errFilter);
        snap = await getDocs(collection(db, 'submissions'));
      }
    } else {
      snap = await getDocs(collection(db, 'submissions'));
    }

    let results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProofSubmission));

    if (statusFilter && statusFilter !== 'ALL') {
      results = results.filter((s) => s.status === statusFilter);
    }

    // Always sort by date descending in JavaScript safely
    return results.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  } catch (err) {
    console.warn('[Firestore] fetchAdminSubmissions error:', err);
    return [];
  }
}

export async function ensureAdminRecordInFirestore(
  userId: string,
  email: string,
  name?: string,
  role: 'TOP_ADMIN' | 'ADMIN' = 'TOP_ADMIN'
): Promise<void> {
  if (!db || !userId) return;
  const cleanEmail = email.toLowerCase().trim();
  const adminData: AdminUserRecord = {
    adminId: 'adm_' + userId,
    userId,
    email: cleanEmail,
    name: name || cleanEmail.split('@')[0],
    role,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    createdBy: 'SYSTEM_BOOTSTRAP',
    creatorEmail: cleanEmail,
  };

  try {
    await setDoc(doc(db, 'admins', userId), adminData, { merge: true });
    if (cleanEmail && cleanEmail !== userId) {
      await setDoc(doc(db, 'admins', cleanEmail), adminData, { merge: true });
    }
  } catch (err) {
    console.warn('[Firestore] ensureAdminRecord note:', err);
  }
}

export function compressImageToDataUrl(
  file: File,
  maxDimension = 400,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/webp';
          resolve(canvas.toDataURL(mime, mime === 'image/webp' ? quality : undefined));
        } else {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function reviewSubmissionInFirestore(
  submissionId: string,
  reviewData: {
    status: 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    customPoints?: number;
  },
  reviewerUser?: User | null,
  fallbackSubmission?: ProofSubmission | null
): Promise<{ success: boolean; message: string }> {
  if (!db || !submissionId) return { success: false, message: 'Database unavailable' };

  try {
    const subRef = doc(db, 'submissions', submissionId);
    const subSnap = await getDoc(subRef);

    let currentSub: ProofSubmission;
    if (subSnap.exists()) {
      currentSub = subSnap.data() as ProofSubmission;
    } else if (fallbackSubmission) {
      currentSub = fallbackSubmission;
    } else {
      currentSub = {
        id: submissionId,
        userId: reviewerUser?.id || 'unknown',
        userName: 'Member',
        userEmail: '',
        actionType: 'USED_REUSABLE_BAG',
        description: 'Verified Action',
        evidenceUrl: '',
        submittedAt: new Date().toISOString(),
        status: 'PENDING',
      };
    }

    const pointsAwarded = reviewData.status === 'APPROVED' ? (reviewData.customPoints !== undefined ? reviewData.customPoints : 10) : 0;
    const bagsAvoided = reviewData.status === 'APPROVED' ? 1 : 0;
    const co2eGramsMin = reviewData.status === 'APPROVED' ? 25 : 0;
    const co2eGramsMax = reviewData.status === 'APPROVED' ? 50 : 0;

    const updatePayload: Partial<ProofSubmission> = {
      status: reviewData.status,
      reviewedBy: reviewerUser?.id || 'admin',
      reviewerEmail: reviewerUser?.email || 'admin@movement.org',
      reviewedAt: new Date().toISOString(),
      reviewNote: reviewData.reviewNote || '',
      pointsAwarded,
      bagsAvoided,
      co2eGramsMin,
      co2eGramsMax,
    };

    if (subSnap.exists()) {
      await updateDoc(subRef, updatePayload);
    } else {
      await setDoc(subRef, { ...currentSub, ...updatePayload });
    }

    // If approved, safely update user's cumulative verified metrics
    if (reviewData.status === 'APPROVED' && currentSub) {
      try {
        let userUpdated = false;
        if (currentSub.userId) {
          const userRef = doc(db, 'users', currentSub.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const u = userSnap.data() as User;
            await updateDoc(userRef, {
              verifiedPoints: (u.verifiedPoints || 0) + pointsAwarded,
              verifiedActionsCount: (u.verifiedActionsCount || 0) + 1,
              verifiedReusableBagUses: (u.verifiedReusableBagUses || 0) + 1,
              verifiedBagsAvoided: (u.verifiedBagsAvoided || 0) + bagsAvoided,
              verifiedCo2eAvoidedGramsMin: (u.verifiedCo2eAvoidedGramsMin || 0) + co2eGramsMin,
              verifiedCo2eAvoidedGramsMax: (u.verifiedCo2eAvoidedGramsMax || 0) + co2eGramsMax,
            });
            userUpdated = true;
          }
        }

        // Fallback: If not found by UID, locate user by registered email
        if (!userUpdated && currentSub.userEmail) {
          const userQ = query(
            collection(db, 'users'),
            where('email', '==', currentSub.userEmail.toLowerCase().trim()),
            limit(1)
          );
          const snap = await getDocs(userQ);
          if (!snap.empty) {
            const targetDoc = snap.docs[0];
            const u = targetDoc.data() as User;
            await updateDoc(targetDoc.ref, {
              verifiedPoints: (u.verifiedPoints || 0) + pointsAwarded,
              verifiedActionsCount: (u.verifiedActionsCount || 0) + 1,
              verifiedReusableBagUses: (u.verifiedReusableBagUses || 0) + 1,
              verifiedBagsAvoided: (u.verifiedBagsAvoided || 0) + bagsAvoided,
              verifiedCo2eAvoidedGramsMin: (u.verifiedCo2eAvoidedGramsMin || 0) + co2eGramsMin,
              verifiedCo2eAvoidedGramsMax: (u.verifiedCo2eAvoidedGramsMax || 0) + co2eGramsMax,
            });
          }
        }
      } catch (userErr) {
        console.warn('[Firestore] Note updating user metrics after review:', userErr);
      }
    }

    return {
      success: true,
      message: `Submission ${reviewData.status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`,
    };
  } catch (err: any) {
    console.error('[Firestore] reviewSubmission error:', err);
    throw new Error(err.message || 'Failed to record review in Firestore');
  }
}

export async function fetchRegisteredUsersFromFirestore(): Promise<User[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'users'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
  } catch (err) {
    console.warn('[Firestore] fetchRegisteredUsers error:', err);
    return [];
  }
}

export async function deleteChallengeFromFirestore(id: string): Promise<void> {
  if (!db || !id) return;
  try {
    await deleteDoc(doc(db, 'challenges', id));
  } catch (err) {
    console.warn('[Firestore] deleteChallenge error:', err);
  }
}

export async function deletePrizeFromFirestore(id: string): Promise<void> {
  if (!db || !id) return;
  try {
    await deleteDoc(doc(db, 'prizes', id));
  } catch (err) {
    console.warn('[Firestore] deletePrize error:', err);
  }
}

export async function fetchLeaderboardFromFirestore(): Promise<LeaderboardEntry[]> {
  if (!db) return [];
  try {
    const users = await fetchRegisteredUsersFromFirestore();
    return users
      .filter((u) => (u.verifiedPoints || 0) > 0)
      .sort((a, b) => (b.verifiedPoints || 0) - (a.verifiedPoints || 0))
      .map((u, index) => ({
        userId: u.id,
        userName: u.fullName || u.email.split('@')[0],
        position: index + 1,
        verifiedPoints: u.verifiedPoints || 0,
        verifiedActionsCount: u.verifiedActionsCount || 0,
        verifiedBagsAvoided: u.verifiedBagsAvoided || 0,
      }));
  } catch (err) {
    console.warn('[Firestore] fetchLeaderboard error:', err);
    return [];
  }
}

// ----------------------------------------------------
// ADMIN USER MANAGEMENT & ROSTER
// ----------------------------------------------------

export async function checkIfUserIsAdminInFirestore(userId?: string, email?: string): Promise<boolean> {
  if (!db) return false;
  try {
    if (userId) {
      const snap = await getDoc(doc(db, 'admins', userId));
      if (snap.exists() && snap.data()?.status === 'ACTIVE') return true;
    }
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const snapEmail = await getDoc(doc(db, 'admins', cleanEmail));
      if (snapEmail.exists() && snapEmail.data()?.status === 'ACTIVE') return true;
      const q = query(
        collection(db, 'admins'),
        where('email', '==', cleanEmail),
        where('status', '==', 'ACTIVE')
      );
      const snapQuery = await getDocs(q);
      if (!snapQuery.empty) return true;
    }
    return false;
  } catch (err) {
    console.warn('[Firestore] checkIfUserIsAdmin error:', err);
    return false;
  }
}

export async function fetchAdminsFromFirestore(): Promise<AdminUserRecord[]> {
  if (!db) return [];
  try {
    const q = query(collection(db, 'admins'));
    const snap = await getDocs(q);
    const admins = snap.docs.map((d) => ({ ...d.data() } as AdminUserRecord));
    return admins;
  } catch (err) {
    console.warn('[Firestore] fetchAdmins error:', err);
    return [];
  }
}

export async function addAdminInFirestore(
  email: string,
  topAdmin: { id: string; email: string }
): Promise<{ success: boolean; message: string; admin?: AdminUserRecord }> {
  if (!db || !email) return { success: false, message: 'Invalid input' };
  const cleanEmail = email.trim().toLowerCase();

  try {
    // Find registered user in Firestore
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('email', '==', cleanEmail))
    );

    let targetUserId = cleanEmail;
    let targetUserName = cleanEmail.split('@')[0];

    if (!usersSnap.empty) {
      const uDoc = usersSnap.docs[0];
      targetUserId = uDoc.id;
      const uData = uDoc.data();
      targetUserName = uData.fullName || targetUserName;

      // Update user document role
      await updateDoc(uDoc.ref, { role: 'ADMIN' });
    }

    const newAdminRecord: AdminUserRecord = {
      adminId: 'adm_' + targetUserId,
      userId: targetUserId,
      email: cleanEmail,
      name: targetUserName,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: topAdmin.id,
      creatorEmail: topAdmin.email,
    };

    // Store by user ID and by sanitized email
    await setDoc(doc(db, 'admins', targetUserId), newAdminRecord);
    if (targetUserId !== cleanEmail) {
      await setDoc(doc(db, 'admins', cleanEmail), newAdminRecord);
    }

    return {
      success: true,
      message: `Successfully appointed ${targetUserName} (${cleanEmail}) as Administrator.`,
      admin: newAdminRecord,
    };
  } catch (err: any) {
    console.error('[Firestore] addAdmin error:', err);
    throw new Error(err.message || 'Failed to appoint admin in Firestore.');
  }
}

export async function setAdminStatusInFirestore(
  adminIdOrUserId: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<{ success: boolean; message: string }> {
  if (!db || !adminIdOrUserId) return { success: false, message: 'Invalid identifier' };
  try {
    const adminRef = doc(db, 'admins', adminIdOrUserId);
    await updateDoc(adminRef, { status });
    return { success: true, message: `Admin status changed to ${status}.` };
  } catch (err: any) {
    console.error('[Firestore] setAdminStatus error:', err);
    throw new Error(err.message || 'Failed to update admin status in Firestore.');
  }
}

export async function removeAdminFromFirestore(
  adminIdOrUserId: string
): Promise<{ success: boolean; message: string }> {
  if (!db || !adminIdOrUserId) return { success: false, message: 'Invalid identifier' };
  try {
    await deleteDoc(doc(db, 'admins', adminIdOrUserId));

    // Also revert user role if user document exists
    const userRef = doc(db, 'users', adminIdOrUserId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      await updateDoc(userRef, { role: 'REGISTERED_USER' });
    }

    return { success: true, message: 'Admin privileges revoked.' };
  } catch (err: any) {
    console.error('[Firestore] removeAdmin error:', err);
    throw new Error(err.message || 'Failed to remove admin in Firestore.');
  }
}

