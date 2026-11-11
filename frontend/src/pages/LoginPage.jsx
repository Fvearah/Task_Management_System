import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  Eye,
  EyeOff,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  Tags,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const features = [
  { icon: Tags, title: 'Kategori', text: 'Kelompokkan task sesuai kebutuhan.' },
  { icon: CalendarClock, title: 'Prioritas dan deadline', text: 'Tahu mana yang perlu dikerjakan lebih dulu.' },
  { icon: LayoutDashboard, title: 'Dashboard', text: 'Pantau progres dalam satu layar.' },
];

// Contoh isi untuk pratinjau di panel kiri; bukan data pengguna.
const previewTasks = [
  { title: 'Desain ERD database', meta: 'Besok', dot: 'bg-sky-500' },
  { title: 'Buat endpoint /tasks', meta: '3 hari lagi', dot: 'bg-neutral-400' },
  { title: 'Setup repository GitHub', meta: 'Selesai', dot: 'bg-emerald-500' },
];

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
      <ListChecks size={19} />
    </span>
    <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
  </div>
);

// Tiga gumpalan cahaya yang bergerak pelan; inilah yang membuat efek blur kaca terlihat.
const Aurora = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="aurora aurora-a" />
    <div className="aurora aurora-b" />
    <div className="aurora aurora-c" />
  </div>
);

const AuthPreview = () => (
  <div className="hidden [@media(min-height:820px)]:block">
    <div aria-hidden className="glass mt-10 max-w-md rounded-2xl p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Minggu ini</span>
        <span className="text-muted tabular-nums">1 dari 3 selesai</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-1/3 rounded-full bg-accent" />
      </div>
      <ul className="mt-4 space-y-3 text-sm">
        {previewTasks.map((task) => (
          <li key={task.title} className="flex items-center gap-3">
            <span className={`size-2 shrink-0 rounded-full ${task.dot}`} />
            <span className="flex-1 truncate">{task.title}</span>
            <span className="text-muted">{task.meta}</span>
          </li>
        ))}
      </ul>
    </div>
    <p className="mt-2 text-xs text-muted">Contoh tampilan</p>
  </div>
);

// Kerangka halaman login dan register: latar cahaya, panel cerita (desktop), dan tempat kartu form.
// Dipakai juga oleh RegisterPage.jsx.
export const AuthShell = ({ title, description, children }) => (
  <main className="relative min-h-[100dvh] overflow-hidden bg-background">
    <Aurora />
    <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-6xl items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:py-12">
      <section className="rise hidden lg:block">
        <Brand />
        <h2 className="mt-14 max-w-md text-4xl font-semibold leading-[1.15] tracking-tight xl:text-5xl">{title}</h2>
        <p className="mt-4 max-w-md text-lg text-muted">{description}</p>
        <ul className="mt-10 space-y-5">
          {features.map(({ icon: Icon, title: featureTitle, text }) => (
            <li key={featureTitle} className="flex items-start gap-4">
              <span className="glass flex size-10 shrink-0 items-center justify-center rounded-xl text-accent">
                <Icon size={18} />
              </span>
              <div>
                <p className="font-medium">{featureTitle}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <AuthPreview />
      </section>

      <div className="rise mx-auto w-full max-w-md" style={{ '--rise-delay': '120ms' }}>
        <div className="mb-6 lg:hidden">
          <Brand />
        </div>
        {children}
      </div>
    </div>
  </main>
);

// Input dengan label mengambang, ikon, tombol lihat password, dan pesan error.
// Props lain (onBlur, onKeyDown, dst.) diteruskan ke <input>. Dipakai juga oleh RegisterPage.jsx.
export const GlassField = ({ id, label, type = 'text', icon: Icon, error, hint, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <div className={`glass-field group relative ${error ? 'is-invalid' : ''}`}>
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent"
          />
        )}
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          placeholder=" "
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`peer h-14 w-full rounded-xl bg-transparent pb-1.5 pt-5 text-[15px] text-ink outline-none ${
            Icon ? 'pl-11' : 'pl-4'
          } ${isPassword ? 'pr-12' : 'pr-4'}`}
          {...inputProps}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute top-1/2 origin-left -translate-y-1/2 text-[15px] text-muted transition-all duration-200 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:scale-[0.78] peer-focus:text-accent peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-[0.78] ${
            Icon ? 'left-11' : 'left-4'
          }`}
        >
          {label}
        </label>
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={visible}
            className="icon-btn absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-danger-text">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
};

const validate = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = 'Email wajib diisi.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Format email belum benar, contoh: nama@email.com.';
  if (!password) errors.password = 'Password wajib diisi.';
  return errors;
};

const LoginPage = () => {
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();

  // Setelah register, email yang baru didaftarkan sudah terisi.
  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const setField = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError('');
  };

  const checkField = (name) => () => setErrors((prev) => ({ ...prev, [name]: validate(form)[name] }));

  const trackCapsLock = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  // Setelah login berhasil, isAuthenticated berubah dan halaman ini mengarahkan ke dashboard.
  const handleSubmit = async (e) => {
    e.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }

    setLoading(true);
    setFormError('');
    try {
      await login(form.email.trim(), form.password);
      toast.success('Login berhasil');
    } catch (err) {
      setFormError(errorMessage(err, 'Email atau password tidak valid.'));
      setForm((f) => ({ ...f, password: '' }));
      document.getElementById('password')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Semua tugas, satu tempat yang rapi."
      description="Catat, kelompokkan, dan selesaikan task tanpa ribet."
    >
      <div className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Masuk ke akun Anda</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Kelola semua tugas Anda dalam satu tempat.</p>

        {formError && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-danger-text/30 bg-danger/10 px-4 py-3 text-sm text-danger-text"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <GlassField
            id="email"
            type="email"
            label="Email"
            icon={Mail}
            autoComplete="email"
            value={form.email}
            onChange={setField('email')}
            onBlur={checkField('email')}
            error={errors.email}
          />
          <GlassField
            id="password"
            type="password"
            label="Password"
            icon={Lock}
            autoComplete="current-password"
            value={form.password}
            onChange={setField('password')}
            onKeyDown={trackCapsLock}
            onKeyUp={trackCapsLock}
            onBlur={() => {
              setCapsLock(false);
              checkField('password')();
            }}
            error={errors.password}
            hint={capsLock ? 'Caps Lock sedang aktif.' : undefined}
          />

          <button type="submit" disabled={loading} className="btn btn-primary mt-2 h-12 w-full text-[15px]">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Memproses…
              </>
            ) : (
              <>
                Masuk <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Belum punya akun?{' '}
          <Link to="/register" className="font-medium text-accent hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default LoginPage;