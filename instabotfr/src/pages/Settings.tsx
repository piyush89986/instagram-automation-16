import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Fetch already connected accounts
const fetchConnectedAccounts = async () => {
  const { data } = await api.get('/instagram/accounts');
  return data.data?.accounts || [];
};

// Fetch Instagram/Meta config (appId, hasServerToken)
const fetchInstagramConfig = async () => {
  try {
    const { data } = await api.get('/instagram/config');
    return data.data || { appId: '', hasServerToken: false };
  } catch {
    return { appId: '', hasServerToken: false };
  }
};

// Connect Instagram via Access Token (from FB SDK or manual input)
const connectInstagram = async (accessToken: string) => {
  const { data } = await api.post('/instagram/oauth/callback', { accessToken });
  return data;
};

// Connect Instagram using the server-side META_ACCESS_TOKEN
const connectWithServerToken = async () => {
  const { data } = await api.post('/instagram/connect-server-token');
  return data;
};

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: any;
  }
}

export default function Settings() {
  const [fbSdkReady, setFbSdkReady] = useState(false);
  const [status, setStatus] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery<any[]>({
    queryKey: ['instagram-accounts'],
    queryFn: fetchConnectedAccounts,
  });

  const { data: metaConfig } = useQuery({
    queryKey: ['instagram-config'],
    queryFn: fetchInstagramConfig,
  });

  const appId = (import.meta.env.VITE_META_APP_ID || metaConfig?.appId || '').trim();
  const hasServerToken = metaConfig?.hasServerToken || false;

  // Pre-load Facebook SDK as soon as appId is available
  useEffect(() => {
    if (!appId || window.FB) {
      if (window.FB) setFbSdkReady(true);
      return;
    }

    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v19.0',
        });
        setFbSdkReady(true);
      } catch (e: any) {
        console.error('FB.init error:', e);
      }
    };

    // Only inject script once
    const existingScript = document.getElementById('facebook-jssdk');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn('Facebook SDK script failed to load (possibly blocked by an ad-blocker).');
      };
      document.body.appendChild(script);
    }
  }, [appId]);

  const connectMutation = useMutation({
    mutationFn: connectInstagram,
    onSuccess: (data) => {
      const savedAccounts = data.data?.accounts || [];
      if (savedAccounts.length > 0) {
        setStatus(`✅ Connected ${savedAccounts.length} Instagram account(s) successfully!`);
        setManualToken('');
        setShowManualInput(false);
      } else {
        setStatus('⚠️ Facebook connected, but no linked Instagram Business/Creator accounts were found.');
      }
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
    },
    onError: (err: any) => {
      setStatus('❌ Connection failed: ' + (err.response?.data?.message || err.message));
    },
  });

  const serverTokenMutation = useMutation({
    mutationFn: connectWithServerToken,
    onSuccess: (data) => {
      const savedAccounts = data.data?.accounts || [];
      if (savedAccounts.length > 0) {
        setStatus(`✅ Successfully connected ${savedAccounts.length} account(s) using server token!`);
      } else {
        setStatus('⚠️ Server token validated, but no linked Instagram accounts were found.');
      }
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] });
    },
    onError: (err: any) => {
      setStatus('❌ Server token error: ' + (err.response?.data?.message || err.message));
    },
  });

  const handleFacebookLoginClick = () => {
    setStatus('');

    if (!appId) {
      setStatus('❌ Meta App ID is missing. Please set VITE_META_APP_ID in Vercel or META_APP_ID on Render.');
      return;
    }

    if (!window.FB) {
      // SDK might still be loading or blocked by ad-blocker
      setStatus('⏳ Initializing Facebook SDK... If nothing opens, please disable your ad-blocker or use the Manual Token option below.');
      
      // Attempt manual script injection if not loaded
      window.fbAsyncInit = function () {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: true,
          version: 'v19.0',
        });
        setFbSdkReady(true);
        triggerLogin();
      };
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      document.body.appendChild(script);
      return;
    }

    triggerLogin();
  };

  const triggerLogin = () => {
    try {
      window.FB.login(
        (response: any) => {
          if (response.authResponse?.accessToken) {
            setStatus('⏳ Connecting your Instagram account to workspace...');
            connectMutation.mutate(response.authResponse.accessToken);
          } else {
            setStatus('❌ Facebook login popup was closed or cancelled.');
          }
        },
        {
          scope: 'instagram_basic,instagram_manage_messages,instagram_manage_comments,instagram_content_publish,pages_messaging,pages_read_engagement,pages_show_list,business_management',
          auth_type: 'rerequest',
        }
      );
    } catch (err: any) {
      setStatus('❌ Error launching Facebook Login: ' + err.message);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setStatus('⏳ Connecting using provided Access Token...');
    connectMutation.mutate(manualToken.trim());
  };

  const isBusy = connectMutation.isPending || serverTokenMutation.isPending;

  return (
    <div className="animate-fade-in space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your connected Instagram accounts and workspace settings.
        </p>
      </div>

      {/* Connect Instagram Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Connect Instagram Account
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Connect your Instagram Professional (Business or Creator) account to enable AI automation.
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            IG
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            onClick={handleFacebookLoginClick}
            disabled={isBusy}
            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {connectMutation.isPending ? 'Connecting...' : '🔗 Connect with Facebook'}
          </Button>

          {hasServerToken && (
            <Button
              variant="outline"
              onClick={() => {
                setStatus('⏳ Syncing accounts using server META_ACCESS_TOKEN...');
                serverTokenMutation.mutate();
              }}
              disabled={isBusy}
              className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
            >
              {serverTokenMutation.isPending ? 'Syncing...' : '⚡ Sync via Server Token'}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showManualInput ? 'Hide Manual Token' : 'Or enter Access Token manually'}
          </Button>
        </div>

        {/* Manual Token Form */}
        {showManualInput && (
          <form onSubmit={handleManualTokenSubmit} className="pt-3 border-t border-border space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Paste your Meta User or Page Access Token:
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="EAAB..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                disabled={isBusy}
                className="font-mono text-xs"
              />
              <Button type="submit" disabled={isBusy || !manualToken.trim()} className="shrink-0">
                Connect Token
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Useful if your browser blocks Facebook popups or if using a Meta System User / Graph API Explorer token.
            </p>
          </form>
        )}

        {/* Status Messages */}
        {status && (
          <div className={`p-3 rounded-md text-sm border ${
            status.startsWith('✅') 
              ? 'bg-green-500/10 text-green-400 border-green-500/30' 
              : status.startsWith('⏳') 
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}>
            {status}
          </div>
        )}
      </div>

      {/* Connected Accounts List */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Connected Accounts
        </h2>

        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading accounts...</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-4xl mb-3">📷</p>
            {status.includes('⚠️') && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg text-sm mb-6 max-w-md mx-auto text-left">
                <p className="font-bold mb-2">Requirements for connecting:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Your Instagram account must be a <strong>Professional Account</strong> (Business or Creator).</li>
                  <li>Your Instagram account must be <strong>connected to a Facebook Page</strong> in your Facebook / Instagram settings.</li>
                  <li>Click "Connect with Facebook" or "Sync via Server Token" above!</li>
                </ol>
              </div>
            )}
            <p>No Instagram accounts connected yet.</p>
            <p className="text-sm mt-1">Connect your account above to enable AI automated replies & publishing.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc: any) => (
              <div
                key={acc._id}
                className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border"
              >
                {acc.profilePicUrl ? (
                  <img
                    src={acc.profilePicUrl}
                    alt={acc.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    {acc.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">@{acc.username}</p>
                  <p className="text-xs text-muted-foreground">ID: {acc.instagramAccountId}</p>
                </div>
                <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                  ● Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
