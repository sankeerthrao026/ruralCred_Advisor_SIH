import { firestoreInstance, isFirebaseConfigured } from './config';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

export type AdvisorType = 'business' | 'finance';

export interface ConversationMetadata {
  id: string;
  advisorType: AdvisorType;
  title: string;
  createdAt: number;
  updatedAt: number;
  language?: string;
  messageCount: number;
  lastSnippet?: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  language?: string;
  data?: any; // Structured output for business advisor diagnostics if present
  isError?: boolean;
}

const getConvListStorageKey = (userId: string) => `ruralcred_conversations_${userId || 'demo-user'}`;
const getConvMsgsStorageKey = (userId: string, conversationId: string) =>
  `ruralcred_conv_msgs_${userId || 'demo-user'}_${conversationId}`;

/**
 * Fetch list of conversations for a specific user and optional advisor type
 */
export async function fetchConversations(
  userId: string,
  advisorType?: AdvisorType
): Promise<ConversationMetadata[]> {
  if (!userId) return [];

  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  // Attempt to fetch from Firestore if configured (real users only)
  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const colRef = collection(firestoreInstance, `users/${userId}/conversations`);
      let snapshot;
      try {
        const q = advisorType
          ? query(colRef, where('advisorType', '==', advisorType), orderBy('updatedAt', 'desc'))
          : query(colRef, orderBy('updatedAt', 'desc'));
        snapshot = await getDocs(q);
      } catch (compoundErr) {
        // Fallback if composite index is pending
        const fallbackQ = query(colRef, orderBy('updatedAt', 'desc'));
        snapshot = await getDocs(fallbackQ);
      }

      if (snapshot && !snapshot.empty) {
        let conversations = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ConversationMetadata)
        );
        if (advisorType) {
          conversations = conversations.filter((c) => c.advisorType === advisorType);
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(getConvListStorageKey(userId), JSON.stringify(conversations));
          } catch {}
        }
        return conversations;
      }
      return [];
    } catch (e) {
      console.warn('[Firestore] Conversations fetch error, falling back to cache:', e);
    }
  }

  // Fallback to isolated user localStorage
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(getConvListStorageKey(userId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return advisorType ? parsed.filter((c: ConversationMetadata) => c.advisorType === advisorType) : parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse local conversations cache:', e);
    }
  }

  return [];
}

/**
 * Fetch messages for a specific conversation
 */
export async function fetchMessages(
  userId: string,
  conversationId: string
): Promise<StoredMessage[]> {
  if (!userId || !conversationId) return [];
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const colRef = collection(
        firestoreInstance,
        `users/${userId}/conversations/${conversationId}/messages`
      );
      const q = query(colRef, orderBy('timestamp', 'asc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as StoredMessage));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(getConvMsgsStorageKey(userId, conversationId), JSON.stringify(msgs));
          } catch {}
        }
        return msgs;
      }
    } catch (e) {
      console.warn('[Firestore] Messages fetch error, falling back to cache:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(getConvMsgsStorageKey(userId, conversationId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local messages cache:', e);
    }
  }

  return [];
}

/**
 * Create or update conversation metadata
 */
export async function saveConversationMetadata(
  userId: string,
  metadata: ConversationMetadata
): Promise<void> {
  if (!userId || !metadata.id) return;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const docRef = doc(firestoreInstance, `users/${userId}/conversations`, metadata.id);
      await setDoc(docRef, metadata, { merge: true });
    } catch (e) {
      console.warn('[Firestore] Save conversation metadata failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const listKey = getConvListStorageKey(userId);
      const current = await fetchConversations(userId);
      const exists = current.some((c) => c.id === metadata.id);
      const updated = exists
        ? current.map((c) => (c.id === metadata.id ? { ...c, ...metadata } : c))
        : [metadata, ...current];
      localStorage.setItem(listKey, JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Save a single message to a conversation and update metadata
 */
export async function saveMessage(
  userId: string,
  conversationId: string,
  message: StoredMessage,
  metadataUpdate?: Partial<ConversationMetadata>
): Promise<void> {
  if (!userId || !conversationId || !message.id) return;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const msgDocRef = doc(
        firestoreInstance,
        `users/${userId}/conversations/${conversationId}/messages`,
        message.id
      );
      await setDoc(msgDocRef, message);

      if (metadataUpdate) {
        const convDocRef = doc(firestoreInstance, `users/${userId}/conversations`, conversationId);
        await setDoc(
          convDocRef,
          {
            ...metadataUpdate,
            updatedAt: Date.now(),
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.warn('[Firestore] Save message failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const msgsKey = getConvMsgsStorageKey(userId, conversationId);
      const current = await fetchMessages(userId, conversationId);
      const updated = [...current.filter((m) => m.id !== message.id), message];
      localStorage.setItem(msgsKey, JSON.stringify(updated));

      if (metadataUpdate) {
        const listKey = getConvListStorageKey(userId);
        const convList = await fetchConversations(userId);
        const exists = convList.some((c) => c.id === conversationId);
        const updatedList = exists
          ? convList.map((c) =>
              c.id === conversationId ? { ...c, ...metadataUpdate, updatedAt: Date.now() } : c
            )
          : [
              {
                id: conversationId,
                advisorType: metadataUpdate.advisorType || 'business',
                title: metadataUpdate.title || 'Conversation',
                createdAt: metadataUpdate.createdAt || Date.now(),
                updatedAt: Date.now(),
                messageCount: 1,
                ...metadataUpdate,
              } as ConversationMetadata,
              ...convList,
            ];
        localStorage.setItem(listKey, JSON.stringify(updatedList));
      }
    } catch {}
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  if (!userId || !conversationId) return;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      // 1. Delete messages in subcollection
      const msgsCol = collection(
        firestoreInstance,
        `users/${userId}/conversations/${conversationId}/messages`
      );
      const snap = await getDocs(msgsCol);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      // 2. Delete conversation document
      const convDoc = doc(firestoreInstance, `users/${userId}/conversations`, conversationId);
      await deleteDoc(convDoc);
    } catch (e) {
      console.warn('[Firestore] Delete conversation failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(getConvMsgsStorageKey(userId, conversationId));
      const listKey = getConvListStorageKey(userId);
      const current = await fetchConversations(userId);
      const updated = current.filter((c) => c.id !== conversationId);
      localStorage.setItem(listKey, JSON.stringify(updated));
    } catch {}
  }
}
