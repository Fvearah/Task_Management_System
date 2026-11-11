import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient, { errorMessage } from '../api/axios';

const PAGE_SIZE = 10;

const STATUS = {
  TODO: { label: 'To Do', dot: 'bg-neutral-400' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-sky-500' },
  DONE: { label: 'Done', dot: 'bg-emerald-500' },
};
const PRIORITY = {
  LOW: { label: 'Low', text: 'text-muted' },
  MEDIUM: { label: 'Medium', text: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'High', text: 'font-medium text-red-600 dark:text-red-400' },
};
const toOptions = (map) => Object.entries(map).map(([value, { label }]) => ({ value, label }));
const STATUS_OPTIONS = toOptions(STATUS);
const PRIORITY_OPTIONS = toOptions(PRIORITY);
const STATUS_TABS = [{ value: '', label: 'Semua' }, ...STATUS_OPTIONS];

const SORT_OPTIONS = [
  { value: 'due_date', label: 'Urut: Deadline' },
  { value: 'created_at', label: 'Urut: Terbaru' },
  { value: 'title', label: 'Urut: Nama (A–Z)' },
];
const SORT_ORDER = { due_date: 'asc', title: 'asc', created_at: 'desc' };

const SUGGESTED_CATEGORIES = ['Work', 'Personal', 'Education', 'Project', 'Health', 'Finance'];

const EMPTY_FILTERS = { search: '', status: '', priority: '', category_id: '', sort_by: 'due_date' };
const EMPTY_FORM = { title: '', description: '', category_id: '', priority: 'MEDIUM', status: 'TODO', due_date: '' };

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// API mengirim "2026-11-12T00:00:00Z"; hanya bagian tanggalnya yang dipakai agar tidak bergeser zona waktu.
const dateOnly = (value) => (value ? value.split('T')[0] : '');

const formatDate = (value) => {
  if (!value) return null;
  const [year, month, day] = dateOnly(value).split('-').map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
};

const isOverdue = (task) =>
  Boolean(task.DueDate) && task.Status !== 'DONE' && dateOnly(task.DueDate) < new Date().toLocaleDateString('en-CA');

// Maksimal 5 nomor halaman di sekitar halaman aktif.
const pageNumbers = (page, totalPages) => {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const taskToForm = (task) => ({
  title: task.Title,
  description: task.Description || '',
  category_id: task.CategoryID ? String(task.CategoryID) : '',
  priority: task.Priority,
  status: task.Status,
  due_date: dateOnly(task.DueDate),
});

const formToPayload = (form) => ({
  title: form.title.trim(),
  description: form.description.trim(),
  category_id: form.category_id ? Number(form.category_id) : null,
  priority: form.priority,
  status: form.status,
  due_date: form.due_date || null,
});

const Select = ({ options, placeholder, ...props }) => (
  <select className="input" {...props}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);


// Memakai <dialog> bawaan browser: focus trap, tombol Esc, dan backdrop sudah ditangani.
const Dialog = ({ open, onClose, title, width = 'max-w-lg', children }) => {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // mousedown (bukan click) agar drag-select teks yang berakhir di luar tidak menutup dialog
      onMouseDown={(e) => e.target === ref.current && onClose()}
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${width} overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm`}
    >
      <div className="p-6">
        <h2 className="mb-5 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
};

const TaskPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status');

  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Kartu di dashboard membuka halaman ini dengan ?status=TODO dst.
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: STATUS[initialStatus] ? initialStatus : '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = () => setReloadKey((k) => k + 1);

  // Pencarian ditunda 300ms agar tidak mengirim request di setiap ketikan.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(id);
  }, [filters.search]);

  useEffect(() => {
    let ignore = false;
    apiClient
      .get('/categories')
      .then((res) => {
        if (!ignore) setCategories(res.data.data ?? []);
      })
      .catch((err) => toast.error(errorMessage(err, 'Gagal memuat kategori')));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    // Axios membuang parameter undefined, jadi filter kosong tidak ikut terkirim.
    const params = {
      page,
      limit: PAGE_SIZE,
      sort_by: filters.sort_by,
      sort_order: SORT_ORDER[filters.sort_by],
      search: debouncedSearch.trim() || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      category_id: filters.category_id || undefined,
    };

    apiClient
      .get('/tasks', { params })
      .then((res) => {
        if (ignore) return;
        const pages = res.data.total_pages || 1;
        // Halaman terakhir habis (misalnya setelah menghapus): mundur ke halaman yang masih ada.
        if (page > pages) {
          setPage(pages);
          return;
        }
        setTasks(res.data.data ?? []);
        setTotalPages(pages);
        setTotal(res.data.total ?? null);
      })
      .catch((err) => {
        if (!ignore) toast.error(errorMessage(err, 'Gagal memuat daftar task'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [page, debouncedSearch, filters.status, filters.priority, filters.category_id, filters.sort_by, reloadKey]);

 const categoryOptions = useMemo(
    () => categories.map((c) => ({ 
      value: c?.id || c?.ID, 
      label: c?.name || c?.Name || 'Kategori Tanpa Nama' 
    })),
    [categories]
  );
  
  const categoryName = useMemo(
    () => Object.fromEntries(categories.map((c) => [
      c?.id || c?.ID, 
      c?.name || c?.Name || 'Kategori Tanpa Nama'
    ])),
    [categories]
  );

  const missingSuggestions = SUGGESTED_CATEGORIES.filter(
    (suggested) => !categories.some((c) => {
      const catName = c?.Name || c?.name || '';
      return catName.toLowerCase() === suggested.toLowerCase();
    })
  );

  const filtersActive = Object.entries(filters).some(([key, value]) => key !== 'sort_by' && value !== '');

  const setFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  };
  const updateFilter = (name) => (e) => setFilter(name, e.target.value);

  const resetFilters = () => {
    setFilters((f) => ({ ...EMPTY_FILTERS, sort_by: f.sort_by }));
    setPage(1);
  };

  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const openModal = (task = null) => {
    setEditing(task);
    setForm(task ? taskToForm(task) : EMPTY_FORM);
    setModalOpen(true);
  };

  // Membuat kategori langsung dari form task, lalu memilihnya.
  // Backend hanya membalas pesan (tanpa ID), jadi daftar kategori diambil ulang untuk mencari ID-nya.
  const quickAddCategory = async (name) => {
    try {
      await apiClient.post('/categories', { name });
      const res = await apiClient.get('/categories');
      const list = res.data.data ?? [];
      setCategories(list);
      const created = list.find((c) => c.Name === name);
      if (created) setForm((f) => ({ ...f, category_id: String(created.ID) }));
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal membuat kategori'));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Nama kategori tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        // Gunakan fallback agar aman membaca ID
        const catId = editing.id || editing.ID;
        await apiClient.put(`/categories/${catId}`, { name: trimmed });
        toast.success('Kategori diperbarui');
      } else {
        await apiClient.post('/categories', { name: trimmed });
        toast.success('Kategori ditambahkan');
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal menyimpan kategori. Nama maksimal 100 karakter.'));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task, status) => {
    try {
      await apiClient.put(`/tasks/${task.ID}`, formToPayload({ ...taskToForm(task), status }));
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal mengubah status'));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Gunakan fallback agar aman membaca ID
      const catId = toDelete.id || toDelete.ID;
      await apiClient.delete(`/categories/${catId}`);
      toast.success('Kategori dihapus');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal menghapus kategori'));
    } finally {
      setDeleting(false);
    }
  };

  const from = (page - 1) * PAGE_SIZE + 1;
  const to = from + tasks.length - 1;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Daftar task</h1>
          <p className="mt-1 text-sm text-muted">Cari, filter, dan urutkan task Anda.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="btn btn-primary">
          <Plus size={16} /> Task baru
        </button>
      </header>

      <div className="mb-4 space-y-3">
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            {STATUS_TABS.map((tab) => {
              const active = filters.status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter('status', tab.value)}
                  className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                    active ? 'bg-accent font-medium text-accent-fg' : 'text-muted hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,auto)]">
          <div className="relative col-span-2 md:col-span-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Cari judul task"
              placeholder="Cari judul task"
              value={filters.search}
              onChange={updateFilter('search')}
              className="input pl-9"
            />
          </div>
          <Select
            aria-label="Filter prioritas"
            placeholder="Semua prioritas"
            options={PRIORITY_OPTIONS}
            value={filters.priority}
            onChange={updateFilter('priority')}
          />
          <Select
            aria-label="Filter kategori"
            placeholder="Semua kategori"
            options={categoryOptions}
            value={filters.category_id}
            onChange={updateFilter('category_id')}
          />
          <Select aria-label="Urutkan" options={SORT_OPTIONS} value={filters.sort_by} onChange={updateFilter('sort_by')} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {tasks.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted">
            {loading ? (
              <p>Memuat task…</p>
            ) : (
              <>
                <p>{filtersActive ? 'Tidak ada task yang cocok dengan filter.' : 'Belum ada task. Buat yang pertama.'}</p>
                {filtersActive && (
                  <button type="button" onClick={resetFilters} className="mt-2 font-medium text-accent hover:underline">
                    Reset filter
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-subtle/50 text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Judul</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Kategori</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Prioritas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Deadline</th>
                  <th className="px-2 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.map((task) => {
                  const done = task.Status === 'DONE';
                  const overdue = isOverdue(task);
                  const deadline = formatDate(task.DueDate);
                  const priority = PRIORITY[task.Priority];
                  return (
                    <tr key={task.ID} className="transition-colors hover:bg-subtle/60">
                      <td className="max-w-[12rem] px-4 py-3 sm:max-w-xs md:max-w-sm">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            aria-label={done ? 'Tandai belum selesai' : 'Tandai selesai'}
                            onClick={() => changeStatus(task, done ? 'TODO' : 'DONE')}
                            className="mt-0.5 shrink-0 text-muted transition-colors hover:text-accent"
                          >
                            {done ? <CheckCircle2 size={20} className="text-accent" /> : <Circle size={20} />}
                          </button>
                          <div className="min-w-0">
                            <p className={`truncate font-medium ${done ? 'text-muted line-through' : ''}`}>{task.Title}</p>
                            {task.Description && <p className="truncate text-muted">{task.Description}</p>}
                            {/* Kolom yang disembunyikan di layar kecil dipindah ke sini */}
                            <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted md:hidden">
                              {categoryName[task.CategoryID] && <span>{categoryName[task.CategoryID]}</span>}
                              <span>{priority?.label}</span>
                              {deadline && <span className={overdue ? 'text-danger-text' : ''}>{deadline}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {categoryName[task.CategoryID] ? (
                          <span className="chip">{categoryName[task.CategoryID]}</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={`hidden px-4 py-3 md:table-cell ${priority?.text}`}>
                        {priority?.label ?? task.Priority}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <span
                            className={`pointer-events-none absolute left-2.5 top-1/2 size-2 -translate-y-1/2 rounded-full ${STATUS[task.Status]?.dot}`}
                          />
                          <select
                            aria-label={`Status untuk ${task.Title}`}
                            value={task.Status}
                            onChange={(e) => changeStatus(task, e.target.value)}
                            className="rounded-lg border border-line bg-surface py-1.5 pl-7 pr-2 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-4 py-3 tabular-nums md:table-cell ${
                          overdue ? 'font-medium text-danger-text' : 'text-muted'
                        }`}
                      >
                        {deadline ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <button
                          type="button"
                          aria-label={`Ubah ${task.Title}`}
                          title="Ubah"
                          onClick={() => openModal(task)}
                          className="icon-btn"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Hapus ${task.Title}`}
                          title="Hapus"
                          onClick={() => setToDelete(task)}
                          className="icon-btn-danger"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p className="tabular-nums">
            {total !== null ? `Menampilkan ${from}–${to} dari ${total} task` : `Halaman ${page} dari ${totalPages}`}
          </p>
          {totalPages > 1 && (
            <nav aria-label="Halaman" className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Halaman sebelumnya"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="icon-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers(page, totalPages).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => setPage(n)}
                  className={`min-w-9 rounded-lg px-2 py-1.5 tabular-nums transition-colors ${
                    n === page ? 'bg-accent font-medium text-accent-fg' : 'hover:bg-subtle hover:text-ink'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label="Halaman berikutnya"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="icon-btn disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah task' : 'Buat task baru'}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Judul *</span>
            <input
              type="text"
              required
              maxLength={200}
              value={form.title}
              onChange={setField('title')}
              className="input"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Deskripsi</span>
            <textarea rows={3} value={form.description} onChange={setField('description')} className="input" />
          </label>

          <div>
            <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Kategori</span>
            <Select
              placeholder="Tanpa kategori"
              options={categoryOptions}
              value={form.category_id}
              onChange={setField('category_id')}
            />
          </label>
            {missingSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">Buat cepat:</span>
                {missingSuggestions.slice(0, 4).map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => quickAddCategory(suggested)}
                    className="chip transition-colors hover:bg-accent/15 hover:text-accent"
                  >
                    <Plus size={12} /> {suggested}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Prioritas</span>
              <Select options={PRIORITY_OPTIONS} value={form.priority} onChange={setField('priority')} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Status</span>
              <Select options={STATUS_OPTIONS} value={form.status} onChange={setField('status')} />
            </label>
            <label className="block sm:col-span-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium">Deadline</span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      setForm((f) => ({ ...f, due_date: d.toLocaleDateString('en-CA') }));
                    }}
                    className="text-accent hover:underline font-medium"
                  >
                    Hari ini
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setForm((f) => ({ ...f, due_date: d.toLocaleDateString('en-CA') }));
                    }}
                    className="text-accent hover:underline font-medium"
                  >
                    Besok
                  </button>
                  <span className="text-muted">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      setForm((f) => ({ ...f, due_date: d.toLocaleDateString('en-CA') }));
                    }}
                    className="text-accent hover:underline font-medium"
                  >
                    Minggu depan
                  </button>
                </div>
              </div>
              <input type="date" value={form.due_date} onChange={setField('due_date')} className="input min-h-[44px]" />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Hapus task?" width="max-w-sm">
        <p className="text-sm text-muted">{toDelete && `Task “${toDelete.Title}” akan dihapus permanen.`}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setToDelete(null)} className="btn btn-secondary">
            Batal
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger">
            Ya, hapus
          </button>
        </div>
      </Dialog>
    </>
  );
};

export default TaskPage;