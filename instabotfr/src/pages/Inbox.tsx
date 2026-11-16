import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConversations, fetchMessages, toggleHumanTakeover, sendManualMessage } from '../services/inbox.service';
import { useSocket } from '../contexts/SocketContext';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Bot, User as UserIcon, Send, MessageSquare, Loader2, Sparkles, X } from 'lucide-react';

export default function Inbox() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateText, setSimulateText] = useState('Hi, what are your shop hours and products?');
  const [simulating, setSimulating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Fetch Conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchConversations('OPEN')
  });

  // Fetch Active Messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => fetchMessages(activeConversationId!),
    enabled: !!activeConversationId
  });

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0]._id);
    }
  }, [conversations, activeConversationId]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  // Handle Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      const convId = payload?.conversation?._id || payload?.message?.conversationId;
      if (convId === activeConversationId || !activeConversationId) {
        if (!activeConversationId && convId) {
          setActiveConversationId(convId);
        }
        queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      }
    };

    const handleConvUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConvUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConvUpdated);
    };
  }, [socket, activeConversationId, queryClient]);

  const activeConv = conversations.find((c: any) => c._id === activeConversationId);

  const toggleTakeoverMutation = useMutation({
    mutationFn: (takeover: boolean) => toggleHumanTakeover(activeConversationId!, takeover),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const sendReplyMutation = useMutation({
    mutationFn: (text: string) => sendManualMessage(activeConversationId!, text),
    onSuccess: (newMsg) => {
      setReplyText('');
      queryClient.setQueryData(['messages', activeConversationId], (old: any) => {
        return old ? [...old, newMsg] : [newMsg];
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !activeConversationId || sendReplyMutation.isPending) return;

    // If human takeover is not already enabled, enable it automatically when an agent types
    if (!activeConv?.humanTakeover) {
      toggleTakeoverMutation.mutate(true);
    }

    sendReplyMutation.mutate(text);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulateText.trim() || simulating) return;
    setSimulating(true);
    try {
      await api.post('/instagram/debug/simulate', { text: simulateText.trim() });
      setShowSimulateModal(false);
      // Wait a moment for AI generation and refresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }, 1500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to simulate webhook event.');
    } finally {
      setSimulating(false);
    }
  };

  const filteredConversations = conversations.filter((c: any) => {
    const username = (c.contactId?.username || '').toLowerCase();
    const name = (c.contactId?.name || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return !q || username.includes(q) || name.includes(q);
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border border-border rounded-xl overflow-hidden shadow-sm animate-fade-in relative">
      
      {/* Simulation Modal */}
      {showSimulateModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-primary" /> Simulate Incoming Instagram DM
              </h3>
              <button onClick={() => setShowSimulateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send a test message as if an Instagram follower sent it. Your bot will process it, run AI generation, and reply here in real time.
            </p>
            <form onSubmit={handleSimulate} className="space-y-4">
              <Input
                value={simulateText}
                onChange={(e) => setSimulateText(e.target.value)}
                placeholder="Type test DM..."
                required
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowSimulateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={simulating || !simulateText.trim()}>
                  {simulating ? <><Loader2 className="animate-spin mr-2" size={16} /> Processing...</> : 'Send Test DM'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Left Sidebar: Conversation List */}
      <div className="w-80 border-r border-border flex flex-col bg-muted/10">
        <div className="p-3 border-b border-border space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background h-9" 
              placeholder="Search leads..." 
            />
          </div>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="w-full text-xs font-medium py-1.5 px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
          >
            <Sparkles size={14} /> Test Bot / Simulate DM
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
              <Loader2 className="animate-spin mr-2" size={16} /> Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-3">
              <p>No conversations found yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowSimulateModal(true)} className="gap-1 text-xs">
                <Sparkles size={12} /> Test Bot with Simulated DM
              </Button>
            </div>
          ) : (
            filteredConversations.map((conv: any) => (
              <div 
                key={conv._id}
                onClick={() => setActiveConversationId(conv._id)}
                className={`p-4 border-b border-border cursor-pointer transition-colors ${activeConversationId === conv._id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-foreground">{conv.contactId?.username || conv.contactId?.name || 'Instagram User'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {conv.humanTakeover ? (
                    <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-medium">AGENT</span>
                  ) : (
                    <span className="bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium">AI BOT</span>
                  )}
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {conv.humanTakeover ? 'Human takeover active' : 'AI automated responses'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Area: Chat Window */}
      <div className="flex-1 flex flex-col bg-background relative">
        {activeConversationId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <UserIcon size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{activeConv?.contactId?.username || activeConv?.contactId?.name || 'Instagram Lead'}</h3>
                  <p className="text-xs text-muted-foreground">Instagram Lead {activeConv?.contactId?.instagramUserId ? `(${activeConv.contactId.instagramUserId})` : ''}</p>
                </div>
              </div>
              
              <Button 
                variant={activeConv?.humanTakeover ? 'outline' : 'default'} 
                onClick={() => toggleTakeoverMutation.mutate(!activeConv?.humanTakeover)}
                className="gap-2"
                disabled={toggleTakeoverMutation.isPending}
              >
                {activeConv?.humanTakeover ? (
                  <>Resume AI Bot</>
                ) : (
                  <><Bot size={16} /> Pause AI & Take Over</>
                )}
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <Loader2 className="animate-spin mr-2" size={16} /> Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No messages yet in this conversation.
                </div>
              ) : (
                messages.map((msg: any) => {
                  const isUser = msg.source === 'INSTAGRAM';
                  return (
                    <div key={msg._id} className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        isUser 
                          ? 'bg-secondary text-secondary-foreground rounded-tl-sm' 
                          : 'bg-primary text-primary-foreground rounded-tr-sm'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        <div className={`text-[10px] mt-1 opacity-70 ${isUser ? 'text-left' : 'text-right'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {!isUser && ` • ${
                            msg.source === 'SYSTEM_AI' 
                              ? 'AI Assistant' 
                              : msg.source === 'SYSTEM_AGENT' 
                              ? 'Agent' 
                              : 'Automated'
                          }`}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-border bg-card">
              <form onSubmit={handleSendReply} className="flex gap-2">
                <Input 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    activeConv?.humanTakeover 
                      ? "Type your message..." 
                      : "Type a message to reply and take over from AI..."
                  } 
                  disabled={sendReplyMutation.isPending}
                  className="flex-1 rounded-full px-6"
                />
                <Button 
                  type="submit" 
                  disabled={!replyText.trim() || sendReplyMutation.isPending} 
                  size="icon" 
                  className="rounded-full shrink-0"
                >
                  {sendReplyMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Select a conversation to view thread</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Incoming DMs from your connected Instagram account will appear here in real-time.
            </p>
            <Button size="sm" variant="outline" onClick={() => setShowSimulateModal(true)} className="gap-1 text-xs mt-4">
              <Sparkles size={12} /> Test Bot with Simulated DM
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
