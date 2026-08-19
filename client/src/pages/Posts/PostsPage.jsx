import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Send,
  Eye,
  Calendar,
  Share2,
  Loader2,
  X,
  CalendarClock,
  Ban,
  RotateCw
} from 'lucide-react';
import { postService } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' }
];

export const PostsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [rescheduleModalPost, setRescheduleModalPost] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['posts', activeTab, searchQuery],
    queryFn: () =>
      postService.getPosts({
        status: activeTab === 'all' ? undefined : activeTab,
        search: searchQuery || undefined
      })
  });

  const deleteMutation = useMutation({
    mutationFn: postService.deletePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (selectedPost) setSelectedPost(null);
    }
  });

  const publishMutation = useMutation({
    mutationFn: postService.publishPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (selectedPost) setSelectedPost(null);
    }
  });

  const retryMutation = useMutation({
    mutationFn: ({ id, platform }) => postService.retryPost(id, platform),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (selectedPost && data.data?.post) {
        setSelectedPost(data.data.post);
      }
    }
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: postService.cancelPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (selectedPost) setSelectedPost(null);
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt, timezone }) =>
      postService.reschedulePost(id, { scheduledAt, timezone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setRescheduleModalPost(null);
      if (selectedPost) setSelectedPost(null);
    },
    onError: (err) => {
      setRescheduleError(err.message || 'Failed to reschedule post');
    }
  });

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    setRescheduleError('');

    if (!newDate || !newTime) {
      setRescheduleError('Please enter both date and time');
      return;
    }

    const localDateTime = new Date(`${newDate}T${newTime}`);
    if (isNaN(localDateTime.getTime()) || localDateTime <= new Date()) {
      setRescheduleError('Rescheduled time must be in the future');
      return;
    }

    rescheduleMutation.mutate({
      id: rescheduleModalPost.id,
      scheduledAt: localDateTime.toISOString(),
      timezone: user?.timezone || 'UTC'
    });
  };

  const posts = data?.data?.posts || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Published
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Scheduled
          </span>
        );
      case 'partially_published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Partial
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            Cancelled
          </span>
        );
      case 'publishing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Posts</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage drafts, publish to multiple connected channels, reschedule, and track publication results.
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-emerald-950 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Post</span>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
          <p className="text-sm">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm p-12 text-center text-slate-500 space-y-3">
          <div className="inline-flex p-3 rounded-full bg-slate-800/60 text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">No posts found</p>
          <p className="text-xs text-slate-500">
            {activeTab === 'all'
              ? 'Get started by creating your first post.'
              : `No posts found with "${activeTab}" status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const hasFailedPublications = post.publications?.some((p) => p.status === 'failed');

            return (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(post.status)}
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    {post.scheduledAt && (
                      <span className="text-xs text-amber-400/90 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()} ({post.timezone})
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                    {post.content || <span className="italic text-slate-500">No text content</span>}
                  </p>

                  {post.platforms && post.platforms.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500 uppercase tracking-wider">
                        Target Platforms:
                      </span>
                      {post.platforms.map((plat) => {
                        const pub = post.publications?.find((p) => p.platform === plat);
                        const isPublished = pub?.status === 'published';
                        const isFailed = pub?.status === 'failed';

                        return (
                          <span
                            key={plat}
                            className={`px-2 py-0.5 rounded-md text-[11px] uppercase font-medium flex items-center gap-1 ${
                              isPublished
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {plat}
                            {isPublished && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            {isFailed && <XCircle className="w-3 h-3 text-rose-400" />}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {/* Retry Failed Channels Action */}
                  {hasFailedPublications && (
                    <button
                      disabled={retryMutation.isPending}
                      onClick={() => retryMutation.mutate({ id: post.id })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition disabled:opacity-50"
                      title="Retry only failed platform publications"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>Retry Failed</span>
                    </button>
                  )}

                  {/* Reschedule Button for Scheduled Posts */}
                  {post.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => {
                          setRescheduleModalPost(post);
                          setRescheduleError('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition"
                        title="Reschedule this post"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel scheduled publication for this post?')) {
                            cancelScheduleMutation.mutate(post.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
                        title="Cancel Schedule"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {post.status === 'draft' && (
                    <button
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate(post.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                      title="Publish now"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedPost(post)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this post?')) {
                        deleteMutation.mutate(post.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                Reschedule Post
              </h3>
              <button
                onClick={() => setRescheduleModalPost(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Time
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <p className="text-xs text-slate-400">
                Timezone: <span className="text-emerald-400">{user?.timezone || 'UTC'}</span>
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRescheduleModalPost(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {rescheduleMutation.isPending ? 'Updating...' : 'Save New Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Details Modal with Per-Platform Retry */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Post Details</h3>
                {getStatusBadge(selectedPost.status)}
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Post Content
                </label>
                <div className="mt-1 p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-200 whitespace-pre-wrap">
                  {selectedPost.content || <span className="italic text-slate-500">None</span>}
                </div>
              </div>

              {selectedPost.scheduledAt && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Scheduled Time
                  </label>
                  <p className="text-slate-200 mt-1">
                    {new Date(selectedPost.scheduledAt).toLocaleString()} ({selectedPost.timezone})
                  </p>
                </div>
              )}

              {/* Per-Platform Publication Breakdown with Independent Retry */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Platform Publications Tracking
                </label>
                {selectedPost.publications && selectedPost.publications.length > 0 ? (
                  <div className="space-y-2">
                    {selectedPost.publications.map((pub) => (
                      <div
                        key={pub.id || pub._id}
                        className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-semibold text-white capitalize">{pub.platform}</span>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${
                                pub.status === 'published'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : pub.status === 'failed'
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {pub.status}
                            </span>
                          </div>

                          {pub.errorMessage && (
                            <p className="text-xs text-rose-400/90 pl-6 leading-tight">
                              {pub.errorMessage}
                            </p>
                          )}
                          {pub.retryCount > 0 && (
                            <p className="text-[10px] text-slate-500 pl-6">
                              Retry Attempts: {pub.retryCount}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {pub.status === 'published' && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          )}
                          {pub.status === 'failed' && (
                            <button
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate({ id: selectedPost.id, platform: pub.platform })}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
                              title={`Retry publishing exclusively to ${pub.platform}`}
                            >
                              <RotateCw className={`w-3 h-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                              <span>Retry {pub.platform}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No publications recorded</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {selectedPost.status === 'draft' ? (
                <button
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate(selectedPost.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish All Now</span>
                </button>
              ) : selectedPost.publications?.some((p) => p.status === 'failed') ? (
                <button
                  disabled={retryMutation.isPending}
                  onClick={() => retryMutation.mutate({ id: selectedPost.id })}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Retry All Failed</span>
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
