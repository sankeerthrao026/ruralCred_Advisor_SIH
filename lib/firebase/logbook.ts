import { firestoreInstance, isFirebaseConfigured } from './config';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';

export interface LogbookEntry {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  timestamp: number;
  tags?: string[];
}

export interface KhataPayment {
  id: string;
  amount: number;
  date: string;
  note?: string;
  timestamp: number;
}

export interface KhataEntry {
  id: string;
  partyName: string;
  partyPhone?: string;
  type: 'customer_credit' | 'supplier_credit';
  amount: number;
  paidAmount: number;
  dateGiven: string;
  dueDate?: string;
  status: 'unpaid' | 'partially_paid' | 'settled';
  notes?: string;
  payments?: KhataPayment[];
  timestamp: number;
}

export const INITIAL_KHATA_ENTRIES: KhataEntry[] = [
  {
    id: 'khata-anita-c1',
    partyName: 'Warangal Milk Cooperative Society',
    partyPhone: '9848011220',
    type: 'customer_credit',
    amount: 8500,
    paidAmount: 0,
    dateGiven: '02 Sep 2026',
    dueDate: '10 Sep 2026',
    status: 'unpaid',
    notes: 'Weekly cooperative milk payment',
    payments: [],
    timestamp: 1787824800000,
  },
  {
    id: 'khata-anita-c2',
    partyName: 'Local Village Milk Customers (K. Rao)',
    partyPhone: '9848011221',
    type: 'customer_credit',
    amount: 5200,
    paidAmount: 0,
    dateGiven: '06 Sep 2026',
    dueDate: '15 Sep 2026',
    status: 'unpaid',
    notes: 'Local milk sales',
    payments: [],
    timestamp: 1788170400000,
  },
  {
    id: 'khata-anita-c3',
    partyName: 'Warangal Milk Cooperative Bulk Center',
    partyPhone: '9848011222',
    type: 'customer_credit',
    amount: 9800,
    paidAmount: 0,
    dateGiven: '10 Sep 2026',
    dueDate: '20 Sep 2026',
    status: 'unpaid',
    notes: 'Cooperative bulk milk supply',
    payments: [],
    timestamp: 1788516000000,
  },
  {
    id: 'khata-anita-c4',
    partyName: 'Warangal Milk Cooperative Society',
    partyPhone: '9848011220',
    type: 'customer_credit',
    amount: 8700,
    paidAmount: 0,
    dateGiven: '14 Sep 2026',
    dueDate: '24 Sep 2026',
    status: 'unpaid',
    notes: 'Weekly cooperative milk payment',
    payments: [],
    timestamp: 1788861600000,
  },
  {
    id: 'khata-anita-c5',
    partyName: 'Sri Laxmi Sweets & Dairy Outlet',
    partyPhone: '9848011223',
    type: 'customer_credit',
    amount: 7500,
    paidAmount: 0,
    dateGiven: '18 Sep 2026',
    dueDate: '28 Sep 2026',
    status: 'unpaid',
    notes: 'Bulk milk supply',
    payments: [],
    timestamp: 1789207200000,
  },
  {
    id: 'khata-anita-c6',
    partyName: 'Morning Residential Delivery Route',
    partyPhone: '9848011224',
    type: 'customer_credit',
    amount: 6000,
    paidAmount: 0,
    dateGiven: '22 Sep 2026',
    dueDate: '30 Sep 2026',
    status: 'unpaid',
    notes: 'Retail milk delivery',
    payments: [],
    timestamp: 1789552800000,
  },
  {
    id: 'khata-anita-d1',
    partyName: 'Balaji Agro Cattle Feed Depot',
    partyPhone: '9848022331',
    type: 'supplier_credit',
    amount: 3200,
    paidAmount: 0,
    dateGiven: '03 Sep 2026',
    dueDate: '15 Sep 2026',
    status: 'unpaid',
    notes: 'Cattle feed and mineral mix',
    payments: [],
    timestamp: 1787911200000,
  },
  {
    id: 'khata-anita-d2',
    partyName: 'Dr. Reddy Veterinary Clinic',
    partyPhone: '9848022332',
    type: 'supplier_credit',
    amount: 1500,
    paidAmount: 0,
    dateGiven: '08 Sep 2026',
    dueDate: '18 Sep 2026',
    status: 'unpaid',
    notes: 'Veterinary visit and medicines',
    payments: [],
    timestamp: 1788343200000,
  },
  {
    id: 'khata-anita-d3',
    partyName: 'Kishan Green Fodder Depot',
    partyPhone: '9848022333',
    type: 'supplier_credit',
    amount: 2800,
    paidAmount: 0,
    dateGiven: '12 Sep 2026',
    dueDate: '22 Sep 2026',
    status: 'unpaid',
    notes: 'Fodder purchase',
    payments: [],
    timestamp: 1788688800000,
  },
  {
    id: 'khata-anita-d4',
    partyName: 'TSSPDCL Rural Electricity & Water Supply',
    partyPhone: '9848022334',
    type: 'supplier_credit',
    amount: 1200,
    paidAmount: 0,
    dateGiven: '16 Sep 2026',
    dueDate: '26 Sep 2026',
    status: 'unpaid',
    notes: 'Electricity and water',
    payments: [],
    timestamp: 1789034400000,
  },
  {
    id: 'khata-anita-d5',
    partyName: 'Venkata Dairy Equipment Services',
    partyPhone: '9848022335',
    type: 'supplier_credit',
    amount: 2000,
    paidAmount: 0,
    dateGiven: '20 Sep 2026',
    dueDate: '30 Sep 2026',
    status: 'unpaid',
    notes: 'Dairy equipment maintenance',
    payments: [],
    timestamp: 1789380000000,
  },
  {
    id: 'khata-anita-d6',
    partyName: 'Sri Sai Milk Transport Logistics',
    partyPhone: '9848022336',
    type: 'supplier_credit',
    amount: 2000,
    paidAmount: 0,
    dateGiven: '24 Sep 2026',
    dueDate: '04 Oct 2026',
    status: 'unpaid',
    notes: 'Transport and delivery expenses',
    payments: [],
    timestamp: 1789725600000,
  },
];

export const INITIAL_DEMO_ENTRIES: LogbookEntry[] = [
  {
    id: 'demo-exp-6',
    date: '24 Sep 2026',
    amount: 2000,
    type: 'expense',
    category: 'Transport',
    note: 'Transport and delivery expenses',
    tags: ['#transport', '#delivery'],
    timestamp: 1789725600000,
  },
  {
    id: 'demo-inc-6',
    date: '22 Sep 2026',
    amount: 6000,
    type: 'income',
    category: 'Sales',
    note: 'Retail morning milk delivery',
    tags: ['#morning_batch', '#retail'],
    timestamp: 1789552800000,
  },
  {
    id: 'demo-exp-5',
    date: '20 Sep 2026',
    amount: 2000,
    type: 'expense',
    category: 'Equipment Maintenance',
    note: 'Dairy equipment maintenance',
    tags: ['#maintenance', '#equipment'],
    timestamp: 1789380000000,
  },
  {
    id: 'demo-inc-5',
    date: '18 Sep 2026',
    amount: 7500,
    type: 'income',
    category: 'Sales',
    note: 'Bulk milk supply',
    tags: ['#bulk_supply', '#dairy'],
    timestamp: 1789207200000,
  },
  {
    id: 'demo-exp-4',
    date: '16 Sep 2026',
    amount: 1200,
    type: 'expense',
    category: 'Rent & Power',
    note: 'Electricity and water',
    tags: ['#utilities', '#electricity'],
    timestamp: 1789034400000,
  },
  {
    id: 'demo-inc-4',
    date: '14 Sep 2026',
    amount: 8700,
    type: 'income',
    category: 'Cooperative Payout',
    note: 'Weekly cooperative milk payment',
    tags: ['#cooperative', '#weekly_payout'],
    timestamp: 1788861600000,
  },
  {
    id: 'demo-exp-3',
    date: '12 Sep 2026',
    amount: 2800,
    type: 'expense',
    category: 'Feed / Supplies',
    note: 'Fodder purchase',
    tags: ['#fodder', '#green_feed'],
    timestamp: 1788688800000,
  },
  {
    id: 'demo-inc-3',
    date: '10 Sep 2026',
    amount: 9800,
    type: 'income',
    category: 'Cooperative Payout',
    note: 'Cooperative bulk milk supply',
    tags: ['#bulk_deal', '#cooperative'],
    timestamp: 1788516000000,
  },
  {
    id: 'demo-exp-2',
    date: '08 Sep 2026',
    amount: 1500,
    type: 'expense',
    category: 'Healthcare / Veterinary',
    note: 'Veterinary visit and medicines',
    tags: ['#veterinary', '#healthcare'],
    timestamp: 1788343200000,
  },
  {
    id: 'demo-inc-2',
    date: '06 Sep 2026',
    amount: 5200,
    type: 'income',
    category: 'Sales',
    note: 'Local milk sales',
    tags: ['#retail', '#local_sales'],
    timestamp: 1788170400000,
  },
  {
    id: 'demo-exp-1',
    date: '03 Sep 2026',
    amount: 3200,
    type: 'expense',
    category: 'Feed / Supplies',
    note: 'Cattle feed and mineral mix',
    tags: ['#feed', '#supplies'],
    timestamp: 1787911200000,
  },
  {
    id: 'demo-inc-1',
    date: '02 Sep 2026',
    amount: 8500,
    type: 'income',
    category: 'Cooperative Payout',
    note: 'Weekly cooperative milk payment',
    tags: ['#cooperative', '#milk_supply'],
    timestamp: 1787824800000,
  },
];

export const INITIAL_KIRANA_ENTRIES: LogbookEntry[] = [
  {
    id: 'kirana-1',
    date: '18 Sep 2026',
    amount: 14200,
    type: 'income',
    category: 'Sales',
    note: 'Daily counter retail sales & groceries',
    timestamp: Date.now() - 86400000 * 1,
  },
  {
    id: 'kirana-2',
    date: '17 Sep 2026',
    amount: 8500,
    type: 'expense',
    category: 'Inventory',
    note: 'Wholesale grains, pulses & edible oil restock',
    timestamp: Date.now() - 86400000 * 2,
  },
  {
    id: 'kirana-3',
    date: '15 Sep 2026',
    amount: 9800,
    type: 'income',
    category: 'Sales',
    note: 'UPI QR settlements & festival snack packages',
    timestamp: Date.now() - 86400000 * 4,
  },
  {
    id: 'kirana-4',
    date: '12 Sep 2026',
    amount: 1200,
    type: 'expense',
    category: 'Utilities',
    note: 'Shop electricity bill & refrigerator maintenance',
    timestamp: Date.now() - 86400000 * 7,
  },
  {
    id: 'kirana-5',
    date: '08 Sep 2026',
    amount: 16500,
    type: 'income',
    category: 'Sales',
    note: 'Weekly mandi bulk supply to village tiffin centers',
    timestamp: Date.now() - 86400000 * 11,
  },
];

export const INITIAL_WEAVING_ENTRIES: LogbookEntry[] = [
  {
    id: 'weaving-1',
    date: '18 Sep 2026',
    amount: 22000,
    type: 'income',
    category: 'Sales',
    note: 'Handloom Pochampally silk sarees delivered to weavers cooperative',
    timestamp: Date.now() - 86400000 * 1,
  },
  {
    id: 'weaving-2',
    date: '16 Sep 2026',
    amount: 7800,
    type: 'expense',
    category: 'Raw Materials',
    note: 'Mulberry raw silk yarn & natural dyes purchase',
    timestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'weaving-3',
    date: '14 Sep 2026',
    amount: 15500,
    type: 'income',
    category: 'Sales',
    note: 'Custom bridal border saree delivery to local boutique',
    timestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'weaving-4',
    date: '10 Sep 2026',
    amount: 1400,
    type: 'expense',
    category: 'Equipment',
    note: 'Pit loom shuttle replacement & reed tuning',
    timestamp: Date.now() - 86400000 * 9,
  },
];

const getStorageKey = (userId: string) => `ruralcred_logbook_${userId}`;

export async function fetchLogbookEntries(userId: string): Promise<LogbookEntry[]> {
  if (!userId) return [];

  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';
  const lowerId = userId.toLowerCase();

  // If Firestore configured and online, attempt to fetch from user's isolated subcollection (real users only)
  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const colRef = collection(firestoreInstance, `users/${userId}/logbook`);
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const remote = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LogbookEntry));
        if (typeof window !== 'undefined') {
          localStorage.setItem(getStorageKey(userId), JSON.stringify(remote));
        }
        return remote;
      }
      // If Firestore collection is empty and this is a real user, return empty array
      if (typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey(userId), JSON.stringify([]));
      }
      return [];
    } catch (e) {
      console.warn('Firestore fetch failed, using local storage cache:', e);
    }
  }

  // Fallback to isolated user localStorage
  if (typeof window !== 'undefined') {
    const key = getStorageKey(userId);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {}
    }

    // Real users start with an empty logbook
    if (!isDemoUser) {
      return [];
    }
    
    // Seed appropriate demo entries only for demo personas
    if (lowerId.includes('kirana') || lowerId.includes('ramesh')) {
      localStorage.setItem(key, JSON.stringify(INITIAL_KIRANA_ENTRIES));
      return INITIAL_KIRANA_ENTRIES;
    }
    if (lowerId.includes('weaving') || lowerId.includes('lakshmi') || lowerId.includes('handloom')) {
      localStorage.setItem(key, JSON.stringify(INITIAL_WEAVING_ENTRIES));
      return INITIAL_WEAVING_ENTRIES;
    }
    // Default demo entries for anita
    localStorage.setItem(key, JSON.stringify(INITIAL_DEMO_ENTRIES));
    return INITIAL_DEMO_ENTRIES;
  }

  if (!isDemoUser) return [];
  if (lowerId.includes('kirana') || lowerId.includes('ramesh')) {
    return INITIAL_KIRANA_ENTRIES;
  }
  if (lowerId.includes('weaving') || lowerId.includes('lakshmi')) {
    return INITIAL_WEAVING_ENTRIES;
  }
  return INITIAL_DEMO_ENTRIES;
}

export async function addLogbookEntry(
  entry: Omit<LogbookEntry, 'id'>,
  userId: string
): Promise<LogbookEntry> {
  const newEntry: LogbookEntry = {
    ...entry,
    id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
  };

  if (!userId) return newEntry;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const colRef = collection(firestoreInstance, `users/${userId}/logbook`);
      const docRef = await addDoc(colRef, { ...entry });
      newEntry.id = docRef.id;
    } catch (e) {
      console.warn('Firestore write failed, preserving to local storage:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getStorageKey(userId);
    const current = await fetchLogbookEntries(userId);
    const updated = [newEntry, ...current];
    localStorage.setItem(key, JSON.stringify(updated));
  }

  return newEntry;
}

export async function deleteLogbookEntry(id: string, userId: string): Promise<void> {
  if (!userId) return;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      await deleteDoc(doc(firestoreInstance, `users/${userId}/logbook`, id));
    } catch (e) {
      console.warn('Firestore delete failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getStorageKey(userId);
    const current = await fetchLogbookEntries(userId);
    const updated = current.filter((e) => e.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
  }
}

export async function updateLogbookEntry(entry: LogbookEntry, userId: string): Promise<LogbookEntry> {
  if (!userId) return entry;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const { id, ...fields } = entry;
      await updateDoc(doc(firestoreInstance, `users/${userId}/logbook`, id), fields);
    } catch (e) {
      console.warn('Firestore update failed, preserving to local storage:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getStorageKey(userId);
    const current = await fetchLogbookEntries(userId);
    const updated = current.map((e) => (e.id === entry.id ? entry : e));
    localStorage.setItem(key, JSON.stringify(updated));
  }

  return entry;
}

// ----------------- Khata / Udhaar Storage Helpers -----------------
function getKhataStorageKey(userId: string) {
  return `ruralcred_khata_${userId || 'demo-user'}`;
}

export async function fetchKhataEntries(userId: string): Promise<KhataEntry[]> {
  if (!userId) return [];

  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  // If Firestore configured and online, attempt to fetch from user's isolated khata subcollection (real users only)
  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const colRef = collection(firestoreInstance, `users/${userId}/khata`);
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const remoteEntries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as KhataEntry));
        if (typeof window !== 'undefined') {
          const key = getKhataStorageKey(userId);
          localStorage.setItem(key, JSON.stringify(remoteEntries));
        }
        return remoteEntries;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(getKhataStorageKey(userId), JSON.stringify([]));
      }
      return [];
    } catch (e) {
      console.warn('Firestore khata fetch failed, using local storage cache:', e);
    }
  }

  if (typeof window === 'undefined') return isDemoUser ? INITIAL_KHATA_ENTRIES : [];

  const key = getKhataStorageKey(userId);
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse local khata:', e);
    }
  }

  if (!isDemoUser) return [];

  localStorage.setItem(key, JSON.stringify(INITIAL_KHATA_ENTRIES));
  return INITIAL_KHATA_ENTRIES;
}


export async function saveKhataEntry(
  entry: Omit<KhataEntry, 'id' | 'paidAmount' | 'status' | 'payments' | 'timestamp'>,
  userId: string
): Promise<KhataEntry> {
  const newKhata: KhataEntry = {
    ...entry,
    id: `khata-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    paidAmount: 0,
    status: 'unpaid',
    payments: [],
    timestamp: Date.now(),
  };

  if (!userId) return newKhata;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const docRef = doc(firestoreInstance, `users/${userId}/khata`, newKhata.id);
      await setDoc(docRef, newKhata);
    } catch (e) {
      console.warn('Firestore khata write failed, preserving to local storage:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getKhataStorageKey(userId);
    const current = await fetchKhataEntries(userId);
    const updated = [newKhata, ...current.filter((k) => k.id !== newKhata.id)];
    localStorage.setItem(key, JSON.stringify(updated));
  }

  return newKhata;
}

export async function recordKhataPayment(
  khataId: string,
  paymentAmount: number,
  paymentDate: string,
  note: string | undefined,
  userId: string
): Promise<KhataEntry | null> {
  if (!userId) return null;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  const current = await fetchKhataEntries(userId);
  let updatedEntry: KhataEntry | null = null;

  const updated = current.map((k) => {
    if (k.id === khataId) {
      const nextPaid = Math.min(k.amount, k.paidAmount + paymentAmount);
      const nextStatus: KhataEntry['status'] =
        nextPaid >= k.amount ? 'settled' : nextPaid > 0 ? 'partially_paid' : 'unpaid';

      const newPayment: KhataPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        amount: paymentAmount,
        date: paymentDate,
        note,
        timestamp: Date.now(),
      };

      updatedEntry = {
        ...k,
        paidAmount: nextPaid,
        status: nextStatus,
        payments: [...(k.payments || []), newPayment],
      };
      return updatedEntry;
    }
    return k;
  });

  if (updatedEntry && isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const docRef = doc(firestoreInstance, `users/${userId}/khata`, khataId);
      await setDoc(docRef, updatedEntry, { merge: true });
    } catch (e) {
      console.warn('Firestore khata payment update failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getKhataStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(updated));
  }

  return updatedEntry;
}

export async function updateKhataEntry(entry: KhataEntry, userId: string): Promise<KhataEntry> {
  if (!userId) return entry;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      const docRef = doc(firestoreInstance, `users/${userId}/khata`, entry.id);
      await setDoc(docRef, entry, { merge: true });
    } catch (e) {
      console.warn('Firestore khata update failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getKhataStorageKey(userId);
    const current = await fetchKhataEntries(userId);
    const updated = current.map((k) => (k.id === entry.id ? entry : k));
    localStorage.setItem(key, JSON.stringify(updated));
  }
  return entry;
}

export async function deleteKhataEntry(id: string, userId: string): Promise<void> {
  if (!userId) return;
  const isDemoUser = userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user';

  if (isFirebaseConfigured && firestoreInstance && !isDemoUser) {
    try {
      await deleteDoc(doc(firestoreInstance, `users/${userId}/khata`, id));
    } catch (e) {
      console.warn('Firestore khata delete failed:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const key = getKhataStorageKey(userId);
    const current = await fetchKhataEntries(userId);
    const updated = current.filter((k) => k.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
  }
}


