import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  PenSquare,
  Send,
  Clock,
  Save,
  CheckSquare,
  Square,
  Globe,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Share2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { postService } from '../../services/postService';
import { socialService } from '../../services/socialService';
import { MediaUploader } from '../../components/MediaUploader';

export const CreatePostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['facebook']);
  const [publishMode, setPublishMode] = useState('now'); // 'now' or 'schedule'
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [media, setMedia] = useState([]);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Fetch connected accounts to indicate which platforms are ready
  const { data: accountsData } = useQuery({
    queryKey: ['socialAccounts'],
    queryFn: socialService.getAccounts
  });

  const connectedPlatforms = (accountsData?.data?.accounts || [])
    .filter((a) => a.status === 'connected')
    .map((a) => a.platform);

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const platformsList = [
    { id: 'facebook', name: 'Facebook', color: 'border-blue-500/40 text-blue-400 bg-blue-500/10' },
    { id: 'instagram', name: 'Instagram', color: 'border-pink-500/40 text-pink-400 bg-pink-500/10' },
    { id: 'linkedin', name: 'LinkedIn', color: 'border-sky-500/40 text-sky-400 bg-sky-500/10' }
  ];

  const publishMutation = useMutation({
    mutationFn: async ({ postData, shouldPublishNow }) => {
      // Step 1: Create post
      const createRes = await postService.createPost(postData);
      const newPost = createRes.data?.post;

      // Step 2: If Publish Now, execute immediate multi-account publishing
      if (shouldPublishNow && newPost?._id) {
        const pubRes = await postService.publishPost(newPost._id);
        return pubRes;
      }
      return createRes;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setSuccessBanner(data.message || 'Post saved successfully!');
      setTimeout(() => {
        navigate('/posts');
      }, 1200);
    },
    onError: (err) => {
      setErrorBanner(err.message || 'Failed to process post');
    }
  });

  const handleSave = (statusToSet = 'draft') => {
    setErrorBanner('');
    setSuccessBanner('');

    let scheduledAtUTC = null;
    const shouldPublishNow = publishMode === 'now' && statusToSet !== 'draft';

    if (publishMode === 'schedule' && statusToSet !== 'draft') {
      if (!scheduledDate || !scheduledTime) {
        setErrorBanner('Please specify both a date and time for scheduled posting');
        return;
      }
      const localDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (isNaN(localDateTime.getTime())) {
        setErrorBanner('Invalid scheduled date or time');
        return;
      }
      if (localDateTime <= new Date()) {
        setErrorBanner('Scheduled time must be in the future');
        return;
      }
      scheduledAtUTC = localDateTime.toISOString();
    }

    if (statusToSet !== 'draft') {
      if (!content.trim() && media.length === 0) {
        setErrorBanner('Please enter text content or attach media');
        return;
      }
      if (selectedPlatforms.length === 0) {
        setErrorBanner('Please select at least one social media platform');
        return;
      }
    }

    publishMutation.mutate({
      postData: {
        content: content.trim(),
        media,
        platforms: selectedPlatforms,
        status: statusToSet === 'draft' ? 'draft' : publishMode === 'schedule' ? 'scheduled' : 'draft',
        scheduledAt: scheduledAtUTC,
        timezone: user?.timezone || 'UTC'
      },
      shouldPublishNow
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create Post</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compose your post, select multiple social media platforms, and publish immediately or schedule.
        </p>
      </div>

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Post Content */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Post Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            placeholder="Write your post message here..."
            className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition resize-y"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
            <span>Supports hashtags, URLs, and multi-line captions</span>
            <span>{content.length} / 5000 characters</span>
          </div>
        </div>

        {/* Media Uploader */}
        <MediaUploader mediaList={media} onMediaChange={setMedia} />

        {/* Target Platforms */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
            Publish To ({selectedPlatforms.length} selected):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {platformsList.map((p) => {
              const isSelected = selectedPlatforms.includes(p.id);
              const isConnected = connectedPlatforms.includes(p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-medium transition ${
                    isSelected
                      ? `${p.color} border-current`
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span>{p.name}</span>
                  </div>

                  {!isConnected && (
                    <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Not Connected
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Publishing Mode */}
        <div className="pt-4 border-t border-slate-800/80">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
            Publishing Schedule:
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="publishMode"
                value="now"
                checked={publishMode === 'now'}
                onChange={() => setPublishMode('now')}
                className="text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-800"
              />
              <span>Publish Immediately</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-200">
              <input
                type="radio"
                name="publishMode"
                value="schedule"
                checked={publishMode === 'schedule'}
                onChange={() => setPublishMode('schedule')}
                className="text-emerald-500 focus:ring-emerald-500 bg-slate-950 border-slate-800"
              />
              <span>Schedule for Later</span>
            </label>
          </div>

          {publishMode === 'schedule' && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Time</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-400">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Timezone: {user?.timezone || 'UTC'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={publishMutation.isPending}
            onClick={() => handleSave('draft')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-sm font-medium transition disabled:opacity-50"
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-slate-400" />
            )}
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            disabled={publishMutation.isPending}
            onClick={() => handleSave(publishMode === 'schedule' ? 'scheduled' : 'post')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-lg shadow-emerald-950 disabled:opacity-50"
          >
            {publishMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : publishMode === 'schedule' ? (
              <Clock className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{publishMode === 'schedule' ? 'Schedule Post' : 'Publish Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
