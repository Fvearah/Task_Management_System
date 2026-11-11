import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient, { errorMessage } from '../api/axios';

const SUGGESTED_CATEGORIES = ['Work', 'Personal', 'Education', 'Project', 'Health', 'Finance'];
const STARTER_CATEGORIES = SUGGESTED_CATEGORIES.slice(0, 4);

// Memakai <dialog> bawaan browser: focus trap, tombol Esc, dan backdrop sudah ditangani.
const Dialog = ({ open, onClose, title, children }) => {
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
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
};

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let ignore = false;
    apiClient
      .get('/categories')
      .then((res) => {
        if (!ignore) setCategories(res.data.data ?? []);
      })
      .catch((err) => toast.error(errorMessage(err, 'Gagal memuat daftar kategori')))
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  // Kolom "Jumlah task" muncul kalau backend mengirim TaskCount.
  const showCount = categories.some((c) => typeof c.TaskCount === 'number' || typeof c.task_count === 'number');
  const missingSuggestions = SUGGESTED_CATEGORIES.filter(
    (suggested) => !categories.some((c) => {
      const catName = c?.Name || c?.name || '';
      return catName.toLowerCase() === suggested.toLowerCase();
    })
  );

  const openModal = (category = null) => {
    setEditing(category);
    setName(category?.name || category?.Name || '');
    setModalOpen(true);
  };

  const addSuggested = async (names) => {
    setAdding(true);
    try {
      await Promise.all(names.map((suggested) => apiClient.post('/categories', { name: suggested })));
      toast.success(names.length === 1 ? `Kategori ${names[0]} ditambahkan` : `${names.length} kategori ditambahkan`);
    } catch (err) {
      toast.error(errorMessage(err, 'Gagal menambah kategori'));
    } finally {
      setAdding(false);
      reload();
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
        // PERBAIKAN: Gunakan fallback ID
        const catId = editing?.id || editing?.ID;
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // PERBAIKAN: Gunakan fallback ID
      const catId = toDelete?.id || toDelete?.ID;
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

  return (
    <div className="max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategori</h1>
          <p className="mt-1 text-sm text-muted">Kelompokkan task agar lebih rapi.</p>
        </div>
        <button type="button" onClick={() => openModal()} className="btn btn-primary">
          <Plus size={16} /> Kategori baru
        </button>
      </header>

      {loading ? (
        <p className="text-sm text-muted">Memuat kategori…</p>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Tag size={22} />
          </span>
          <h2 className="mt-4 text-base font-semibold">Belum ada kategori</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Mulai cepat dengan kategori bawaan, atau buat sendiri sesuai kebutuhan.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {STARTER_CATEGORIES.map((starter) => (
              <span key={starter} className="chip">
                {starter}
              </span>
            ))}
          </div>
          <button
            type="button"
            disabled={adding}
            onClick={() => addSuggested(STARTER_CATEGORIES)}
            className="btn btn-primary mt-5"
          >
            {adding ? 'Menambahkan…' : 'Tambah kategori bawaan'}
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {categories.map((category, index) => {
              // Amankan data ID dan Name dari berbagai kemungkinan casing (kapital atau kecil)
              const catId = category?.id || category?.ID;
              const catName = category?.name || category?.Name || 'Kategori Tanpa Nama';
              const taskCount = category?.task_count || category?.TaskCount || 0;

              return (
                <li key={catId || index} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-subtle/60">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Tag size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{catName}</span>
                  {showCount && <span className="text-sm text-muted tabular-nums">{taskCount} task</span>}
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      aria-label={`Ubah ${catName}`}
                      title="Ubah"
                      // Pastikan mengirim data utuh (yang sudah diamankan) ke fungsi modal
                      onClick={() => openModal({ ...category, id: catId, name: catName })}
                      className="icon-btn"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus ${catName}`}
                      title="Hapus"
                      // Pastikan mengirim data utuh ke fungsi hapus
                      onClick={() => setToDelete({ ...category, id: catId, name: catName })}
                      className="icon-btn-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {missingSuggestions.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium text-muted">Saran kategori</h2>
              <div className="flex flex-wrap gap-2">
                {missingSuggestions.map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    disabled={adding}
                    onClick={() => addSuggested([suggested])}
                    className="btn btn-secondary px-3 py-1.5"
                  >
                    <Plus size={14} /> {suggested}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Ubah kategori' : 'Kategori baru'}>
        <form onSubmit={handleSave} className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Nama kategori</span>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misalnya: Proyek pribadi"
              className="input"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog open={Boolean(toDelete)} onClose={() => setToDelete(null)} title="Hapus kategori?">
        <p className="text-sm text-muted">
          {toDelete &&
            `Kategori “${toDelete?.name || toDelete?.Name}” akan dihapus. Task yang memakai kategori ini tidak ikut terhapus; kategorinya dikosongkan.`}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setToDelete(null)} className="btn btn-secondary">
            Batal
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger">
            Ya, hapus
          </button>
        </div>
      </Dialog>
    </div>
  );
};

export default CategoryPage;