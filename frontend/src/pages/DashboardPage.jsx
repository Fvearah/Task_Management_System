import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ListTodo, CircleDashed, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient, { errorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';

// Kartu dengan cahaya yang mengikuti kursor (referensi: spotlight-card).
// Posisi kursor diisi di sini; gambar efeknya ada di index.css ([data-glow]).
const GlowCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const syncPointer = ({ clientX: x, clientY: y }) => {
      const card = cardRef.current;
      if (!card) return;
      card.style.setProperty('--x', x.toFixed(2));
      card.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
      card.style.setProperty('--y', y.toFixed(2));
      card.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
    };

    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  return (
    <div
      ref={cardRef}
      data-glow
      // hijau ke cyan mengikuti posisi kursor
      style={{ '--base': 150, '--spread': 60 }}
      className={`rounded-[14px] shadow-sm dark:shadow-[0_1rem_2rem_-1rem_black] ${className}`}
    >
      <div data-glow />
      {children}
    </div>
  );
};

const STATUS = {
  TODO: { label: 'To Do', dot: 'bg-neutral-400', tone: 'text-neutral-400', icon: CircleDashed },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-sky-500', tone: 'text-sky-500', icon: Clock },
  DONE: { label: 'Done', dot: 'bg-emerald-500', tone: 'text-emerald-500', icon: CheckCircle2 },
};

const PRIORITY = {
  LOW: { label: 'Low', text: 'text-muted' },
  MEDIUM: { label: 'Medium', text: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'High', text: 'font-medium text-red-600 dark:text-red-400' },
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// API mengirim "2026-11-12T00:00:00Z"; hanya bagian tanggalnya yang dipakai agar tidak bergeser zona waktu.
const parseDate = (value) => {
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

const daysUntil = (value) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDate(value) - today) / 86_400_000);
};

const deadlineLabel = (days) => {
  if (days < 0) return `Terlambat ${-days} hari`;
  if (days === 0) return 'Hari ini';
  if (days === 1) return 'Besok';
  return `${days} hari lagi`;
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [categoryName, setCategoryName] = useState({});
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiClient.get('/dashboard'),
      // Nama kategori hanya pelengkap; dashboard tetap tampil kalau request ini gagal.
      apiClient.get('/categories').catch(() => null),
    ])
      .then(([dashboard, categories]) => {
        if (ignore) return;
        setData(dashboard.data);
        setCategoryName(Object.fromEntries((categories?.data.data ?? []).map((c) => [c.ID, c.Name])));
      })
      .catch((err) => {
        if (ignore) return;
        setFailed(true);
        toast.error(errorMessage(err, 'Gagal mengambil data dashboard'));
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (failed) return <p className="text-sm text-muted">Data dashboard tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi.</p>;
  if (!data) return <p className="text-sm text-muted">Memuat dashboard…</p>;

  const total = data.total_task ?? 0;
  const counts = {
    TODO: data.todo_task ?? 0,
    IN_PROGRESS: data.in_progress_task ?? 0,
    DONE: data.done_task ?? 0,
  };
  const upcoming = data.upcoming_tasks ?? [];
  const donePercent = total > 0 ? Math.round((counts.DONE / total) * 100) : 0;

  const tiles = [
    { label: 'Total task', value: total, to: '/tasks', icon: ListTodo, tone: 'text-accent' },
    ...Object.entries(STATUS).map(([key, { label, icon, tone }]) => ({
      label,
      value: counts[key],
      to: `/tasks?status=${key}`,
      icon,
      tone,
    })),
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user ? `Halo, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-muted">Ringkasan task milik Anda.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(({ label, value, to, icon: Icon, tone }) => (
          <Link
            key={label}
            to={to}
            className="block rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <GlowCard className="p-5">
              <div className="flex items-center justify-between text-sm text-muted">
                {label}
                <Icon size={18} className={tone} />
              </div>
              <p className="mt-4 text-4xl font-semibold tabular-nums">{value}</p>
            </GlowCard>
          </Link>
        ))}
      </div>

      <section aria-label="Ringkasan status" className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Ringkasan status</h2>
          <p className="text-sm text-muted tabular-nums">
            {total > 0 ? `${donePercent}% selesai dari ${total} task` : 'Belum ada task'}
          </p>
        </div>

        {total > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-subtle">
            {Object.entries(STATUS).map(
              ([key, { label, dot }]) =>
                counts[key] > 0 && (
                  <div
                    key={key}
                    title={`${label}: ${counts[key]}`}
                    className={dot}
                    style={{ width: `${(counts[key] / total) * 100}%` }}
                  />
                )
            )}
          </div>
        )}

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {Object.entries(STATUS).map(([key, { label, dot }]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${dot}`} />
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium tabular-nums">{counts[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Mendekati deadline</h2>
          <Link to="/tasks" className="text-sm font-medium text-accent hover:underline">
            Lihat semua
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-sm text-muted">
            Tidak ada task yang mendesak.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {upcoming.map((task) => {
              const days = daysUntil(task.DueDate);
              const status = STATUS[task.Status];
              const priority = PRIORITY[task.Priority];
              const category = categoryName[task.CategoryID];
              const urgency = days < 0 ? 'text-danger-text' : days <= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-muted';
              return (
                <li key={task.ID} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{task.Title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      {category && <span className="chip">{category}</span>}
                      <span className={`font-medium ${urgency}`}>{deadlineLabel(days)}</span>
                      <span className="text-muted tabular-nums">{dateFormatter.format(parseDate(task.DueDate))}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-sm sm:flex-row sm:items-center sm:gap-5">
                    <span className={priority?.text}>{priority?.label ?? task.Priority}</span>
                    <span className="inline-flex items-center gap-2">
                      <span className={`size-2 rounded-full ${status?.dot ?? 'bg-neutral-300'}`} />
                      {status?.label ?? task.Status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
};

export default DashboardPage;