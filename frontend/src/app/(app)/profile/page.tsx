'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { InterviewProgressPoint, InterviewStats, User } from '@/types';

type ProgressMetric =
  | 'overall'
  | 'text'
  | 'video'
  | 'communication'
  | 'confidence';

type TimeRange = '7d' | '30d' | '3m' | 'all';

const progressMetricOptions: { label: string; value: ProgressMetric }[] = [
  { label: 'Overall Score', value: 'overall' },
  { label: 'Text Interview Score', value: 'text' },
  { label: 'Video Interview Score', value: 'video' },
  { label: 'Communication Score', value: 'communication' },
  { label: 'Confidence Score', value: 'confidence' },
];

const timeRangeOptions: { label: string; value: TimeRange }[] = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'All Time', value: 'all' },
];

function getRangeStart(range: TimeRange) {
  if (range === 'all') return null;

  const date = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  date.setDate(date.getDate() - days);
  return date;
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IP'
  );
}

function formatProfileDate(value?: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<InterviewStats | null>(null);
  const [progress, setProgress] = useState<InterviewProgressPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<ProgressMetric>('overall');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    avatar_initials: 'IP',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [theme, setTheme] = useState('dark');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [progressError, setProgressError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.dataset.theme = savedTheme;

    if (!token) {
      router.replace('/auth');
      return;
    }

    async function loadUser() {
      try {
        const userRes = await api.get<User>('/api/auth/me');
        setUser(userRes.data);
        const savedInitials = localStorage.getItem(
          `profile_initials_${userRes.data.id}`
        );
        setProfileForm({
          full_name: userRes.data.full_name,
          email: userRes.data.email,
          avatar_initials: savedInitials || getInitials(userRes.data.full_name),
        });
      } catch {
        setError('Could not load your profile details.');
      }
    }

    async function loadStats() {
      try {
        const [statsRes, progressRes] = await Promise.all([
          api.get<InterviewStats>('/api/interviews/stats'),
          api.get<InterviewProgressPoint[]>('/api/interviews/progress'),
        ]);

        setStats(statsRes.data);
        setProgress(progressRes.data);
      } catch {
        setStatsError('Interview stats are not available yet.');
        setProgressError('Progress data is not available yet.');
      }
    }

    loadUser();
    loadStats();
  }, [router]);

  function updateTheme(newTheme: string) {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.dataset.theme = newTheme;
  }

  function handleProfileChange(field: keyof typeof profileForm, value: string) {
    setProfileForm((prev) => ({
      ...prev,
      [field]:
        field === 'avatar_initials'
          ? value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase()
          : value,
    }));
    setSaveMessage('');
  }

  function handlePasswordChange(field: keyof typeof passwordForm, value: string) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordMessage('');
    setPasswordError('');
  }

  function startProfileEdit() {
    setSaveMessage('');
    setPasswordMessage('');
    setPasswordError('');
    setIsEditingProfile(true);
  }

  function startPasswordChange() {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setPasswordMessage('');
    setPasswordError('');
    setIsChangingPassword(true);
  }

  function cancelProfileEdit() {
    if (!user) return;

    const savedInitials = localStorage.getItem(`profile_initials_${user.id}`);
    setProfileForm({
      full_name: user.full_name,
      email: user.email,
      avatar_initials: savedInitials || getInitials(user.full_name),
    });
    setError('');
    setSaveMessage('');
    setIsEditingProfile(false);
  }

  function cancelPasswordChange() {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
    setPasswordMessage('');
    setPasswordError('');
    setIsChangingPassword(false);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setError('');
    setSaveMessage('');

    try {
      const res = await api.put<User>('/api/auth/me', {
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
      });

      const avatarInitials =
        profileForm.avatar_initials || getInitials(profileForm.full_name);

      localStorage.setItem(`profile_initials_${res.data.id}`, avatarInitials);
      setUser(res.data);
      setProfileForm({
        full_name: res.data.full_name,
        email: res.data.email,
        avatar_initials: avatarInitials,
      });
      setIsEditingProfile(false);
      setSaveMessage('Profile updated successfully.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not save profile changes.';
      setError(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (passwordForm.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      await api.put('/api/auth/me/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setIsChangingPassword(false);
      setPasswordMessage('Password updated successfully.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not update your password.';
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  }

  const initials = profileForm.avatar_initials || getInitials(user?.full_name || '');
  const passwordLastChangedAt = null;
  const passwordStatus = passwordLastChangedAt
    ? `Last changed: ${formatProfileDate(passwordLastChangedAt)}`
    : user?.created_at
      ? `Password set: ${formatProfileDate(user.created_at)}`
      : 'Last changed: Not available';
  const themeStatus = `Current: ${theme === 'dark' ? 'Dark Mode' : 'Light Mode'}`;

  const statItems = [
    {
      label: 'Completed Interviews',
      value: stats?.total_completed ?? 0,
    },
    {
      label: 'Average Text Score',
      value:
        stats?.average_text_score !== null && stats?.average_text_score !== undefined
          ? `${stats.average_text_score}/10`
          : 'No scores yet',
    },
    {
      label: 'Average Video Score',
      value:
        stats?.average_video_score !== null && stats?.average_video_score !== undefined
          ? `${stats.average_video_score}/10`
          : 'No scores yet',
    },
    {
      label: 'Most Interviewed Role',
      value: stats?.most_interviewed_role || 'No completed roles yet',
    },
  ];

  const rangeStart = getRangeStart(selectedRange);
  const filteredProgress = progress.filter((item) => {
    const completedAt = new Date(item.completed_at);
    const matchesRange = !rangeStart || completedAt >= rangeStart;
    const matchesMetric =
      selectedMetric === 'overall' ||
      item.interview_type === selectedMetric;

    return matchesRange && matchesMetric;
  });

  const chartWidth = 720;
  const chartHeight = 260;
  const chartPadding = { top: 24, right: 24, bottom: 44, left: 48 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const chartPoints = filteredProgress.map((item, index) => {
    const x =
      filteredProgress.length === 1
        ? chartPadding.left + plotWidth / 2
        : chartPadding.left + (index / (filteredProgress.length - 1)) * plotWidth;
    const y =
      chartPadding.top + plotHeight - (Math.max(0, Math.min(item.score * 10, 100)) / 100) * plotHeight;

    return { ...item, x, y, scorePercent: Math.max(0, Math.min(item.score * 10, 100)) };
  });

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const hasChartData = chartPoints.length > 0;

  return (
    <main className="min-h-screen bg-[rgb(var(--background-rgb))] p-8 text-[rgb(var(--foreground-rgb))] transition-colors">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-8 shadow-xl transition-colors">
          <form onSubmit={saveProfile}>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-600 text-3xl font-extrabold text-white">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                    Account Overview
                  </p>

                  {!isEditingProfile ? (
                    <>
                      <h2 className="mt-2 text-2xl font-bold text-[rgb(var(--foreground-rgb))]">
                        {user?.full_name || 'Loading profile...'}
                      </h2>

                      <p className="mt-2 max-w-2xl break-words text-[rgb(var(--muted-rgb))]">
                        {user?.email || 'Your account email will appear here.'}
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 grid gap-4 md:min-w-[420px]">
                      <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                        Full Name
                        <input
                          value={profileForm.full_name}
                          onChange={(e) => handleProfileChange('full_name', e.target.value)}
                          className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                        />
                      </label>

                      <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                        Email Address
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => handleProfileChange('email', e.target.value)}
                          className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                        />
                      </label>

                      <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                        Profile Initials or Avatar
                        <input
                          value={profileForm.avatar_initials}
                          onChange={(e) =>
                            handleProfileChange('avatar_initials', e.target.value)
                          }
                          placeholder="TH"
                          className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  )}

                  {error && (
                    <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                      {error}
                    </p>
                  )}

                  {saveMessage && (
                    <p className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-500">
                      {saveMessage}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:items-end">
                {!isEditingProfile ? (
                  <button
                    type="button"
                    onClick={startProfileEdit}
                    className="rounded-xl border border-[rgb(var(--border-rgb))] px-4 py-2 text-sm font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--background-rgb))]"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                    <button
                      type="submit"
                      disabled={savingProfile || !profileForm.full_name.trim() || !profileForm.email.trim()}
                      className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60 active:scale-95"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelProfileEdit}
                      disabled={savingProfile}
                      className="rounded-xl border border-[rgb(var(--border-rgb))] px-5 py-3 text-sm font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--background-rgb))] disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="min-h-64 rounded-2xl border border-dashed border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 transition-colors">
            <h3 className="mb-3 text-lg font-bold text-[rgb(var(--foreground-rgb))]">
              Interview Stats
            </h3>

            {statsError && (
              <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
                {statsError}
              </p>
            )}

            <div className="grid gap-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4"
                >
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                    {item.label}
                  </p>

                  <p className="text-xl font-extrabold text-[rgb(var(--foreground-rgb))]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[rgb(var(--foreground-rgb))]">
                Settings
              </h3>

              <p className="mt-2 text-sm text-[rgb(var(--muted-rgb))]">
                Manage your security and display preferences.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-500">
                Security
              </h4>

              <p className="mt-2 text-sm text-[rgb(var(--muted-rgb))]">
                Keep your account secure by updating your password when needed.
              </p>

              <div className="mt-4 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[rgb(var(--foreground-rgb))]">
                      Password
                    </p>

                    <p className="mt-1 text-sm text-[rgb(var(--muted-rgb))]">
                      Change the password used to sign into your account.
                    </p>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                      {passwordStatus}
                    </p>
                  </div>

                  {!isChangingPassword && (
                    <button
                      type="button"
                      onClick={startPasswordChange}
                      className="rounded-xl border border-[rgb(var(--border-rgb))] px-4 py-2 text-sm font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))] sm:shrink-0"
                    >
                      Change Password
                    </button>
                  )}
                </div>

                {isChangingPassword && (
                  <form onSubmit={savePassword} className="mt-5 grid gap-4">
                    <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                      Current Password
                      <input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          handlePasswordChange('current_password', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                      New Password
                      <input
                        type="password"
                        minLength={8}
                        value={passwordForm.new_password}
                        onChange={(e) =>
                          handlePasswordChange('new_password', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <label className="text-sm font-semibold text-[rgb(var(--foreground-rgb))]">
                      Confirm New Password
                      <input
                        type="password"
                        minLength={8}
                        value={passwordForm.confirm_password}
                        onChange={(e) =>
                          handlePasswordChange('confirm_password', e.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] px-4 py-3 text-sm font-normal text-[rgb(var(--foreground-rgb))] outline-none transition focus:ring-2 focus:ring-blue-500"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={
                          savingPassword ||
                          !passwordForm.current_password ||
                          !passwordForm.new_password ||
                          !passwordForm.confirm_password
                        }
                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60 active:scale-95"
                      >
                        {savingPassword ? 'Saving...' : 'Save Password'}
                      </button>

                      <button
                        type="button"
                        onClick={cancelPasswordChange}
                        disabled={savingPassword}
                        className="rounded-xl border border-[rgb(var(--border-rgb))] px-5 py-3 text-sm font-bold text-[rgb(var(--foreground-rgb))] transition hover:bg-[rgb(var(--card-rgb))] disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {passwordError && (
                  <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {passwordError}
                  </p>
                )}

                {passwordMessage && (
                  <p className="mt-3 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-500">
                    {passwordMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="my-6 h-px bg-[rgb(var(--border-rgb))]" />

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-500">
                Appearance
              </h4>

              <p className="mt-2 text-sm text-[rgb(var(--muted-rgb))]">
                Choose how InterviewPal looks on this device.
              </p>

              <div className="mt-4 rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[rgb(var(--foreground-rgb))]">
                      Theme
                    </p>

                    <p className="mt-1 text-sm text-[rgb(var(--muted-rgb))]">
                      Switch between dark and light appearance.
                    </p>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                      {themeStatus}
                    </p>
                  </div>

                  <div className="grid gap-2 rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-2 sm:grid-cols-2 sm:shrink-0">
                    {['dark', 'light'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateTheme(option)}
                        className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                          theme === option
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-[rgb(var(--muted-rgb))] hover:bg-[rgb(var(--background-rgb))] hover:text-[rgb(var(--foreground-rgb))]'
                        }`}
                      >
                        {option === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--card-rgb))] p-6 shadow-xl transition-colors">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-[rgb(var(--foreground-rgb))]">
                Progress Over Time
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-[rgb(var(--muted-rgb))]">
                Track how your interview performance improves with practice.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                Metric
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as ProgressMetric)}
                  className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--foreground-rgb))] outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {progressMetricOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                Time Range
                <select
                  value={selectedRange}
                  onChange={(e) => setSelectedRange(e.target.value as TimeRange)}
                  className="mt-2 w-full rounded-xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--foreground-rgb))] outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timeRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {progressError && (
            <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">
              {progressError}
            </p>
          )}

          {hasChartData ? (
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-4">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Line chart of interview scores over time"
                className="h-72 w-full"
              >
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = chartPadding.top + plotHeight - (tick / 100) * plotHeight;

                  return (
                    <g key={tick}>
                      <line
                        x1={chartPadding.left}
                        x2={chartWidth - chartPadding.right}
                        y1={y}
                        y2={y}
                        stroke="rgb(var(--border-rgb))"
                        strokeDasharray={tick === 0 ? '0' : '4 8'}
                        strokeWidth="1"
                      />
                      <text
                        x={chartPadding.left - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-[rgb(var(--muted-rgb))] text-[11px]"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                <line
                  x1={chartPadding.left}
                  x2={chartPadding.left}
                  y1={chartPadding.top}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="rgb(var(--border-rgb))"
                />
                <line
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={chartHeight - chartPadding.bottom}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="rgb(var(--border-rgb))"
                />

                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="rgb(59, 130, 246)"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="4"
                  />
                )}

                {chartPoints.map((point, index) => (
                  <g key={point.id}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="5"
                      className="fill-blue-500 stroke-[rgb(var(--background-rgb))]"
                      strokeWidth="3"
                    />
                    <title>
                      {`${point.role}: ${point.scorePercent}% on ${new Date(point.completed_at).toLocaleDateString()}`}
                    </title>
                    <text
                      x={point.x}
                      y={chartHeight - 16}
                      textAnchor="middle"
                      className="fill-[rgb(var(--muted-rgb))] text-[11px]"
                    >
                      {filteredProgress.length <= 6
                        ? new Date(point.completed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : `#${index + 1}`}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border-rgb))] bg-[rgb(var(--background-rgb))] p-8 text-center">
              <h3 className="text-xl font-bold text-[rgb(var(--foreground-rgb))]">
                Complete your first interview to start tracking your progress.
              </h3>

              <button
                onClick={() => router.push('/interview')}
                className="mt-5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 active:scale-95"
              >
                Start Interview
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
