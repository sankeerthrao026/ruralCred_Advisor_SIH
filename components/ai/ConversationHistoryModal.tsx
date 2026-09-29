'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ConversationMetadata,
  fetchConversations,
  deleteConversation,
  AdvisorType,
} from '@/lib/firebase/conversations';
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  X,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConversationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  advisorType: AdvisorType;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => Promise<void>;
  onNewConversation: () => void;
  language: string;
}

export function ConversationHistoryModal({
  isOpen,
  onClose,
  advisorType,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  language,
}: ConversationHistoryModalProps) {
  const { user } = useAuth();
  const userId = user?.id || 'demo-user';
  const isTe = language === 'te';

  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadList = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await fetchConversations(userId, advisorType);
      setConversations(list);
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadList();
    }
  }, [isOpen, userId, advisorType]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      isTe
        ? 'ఈ సంభాషణను తొలగించాలనుకుంటున్నారా?'
        : 'Are you sure you want to delete this conversation?'
    );
    if (!confirmed) return;

    setDeletingId(convId);
    try {
      await deleteConversation(userId, convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        onNewConversation();
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelect = async (convId: string) => {
    await onSelectConversation(convId);
    onClose();
  };

  const handleNew = () => {
    onNewConversation();
    onClose();
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(isTe ? 'te-IN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 sm:p-6 shadow-xl flex flex-col max-h-[85vh] transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <h3 className="font-bold font-sora text-sm text-foreground">
                {isTe
                  ? `${advisorType === 'business' ? 'వ్యాపార' : 'ఫైనాన్స్'} సలహాదారు సంభాషణలు`
                  : `${advisorType === 'business' ? 'Business' : 'Finance'} Advisor History`}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isTe
                  ? 'మీ మునుపటి సంభాషణలు మరియు సలహాలు'
                  : 'Your persistent, private conversation sessions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Action: New Conversation */}
        <div className="pt-3 pb-2">
          <Button
            type="button"
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>{isTe ? 'కొత్త సంభాషణ ప్రారంభించండి' : 'Start New Conversation'}</span>
          </Button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">{isTe ? 'సంభాషణలు లోడ్ అవుతున్నాయి...' : 'Loading history...'}</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4">
              <Clock className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-semibold text-foreground">
                {isTe ? 'మునుపటి సంభాషణలు లేవు' : 'No previous conversations'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isTe
                  ? 'మీరు ప్రశ్న అడిగినప్పుడు సంభాషణ ఇక్కడ సేవ్ చేయబడుతుంది.'
                  : 'Start a discussion above and it will be saved here automatically.'}
              </p>
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`group rounded-xl border p-3 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? 'border-primary bg-primary/5 text-foreground shadow-xs'
                      : 'border-border bg-card/60 hover:bg-muted/50 text-foreground'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {c.title || (isTe ? 'సంభాషణ' : 'Conversation')}
                      </p>
                      {isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold shrink-0">
                          {isTe ? 'ప్రస్తుత' : 'Active'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{formatTimestamp(c.updatedAt || c.createdAt)}</span>
                      <span>•</span>
                      <span>{c.messageCount || 0} {isTe ? 'సందేశాలు' : 'messages'}</span>
                      {c.language && (
                        <>
                          <span>•</span>
                          <span className="uppercase font-mono">{c.language}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, c.id)}
                      disabled={deletingId === c.id}
                      className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                      title={isTe ? 'తొలగించు' : 'Delete'}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-3 mt-3 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            {isTe ? 'మూసివేయి' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
