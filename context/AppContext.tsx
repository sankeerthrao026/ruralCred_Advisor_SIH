'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Language, getDictionary } from '@/lib/i18n';
import {
  calculateFinancePlan,
  calculateFinancialHealthScore,
  FinanceAnalysisResult,
  FinancialHealthScoreResult,
} from '@/lib/finance/engine';
import {
  calculateCreditReadiness,
  CreditReadinessResult,
} from '@/lib/finance/credit-score';
import { evaluateFinancialRisks, DetectedRisk } from '@/lib/risk/engine';
import {
  LogbookEntry,
  fetchLogbookEntries,
  addLogbookEntry,
  updateLogbookEntry,
  deleteLogbookEntry,
  KhataEntry,
  fetchKhataEntries,
  saveKhataEntry,
  recordKhataPayment,
  updateKhataEntry as updateKhataStorage,
  deleteKhataEntry as deleteKhataStorage,
  INITIAL_DEMO_ENTRIES,
  INITIAL_KIRANA_ENTRIES,
  INITIAL_WEAVING_ENTRIES,
  INITIAL_KHATA_ENTRIES,
} from '@/lib/firebase/logbook';

import { useAuth } from './AuthContext';
import { firestoreInstance, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PRESET_PROFILES, ACTIVE_PROFILE_KEY } from '@/lib/demo-session';
import { getTodayDisplayDate } from '@/lib/utils/date';
import { apiClient } from '@/lib/api/client';

export type BackendConnectionMode = 'backend' | 'local_fallback' | 'checking';
export type ProfileStatus = 'IDLE' | 'LOADING' | 'PROFILE_FOUND' | 'PROFILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'NETWORK_ERROR';

export interface UserProfile {
  name: string;
  businessName: string;
  location: string;
  category: string;
  marginCapital: number;
  hasActiveLoan: boolean;
  simulatingSecondLoan: boolean;
  onboardingCompleted?: boolean;
  gender?: string;
  socialCategory?: string;
  hasUdyamRegistration?: boolean;
  yearsInBusiness?: number;
  numberCattle?: number;
  primaryActivity?: string;
  monthlyAverageIncome?: string;
  monthlyAverageExpenses?: string;
  loanRequirement?: number;
  loanPurpose?: string;
}

export interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  inputMode: 'text' | 'voice';
  setInputMode: (mode: 'text' | 'voice') => void;
  profile: UserProfile;
  profileStatus: ProfileStatus;
  profileError: string | null;
  retryLoadUserData: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loadPreset: (presetKey: 'dairy' | 'weaving' | 'kirana' | 'risk_case') => void;
  hasCompletedOnboarding: boolean;
  
  // Scheme Selection & Simulation Handover (Bug #4)
  selectedSchemeId: string | null;
  setSelectedSchemeId: (id: string | null) => void;

  // Logbook
  entries: LogbookEntry[];
  addNewEntry: (entry: Omit<LogbookEntry, 'id' | 'timestamp'>) => Promise<void>;
  updateEntry: (entry: LogbookEntry) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
  resetEntriesToDefault: () => void;
  syncStatus: 'synced' | 'local_cache' | 'syncing';

  // Khata / Customer Credit Ledger
  khataEntries: KhataEntry[];
  addKhataEntry: (entry: Omit<KhataEntry, 'id' | 'paidAmount' | 'status' | 'payments' | 'timestamp'>) => Promise<void>;
  updateKhataEntry: (entry: KhataEntry) => Promise<void>;
  recordKhataPayment: (id: string, paymentAmount: number, paymentDate: string, note?: string) => Promise<void>;
  removeKhataEntry: (id: string) => Promise<void>;
  totalCustomerCredit: number;
  totalSupplierCredit: number;

  // Deterministic Analytics & Unified Health Score (Bug #6)
  finance: FinanceAnalysisResult;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  healthScore: FinancialHealthScoreResult;
  creditReadiness: CreditReadinessResult;
  detectedRisks: DetectedRisk[];
  dictionary: ReturnType<typeof getDictionary>;

  // Backend Connection Mode (FastAPI vs Local Fallback)
  backendMode: BackendConnectionMode;
  isBackendOnline: boolean;
  backendLoading: boolean;
  backendError: string | null;
  refreshBackendData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user';

  const [language, setLanguage] = useState<Language>('en');
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local_cache' | 'syncing'>('synced');

  // Load and apply theme on mount (default to dark)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedTheme = localStorage.getItem('ruralcred-theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
          setThemeState(storedTheme);
          document.documentElement.classList.toggle('dark', storedTheme === 'dark');
          document.documentElement.classList.toggle('light', storedTheme === 'light');
        } else {
          setThemeState('dark');
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      } catch {}
    }
  }, []);

  const setTheme = useCallback((newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ruralcred-theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        document.documentElement.classList.toggle('light', newTheme === 'light');
      } catch (e) {
        console.warn('Failed to save theme preference:', e);
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const [profile, setProfile] = useState<UserProfile>(() => {
    if (user && !user.isDemo) {
      return {
        name: user.name || user.email?.split('@')[0] || 'Entrepreneur',
        businessName: `${user.name || 'My'} Enterprises`,
        location: '',
        category: 'Dairy Farming',
        marginCapital: 0,
        hasActiveLoan: false,
        simulatingSecondLoan: false,
        onboardingCompleted: false,
      };
    }
    if (user?.isDemo) {
      return {
        name: 'Anita Sharma',
        businessName: 'Sharma Dairy Farm',
        location: 'Warangal, Telangana',
        category: 'Dairy Farming',
        marginCapital: 150000,
        hasActiveLoan: false,
        simulatingSecondLoan: false,
        onboardingCompleted: true,
        gender: 'female',
        socialCategory: 'OBC',
      };
    }
    return {
      name: '',
      businessName: '',
      location: '',
      category: 'Dairy Farming',
      marginCapital: 0,
      hasActiveLoan: false,
      simulatingSecondLoan: false,
      onboardingCompleted: false,
    };
  });

  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [khataEntries, setKhataEntries] = useState<KhataEntry[]>([]);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('LOADING');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Initialize and load saved state whenever user or userId changes
  const loadUserData = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('ruralcred_language') as Language;
      if (savedLang === 'en' || savedLang === 'te') {
        setLanguage(savedLang);
      }
      const savedMode = localStorage.getItem('ruralcred_input_mode') as 'text' | 'voice';
      if (savedMode) {
        setInputMode(savedMode);
      }
    }

    if (!userId || (userId === 'demo-user' && !user?.isDemo)) {
      setEntries([]);
      setKhataEntries([]);
      setProfileStatus('IDLE');
      return;
    }

    const isDemoUser = Boolean(user?.isDemo || userId.startsWith('demo-') || userId.startsWith('demo_'));

    if (isDemoUser) {
      // DEMO USER FLOW
      const lowerId = (userId || '').toLowerCase();
      let presetProfile = { ...PRESET_PROFILES.dairy.profile, onboardingCompleted: true };
      if (lowerId.includes('ramesh') || lowerId.includes('kirana')) {
        presetProfile = { ...PRESET_PROFILES.kirana.profile, onboardingCompleted: true };
      } else if (lowerId.includes('lakshmi') || lowerId.includes('weaving') || lowerId.includes('handloom')) {
        presetProfile = { ...PRESET_PROFILES.weaving.profile, onboardingCompleted: true };
      }

      const profileKey = `ruralcred_profile_${userId}`;
      const savedDemoProfile = typeof window !== 'undefined' ? localStorage.getItem(profileKey) : null;
      if (savedDemoProfile) {
        try {
          setProfile(JSON.parse(savedDemoProfile));
        } catch {
          setProfile(presetProfile);
        }
      } else {
        setProfile(presetProfile);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(profileKey, JSON.stringify(presetProfile));
            localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(presetProfile));
          } catch {}
        }
      }

      setProfileStatus('PROFILE_FOUND');
      setProfileError(null);

      const loadedEntries = await fetchLogbookEntries(userId);
      setEntries(loadedEntries || []);

      const loadedKhata = await fetchKhataEntries(userId);
      if (loadedKhata) setKhataEntries(loadedKhata);
    } else {
      // REAL AUTHENTICATED FIREBASE USER FLOW
      setProfileStatus('LOADING');
      setProfileError(null);
      let profileFound = false;

      // 1. Fetch from Firestore
      if (isFirebaseConfigured && firestoreInstance) {
        try {
          const userDocRef = doc(firestoreInstance, 'users', userId);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const remoteProfile = snap.data() as UserProfile;
            setProfile(remoteProfile);
            profileFound = true;
            setProfileStatus(
              remoteProfile.onboardingCompleted && remoteProfile.location?.trim()
                ? 'PROFILE_FOUND'
                : 'PROFILE_NOT_FOUND'
            );
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(`ruralcred_profile_${userId}`, JSON.stringify(remoteProfile));
                localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(remoteProfile));
              } catch {}
            }
          }
        } catch (e: any) {
          console.warn('[Firestore] Profile fetch error for real user:', e);
          const isPerm =
            e?.code === 'permission-denied' ||
            String(e?.message).toLowerCase().includes('permission') ||
            String(e?.message).toLowerCase().includes('insufficient');
          if (isPerm) {
            setProfileStatus('PERMISSION_DENIED');
            setProfileError('Firestore access was denied by security rules.');
          } else {
            setProfileStatus('NETWORK_ERROR');
            setProfileError(e?.message || 'Failed to connect to Firestore.');
          }
        }
      }

      // 2. Fallback to local storage for THIS SPECIFIC USER UID (never demo personas)
      if (!profileFound && typeof window !== 'undefined') {
        const profileKey = `ruralcred_profile_${userId}`;
        const cached = localStorage.getItem(profileKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === 'object' && parsed.name) {
              setProfile(parsed);
              profileFound = true;
              setProfileStatus(
                parsed.onboardingCompleted && parsed.location?.trim()
                  ? 'PROFILE_FOUND'
                  : 'PROFILE_NOT_FOUND'
              );
            }
          } catch {}
        }
      }

      // 3. New Authenticated User clean initialization (Only if not in error state)
      if (!profileFound) {
        const realName = user?.name || user?.email?.split('@')[0] || 'Entrepreneur';
        const freshProfile: UserProfile = {
          name: realName,
          businessName: `${realName} Enterprises`,
          location: '',
          category: 'Dairy Farming',
          marginCapital: 0,
          hasActiveLoan: false,
          simulatingSecondLoan: false,
          onboardingCompleted: false,
        };
        setProfile(freshProfile);

        // If no explicit permission denied, mark as PROFILE_NOT_FOUND so onboarding renders
        setProfileStatus((current) => (current === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'PROFILE_NOT_FOUND'));

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`ruralcred_profile_${userId}`, JSON.stringify(freshProfile));
            localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(freshProfile));
          } catch {}
        }

        if (isFirebaseConfigured && firestoreInstance) {
          try {
            const userDocRef = doc(firestoreInstance, 'users', userId);
            await setDoc(userDocRef, {
              ...freshProfile,
              email: user?.email || '',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }, { merge: true });
          } catch (e) {
            console.warn('[Firestore] Profile write error on fresh initialization:', e);
          }
        }
      }

      // 4. Fetch user-isolated logbook & khata (always isolated by UID)
      const loadedEntries = await fetchLogbookEntries(userId);
      setEntries(loadedEntries || []);

      const loadedKhata = await fetchKhataEntries(userId);
      setKhataEntries(loadedKhata || []);
    }
  }, [userId, user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const retryLoadUserData = async () => {
    await loadUserData();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const isCompleted = updates.onboardingCompleted !== undefined 
      ? updates.onboardingCompleted 
      : Boolean((updates.location || profile.location)?.trim() && (updates.name || profile.name)?.trim() && (updates.businessName || profile.businessName)?.trim());

    const next: UserProfile = {
      ...profile,
      ...updates,
      onboardingCompleted: isCompleted,
    };
    setProfile(next);
    if (isCompleted && (next.location || '').trim()) {
      setProfileStatus('PROFILE_FOUND');
      setProfileError(null);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`ruralcred_profile_${userId}`, JSON.stringify(next));
      localStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(next));
    }

    const isDemoUser = Boolean(user?.isDemo || userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user');
    if (isFirebaseConfigured && firestoreInstance && userId && !isDemoUser) {
      try {
        const userDocRef = doc(firestoreInstance, 'users', userId);
        await setDoc(userDocRef, {
          ...next,
          updatedAt: Date.now(),
        }, { merge: true });
      } catch (e: any) {
        console.warn('Failed to save profile to Firestore:', e);
        if (e?.code === 'permission-denied') {
          setProfileStatus('PERMISSION_DENIED');
          setProfileError('Permission denied while saving profile to Firestore.');
        }
      }
    }
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ruralcred_language', lang);
    }
  };

  const handleSetInputMode = (mode: 'text' | 'voice') => {
    setInputMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ruralcred_input_mode', mode);
    }
  };

  const addNewEntry = async (entry: Omit<LogbookEntry, 'id' | 'timestamp'>) => {
    setSyncStatus('syncing');
    const newEntry = await addLogbookEntry(
      {
        ...entry,
        timestamp: Date.now(),
      },
      userId
    );
    setEntries((prev) => [newEntry, ...prev]);
    setSyncStatus('synced');
  };

  const removeEntry = async (id: string) => {
    await deleteLogbookEntry(id, userId);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = async (entry: LogbookEntry) => {
    setSyncStatus('syncing');
    await updateLogbookEntry(entry, userId);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)));
    setSyncStatus('synced');
  };

  const addKhataEntry = async (
    entry: Omit<KhataEntry, 'id' | 'paidAmount' | 'status' | 'payments' | 'timestamp'>
  ) => {
    const created = await saveKhataEntry(entry, userId);
    setKhataEntries((prev) => [created, ...prev]);
  };

  const updateKhataEntry = async (entry: KhataEntry) => {
    await updateKhataStorage(entry, userId);
    setKhataEntries((prev) => prev.map((k) => (k.id === entry.id ? entry : k)));
  };

  const recordKhataPaymentHandler = async (
    id: string,
    paymentAmount: number,
    paymentDate: string,
    note?: string
  ) => {
    const updated = await recordKhataPayment(id, paymentAmount, paymentDate, note, userId);
    if (updated) {
      setKhataEntries((prev) => prev.map((k) => (k.id === id ? updated : k)));
    }
  };

  const removeKhataEntry = async (id: string) => {
    await deleteKhataStorage(id, userId);
    setKhataEntries((prev) => prev.filter((k) => k.id !== id));
  };

  const { totalCustomerCredit, totalSupplierCredit } = useMemo(() => {
    let cust = 0;
    let supp = 0;
    for (const k of khataEntries) {
      const remaining = Math.max(0, k.amount - k.paidAmount);
      if (k.type === 'customer_credit') cust += remaining;
      if (k.type === 'supplier_credit') supp += remaining;
    }
    return { totalCustomerCredit: cust, totalSupplierCredit: supp };
  }, [khataEntries]);

  const resetEntriesToDefault = () => {
    setEntries(INITIAL_DEMO_ENTRIES);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`ruralcred_logbook_${userId}`, JSON.stringify(INITIAL_DEMO_ENTRIES));
    }
  };

  const loadPreset = (presetKey: 'dairy' | 'weaving' | 'kirana' | 'risk_case') => {
    const isDemoUser = Boolean(user?.isDemo || userId.startsWith('demo-') || userId.startsWith('demo_') || userId === 'demo-user');
    const realUserName = profile.name || user?.name || user?.email?.split('@')[0] || 'Entrepreneur';

    if (presetKey === 'dairy') {
      updateProfile({
        name: isDemoUser ? 'Anita Sharma' : realUserName,
        businessName: isDemoUser ? 'Sharma Dairy Farm' : `${realUserName} Dairy Farm`,
        location: 'Warangal, Telangana',
        category: 'Dairy Farming',
        marginCapital: 150000,
        hasActiveLoan: false,
        simulatingSecondLoan: false,
        onboardingCompleted: true,
      });
      if (isDemoUser) {
        setEntries(INITIAL_DEMO_ENTRIES);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ruralcred_logbook_${userId}`, JSON.stringify(INITIAL_DEMO_ENTRIES));
        }
      }
    } else if (presetKey === 'weaving') {
      updateProfile({
        name: isDemoUser ? 'Lakshmi Devi' : realUserName,
        businessName: isDemoUser ? 'Lakshmi Handlooms & Textiles' : `${realUserName} Handlooms & Textiles`,
        location: 'Nalgonda, Telangana',
        category: 'Handloom / Weaving',
        marginCapital: 30000,
        hasActiveLoan: false,
        simulatingSecondLoan: false,
        onboardingCompleted: true,
      });
      if (isDemoUser) {
        setEntries(INITIAL_WEAVING_ENTRIES);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ruralcred_logbook_${userId}`, JSON.stringify(INITIAL_WEAVING_ENTRIES));
        }
      }
    } else if (presetKey === 'kirana') {
      updateProfile({
        name: isDemoUser ? 'Ramesh Kumar' : realUserName,
        businessName: isDemoUser ? 'Ramesh General & Kirana Store' : `${realUserName} General & Kirana Store`,
        location: 'Khammam, Telangana',
        category: 'Rural Grocery / Kirana',
        marginCapital: 50000,
        hasActiveLoan: false,
        simulatingSecondLoan: false,
        onboardingCompleted: true,
      });
      if (isDemoUser) {
        setEntries(INITIAL_KIRANA_ENTRIES);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`ruralcred_logbook_${userId}`, JSON.stringify(INITIAL_KIRANA_ENTRIES));
        }
      }
    } else if (presetKey === 'risk_case') {
      // Over-leverage and negative cash flow risk simulation
      updateProfile({
        hasActiveLoan: true,
        simulatingSecondLoan: true,
      });
      // Add high expense entry to trigger Rule 2
      addNewEntry({
        date: getTodayDisplayDate(),
        amount: 85000,
        type: 'expense',
        category: 'Asset Repairs',
        note: 'Emergency transformer replacement & repair',
      });
    }
  };

  // Scheme Selection & Simulation Handover (Bug #4)
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);

  // Aggregate Logbook Totals
  const { totalIncome, totalExpenses, netCashFlow } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const e of entries) {
      if (e.type === 'income') inc += e.amount;
      if (e.type === 'expense') exp += e.amount;
    }
    return { totalIncome: inc, totalExpenses: exp, netCashFlow: inc - exp };
  }, [entries]);

  // Baseline Local Fallback Calculations (Synchronous & resilient ground-truth mirror)
  const localFinance = useMemo(() => {
    return calculateFinancePlan(profile.marginCapital);
  }, [profile.marginCapital]);

  // Unified Deterministic 30/40/30 Alternative Credit Scoring Engine (Bug #6)
  const localCreditReadiness: CreditReadinessResult = useMemo(() => {
    const liquidBuffer = Math.round(localFinance.projectCost * 0.10);
    const availableCash = Math.max(0, netCashFlow) + liquidBuffer;
    return calculateCreditReadiness(entries, {
      availableCashOverride: availableCash,
      userName: profile.name,
      businessName: profile.businessName,
    });
  }, [entries, localFinance.projectCost, netCashFlow, profile.name, profile.businessName]);

  const localHealthScore: FinancialHealthScoreResult = useMemo(() => {
    const status: 'excellent' | 'steady' | 'needs_attention' =
      localCreditReadiness.overallScore >= 80
        ? 'excellent'
        : localCreditReadiness.overallScore >= 60
        ? 'steady'
        : 'needs_attention';

    return {
      score: localCreditReadiness.overallScore,
      status: status,
      statusTe: localCreditReadiness.gradeTe,
      summary: localCreditReadiness.summary,
      summaryTe: localCreditReadiness.summaryTe,
      loggingScore: localCreditReadiness.components.loggingScore,
      profitTrendScore: localCreditReadiness.components.profitScore,
      expenseRatioScore: localCreditReadiness.components.expenseDisciplineScore,
      breakdown: [
        {
          label: 'Logging Consistency',
          labelTe: 'లాగ్‌బుక్ స్థిరత్వం',
          weight: '30%',
          score: localCreditReadiness.components.loggingScore,
        },
        {
          label: 'Profit Stability',
          labelTe: 'లాభాల స్థిరత్వం',
          weight: '40%',
          score: localCreditReadiness.components.profitScore,
        },
        {
          label: 'Expense Discipline',
          labelTe: 'వ్యయ నియంత్రణ',
          weight: '30%',
          score: localCreditReadiness.components.expenseDisciplineScore,
        },
      ],
    };
  }, [localCreditReadiness]);

  const localDetectedRisks = useMemo(() => {
    return evaluateFinancialRisks({
      hasActiveLoan: profile.hasActiveLoan,
      simulatingSecondLoan: profile.simulatingSecondLoan,
      totalIncome,
      totalExpenses,
      netCashFlow,
      previousNetCashFlow: 35000,
    });
  }, [profile.hasActiveLoan, profile.simulatingSecondLoan, totalIncome, totalExpenses, netCashFlow]);

  // Active States: Source of truth defaults to local fallback on mount, then updates from FastAPI backend
  const [finance, setFinance] = useState<FinanceAnalysisResult>(localFinance);
  const [healthScore, setHealthScore] = useState<FinancialHealthScoreResult>(localHealthScore);
  const [creditReadiness, setCreditReadiness] = useState<CreditReadinessResult>(localCreditReadiness);
  const [detectedRisks, setDetectedRisks] = useState<DetectedRisk[]>(localDetectedRisks);
  const [backendMode, setBackendMode] = useState<BackendConnectionMode>('checking');
  const [backendLoading, setBackendLoading] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Keep local fallback synced if in local_fallback mode
  useEffect(() => {
    if (backendMode === 'local_fallback') {
      setFinance(localFinance);
      setHealthScore(localHealthScore);
      setCreditReadiness(localCreditReadiness);
      setDetectedRisks(localDetectedRisks);
    }
  }, [localFinance, localHealthScore, localCreditReadiness, localDetectedRisks, backendMode]);

  // Asynchronously query FastAPI backend
  const refreshBackendData = useCallback(async () => {
    setBackendLoading(true);
    try {
      // 1. Finance calculation
      const financePromise = apiClient.calculateFinance(profile.marginCapital);

      // 2. Risk analysis
      const riskPromise = apiClient.analyzeRisk({
        hasActiveLoan: profile.hasActiveLoan,
        simulatingSecondLoan: profile.simulatingSecondLoan,
        totalIncome,
        totalExpenses,
        netCashFlow,
        previousNetCashFlow: 35000,
      });

      // 3. Health score
      const healthPromise = apiClient.getHealthScore(userId, {
        totalIncome,
        totalExpenses,
        entryCount: entries.length,
        hasDownwardTrend: netCashFlow < 15000 && totalIncome > 0,
      });

      const [financeRes, riskRes, healthRes] = await Promise.all([
        financePromise,
        riskPromise,
        healthPromise,
      ]);

      if (financeRes.success && financeRes.data) {
        // FastAPI Backend is LIVE! Use it as single source of truth
        const bData = financeRes.data;
        setFinance({
          ...bData,
          marginPercentage: Math.round((bData.marginCapital / bData.projectCost) * 100) || 10,
          loanPercentage: Math.round((bData.loanAmount / bData.projectCost) * 100) || 90,
          scheme: {
            ...bData.scheme,
            id: bData.scheme.id as 'micro-finance' | 'term-loan',
          },
        });

        if (riskRes.success && riskRes.data) {
          setDetectedRisks(riskRes.data.detectedRisks);
        } else {
          setDetectedRisks(localDetectedRisks);
        }

        if (healthRes.success && healthRes.data) {
          const bHealth = healthRes.data;
          setHealthScore({
            score: bHealth.score,
            status: bHealth.status === 'caution' ? 'needs_attention' : bHealth.status,
            statusTe: bHealth.statusTe,
            summary: bHealth.summary,
            summaryTe: bHealth.summaryTe,
            loggingScore: bHealth.breakdown.find((b) => b.metric.includes('Logging'))?.score ?? 80,
            profitTrendScore: bHealth.breakdown.find((b) => b.metric.includes('Profit'))?.score ?? 85,
            expenseRatioScore: bHealth.breakdown.find((b) => b.metric.includes('Expense'))?.score ?? 70,
            breakdown: bHealth.breakdown.map((b) => ({
              label: b.label,
              labelTe: b.labelTe,
              weight: b.weight,
              score: b.score,
            })),
          });
        } else {
          setHealthScore(localHealthScore);
        }

        setCreditReadiness(localCreditReadiness);
        setBackendMode('backend');
        setBackendError(null);
      } else {
        // Backend returned failure or unreachable -> fallback to local calculation
        setFinance(localFinance);
        setHealthScore(localHealthScore);
        setCreditReadiness(localCreditReadiness);
        setDetectedRisks(localDetectedRisks);
        setBackendMode('local_fallback');
        setBackendError(financeRes.error || 'FastAPI backend server offline');
      }
    } catch (err: any) {
      setFinance(localFinance);
      setHealthScore(localHealthScore);
      setCreditReadiness(localCreditReadiness);
      setDetectedRisks(localDetectedRisks);
      setBackendMode('local_fallback');
      setBackendError(err?.message || 'FastAPI backend connection error');
    } finally {
      setBackendLoading(false);
    }
  }, [
    profile.marginCapital,
    profile.hasActiveLoan,
    profile.simulatingSecondLoan,
    totalIncome,
    totalExpenses,
    netCashFlow,
    entries.length,
    userId,
    localFinance,
    localHealthScore,
    localCreditReadiness,
    localDetectedRisks,
  ]);

  // Fetch from FastAPI backend whenever calculation inputs change
  useEffect(() => {
    let isSubscribed = true;
    refreshBackendData();

    // Auto-reconnect periodic check: ping health every 15s to switch back to backend if it turns online
    const interval = setInterval(async () => {
      if (!isSubscribed) return;
      const health = await apiClient.checkHealth(2000);
      if (health.success) {
        if (backendMode !== 'backend') {
          refreshBackendData();
        }
      } else {
        if (backendMode === 'backend') {
          setBackendMode('local_fallback');
          setBackendError('FastAPI backend became unreachable');
        }
      }
    }, 15000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [refreshBackendData, backendMode]);

  const dictionary = useMemo(() => getDictionary(language), [language]);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        theme,
        setTheme,
        toggleTheme,
        inputMode,
        setInputMode: handleSetInputMode,
        profile,
        profileStatus,
        profileError,
        retryLoadUserData,
        updateProfile,
        loadPreset,
        hasCompletedOnboarding: Boolean(
          user?.isDemo ||
          (profileStatus === 'PROFILE_FOUND' &&
            profile &&
            profile.name?.trim() &&
            profile.businessName?.trim() &&
            profile.location?.trim() &&
            profile.onboardingCompleted === true)
        ),
        selectedSchemeId,
        setSelectedSchemeId,
        entries,
        addNewEntry,
        updateEntry,
        removeEntry,
        resetEntriesToDefault,
        syncStatus,
        khataEntries,
        addKhataEntry,
        updateKhataEntry,
        recordKhataPayment: recordKhataPaymentHandler,
        removeKhataEntry,
        totalCustomerCredit,
        totalSupplierCredit,
        finance,
        totalIncome,
        totalExpenses,
        netCashFlow,
        healthScore,
        creditReadiness: localCreditReadiness,
        detectedRisks,
        dictionary,
        backendMode,
        isBackendOnline: backendMode === 'backend',
        backendLoading,
        backendError,
        refreshBackendData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
