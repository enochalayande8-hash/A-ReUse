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
  PaymentSettings,
  LeaderboardEntry,
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
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProofSubmission));
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

export async function fetchOrgProfileFromFirestore(): Promise<OrganizationProfile | null> {
  return fetchSettingFromFirestore<OrganizationProfile>('orgProfile');
}

// ----------------------------------------------------
// ADMIN SUBMISSIONS MANAGEMENT
// ----------------------------------------------------

export async function fetchAdminSubmissionsFromFirestore(statusFilter?: string): Promise<ProofSubmission[]> {
  if (!db) return [];
  try {
    let q;
    if (statusFilter && statusFilter !== 'ALL') {
      try {
        q = query(
          collection(db, 'submissions'),
          where('status', '==', statusFilter),
          orderBy('submittedAt', 'desc')
        );
      } catch {
        q = query(collection(db, 'submissions'), where('status', '==', statusFilter));
      }
    } else {
      try {
        q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
      } catch {
        q = query(collection(db, 'submissions'));
      }
    }

    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProofSubmission));

    // Client-side sort safety
    return results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (err) {
    console.warn('[Firestore] fetchAdminSubmissions error:', err);
    return [];
  }
}

export async function reviewSubmissionInFirestore(
  submissionId: string,
  reviewData: {
    status: 'APPROVED' | 'REJECTED';
    reviewNote?: string;
    customPoints?: number;
  },
  reviewerUser?: User | null
): Promise<{ success: boolean; message: string }> {
  if (!db || !submissionId) return { success: false, message: 'Database unavailable' };

  try {
    const subRef = doc(db, 'submissions', submissionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) {
      return { success: false, message: 'Submission not found' };
    }

    const currentSub = subSnap.data() as ProofSubmission;
    const pointsAwarded = reviewData.status === 'APPROVED' ? (reviewData.customPoints || 10) : 0;
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

    await updateDoc(subRef, updatePayload);

    // If approved, update user's cumulative verified metrics
    if (reviewData.status === 'APPROVED' && currentSub.userId) {
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

