import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPost } from '../services/publishing.service';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Calendar, Image as ImageIcon, Video, Send, CheckCircle2, Clock, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Publishing() {
  const [postType, setPostType] = useState<'IMAGE' | 'REEL' | 'STORY'>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const queryClient = useQueryClient();

  // Fetch Connected Instagram Accounts
  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/instagram/accounts');
      return data.data.accounts || [];
    }
  });

  // Fetch Published / Scheduled Posts
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['publishing-posts'],
    queryFn: async () => {
      const { data } = await api.get('/publishing/posts');
      return data.data.posts || [];
    }
  });

  // Default to first connected account
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0]._id);
    }
  }, [accounts, selectedAccountId]);

  const publishMutation = useMutation({
    mutationFn: () => {
      const accountToUse = selectedAccountId || accounts[0]?._id;
      if (!accountToUse) {
        throw new Error('Please connect an Instagram account in Settings first.');
      }
      return createPost({
        instagramAccountId: accountToUse,
        postType,
        mediaUrls: [mediaUrl.trim()],
        caption: caption.trim(),
        scheduledTime: scheduledTime ? new Date(scheduledTime).toISOString() : undefined,
        publishNow: !scheduledTime
      });
    },
    onSuccess: (data) => {
      alert(scheduledTime ? 'Post Scheduled Successfully!' : 'Post Published Successfully to Instagram!');
      setMediaUrl('');
      setCaption('');
      setScheduledTime('');
      queryClient.invalidateQueries({ queryKey: ['publishing-posts'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      alert(`Publishing Error: ${msg}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) return alert('Media URL is required');
    publishMutation.mutate();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Content Publishing</h1>
        <p className="text-muted-foreground mt-2">Publish and schedule Posts, Reels, and Stories directly to your connected Instagram account.</p>
      </div>

      {/* Account Status Banner */}
      {!loadingAccounts && accounts.length === 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-amber-600 dark:text-amber-400">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">No Instagram account connected yet.</span>
          </div>
          <Link to="/settings" className="text-sm underline font-semibold flex items-center gap-1 hover:opacity-80">
            Connect in Settings &rarr;
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Composer */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Send size={20}/> Create & Publish Post
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Instagram Account</label>
              {loadingAccounts ? (
                <div className="text-xs text-muted-foreground">Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <div className="text-xs text-muted-foreground">No accounts available</div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  {accounts.map((acc: any) => (
                    <option key={acc._id} value={acc._id}>
                      @{acc.username} (Page: {acc.metaAccountId})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Post Type Selector */}
            <div className="flex gap-4">
              <Button 
                type="button"
                variant={postType === 'IMAGE' ? 'default' : 'outline'}
                onClick={() => setPostType('IMAGE')}
                className="flex-1 gap-2"
              >
                <ImageIcon size={16}/> Post
              </Button>
              <Button 
                type="button"
                variant={postType === 'REEL' ? 'default' : 'outline'}
                onClick={() => setPostType('REEL')}
                className="flex-1 gap-2"
              >
                <Video size={16}/> Reel
              </Button>
              <Button 
                type="button"
                variant={postType === 'STORY' ? 'default' : 'outline'}
                onClick={() => setPostType('STORY')}
                className="flex-1 gap-2"
              >
                <Calendar size={16}/> Story
              </Button>
            </div>

            {/* Media URL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Public Media URL <span className="text-xs text-muted-foreground">({postType === 'IMAGE' ? 'JPEG/PNG image' : 'MP4 video'})</span>
              </label>
              <Input 
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Note: Instagram requires media URLs to be publicly accessible over HTTPS.
              </p>
            </div>

            {/* Caption */}
            {postType !== 'STORY' && (
              <div>
                <label className="block text-sm font-medium mb-2">Caption</label>
                <textarea 
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] text-foreground"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write an engaging caption with hashtags..."
                />
              </div>
            )}

            {/* Schedule Time */}
            <div>
              <label className="block text-sm font-medium mb-2">Schedule Time (Leave blank to publish now)</label>
              <Input 
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={publishMutation.isPending || accounts.length === 0}
            >
              {publishMutation.isPending ? (
                <><Loader2 className="animate-spin mr-2" size={16} /> Publishing to Instagram...</>
              ) : (
                scheduledTime ? 'Schedule Post' : 'Publish to Instagram Now'
              )}
            </Button>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-6 w-full">Preview</h2>
          <div className="w-full max-w-[280px] bg-background border border-border rounded-3xl overflow-hidden shadow-sm aspect-[9/16] relative flex flex-col">
            {mediaUrl ? (
              postType === 'REEL' || mediaUrl.endsWith('.mp4') ? (
                <video src={mediaUrl} className="w-full h-full object-cover" controls={false} autoPlay loop muted />
              ) : (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://placehold.co/600x800?text=Invalid+Image+URL'; }} />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 p-4 text-center">
                <ImageIcon size={32} className="opacity-30 mb-2" />
                <span className="text-xs">Enter a valid public media URL to preview</span>
              </div>
            )}
            {postType !== 'STORY' && caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-10">
                <p className="text-white text-xs line-clamp-3 leading-relaxed">{caption}</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Published & Scheduled Posts History */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock size={20} /> Publishing History
        </h2>
        {loadingPosts ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" size={16} /> Loading post history...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No posts published or scheduled yet. Create your first post above!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post: any) => (
              <div key={post._id} className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {post.mediaUrls?.[0] ? (
                    <img 
                      src={post.mediaUrls[0]} 
                      alt="" 
                      className="w-12 h-12 rounded-lg object-cover bg-secondary shrink-0" 
                      onError={(e) => { (e.target as any).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate max-w-md">
                      {post.caption || '(No caption)'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                        {post.postType}
                      </span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {post.errorLogs?.[0] && (
                      <p className="text-[11px] text-destructive mt-1 truncate max-w-lg">
                        Error: {post.errorLogs[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {post.status === 'PUBLISHED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 size={12} /> Published
                    </span>
                  ) : post.status === 'SCHEDULED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                      <Clock size={12} /> Scheduled
                    </span>
                  ) : post.status === 'FAILED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                      <AlertCircle size={12} /> Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {post.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
