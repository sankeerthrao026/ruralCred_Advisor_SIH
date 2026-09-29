'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { BusinessAdvisorOutput } from '@/lib/ai/provider';
import {
  saveConversationMetadata,
  saveMessage,
  fetchMessages,
  StoredMessage,
} from '@/lib/firebase/conversations';
import { ConversationHistoryModal } from '@/components/ai/ConversationHistoryModal';
import {
  isSpeechRecognitionSupported,
  isMediaRecordingSupported,
  startSpeechListening,
  startAudioRecordingFallback,
  stopActiveSpeechRecognition,
  SpeechController,
  getSpeechErrorMessage,
} from '@/lib/voice/speech';
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Tag,
  Users,
  Target,
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Calendar,
  Compass,
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  Plus,
} from 'lucide-react';
import { FeasibilityScoreCard } from '@/components/feasibility/FeasibilityScoreCard';
import { MissingInformationCard } from '@/components/checklist/MissingInformationCard';
import { ScenarioSimulatorCard } from '@/components/simulator/ScenarioSimulatorCard';
import { MultiYearProjectionTable } from '@/components/projections/MultiYearProjectionTable';
import { exportBusinessAnalysisToPdf, BusinessAnalysisReportData } from '@/lib/export/business-analysis-pdf';
import { evaluateBusinessFeasibility } from '@/lib/finance/feasibility';
import { runScenarioComparisonSuite } from '@/lib/finance/scenarios';
import { calculateMultiYearProjection } from '@/lib/finance/engine';
import { evaluateMissingInformation } from '@/lib/finance/checklist';

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data?: BusinessAdvisorOutput;
  isError?: boolean;
}

const AI_PIPELINE_STEPS = [
  {
    step: 1,
    icon: Database,
    titleEn: 'Querying district mandi pricing & regional enterprise benchmarks',
    titleTe: 'జిల్లా మండి ధరలు మరియు ప్రాంతీయ వ్యాపార బెంచ్‌మార్క్‌లను శోధిస్తున్నాము',
    detailEn: 'APMC & Agriculture Marketing localized market data indices',
    detailTe: 'APMC మార్కెట్ డేటా మరియు వ్యవసాయ మార్కెటింగ్ సూచికలు',
  },
  {
    step: 2,
    icon: Cpu,
    titleEn: 'Evaluating enterprise viability & unit economics',
    titleTe: 'యూనిట్ ఎకనామిక్స్ మరియు రిస్క్ పారామితుల విశ్లేషణ',
    detailEn: 'Evaluating margin capital, target demand, competitor density',
    detailTe: 'పెట్టుబడి మూలధనం, కేటగిరీ గిరాకీ, కాలానుగుణ మార్పులు',
  },
  {
    step: 3,
    icon: Sparkles,
    titleEn: 'Synthesizing strategic SWOT matrix & localized pricing guidance',
    titleTe: 'SWOT మ్యాట్రిక్స్ మరియు స్థానిక ధరల శ్రేణిని క్రోడీకరిస్తున్నాము',
    detailEn: 'Generating actionable differentiation and competitive moat',
    detailTe: 'పోటీదారుల విశ్లేషణ మరియు లాభదాయక వ్యాపార వ్యూహం',
  },
];

const DISTRICT_OPTIONS = [
  {
    state: 'Telangana',
    districts: ['Warangal', 'Karimnagar', 'Nalgonda', 'Nizamabad', 'Khammam', 'Mahabubnagar', 'Ranga Reddy'],
  },
  {
    state: 'Andhra Pradesh',
    districts: ['Guntur', 'Chittoor', 'West Godavari'],
  },
  {
    state: 'Maharashtra',
    districts: ['Kolhapur', 'Solapur', 'Nashik'],
  },
  {
    state: 'Karnataka',
    districts: ['Belagavi', 'Mandya', 'Dharwad'],
  },
  {
    state: 'Uttar Pradesh',
    districts: ['Varanasi', 'Gorakhpur', 'Lucknow'],
  },
  {
    state: 'Bihar',
    districts: ['Muzaffarpur', 'Patna Rural', 'Madhubani'],
  },
];

const CATEGORY_OPTIONS = [
  { id: 'Dairy', labelEn: 'Dairy Farming', labelTe: 'పాడి పరిశ్రమ' },
  { id: 'Poultry', labelEn: 'Poultry Broiler/Layer', labelTe: 'పౌల్ట్రీ పెంపకం' },
  { id: 'Kirana', labelEn: 'Kirana & General Store', labelTe: 'కిరాణా దుకాణం' },
  { id: 'Weaving', labelEn: 'Handloom & Weaving', labelTe: 'చేనేత వస్త్రాలు' },
  { id: 'Tailoring', labelEn: 'Tailoring & Garments', labelTe: 'టైలరింగ్' },
  { id: 'Agri Processing', labelEn: 'Agri / Flour Milling', labelTe: 'వ్యవసాయ మిల్లింగ్' },
  { id: 'Pottery', labelEn: 'Pottery & Clay Craft', labelTe: 'మట్టి పాత్రల తయారీ' },
  { id: 'Carpentry', labelEn: 'Carpentry & Woodwork', labelTe: 'వడ్రంగి పని' },
  { id: 'Fishery', labelEn: 'Fishery & Aquaculture', labelTe: 'చేపల పెంపకం' },
  { id: 'Auto Repair', labelEn: 'Auto & Tractor Repair', labelTe: 'ఆటో రిపేర్' },
  { id: 'Street Food', labelEn: 'Street Food / Canteen', labelTe: 'గ్రామీణ హోటల్' },
];

const SEASON_OPTIONS = [
  { id: 'Year-Round Baseline', labelEn: 'Year-Round Baseline', labelTe: 'సాధారణ వార్షిక డిమాండ్' },
  { id: 'Festive Season (Diwali / Sankranti Peak)', labelEn: 'Festive Season Peak (Diwali / Sankranti / Dussehra)', labelTe: 'పండుగల సీజన్ (దీపావళి / సంక్రాంతి)' },
  { id: 'Post-Harvest Season (Bumper Mandi Liquidity)', labelEn: 'Post-Harvest Mandi Off-Take (Bumper Liquidity)', labelTe: 'పంట కోతల అనంతర సీజన్' },
  { id: 'Summer Lean Season (Water Scarcity & Heat Stress)', labelEn: 'Summer Lean Season (Off-Peak Period)', labelTe: 'వేసవి కాలం (తక్కువ గిరాకీ)' },
];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function BusinessAdvisorScreen() {
  const { profile, finance, language, dictionary, totalIncome, totalExpenses } = useApp();
  const { user, isDemo } = useAuth();
  const userId = user?.id || 'demo-user';
  const t = dictionary.businessAdvisor;
  const isTe = language === 'te';

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BusinessAdvisorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // PDF Export State
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportPdfSuccess, setExportPdfSuccess] = useState(false);

  // Hyper-local RAG parameters
  const [selectedLocation, setSelectedLocation] = useState<string>(profile.location || 'Warangal');
  const [selectedCategory, setSelectedCategory] = useState<string>(profile.category || 'Dairy');
  const [selectedSeason, setSelectedSeason] = useState<string>('Year-Round Baseline');

  // Interactive Conversation State
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});
  const [telemetryTrigger, setTelemetryTrigger] = useState(0);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceControllerRef = useRef<SpeechController | null>(null);

  const handleNewConversation = () => {
    const newId = `conv-biz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setActiveConversationId(newId);
    setMessages([]);
    setData(null);
  };

  const handleSelectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    try {
      const stored = await fetchMessages(userId, convId);
      const mapped: AdvisorMessage[] = stored.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: formatTime(m.timestamp),
        data: m.data,
        isError: m.isError,
      }));
      setMessages(mapped);
      const lastWithData = [...mapped].reverse().find((m) => m.data);
      if (lastWithData && lastWithData.data) {
        setData(lastWithData.data);
      }
    } catch (e) {
      console.warn('Failed to load conversation messages:', e);
    }
  };

  // Abort any active voice session when the screen unmounts so the microphone
  // is never left running in the background.
  useEffect(() => {
    return () => {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.abort();
        voiceControllerRef.current = null;
      }
      stopActiveSpeechRecognition();
    };
  }, []);

  // Sync with profile initially if profile changes
  useEffect(() => {
    if (profile.location) setSelectedLocation(profile.location);
    if (profile.category) setSelectedCategory(profile.category);
  }, [profile.location, profile.category]);

  // Cycle through multi-step thinking state when initial loading
  useEffect(() => {
    if (!loading) {
      setActiveStep(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < 2 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(interval);
  }, [loading]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isFollowUpLoading]);

  // Dynamic suggested questions based on selected category
  const getSuggestedQuestions = () => {
    const cat = selectedCategory.toLowerCase();
    if (cat.includes('dairy') || cat.includes('పాడి')) {
      return [
        { en: 'What if I expand to the next village?', te: 'సమీప గ్రామానికి విస్తరిస్తే మార్కెట్ ఎలా ఉంటుంది?' },
        { en: 'Where can I buy feed & fodder cheaper?', te: 'దాణా & పచ్చిగడ్డి తక్కువ ధరకు ఎక్కడ లభిస్తుంది?' },
        { en: 'Which government scheme gives subsidy for cows?', te: 'పాడి పరిశ్రమకు ఏ ప్రభుత్వ పథకం సబ్సిడీ ఇస్తుంది?' },
        { en: 'How to manage milk yield during summer heat?', te: 'వేసవిలో పాల దిగుబడి తగ్గకుండా ఎలాంటి జాగ్రత్తలు తీసుకోవాలి?' },
      ];
    }
    if (cat.includes('kirana') || cat.includes('grocery') || cat.includes('కిరాణా')) {
      return [
        { en: 'What if I open another branch in the next village?', te: 'పక్క గ్రామంలో మరో బ్రాంచ్ తెరిస్తే ఎలా ఉంటుంది?' },
        { en: 'Where can I procure wholesale stock at mandi rates?', te: 'హోల్‌సేల్ సరుకులు తక్కువ ధరకు ఎక్కడ కొనుగోలు చేయవచ్చు?' },
        { en: 'How can I reduce customer credit (బాకీలు)?', te: 'కస్టమర్ల అప్పులు బాకీలు త్వరగా ఎలా వసూలు చేయాలి?' },
        { en: 'What inventory should I stock for festive season?', te: 'పండుగల సీజన్ కోసం ఏ వస్తువులు ఎక్కువ నిల్వ చేయాలి?' },
      ];
    }
    if (cat.includes('weaving') || cat.includes('handloom') || cat.includes('చేనేత')) {
      return [
        { en: 'How to supply directly to city boutiques without brokers?', te: 'దళారులు లేకుండా నగరాల్లోని షోరూమ్‌లకు ఎలా విక్రయించాలి?' },
        { en: 'Where to procure quality silk yarn and natural dyes cheaper?', te: 'పట్టు నూలు & రంగులు నాణ్యమైనవి తక్కువ ధరకు ఎక్కడ దొరుకుతాయి?' },
        { en: 'Can I get working capital under Mudra Weavers Card?', te: 'చేనేత కార్డ్ లేదా ముద్ర కింద తక్కువ వడ్డీ రుణం లభిస్తుందా?' },
        { en: 'What designs have the highest demand this wedding season?', te: 'పెళ్లిళ్ల సీజన్‌లో ఎలాంటి డిజైన్లకు ఎక్కువ గిరాకీ ఉంటుంది?' },
      ];
    }
    return [
      { en: 'What if I expand to the next village?', te: 'సమీప గ్రామానికి విస్తరిస్తే మార్కెట్ ఎలా ఉంటుంది?' },
      { en: 'Where can I buy raw materials cheaper?', te: 'ముడిసరుకు తక్కువ ధరకు ఎక్కడ లభిస్తుంది?' },
      { en: 'What government scheme supports my business expansion?', te: 'నా వ్యాపార విస్తరణకు ఏ ప్రభుత్వ పథకం మద్దతు ఇస్తుంది?' },
      { en: 'How to maintain high profit margins during off-season?', te: 'ఆఫ్-సీజన్‌లో లాభాలను ఎలా కాపాడుకోవాలి?' },
    ];
  };

  // Generate and export Business Analysis PDF
  const handleExportPdf = () => {
    try {
      setExportingPdf(true);

      const marginVal = profile.marginCapital || finance.marginCapital || 100000;
      const projectCostVal = finance.projectCost || 1000000;
      const loanVal = finance.loanAmount || 900000;
      const monthlyRev = totalIncome > 0 ? totalIncome : 120000;
      const monthlyExp = totalExpenses > 0 ? totalExpenses : 70000;

      // Deterministic feasibility assessment
      const feasibility = evaluateBusinessFeasibility({
        category: selectedCategory,
        location: selectedLocation,
        marginCapital: marginVal,
        projectCost: projectCostVal,
        loanAmount: loanVal,
        monthlyRevenueEstimate: monthlyRev,
        monthlyExpenseEstimate: monthlyExp,
      });

      // Deterministic scenario comparison suite
      const scenarios = runScenarioComparisonSuite({
        marginCapital: marginVal,
        projectCost: projectCostVal,
        loanAmount: loanVal,
        baseMonthlyRevenue: monthlyRev,
        baseMonthlyExpense: monthlyExp,
        interestRateAnnual: 8.5,
        tenureYears: 5,
      });

      // Deterministic 5-year projections
      const multiYearProjections = calculateMultiYearProjection({
        marginCapital: marginVal,
        projectCost: projectCostVal,
        loanAmount: loanVal,
        baseMonthlyRevenue: monthlyRev,
        baseMonthlyExpense: monthlyExp,
        interestRateAnnual: 8.5,
        tenureYears: 5,
        moratoriumMonths: 6,
      });

      // Missing information checklist
      const missingInformation = evaluateMissingInformation({
        name: profile.name,
        businessName: profile.businessName,
        category: selectedCategory,
        location: selectedLocation,
        marginCapital: marginVal,
        hasUdyamRegistration: profile.hasUdyamRegistration,
      });

      const exportData: BusinessAnalysisReportData = {
        businessName: profile.businessName || (isDemo ? 'Sharma Dairy Farm' : `${profile.name || user?.name || 'My'} Enterprises`),
        promoterName: profile.name || user?.name || user?.email?.split('@')[0] || (isDemo ? 'Anita Sharma' : 'Entrepreneur'),
        category: selectedCategory,
        location: selectedLocation,
        projectCost: projectCostVal,
        promoterMargin: marginVal,
        loanAmount: loanVal,
        advisorOutput: data,
        season: selectedSeason,
        feasibility,
        scenarios,
        multiYearProjections,
        missingInformation,
        language: isTe ? 'te' : 'en',
        providerUsed: data?.providerUsed || 'Google Gemini 2.5 Flash / NVIDIA NIM',
        sourcesUsed: data?.sourcesUsed,
      };

      exportBusinessAnalysisToPdf(exportData);
      setExportPdfSuccess(true);
      setTimeout(() => setExportPdfSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to export Business Analysis PDF:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  // Primary initial analysis
  const runAnalysis = async (
    loc = selectedLocation,
    cat = selectedCategory,
    season = selectedSeason,
    resetChat = true
  ) => {
    setLoading(true);
    setError(null);
    setActiveStep(0);
    try {
      const res = await fetch('/api/ai/business-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: loc,
          category: cat,
          marginCapital: profile.marginCapital || 100000,
          language,
          userQuery: season !== 'Year-Round Baseline' ? season : undefined,
          history: [],
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch business advisory');
      }

      const result: BusinessAdvisorOutput = await res.json();
      setData(result);

      if (resetChat) {
        const initialUserMsg: AdvisorMessage = {
          id: `init-user-${Date.now()}`,
          role: 'user',
          content: isTe
            ? `${loc} పరిధిలో ₹${(profile.marginCapital || 100000).toLocaleString('en-IN')} పెట్టుబడితో ${cat} వ్యాపార సాధ్యాసాధ్యాల విశ్లేషణ (${season !== 'Year-Round Baseline' ? season : 'వార్షిక గిరాకీ'}).`
            : `Business viability evaluation for ${cat} in ${loc} with ₹${(profile.marginCapital || 100000).toLocaleString('en-IN')} margin capital (${season !== 'Year-Round Baseline' ? season : 'Year-Round'}).`,
          timestamp: formatTime(Date.now()),
        };

        const initialAiMsg: AdvisorMessage = {
          id: `init-ai-${Date.now()}`,
          role: 'assistant',
          content: result.reply || `${result.marketReach.headline}. ${result.marketReach.details}`,
          timestamp: formatTime(Date.now()),
          data: result,
        };

        setMessages([initialUserMsg, initialAiMsg]);
      }
    } catch (err: any) {
      console.error('Advisor error:', err);
      setError(err?.message || 'Error running advisory');
    } finally {
      setLoading(false);
      setTelemetryTrigger((prev) => prev + 1);
    }
  };

  // Send a follow-up conversational question
  const handleSendFollowUp = async (questionText: string) => {
    const cleanText = questionText.trim();
    if (!cleanText || isFollowUpLoading) return;

    setInputText('');

    let convId = activeConversationId;
    const isNewConv = !convId;
    if (!convId) {
      convId = `conv-biz-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setActiveConversationId(convId);
    }

    const userMessage: AdvisorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: cleanText,
      timestamp: formatTime(Date.now()),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsFollowUpLoading(true);

    // Persist user message
    if (userId) {
      await saveMessage(
        userId,
        convId,
        {
          id: userMessage.id,
          role: 'user',
          content: cleanText,
          timestamp: Date.now(),
          language,
        },
        {
          id: convId,
          advisorType: 'business',
          title: isNewConv || messages.length <= 1 ? cleanText.substring(0, 45) : undefined,
          createdAt: isNewConv ? Date.now() : undefined,
          updatedAt: Date.now(),
          language,
          messageCount: updatedMessages.length,
          lastSnippet: cleanText.substring(0, 80),
        }
      );
    }

    try {
      // Build conversation history array
      const historyPayload = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/business-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: selectedLocation,
          category: selectedCategory,
          marginCapital: profile.marginCapital || 100000,
          language,
          userQuery: cleanText,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve follow-up answer');
      }

      const result: BusinessAdvisorOutput = await res.json();
      setData(result); // Update diagnostics with latest response

      const aiMessage: AdvisorMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.reply || `${result.marketReach.headline}. ${result.marketReach.details}`,
        timestamp: formatTime(Date.now()),
        data: result,
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Persist assistant message
      if (userId && convId) {
        await saveMessage(
          userId,
          convId,
          {
            id: aiMessage.id,
            role: 'assistant',
            content: aiMessage.content,
            timestamp: Date.now(),
            language,
            data: result,
          },
          {
            id: convId,
            advisorType: 'business',
            updatedAt: Date.now(),
            messageCount: updatedMessages.length + 1,
            lastSnippet: (result.reply || aiMessage.content).substring(0, 80),
          }
        );
      }
    } catch (err: any) {
      console.error('Follow-up error:', err);
      const errorMessage: AdvisorMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isTe
          ? 'సలహాదారు సమాధానం పొందడంలో సమస్య ఏర్పడింది. దయచేసి మళ్ళీ ప్రయత్నించండి.'
          : 'Unable to retrieve answer. Please check your network and try again.',
        isError: true,
        timestamp: formatTime(Date.now()),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsFollowUpLoading(false);
      setTelemetryTrigger((prev) => prev + 1);
    }
  };

  // Retry the last user question if an error occurred
  const handleRetry = (errIndex: number) => {
    // Find the user query that preceded this error
    let userQuery = '';
    for (let i = errIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }

    if (!userQuery) return;

    // Remove the error message and re-send
    setMessages((prev) => prev.filter((_, idx) => idx !== errIndex));
    handleSendFollowUp(userQuery);
  };

  // Voice Input handler
  const handleToggleVoice = async () => {
    setVoiceError(null);

    // If already listening, stop recording
    if (isListening) {
      if (voiceControllerRef.current) {
        voiceControllerRef.current.stop();
        voiceControllerRef.current = null;
      }
      setIsListening(false);
      return;
    }

    // Secondary fallback starter
    const startFallback = async () => {
      if (!isMediaRecordingSupported()) {
        setIsListening(false);
        setVoiceError(
          isTe
            ? 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ సపోర్ట్ లేదు. దయచేసి Chrome లేదా Edge ఉపయోగించండి.'
            : 'Voice input is not supported in this browser. Please use Chrome or Edge.'
        );
        return;
      }

      try {
        setIsListening(true);
        const fallbackRecorder = await startAudioRecordingFallback({
          language: language as 'en' | 'te',
          onResult: (transcribedText) => {
            setIsListening(false);
            voiceControllerRef.current = null;
            if (transcribedText) {
              setInputText(transcribedText);
              inputRef.current?.focus();
            }
          },
          onError: (err) => {
            setIsListening(false);
            voiceControllerRef.current = null;
            const errMsg = err?.message || (isTe ? 'వాయిస్ రికార్డింగ్‌లో సమస్య ఏర్పడింది.' : 'Voice recording failed.');
            setVoiceError(errMsg);
          },
        });
        voiceControllerRef.current = fallbackRecorder;
      } catch (e: any) {
        setIsListening(false);
        voiceControllerRef.current = null;
        setVoiceError(e?.message || (isTe ? 'మైక్రోఫోన్ అనుమతించబడలేదు.' : 'Microphone access denied.'));
      }
    };

    // 1. Try Web Speech API first
    if (isSpeechRecognitionSupported()) {
      let hasReceivedAnyResult = false;

      setIsListening(true);
      const controller = startSpeechListening({
        language,
        onInterim: (interim) => {
          if (interim) {
            hasReceivedAnyResult = true;
            setInputText(interim);
          }
        },
        onResult: (transcript: string) => {
          if (transcript) {
            hasReceivedAnyResult = true;
            setInputText(transcript);
          }
        },
        onError: (_code, message) => {
          if (!hasReceivedAnyResult && isMediaRecordingSupported()) {
            startFallback();
          } else {
            setIsListening(false);
            voiceControllerRef.current = null;
            setVoiceError(message);
          }
        },
        onEnd: () => {
          setIsListening(false);
          voiceControllerRef.current = null;
          inputRef.current?.focus();
        },
      });

      if (controller) {
        voiceControllerRef.current = controller;
        return;
      }
    }

    // 2. Direct fallback if Web Speech API is not supported or returned null
    await startFallback();
  };

  // Run automatically on first load if not loaded yet
  useEffect(() => {
    if (!data && !loading) {
      runAnalysis(selectedLocation, selectedCategory, selectedSeason, true);
    }
  }, [language]);

  return (
    <div className="flex flex-col gap-6">
      {/* Grounding Source Attribution Banner */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-emerald-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
            <Database className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground">
                {isTe
                  ? 'హైపర్-లోకల్ మార్కెట్ ఇంటెలిజెన్స్'
                  : 'Hyper-Local Market Intelligence'}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isTe ? 'ప్రత్యక్ష APMC మార్కెట్ బెంచ్‌మార్క్‌లు' : 'Live APMC Market Benchmarks'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isTe
                ? 'తెలంగాణ, ఆంధ్రప్రదేశ్ జిల్లాల మండి ధరలు, కాలానుగుణ మార్పులు మరియు మార్కెట్ విశ్లేషణ.'
                : 'Grounding across 22+ agricultural districts. Evaluates real-time mandi prices and seasonal demand.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 shrink-0 bg-card font-semibold text-xs border-border hover:bg-muted transition-all cursor-pointer shadow-xs"
          >
            <Clock className="size-3.5 text-primary" />
            <span>{isTe ? 'సంభాషణల చరిత్ర' : 'Chat History'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 shrink-0 bg-card font-semibold text-xs border-border hover:bg-muted transition-all cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>{isTe ? 'కొత్త సంభాషణ' : 'New Chat'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={exportingPdf || loading}
            className="flex items-center gap-1.5 shrink-0 bg-card font-semibold text-xs border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer shadow-xs"
          >
            <Download className={`size-3.5 ${exportingPdf ? 'animate-bounce' : ''}`} />
            <span>
              {exportingPdf
                ? isTe
                  ? 'పిడిఎఫ్ రూపొందుతోంది...'
                  : 'Generating PDF...'
                : exportPdfSuccess
                ? isTe
                  ? 'డౌన్‌లోడ్ పూర్తయింది!'
                  : 'Downloaded!'
                : isTe
                ? 'అడ్వైజరీ రిపోర్ట్ (PDF)'
                : 'Download Advisory Report (PDF)'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => runAnalysis(selectedLocation, selectedCategory, selectedSeason, true)}
            disabled={loading || isFollowUpLoading}
            className="flex items-center gap-1.5 shrink-0 bg-card font-semibold text-xs border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? t.analyzingText : isTe ? 'కొత్త విశ్లేషణ' : 'New Analysis'}</span>
          </Button>
        </div>
      </div>

      {/* Hyper-Local District, Category & Seasonality Explorer */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Compass className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-sora">
              {isTe ? 'హైపర్-లోకల్ పరిశోధన పారామితులు' : 'Hyper-Local RAG Query Parameters'}
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {isTe ? 'పరిశీలించడానికి మార్చండి' : 'Select district, category & season to re-query RAG'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* District Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 text-primary" />
              {isTe ? 'జిల్లా & రాష్ట్రం' : 'District & State'}
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLocation(val);
                runAnalysis(val, selectedCategory, selectedSeason, true);
              }}
              disabled={loading || isFollowUpLoading}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {DISTRICT_OPTIONS.map((group) => (
                <optgroup key={group.state} label={group.state}>
                  {group.districts.map((d) => (
                    <option key={d} value={d}>
                      {d} ({group.state})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Category Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="size-3 text-primary" />
              {isTe ? 'వ్యాపార విభాగం' : 'Business Category'}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                runAnalysis(selectedLocation, val, selectedSeason, true);
              }}
              disabled={loading || isFollowUpLoading}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {isTe ? c.labelTe : c.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* Seasonality / Mandi Trend Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3 text-primary" />
              {isTe ? 'కాలానుగుణ మండి స్థితి' : 'Seasonality & Mandi Context'}
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedSeason(val);
                runAnalysis(selectedLocation, selectedCategory, val, true);
              }}
              disabled={loading || isFollowUpLoading}
              className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SEASON_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {isTe ? s.labelTe : s.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Multi-Step AI Thinking State (Initial Load) */}
      {loading && (
        <div className="rounded-2xl border bg-card p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center min-h-[380px] page-enter">
          <div className="relative flex items-center justify-center mb-4">
            <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="size-7 text-primary absolute animate-pulse" />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span>Multi-Agent Synthesis</span>
            </div>
            <h3 className="text-lg font-bold font-sora text-foreground">
              {t.analyzingText}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md">
              {isTe
                ? 'మీ ప్రాంతపు జనాభా గిరాకీ, పోటీదారుల సంఖ్య మరియు ధరల బెంచ్‌మార్క్‌లను క్రోడీకరిస్తున్నాము...'
                : 'Cross-referencing rural consumer density, competitor presence, and typical margin thresholds...'}
            </p>
          </div>

          {/* Interactive Step Visualizer */}
          <div className="w-full max-w-lg space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
            {AI_PIPELINE_STEPS.map((step, idx) => {
              const isCompleted = activeStep > idx;
              const isCurrent = activeStep === idx;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.step}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-primary/10 border border-primary/30 shadow-xs'
                      : isCompleted
                      ? 'opacity-80 bg-background/50'
                      : 'opacity-40'
                  }`}
                >
                  <div
                    className={`size-7 rounded-lg grid place-items-center text-xs font-bold shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="size-4" /> : <StepIcon className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                      {isTe ? step.titleTe : step.titleEn}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isTe ? step.detailTe : step.detailEn}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary animate-pulse shrink-0">
                      Processing...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Initial Error Banner */}
      {!loading && error && messages.length === 0 && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="size-8 text-destructive" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <Button size="sm" onClick={() => runAnalysis()} className="mt-2 cursor-pointer">
            <RefreshCw className="size-3.5 mr-1.5" />
            {isTe ? 'మళ్ళీ ప్రయత్నించండి' : 'Retry Advisory'}
          </Button>
        </div>
      )}

      {/* Dynamic Multi-Step AI Thinking State (Initial Full-screen Load) */}
      {loading && messages.length === 0 && (
        <div className="rounded-2xl border bg-card p-8 sm:p-10 shadow-xs flex flex-col items-center justify-center min-h-[380px] page-enter">
          <div className="relative flex items-center justify-center mb-4">
            <div className="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Sparkles className="size-7 text-primary absolute animate-pulse" />
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span>Multi-Agent Synthesis</span>
            </div>
            <h3 className="text-lg font-bold font-sora text-foreground">
              {t.analyzingText}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md">
              {isTe
                ? 'మీ ప్రాంతపు జనాభా గిరాకీ, పోటీదారుల సంఖ్య మరియు ధరల బెంచ్‌మార్క్‌లను క్రోడీకరిస్తున్నాము...'
                : 'Cross-referencing rural consumer density, competitor presence, and typical margin thresholds...'}
            </p>
          </div>

          {/* Interactive Step Visualizer */}
          <div className="w-full max-w-lg space-y-3 bg-muted/30 rounded-xl p-4 border border-border/50">
            {AI_PIPELINE_STEPS.map((step, idx) => {
              const isCompleted = activeStep > idx;
              const isCurrent = activeStep === idx;
              const StepIcon = step.icon;

              return (
                <div
                  key={step.step}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300 ${
                    isCurrent
                      ? 'bg-primary/10 border border-primary/30 shadow-xs'
                      : isCompleted
                      ? 'opacity-80 bg-background/50'
                      : 'opacity-40'
                  }`}
                >
                  <div
                    className={`size-7 rounded-lg grid place-items-center text-xs font-bold shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground animate-pulse'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="size-4" /> : <StepIcon className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                      {isTe ? step.titleTe : step.titleEn}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {isTe ? step.detailTe : step.detailEn}
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary animate-pulse shrink-0">
                      Processing...
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CORE FEATURE: Business Intelligence Workspace (Split Layout) */}
      {(!loading || messages.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Interactive Conversation Stream */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <div className="rounded-2xl border bg-card shadow-xs overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="p-4 sm:px-6 sm:py-4 border-b bg-muted/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-sora text-foreground">
                        {isTe ? 'వ్యాపార సలహాదారు సంభాషణ' : 'Business Advisory Dialogue'}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        <Sparkles className="size-2.5" />
                        RAG Grounded
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {isTe
                        ? `${selectedLocation} • ${selectedCategory} కోసం నిరంతర సంభాషణ`
                        : `Contextual RAG session for ${selectedCategory} in ${selectedLocation}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => runAnalysis(selectedLocation, selectedCategory, selectedSeason, true)}
                    title={isTe ? 'సంభాషణను రీసెట్ చేయండి' : 'Clear and reset conversation'}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="hidden sm:inline">{isTe ? 'రీసెట్' : 'Reset'}</span>
                  </button>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="p-4 sm:p-6 flex flex-col gap-4 max-h-[600px] overflow-y-auto bg-background/50">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const turnData = msg.data;
                  const isExpanded = Boolean(expandedTurns[msg.id]);

                  if (isUser) {
                    return (
                      <div key={msg.id} className="flex justify-end items-end gap-2.5 max-w-[85%] self-end message-enter">
                        <div className="flex flex-col items-end">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-xs px-4 py-2.5 text-xs sm:text-sm font-medium shadow-xs leading-relaxed">
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground mt-1 px-1">
                            {msg.timestamp}
                          </span>
                        </div>
                        <div className="grid size-7 place-items-center rounded-full bg-primary/20 text-primary text-xs shrink-0 mb-4">
                          <User className="size-3.5" />
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  return (
                    <div key={msg.id} className="flex items-start gap-2.5 max-w-[95%] self-start message-enter">
                      <div className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary shrink-0 mt-1">
                        <Sparkles className="size-4" />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-2">
                        <div
                          className={`rounded-2xl rounded-tl-xs p-4 sm:p-5 border shadow-xs leading-relaxed text-xs sm:text-sm ${
                            msg.isError
                              ? 'border-destructive/40 bg-destructive/5 text-destructive'
                              : 'bg-card text-foreground border-border/80'
                          }`}
                        >
                          {/* Top metadata tags */}
                          {!msg.isError && (
                            <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-border/40">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                RuralCred Business Advisor
                              </span>
                              {turnData?.providerUsed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                  <Cpu className="size-2.5" />
                                  {turnData.providerUsed}
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {msg.timestamp}
                              </span>
                            </div>
                          )}

                          {/* Main Message Text */}
                          <p className="font-normal text-foreground whitespace-pre-line leading-relaxed">
                            {msg.content}
                          </p>

                          {/* Error state with retry action */}
                          {msg.isError && (
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRetry(idx)}
                                className="h-8 text-xs cursor-pointer gap-1.5"
                              >
                                <RefreshCw className="size-3.5" />
                                {isTe ? 'మళ్ళీ ప్రయత్నించండి' : 'Retry Query'}
                              </Button>
                            </div>
                          )}

                          {/* Grounded Key Metrics Mini-Bar */}
                          {!msg.isError && turnData && (
                            <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                              <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1.5 rounded-lg">
                                <Tag className="size-3 text-primary shrink-0" />
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-bold text-foreground truncate">
                                  {turnData.pricingSuggestion.recommendedBand}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1.5 rounded-lg">
                                <TrendingUp className="size-3 text-emerald-600 shrink-0" />
                                <span className="text-muted-foreground">Margin:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                  {turnData.pricingSuggestion.marginTarget}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1.5 rounded-lg">
                                <Users className="size-3 text-amber-600 shrink-0" />
                                <span className="text-muted-foreground">Density:</span>
                                <span className="font-bold text-foreground">
                                  {turnData.competitorDensity.densityLevel}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Expandable Turn Diagnostics Toggle */}
                          {!msg.isError && turnData && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTurns((prev) => ({ ...prev, [msg.id]: !isExpanded }))
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                <span>
                                  {isExpanded
                                    ? isTe
                                      ? 'వివరణాత్మక డయాగ్నోస్టిక్స్ దాచండి'
                                      : 'Hide Turn Diagnostics'
                                    : isTe
                                    ? 'ఈ ప్రశ్నకు సంబంధించిన వ్యూహం & వివరణలు'
                                    : 'View Turn Strategy & Demand Drivers'}
                                </span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-3 rounded-xl bg-muted/30 border border-border/50 text-xs space-y-2 page-enter">
                                  <p className="font-semibold text-foreground">
                                    {isTe ? 'అవకాశ విశ్లేషణ:' : 'Opportunity Analysis:'}{' '}
                                    <span className="font-normal text-muted-foreground">
                                      {turnData.opportunityAnalysis.overview}
                                    </span>
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
                                    <div>
                                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 block mb-1">
                                        {isTe ? 'బలాలు (Strengths):' : 'Key Strengths:'}
                                      </span>
                                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                                        {turnData.swot.strengths.slice(0, 2).map((s, i) => (
                                          <li key={i}>{s}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                                        {isTe ? 'వ్యూహాత్మక రక్షణ (Moat):' : 'Mitigation Strategy:'}
                                      </span>
                                      <p className="text-muted-foreground text-[11px]">
                                        {turnData.competitorDensity.mitigationStrategy}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Retrieved Sources Badge */}
                        {!msg.isError && turnData?.sourcesUsed && turnData.sourcesUsed.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 px-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Database className="size-2.5 text-primary" />
                              RAG:
                            </span>
                            {turnData.sourcesUsed.slice(0, 2).map((src, i) => (
                              <span
                                key={i}
                                className="text-[9px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded border"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Follow-up Typing / Loading Indicator */}
                {isFollowUpLoading && (
                  <div className="flex items-start gap-2.5 self-start page-enter">
                    <div className="grid size-8 place-items-center rounded-xl bg-primary/15 text-primary shrink-0 mt-1 animate-pulse">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="rounded-2xl rounded-tl-xs p-4 border border-primary/30 bg-primary/5 shadow-xs flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-2 rounded-full bg-primary animate-bounce" />
                      </div>
                      <span className="text-xs text-primary font-medium">
                        {isTe
                          ? `${selectedLocation} మండి డేటాను మరియు RAG నాలెడ్జ్ బేస్‌ను శోధిస్తున్నాము...`
                          : `Querying ChromaDB records & generating hyper-local context for ${selectedLocation}...`}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Suggested Follow-up Question Chips */}
              <div className="px-4 py-3 border-t bg-muted/10">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-2">
                  <Sparkles className="size-3 text-primary" />
                  <span>{isTe ? 'సూచించిన తదుపరి ప్రశ్నలు (1-క్లిక్):' : 'Suggested follow-up questions:'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {getSuggestedQuestions().map((q, idx) => {
                    const text = isTe ? q.te : q.en;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isFollowUpLoading}
                        onClick={() => handleSendFollowUp(text)}
                        className="rounded-lg border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors shadow-2xs cursor-pointer text-left disabled:opacity-50"
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Voice Error Notification */}
              {voiceError && (
                <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    {voiceError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVoiceError(null)}
                    className="text-xs underline font-semibold ml-2 cursor-pointer shrink-0"
                  >
                    {isTe ? 'మూసివేయి' : 'Dismiss'}
                  </button>
                </div>
              )}

              {/* Chat Input Bar with Text and Voice Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendFollowUp(inputText);
                }}
                className="p-3 sm:p-4 border-t bg-card flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  title={isListening ? (isTe ? 'వాయిస్ నిలిపివేయండి' : 'Stop listening') : (isTe ? 'వాయిస్ ఇన్‌పుట్' : 'Voice input (Telugu / English)')}
                  className={`grid size-10 place-items-center rounded-xl border transition-all cursor-pointer shrink-0 ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-500/20'
                      : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border-border/80'
                  }`}
                >
                  {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>

                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isListening
                        ? isTe
                          ? 'వింటున్నాము... మాట్లాడండి...'
                          : 'Listening... speak your question...'
                        : isTe
                        ? 'ఉదా: "మరో గ్రామానికి విస్తరిస్తే మార్కెట్ ఎలా ఉంటుంది?"'
                        : 'Ask a follow-up (e.g., "What if I expand to the next village?")...'
                    }
                    disabled={isFollowUpLoading}
                    className="w-full rounded-xl border bg-background px-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isFollowUpLoading || !inputText.trim()}
                  className="h-10 px-4 rounded-xl font-semibold gap-1.5 cursor-pointer shrink-0"
                >
                  <Send className="size-3.5" />
                  <span className="hidden sm:inline">{isTe ? 'పంపండి' : 'Send'}</span>
                </Button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Contextual Business Intelligence Panel */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border bg-card p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-primary" />
                  <h3 className="font-bold font-sora text-xs uppercase tracking-wider text-foreground">
                    {isTe ? 'స్థానిక వ్యాపార స్థాన సమాచారం' : 'Local Business Context'}
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live RAG Telemetry
                </span>
              </div>

              {/* Active Enterprise Quick Tag */}
              <div className="rounded-xl bg-muted/40 p-3 border flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-foreground">
                    {selectedCategory}
                  </p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary" />
                    {selectedLocation} • {selectedSeason}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground">
                    {isTe ? 'సొంత పెట్టుబడి' : 'Margin Capital'}
                  </span>
                  <p className="text-xs font-bold text-primary font-sora">
                    ₹{(profile.marginCapital || 100000).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Pricing & Margin Benchmark */}
              {data ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Tag className="size-3 text-primary" />
                      {isTe ? 'సిఫార్సు ధర' : 'Target Price'}
                    </p>
                    <p className="mt-1 font-bold text-foreground font-sora text-sm">
                      {data.pricingSuggestion.recommendedBand}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {data.pricingSuggestion.benchmarkComparison}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="size-3 text-emerald-600" />
                      {isTe ? 'లక్ష్య లాభం' : 'Target Margin'}
                    </p>
                    <p className="mt-1 font-bold text-emerald-700 dark:text-emerald-400 font-sora text-sm">
                      {data.pricingSuggestion.marginTarget}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {data.marketReach.targetSegment || 'Local rural consumers'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border bg-muted/20 text-center text-xs text-muted-foreground">
                  {isTe ? 'ధరల సమాచారం లోడ్ అవుతోంది...' : 'Loading pricing benchmarks...'}
                </div>
              )}

              {/* Competitor Density & Moat */}
              {data && (
                <div className="rounded-xl border bg-muted/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      {isTe ? 'పోటీదారుల స్థాయి' : 'Competitor Density'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        data.competitorDensity.densityLevel === 'High'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      }`}
                    >
                      {data.competitorDensity.densityLevel} Density
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {data.competitorDensity.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                      <ShieldCheck className="size-3" />
                      {isTe ? 'రక్షణ వ్యూహం (Moat):' : 'Moat & Mitigation:'}
                    </span>
                    <p className="text-[11px] text-foreground mt-0.5 leading-relaxed font-medium">
                      {data.competitorDensity.mitigationStrategy}
                    </p>
                  </div>
                </div>
              )}

              {/* Demand Drivers & Seasonality */}
              {data && (
                <div className="rounded-xl border bg-amber-500/5 p-3.5 border-amber-500/20 space-y-2">
                  <p className="text-[11px] font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-amber-600" />
                    {isTe ? 'కాలానుగుణ గిరాకీ అంశాలు' : 'Seasonal Demand & Drivers'}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {data.opportunityAnalysis.seasonalOpportunity}
                  </p>
                  <div className="space-y-1 pt-1">
                    {data.opportunityAnalysis.primaryDrivers.slice(0, 2).map((driver, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-[11px] text-foreground">
                        <CheckCircle2 className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{driver}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live SWOT Diagnostic Mini-Grid */}
              {data && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold font-sora text-foreground uppercase tracking-wider">
                      {isTe ? 'SWOT విశ్లేషణ సారాంశం' : 'SWOT Diagnostic Snapshot'}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {dictionary.aiEstimateBadge}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {/* Strengths */}
                    <div className="p-2.5 rounded-lg border border-emerald-300/60 bg-emerald-500/5">
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 text-[10px] uppercase">
                        {t.strengths}
                      </p>
                      <ul className="mt-1 space-y-1 text-muted-foreground text-[10px]">
                        {data.swot.strengths.slice(0, 2).map((s, idx) => (
                          <li key={idx} className="leading-tight">• {s}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="p-2.5 rounded-lg border border-amber-300/60 bg-amber-500/5">
                      <p className="font-bold text-amber-800 dark:text-amber-300 text-[10px] uppercase">
                        {t.weaknesses}
                      </p>
                      <ul className="mt-1 space-y-1 text-muted-foreground text-[10px]">
                        {data.swot.weaknesses.slice(0, 2).map((w, idx) => (
                          <li key={idx} className="leading-tight">• {w}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Opportunities */}
                    <div className="p-2.5 rounded-lg border border-blue-300/60 bg-blue-500/5">
                      <p className="font-bold text-blue-800 dark:text-blue-300 text-[10px] uppercase">
                        {t.opportunities}
                      </p>
                      <ul className="mt-1 space-y-1 text-muted-foreground text-[10px]">
                        {data.swot.opportunities.slice(0, 2).map((o, idx) => (
                          <li key={idx} className="leading-tight">• {o}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Threats */}
                    <div className="p-2.5 rounded-lg border border-rose-300/60 bg-rose-500/5">
                      <p className="font-bold text-rose-800 dark:text-rose-300 text-[10px] uppercase">
                        {t.threats}
                      </p>
                      <ul className="mt-1 space-y-1 text-muted-foreground text-[10px]">
                        {data.swot.threats.slice(0, 2).map((th, idx) => (
                          <li key={idx} className="leading-tight">• {th}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Benchmark OPEX Breakdown */}
              {data?.groundedFacts?.benchmarkOpex && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-[11px] font-bold font-sora text-foreground uppercase tracking-wider">
                    {isTe ? 'సగటు ఖర్చుల విభజన' : 'District Benchmark OPEX'}
                  </p>
                  <div className="space-y-2">
                    {data.groundedFacts.benchmarkOpex.map((cost, idx) => (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground truncate">{cost.item}</span>
                          <span className="font-bold text-foreground">{cost.percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${cost.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 1 INTEGRATED SECTIONS: Structured Feasibility, Checklist, Scenario Simulator, Multi-Year Projections */}
      <div className="flex flex-col gap-6 pt-4">
        {/* 1. Structured Feasibility Matrix */}
        <FeasibilityScoreCard />

        {/* 2. Contextual Missing Information Checklist */}
        <MissingInformationCard />

        {/* 3. Interactive Scenario Simulator & Risk Recalculation */}
        <ScenarioSimulatorCard />

        {/* 4. 5-Year Multi-Year Financial Projections */}
        <MultiYearProjectionTable />
      </div>

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        advisorType="business"
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        language={language}
      />
    </div>
  );
}

export default BusinessAdvisorScreen;
