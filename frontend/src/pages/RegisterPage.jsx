import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../api/axios';
import { AuthShell, GlassField } from './LoginPage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const STRENGTH_LABELS = ['Terlalu pendek', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
const STRENGTH_COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-500'];

// Saran saat mengetik, bukan aturan: backend hanya mewajibkan minimal 6 karakter.
const passwordStrength = (password) => {
  if (password.length < 6) return 0;
  let score = 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

const validate = ({ name, email, password }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Nama wajib diisi.';
  if (!email.trim()) errors.email = 'Email wajib diisi.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Format email belum benar, contoh: nama@email.com.';
  if (!password) errors.password = 'Password wajib diisi.';
  else if (password.length < 6) errors.password = 'Password minimal 6 karakter.';
  return errors;
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const setField = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError('');
  };

  const checkField = (name) => () => setErrors((prev) => ({ ...prev, [name]: validate(form)[name] }));

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
      await register(form.name.trim(), form.email.trim(), form.password);
      toast.success('Akun dibuat. Silakan masuk.');
      navigate('/login', { state: { email: form.email.trim() } });
    } catch (err) {
      if (err.response?.status === 409) {
        setErrors({ email: 'Email ini sudah terdaftar. Silakan masuk.' });
        document.getElementById('email')?.focus();
      } else {
        setFormError(errorMessage(err, 'Data tidak valid. Pastikan email benar dan password minimal 6 karakter.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const filled = form.password ? Math.max(strength, 1) : 0;

  return (
    <AuthShell
      title="Mulai kelola task Anda hari ini."
      description="Buat akun, tambahkan kategori, lalu catat task pertama dalam hitungan menit."
    >
      <div className="glass rounded-3xl p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Buat akun baru</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Catat, kelompokkan, dan pantau task Anda.</p>

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
            id="name"
            label="Nama"
            icon={User}
            autoComplete="name"
            maxLength={100}
            value={form.name}
            onChange={setField('name')}
            onBlur={checkField('name')}
            error={errors.name}
          />
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

          <div>
            <GlassField
              id="password"
              type="password"
              label="Password"
              icon={Lock}
              autoComplete="new-password"
              value={form.password}
              onChange={setField('password')}
              onBlur={checkField('password')}
              error={errors.password}
              hint={form.password ? undefined : 'Minimal 6 karakter.'}
            />
            {form.password && (
              <div className="mt-2.5" aria-live="polite">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        i < filled ? STRENGTH_COLORS[strength] : 'bg-ink/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">Kekuatan password: {STRENGTH_LABELS[strength]}</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary mt-2 h-12 w-full text-[15px]">
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Mendaftarkan…
              </>
            ) : (
              <>
                Buat akun <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Sudah punya akun?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default RegisterPage;