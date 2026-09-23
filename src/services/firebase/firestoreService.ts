import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
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
