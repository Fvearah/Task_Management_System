import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Tags, LogOut, ListChecks, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Toggle tema 3 state (Terang, Gelap, Sesuai Perangkat). Mengatur class .dark di <html>.
const MOON = { side: -1, spin: 25 };
const SUN = { side: 1, spin: 120 };
const ARC_RADIUS = 115;
const QUARTER_TURN = Math.PI / 2;
const KEYFRAME_STEPS = 30;
const BODY_CLASS = 'pointer-events-none absolute inset-0 flex items-center justify-center';
const SKY_CLASS = 'pointer-events-none absolute inset-0 -z-10';
const NIGHT_SKY = 'linear-gradient(180deg, #090f2a 0%, #16204b 60%, #2a2f66 100%)';
const DAY_SKY = 'linear-gradient(180deg, #4ea8ff 0%, #9fd3ff 60%, #e3f3ff 100%)';
const STARS = [
  { x: 24, y: 22, r: 1.6, t: 2100 },
  { x: 66, y: 16, r: 1.2, t: 2600 },
  { x: 80, y: 42, r: 1.8, t: 1900 },
  { x: 38, y: 58, r: 1.1, t: 2900 },
  { x: 58, y: 74, r: 1.4, t: 2300 },
  { x: 14, y: 72, r: 1.2, t: 2500 },
];
const SKY_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
const PAGE_FADE_STYLE_ID = 'sun-moon-theme-fade';
const PAGE_FADE_PROPERTIES = 'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke';

let pageFadeCleanup = 0;

const arcPoint = (side, angle) => ({
  x: side * ARC_RADIUS * Math.sin(angle),
  y: ARC_RADIUS * (1 - Math.cos(angle)),
});

const easeInCubic = (t) => t * t * t;

const easeOutBack = (t) => {
  const overshoot = 1.4;
  return 1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;
};

const settingKeyframes = ({ side, spin }) =>
  Array.from({ length: KEYFRAME_STEPS + 1 }, (_, i) => {
    const t = i / KEYFRAME_STEPS;
    const travelled = easeInCubic(t);
    const { x, y } = arcPoint(side, travelled * QUARTER_TURN);
    return {
      offset: t,
      transform: `translate(${x}%, ${y}%) rotate(${side * spin * travelled}deg)`,
      opacity: t < 0.55 ? 1 : (1 - t) / 0.45,
    };
  });

const risingKeyframes = ({ side, spin }) =>
  Array.from({ length: KEYFRAME_STEPS + 1 }, (_, i) => {
    const t = i / KEYFRAME_STEPS;
    const remaining = 1 - easeOutBack(t);
    const { x, y } = arcPoint(side, remaining * QUARTER_TURN);
    return {
      offset: t,
      transform: `translate(${x}%, ${y}%) rotate(${side * spin * remaining}deg) scale(${1 - 0.28 * remaining})`,
      opacity: Math.min(1, t / 0.3),
    };
  });

const KEYFRAMES = {
  moonSets: settingKeyframes(MOON),
  moonRises: risingKeyframes(MOON),
  sunSets: settingKeyframes(SUN),
  sunRises: risingKeyframes(SUN),
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getResolvedTheme = (pref) => {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
};

const applyDocumentTheme = (theme, duration) => {
  if (duration > 0 && !prefersReducedMotion()) {
    const style =
      document.getElementById(PAGE_FADE_STYLE_ID) ??
      document.head.appendChild(Object.assign(document.createElement('style'), { id: PAGE_FADE_STYLE_ID }));
    style.textContent = `*, *::before, *::after { transition-property: ${PAGE_FADE_PROPERTIES} !important; transition-duration: ${duration}ms !important; transition-timing-function: cubic-bezier(0.65, 0, 0.35, 1) !important; transition-delay: 0s !important; }`;
    window.clearTimeout(pageFadeCleanup);
    pageFadeCleanup = window.setTimeout(() => style.remove(), duration + 100);
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

const swapBodies = (moon, sun, skies, flight, nextResolved, duration) => {
  if (flight.current.length > 0) {
    for (const animation of flight.current) animation.reverse();
    return;
  }
  if (!moon || !sun || typeof moon.animate !== 'function' || prefersReducedMotion()) return;

  const toLight = nextResolved === 'light';
  const setting = (toLight ? moon : sun).animate(toLight ? KEYFRAMES.moonSets : KEYFRAMES.sunSets, {
    duration: duration * 0.65,
    fill: 'both',
  });
  const rising = (toLight ? sun : moon).animate(toLight ? KEYFRAMES.sunRises : KEYFRAMES.moonRises, {
    duration: duration * 0.64,
    delay: duration * 0.36,
    fill: 'both',
  });
  const pair = [setting, rising];

  if (skies.night && skies.day) {
    const skyOptions = { duration, easing: SKY_EASING, fill: 'both' };
    pair.push(
      skies.night.animate([{ opacity: toLight ? 1 : 0 }, { opacity: toLight ? 0 : 1 }], skyOptions),
      skies.day.animate([{ opacity: toLight ? 0 : 1 }, { opacity: toLight ? 1 : 0 }], skyOptions)
    );
  }

  flight.current = pair;
  Promise.all(pair.map((animation) => animation.finished)).then(
    () => {
      if (flight.current !== pair) return;
      flight.current = [];
      for (const animation of pair) animation.cancel();
    },
    (error) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
    }
  );
};

const restingStyle = (body, visible) => ({
  transform: visible ? 'none' : `translate(${body.side * ARC_RADIUS}%, ${ARC_RADIUS}%)`,
  opacity: visible ? 1 : 0,
});

const SunMoonThemeToggle = ({ storageKey = 'theme', duration = 1740, size = 40, className = '' }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem(storageKey) || 'system');
  const moonRef = useRef(null);
  const sunRef = useRef(null);
  const nightRef = useRef(null);
  const dayRef = useRef(null);
  const flight = useRef([]);
  
  const resolved = getResolvedTheme(theme);
  const previousResolved = useRef(resolved);

  // Mendengarkan perubahan tema sistem secara real-time jika mode 'system' aktif
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if ((localStorage.getItem(storageKey) || 'system') === 'system') {
        const newResolved = mediaQuery.matches ? 'dark' : 'light';
        applyDocumentTheme(newResolved, duration);
        setTheme('system'); // trigger re-render
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storageKey, duration]);

  useLayoutEffect(() => {
    const currentResolved = getResolvedTheme(theme);
    if (previousResolved.current === currentResolved) return;
    previousResolved.current = currentResolved;
    swapBodies(moonRef.current, sunRef.current, { night: nightRef.current, day: dayRef.current }, flight, currentResolved, duration);
  }, [theme, duration]);

  // Bintang berkedip di langit malam
  useEffect(() => {
    const night = nightRef.current;
    if (!night || prefersReducedMotion() || typeof night.animate !== 'function') return;
    const twinkles = [...night.querySelectorAll('[data-star]')].map((star, index) =>
      star.animate([{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], {
        duration: STARS[index]?.t ?? 2400,
        delay: -index * 530,
        iterations: Infinity,
        easing: 'ease-in-out',
      })
    );
    return () => twinkles.forEach((animation) => animation.cancel());
  }, []);

  useEffect(() => {
    const pending = flight;
    return () => {
      for (const animation of pending.current) animation.cancel();
    };
  }, []);

  const toggle = () => {
    // Siklus urutan: light -> dark -> system -> light
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
    localStorage.setItem(storageKey, next);

    const nextResolved = getResolvedTheme(next);
    applyDocumentTheme(nextResolved, duration);

    const labels = { light: 'Terang', dark: 'Gelap', system: 'Sesuai Perangkat' };
    toast.success(`Tema: ${labels[next]}`, { id: 'theme-toast', duration: 1500 });
  };

  return (
    <button
      type="button"
      data-state={theme}
      aria-label={`Tema saat ini: ${theme}. Klik untuk mengubah.`}
      className={`relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-ink transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      style={{ width: size, height: size }}
      onClick={toggle}
    >
      <span
        ref={nightRef}
        aria-hidden
        className={SKY_CLASS}
        style={{ background: NIGHT_SKY, opacity: resolved === 'dark' ? 1 : 0 }}
      >
        {STARS.map((star, index) => (
          <span
            key={index}
            data-star
            className="absolute rounded-full bg-white"
            style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.r * 2, height: star.r * 2, opacity: 0.6 }}
          />
        ))}
      </span>
      <span
        ref={dayRef}
        aria-hidden
        className={SKY_CLASS}
        style={{ background: DAY_SKY, opacity: resolved === 'light' ? 1 : 0 }}
      />
      <span
        ref={moonRef}
        aria-hidden
        className={`${BODY_CLASS} text-amber-200 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]`}
        style={restingStyle(MOON, resolved === 'dark')}
      >
        <Moon className="size-1/2" fill="currentColor" />
      </span>
      <span
        ref={sunRef}
        aria-hidden
        className={`${BODY_CLASS} text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]`}
        style={restingStyle(SUN, resolved === 'light')}
      >
        <Sun className="size-1/2" />
      </span>
      {/* Badge huruf 'A' kecil di pojok ikon jika mode Sesuai Perangkat (Auto) aktif */}
      {theme === 'system' && (
        <span className="absolute bottom-0.5 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-fg shadow">
          A
        </span>
      )}
    </button>
  );
};

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Task', path: '/tasks', icon: CheckSquare },
  { name: 'Kategori', path: '/categories', icon: Tags },
];

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
    isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-subtle hover:text-ink'
  }`;

const tabLink = ({ isActive }) =>
  `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs ${isActive ? 'font-medium text-accent' : 'text-muted'}`;

const initials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
      <ListChecks size={18} />
    </span>
    <span className="text-base font-semibold tracking-tight">TaskFlow</span>
  </div>
);

const Sidebar = () => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar');
  };

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="mb-8 px-2">
          <Brand />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ name, path, icon: Icon }) => (
            <NavLink key={path} to={path} className={sideLink}>
              <Icon size={18} />
              {name}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-line pt-4">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                {initials(user.name)}
              </span>
              <span className="truncate text-sm font-medium">{user.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger-text"
            >
              <LogOut size={18} />
              Keluar
            </button>
            <SunMoonThemeToggle size={36} />
          </div>
        </div>
      </aside>

      {/* Mobile: bar atas dan tab bar bawah */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <Brand />
        <SunMoonThemeToggle size={36} />
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface md:hidden">
        {navItems.map(({ name, path, icon: Icon }) => (
          <NavLink key={path} to={path} className={tabLink}>
            <Icon size= {20} />
            {name}
          </NavLink>
        ))}
        <button type="button" onClick={handleLogout} className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs text-muted">
          <LogOut size={20} />
          Keluar
        </button>
      </nav>
    </>
  );
};

export default Sidebar;