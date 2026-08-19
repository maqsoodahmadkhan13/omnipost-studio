import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Sparkles
} from 'lucide-react';
import { socialService } from '../../services/socialService';

export const AccountsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  useEffect(() => {
    const connectedPlatform = searchParams.get('connected');
    const errorParam = searchParams.get('error');

    if (connectedPlatform) {
      setFeedbackMessage({
        type: 'success',
        text: `Successfully connected your ${connectedPlatform} account!`
      });
      searchParams.delete('connected');
      setSearchParams(searchParams);
    } else if (errorParam) {
      setFeedbackMessage({
        type: 'error',
        text: `Connection failed: ${errorParam}`
      });
      searchParams.delete('error');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Fetch user's connected social accounts
  const { data, isLoading } = useQuery({
    queryKey: ['socialAccounts'],
    queryFn: socialService.getAccounts
  });

  const connectedAccounts = data?.data?.accounts || [];

  const disconnectMutation = useMutation({
    mutationFn: socialService.disconnectAccount,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts'] });
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Account disconnected successfully'
      });
    },
    onError: (err) => {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to disconnect account'
      });
    }
  });

  const mockConnectMutation = useMutation({
    mutationFn: socialService.connectMock,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['socialAccounts'] });
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Connected test account'
      });
    },
    onError: (err) => {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to connect test account'
      });
    }
  });

  const handleConnect = async (platformId) => {
    try {
      const res = await socialService.getConnectUrl(platformId);
      if (res.data?.authUrl) {
        window.location.href = res.data.authUrl;
      }
    } catch (err) {
      // If live OAuth not configured, fallback to mock connect
      mockConnectMutation.mutate(platformId);
    }
  };

  const platforms = [
    {
      id: 'facebook',
      name: 'Facebook',
      description: 'Publish posts to Facebook Pages and track engagement.',
      color: 'bg-blue-600',
      activeInPhase: true
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Publish photos and media to Instagram Professional accounts.',
      color: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600',
      activeInPhase: true
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      description: 'Share updates and text posts to LinkedIn profiles and company pages.',
      color: 'bg-sky-600',
      activeInPhase: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Connected Accounts</h1>
        <p className="text-sm text-slate-400 mt-1">
          Connect and manage your social platforms using official Meta & LinkedIn OAuth protocols.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Security Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start gap-3.5 shadow-sm">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">Zero-Leak Token Architecture</p>
          <p>
            OAuth access tokens and secrets are stored in secure backend databases and never exposed to the React frontend or client logs.
          </p>
        </div>
      </div>

      {/* Platforms Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-sm">Loading connected accounts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platforms.map((platform) => {
            const connectedAccount = connectedAccounts.find(
              (acc) => acc.platform === platform.id && acc.status === 'connected'
            );
            const isConnected = !!connectedAccount;

            return (
              <div
                key={platform.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl ${platform.color} flex items-center justify-center text-white font-bold shadow-md`}
                    >
                      {platform.name[0]}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> Disconnected
                        </>
                      )}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {platform.name}
                      {platform.id === 'facebook' && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active (Phase 6)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {platform.description}
                    </p>
                  </div>

                  {isConnected && (
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1">
                      <p className="font-medium text-white">{connectedAccount.accountName}</p>
                      <p className="text-slate-400">
                        {connectedAccount.username ? `@${connectedAccount.username}` : 'ID: ' + connectedAccount.externalAccountId}
                      </p>
                      {connectedAccount.metadata?.isMock && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                          <Sparkles className="w-3 h-3" /> Sandbox / Dev Channel
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {isConnected ? (
                    <button
                      type="button"
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate(connectedAccount.id || connectedAccount._id)}
                      className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(platform.id)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Connect {platform.name}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
