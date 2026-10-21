"use client";

import { CheckCircle2, ImagePlus, LoaderCircle, PackagePlus, Trash2, TriangleAlert, UploadCloud } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Category = { id: string; name: string; parentId: string | null };
type MyProduct = { id: string; name: string; price: number; stock: number; image: string; isPublished: number; createdAt: string };
type Preview = { file: File; url: string };

const MAX_FILES = 6;
const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

const field = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-800";
const label = "mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200";

function authHeaders(): HeadersInit {
  try {
    const token = localStorage.getItem("hasi-token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export function DistributorProductForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MyProduct[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previewsRef = useRef<Preview[]>([]);
  previewsRef.current = previews;

  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/distributor/products", { headers: authHeaders() });
      if (response.ok) setProducts(((await response.json()) as { products: MyProduct[] }).products);
    } catch { /* список не критичен */ }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) setCategories(((await response.json()) as { categories: Category[] }).categories);
      } catch { /* форма покажет пустой список */ }
    })();
    void loadProducts();
    return () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, [loadProducts]);

  // Категории: главные с подкатегориями (<optgroup>).
  const grouped = useMemo(() => {
    const mains = categories.filter((c) => !c.parentId);
    return mains.map((main) => ({ main, children: categories.filter((c) => c.parentId === main.id) }));
  }, [categories]);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const accepted: Preview[] = [];
    let problem = "";
    for (const file of Array.from(list)) {
      if (!ACCEPT.split(",").includes(file.type)) { problem = "Поддерживаются только JPEG, PNG и WebP."; continue; }
      if (file.size > MAX_SIZE) { problem = "Каждая фотография — не более 10 МБ."; continue; }
      accepted.push({ file, url: URL.createObjectURL(file) });
    }
    setPreviews((current) => {
      const room = MAX_FILES - current.length;
      if (accepted.length > room) problem = `Можно загрузить не более ${MAX_FILES} фотографий.`;
      accepted.slice(room).forEach((p) => URL.revokeObjectURL(p.url));
      return [...current, ...accepted.slice(0, Math.max(room, 0))];
    });
    setNotice(problem ? { type: "error", text: problem } : null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removePreview(url: string) {
    URL.revokeObjectURL(url);
    setPreviews((current) => current.filter((p) => p.url !== url));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.set("name", name);
      body.set("categoryId", categoryId);
      body.set("brand", brand);
      body.set("price", price);
      body.set("stock", stock || "0");
      body.set("description", description);
      previews.forEach((p) => body.append("images", p.file));
      const response = await fetch("/api/distributor/products", { method: "POST", headers: authHeaders(), body });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не удалось добавить товар.");
      previews.forEach((p) => URL.revokeObjectURL(p.url));
      setPreviews([]);
      setName(""); setBrand(""); setPrice(""); setStock(""); setDescription("");
      setNotice({ type: "ok", text: "Товар добавлен и опубликован в каталоге." });
      void loadProducts();
    } catch (reason) {
      setNotice({ type: "error", text: reason instanceof Error ? reason.message : "Не удалось добавить товар." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 bg-gradient-to-r from-violet-700 to-indigo-600 px-5 py-4 text-white sm:px-8 sm:py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15"><PackagePlus className="h-6 w-6" /></span>
          <div>
            <h2 className="text-lg font-black sm:text-xl">Добавить товар</h2>
            <p className="text-sm text-violet-100">Заполните основное — товар сразу появится в каталоге</p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-5 p-5 sm:p-8 lg:grid-cols-2 lg:gap-8">
          <div className="space-y-5">
            <div>
              <label htmlFor="p-name" className={label}>Название *</label>
              <input id="p-name" required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: IP-камера Hikvision 4 Мп" className={field} />
            </div>
            <div>
              <label htmlFor="p-cat" className={label}>Категория *</label>
              <select id="p-cat" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
                <option value="">Выберите категорию…</option>
                {grouped.map(({ main, children }) => children.length ? (
                  <optgroup key={main.id} label={main.name}>
                    <option value={main.id}>{main.name} — общее</option>
                    {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ) : <option key={main.id} value={main.id}>{main.name}</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label htmlFor="p-brand" className={label}>Бренд</label>
                <input id="p-brand" maxLength={100} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Hikvision" className={field} />
              </div>
              <div>
                <label htmlFor="p-price" className={label}>Цена, сомонӣ *</label>
                <input id="p-price" required type="number" inputMode="numeric" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={field} />
              </div>
              <div>
                <label htmlFor="p-stock" className={label}>Количество *</label>
                <input id="p-stock" required type="number" inputMode="numeric" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className={field} />
              </div>
            </div>
            <div>
              <label htmlFor="p-desc" className={label}>Описание</label>
              <textarea id="p-desc" rows={4} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Коротко о товаре: назначение, особенности, комплектация" className={`${field} resize-y`} />
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <span className={label}>Фотографии</span>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className={`rounded-3xl border-2 border-dashed p-5 text-center transition ${dragging ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60"}`}
              >
                <UploadCloud className="mx-auto h-9 w-9 text-violet-500" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Перетащите фото сюда или</p>
                <input ref={fileInput} id="p-files" type="file" accept={ACCEPT} multiple className="sr-only" onChange={(e) => addFiles(e.currentTarget.files)} />
                <label htmlFor="p-files" className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500 focus-within:ring-4 focus-within:ring-violet-500/30">
                  <ImagePlus className="h-4 w-4" /> Выбрать файл
                </label>
                <p className="mt-3 text-xs text-slate-500">JPEG, PNG или WebP · до {MAX_FILES} фото · до 10 МБ каждое</p>
              </div>

              {previews.length > 0 ? (
                <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {previews.map((p, index) => (
                    <li key={p.url} className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`Фото ${index + 1}`} className="h-full w-full object-cover" />
                      {index === 0 ? <span className="absolute left-1.5 top-1.5 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">Главное</span> : null}
                      <button type="button" onClick={() => removePreview(p.url)} aria-label={`Удалить фото ${index + 1}`} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-auto space-y-3">
              {notice ? (
                <div role="status" className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${notice.type === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"}`}>
                  {notice.type === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
                  {notice.text}
                </div>
              ) : null}
              <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-600 px-6 py-4 text-base font-black text-white shadow-lg shadow-violet-700/25 transition hover:brightness-110 disabled:opacity-60">
                {busy ? <><LoaderCircle className="h-5 w-5 animate-spin" /> Публикуем…</> : <><PackagePlus className="h-5 w-5" /> Добавить товар</>}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Мои товары ({products.length})</h2>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Вы ещё не добавили ни одного товара.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  ) : <ImagePlus className="h-5 w-5 text-slate-400" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.price} сомонӣ · в наличии: {p.stock}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
