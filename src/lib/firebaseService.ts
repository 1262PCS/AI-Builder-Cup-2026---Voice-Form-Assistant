import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { VoiceSettings, UserAutofillProfile, SessionHistoryItem } from '../types/extension';

export interface AppUserData {
  uid: string;
  email?: string;
  displayName?: string;
  voiceName: string;
  englishDialect?: string;
  speakingRate?: number;
  pitch?: number;
  confirmationMode?: string;
  autoFillProfile?: Partial<UserAutofillProfile>;
}

export class FirebaseDataService {
  /**
   * Listen to auth state
   */
  public onAuth(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Sign in with Google
   */
  public async loginWithGoogle(): Promise<FirebaseUser> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    }
  }

  /**
   * Continue as Guest
   */
  public async loginAsGuest(): Promise<FirebaseUser> {
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.error('Anonymous Sign In failed:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  public async logout(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Get User Settings & Autofill Memory
   */
  public async getUserProfile(uid: string): Promise<AppUserData | null> {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as AppUserData;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  /**
   * Save or Update User Profile & Autofill Memory
   */
  public async saveUserProfile(
    uid: string,
    data: {
      voiceSettings: VoiceSettings;
      autoFillProfile: UserAutofillProfile;
      displayName?: string;
      email?: string;
    }
  ): Promise<void> {
    const path = `users/${uid}`;
    try {
      const existingSnap = await getDoc(doc(db, 'users', uid));
      const isNew = !existingSnap.exists();

      const payload: Record<string, any> = {
        uid,
        voiceName: data.voiceSettings.voiceName,
        englishDialect: data.voiceSettings.englishDialect,
        speakingRate: data.voiceSettings.speed,
        pitch: data.voiceSettings.pitch,
        confirmationMode: data.voiceSettings.autoConfirm ? 'auto' : 'verbal',
        autoFillProfile: data.autoFillProfile,
        updatedAt: serverTimestamp(),
      };

      if (data.displayName) payload.displayName = data.displayName.slice(0, 128);
      if (data.email) payload.email = data.email.slice(0, 128);

      if (isNew) {
        payload.createdAt = serverTimestamp();
      }

      await setDoc(doc(db, 'users', uid), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  /**
   * Log completed session
   */
  public async recordSession(
    uid: string,
    session: {
      pageUrl: string;
      pageTitle: string;
      totalFields: number;
      filledFields: number;
      verifiedItems: { label: string; value: string }[];
    }
  ): Promise<string> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionPath = `users/${uid}/sessions/${sessionId}`;

    try {
      await setDoc(doc(db, 'users', uid, 'sessions', sessionId), {
        id: sessionId,
        userId: uid,
        pageUrl: session.pageUrl.slice(0, 512),
        pageTitle: session.pageTitle.slice(0, 256),
        status: 'completed',
        totalFields: session.totalFields,
        filledFields: session.filledFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Also record individual field fills in subcollection
      for (const item of session.verifiedItems) {
        const fillId = `fill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'users', uid, 'formFills', fillId), {
          id: fillId,
          userId: uid,
          sessionId,
          fieldLabel: item.label.slice(0, 256),
          verifiedValue: item.value.slice(0, 512),
          isVerified: true,
          createdAt: serverTimestamp(),
        });
      }

      return sessionId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, sessionPath);
    }
  }

  /**
   * Fetch recent user sessions
   */
  public async getRecentSessions(uid: string): Promise<SessionHistoryItem[]> {
    const path = `users/${uid}/sessions`;
    try {
      const q = query(collection(db, 'users', uid, 'sessions'), orderBy('createdAt', 'desc'), limit(15));
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          pageUrl: data.pageUrl || '',
          pageTitle: data.pageTitle || 'Web Form Session',
          totalFields: data.totalFields || 0,
          filledFields: data.filledFields || 0,
          timestamp: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : new Date().toLocaleString(),
          verifiedFields: [],
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
}

export const firebaseService = new FirebaseDataService();
