import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Share2,
  CalendarClock,
  Ban,
  Eye,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { postService } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);
  const [rescheduleModalPost, setRescheduleModalPost] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Fetch all scheduled posts
  const { data, isLoading } = useQuery({
    queryKey: ['scheduledPosts'],
    queryFn: () => postService.getPosts({ status: 'scheduled', limit: 100 })
  });

  const scheduledPosts = data?.data?.posts || [];

  const cancelScheduleMutation = useMutation({
    mutationFn: postService.cancelPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (selectedPost) setSelectedPost(null);
    }
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt, timezone }) =>
      postService.reschedulePost(id, { scheduledAt, timezone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
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

  // Calendar Grid Generation
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, daysInPrevMonth - i)
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i)
    });
  }

  // Next month leading days to complete grid
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i)
    });
  }

  const isToday = (date) => {
    const now = new Date();
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const getPostsForDate = (date) => {
    return scheduledPosts.filter((post) => {
      if (!post.scheduledAt) return false;
      const postDate = new Date(post.scheduledAt);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visual scheduler grid of scheduled social posts in timezone: <span className="text-emerald-400 font-medium">{user?.timezone || 'UTC'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm">
            <button
              onClick={prevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-semibold text-white">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={today}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-xl transition"
          >
            Today
          </button>

          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-950"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </Link>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/80">
          {calendarDays.map((item, idx) => {
            const todayCell = isToday(item.date);
            const postsForDay = getPostsForDate(item.date);

            return (
              <div
                key={idx}
                className={`min-h-[110px] sm:min-h-[130px] p-2 transition flex flex-col justify-between ${
                  item.isCurrentMonth
                    ? 'bg-slate-900/70 hover:bg-slate-800/40'
                    : 'bg-slate-950/40 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      todayCell
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : item.isCurrentMonth
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.day}
                  </span>
                  {postsForDay.length > 0 && (
                    <span className="text-[10px] text-amber-400 font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      {postsForDay.length}
                    </span>
                  )}
                </div>

                {/* Scheduled Posts Pills */}
                <div className="space-y-1.5 my-1 overflow-y-auto max-h-[85px] pr-0.5">
                  {postsForDay.map((post) => {
                    const postTime = new Date(post.scheduledAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        className="group p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500/60 cursor-pointer transition text-left"
                      >
                        <div className="flex items-center justify-between text-[10px] text-amber-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {postTime}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase">
                            {post.platforms?.join(', ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 truncate mt-0.5 font-normal">
                          {post.content || 'Media post'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

      {/* Post Details & Action Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Scheduled Post</h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Scheduled
                </span>
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

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Scheduled Time
                </label>
                <p className="text-slate-200 mt-1">
                  {new Date(selectedPost.scheduledAt).toLocaleString()} ({selectedPost.timezone})
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Target Platforms
                </label>
                <div className="flex gap-2">
                  {selectedPost.platforms?.map((plat) => (
                    <span
                      key={plat}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold uppercase"
                    >
                      {plat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRescheduleModalPost(selectedPost);
                    setRescheduleError('');
                  }}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Reschedule</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel this scheduled post?')) {
                      cancelScheduleMutation.mutate(selectedPost.id);
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Schedule</span>
                </button>
              </div>

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
