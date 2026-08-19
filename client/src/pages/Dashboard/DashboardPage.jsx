import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Share2,
  PenSquare,
  ArrowUpRight,
  CalendarDays,
  Calendar,
  Loader2,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';

export const DashboardPage = () => {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 10000 // Auto refresh dashboard stats every 10 seconds
  });

  const statsData = data?.data?.stats || {
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    failedPosts: 0,
    postsThisMonth: 0,
    connectedAccounts: 0
  };

  const upcomingPosts = data?.data?.upcomingPosts || [];
  const recentActivity = data?.data?.recentActivity || [];

  const stats = [
    {
      label: 'Total Posts',
      value: statsData.totalPosts,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      label: 'Scheduled',
      value: statsData.scheduledPosts,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10'
    },
    {
      label: 'Published',
      value: statsData.publishedPosts,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10'
    },
    {
      label: 'Failed / Partial',
      value: statsData.failedPosts,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10'
    },
    {
      label: 'Connected Accounts',
      value: statsData.connectedAccounts,
      icon: Share2,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    }
  ];

  const getStatusPill = (status) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Published
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Clock className="w-3 h-3" /> Scheduled
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      case 'partially_published':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Creator'}!
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            <span>{statsData.postsThisMonth} posts composed this month.</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" /> Active Timezone: {user?.timezone || 'UTC'}
            </span>
          </p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-emerald-950 shrink-0"
        >
          <PenSquare className="w-4 h-4" />
          <span>Create Post</span>
        </Link>
      </div>

      {/* Statistics Grid */}
      {isLoading ? (
        <div className="p-12 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </span>
                  <div className={`p-2 rounded-xl border border-slate-800/80 ${item.bg} ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white tracking-tight">{item.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Grid: Upcoming & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Scheduled Posts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Upcoming Scheduled Posts
              </h2>
              <Link
                to="/calendar"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                Calendar View <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingPosts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 space-y-2">
                <div className="inline-flex p-3 rounded-full bg-slate-800/60 text-slate-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <p className="text-sm">No upcoming scheduled posts</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id || post._id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(post.scheduledAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="text-[10px] uppercase text-slate-400">
                        {post.platforms?.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-1">
                      {post.content || 'Media post'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Recent Post Activity
              </h2>
              <Link
                to="/posts"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                All Posts <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-10 text-center text-slate-500 space-y-2">
                <div className="inline-flex p-3 rounded-full bg-slate-800/60 text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivity.map((post) => (
                  <div
                    key={post.id || post._id}
                    className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusPill(post.status)}
                        <span className="text-[10px] text-slate-500">
                          {new Date(post.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 truncate">
                        {post.content || <span className="italic text-slate-500">Media attachment</span>}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-400 uppercase shrink-0">
                      {post.platforms?.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
