"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  Check,
  ChevronLeft,
  ClipboardList,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Gauge,
  Globe,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Monitor,
  MousePointerClick,
  Package,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PhotosEditor, type PhotosValue } from "@/components/shop/admin/PhotosEditor";
import { TemplateEditor } from "@/components/shop/admin/TemplateEditor";
import { ContentEditor } from "@/components/shop/admin/ContentEditor";
import { SettingsEditor } from "@/components/shop/admin/SettingsEditor";
import { SeoEditor } from "@/components/shop/admin/SeoEditor";
import { ProductSpecsQuick } from "@/components/shop/admin/ProductSpecsQuick";
import { LangField } from "@/components/shop/admin/primitives";
import type { L } from "@/lib/shop/data";

/**
 * Панель управления TBS Inform: статистика посещаемости, заявки, модерация
 * отзывов и редактор товаров. Доступ по паролю → подписанная cookie
 * (7 дней). Пароль меняется переменной окружения ADMIN_PASSWORD.
 */

interface LeadRec {
  id: string;
  name: string;
  phone: string;
  message: string | null;
  product: string | null;
  done: boolean;
  createdAt: string;
}

interface ReviewRec {
  id: string;
  productSlug: string;
  name: string;
  rating: number;
  text: string;
  hidden: boolean;
  createdAt: string;
}

interface ProductRec {
  slug: string;
  brand: string;
  name: string;
  short: string;
  ru: string;
  uz: string;
  en: string;
  img: string;
  hover: string;
  gallery: string[];
  video: string;
  videoTitle: L | null;
  videoBase: string;
  videoHidden: boolean;
  imgBase: string;
  hoverBase: string;
  galleryBase: string[];
  cats: string[]; // слаги типов (первый — надпись на карточке)
  catsBase: string[]; // слаги типов эталона — чтобы не сохранять без изменений
  isCustom: boolean;
  changed: boolean;
  hidden: boolean;
  updatedAt: string | null;
}

interface P75 {
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}

interface Vitals {
  n: number; // сколько просмотров с замерами за 30 дней
  all: P75;
  mobile: P75;
  desktop: P75;
}

interface Stats {
  today: number;
  yesterday: number;
  d7: number;
  d30: number;
  total: number;
  online: number;
  unique24: number;
  unique30: number;
  days: { date: string; count: number }[];
  topPages: { key: string; count: number }[];
  refs: { key: string; count: number }[];
  devices: { key: string; count: number }[];
  langs: { key: string; count: number }[];
  searchTerms: { key: string; count: number }[];
  vitals: Vitals;
}

type Tab = "overview" | "leads" | "reviews" | "products" | "seo" | "template" | "content" | "settings";

interface LogRec {
  ts: number;
  action: string;
  detail?: string;
}

const dtf = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const nf = new Intl.NumberFormat("ru-RU");

const shortDate = (iso: string) => iso.slice(8, 10) + "." + iso.slice(5, 7);

const DEVICE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  mobile: { label: "Телефоны", icon: <Smartphone className="h-4 w-4" /> },
  tablet: { label: "Планшеты", icon: <Tablet className="h-4 w-4" /> },
  desktop: { label: "Компьютеры", icon: <Monitor className="h-4 w-4" /> },
};

// Пороговые значения Core Web Vitals (как в Google): ≤good — зелёный,
// ≤mid — жёлтый, выше — красный. CLS — безразмерная величина.
const VITAL_META: {
  key: keyof P75;
  label: string;
  unit: string;
  good: number;
  mid: number;
  hint: string;
  frac?: boolean;
}[] = [
  { key: "lcp", label: "LCP", unit: " мс", good: 2500, mid: 4000, hint: "отрисовка основного контента" },
  { key: "inp", label: "INP", unit: " мс", good: 200, mid: 500, hint: "отклик на касание" },
  { key: "cls", label: "CLS", unit: "", good: 0.1, mid: 0.25, hint: "стабильность макета", frac: true },
  { key: "ttfb", label: "TTFB", unit: " мс", good: 800, mid: 1800, hint: "ответ сервера" },
  { key: "fcp", label: "FCP", unit: " мс", good: 1800, mid: 3000, hint: "первый контент на экране" },
];

const vitalTone = (v: number | null, good: number, mid: number) =>
  v == null ? "bg-slate-300" : v <= good ? "bg-emerald-500" : v <= mid ? "bg-amber-500" : "bg-rose-500";

const vitalText = (v: number | null, frac?: boolean) =>
  v == null ? "—" : frac ? v.toFixed(2) : nf.format(Math.round(v));

export function AdminView() {
  const { toast } = useToast();
  const [pwd, setPwd] = useState("");
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  const [leads, setLeads] = useState<LeadRec[]>([]);
  const [reviews, setReviews] = useState<ReviewRec[]>([]);
  const [products, setProducts] = useState<ProductRec[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<LogRec[]>([]);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    slug: string;
    brand: string;
    cats: string[];
    catsBase: string[];
    isNew: boolean;
    name: string;
    short: string;
    ru: string;
    uz: string;
    en: string;
    hidden: boolean;
    photos: PhotosValue;
    photosBase: PhotosValue;
    video: string;
    videoTitle: L;
    hideVideo: boolean;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [leadFilter, setLeadFilter] = useState<"all" | "new" | "done">("all");
  const [leadQuery, setLeadQuery] = useState("");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [translating, setTranslating] = useState<"ru" | "uz" | "en" | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/sluzhebnoe/stats");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const json = await res.json();
      if (json.ok) setStats(json as Stats);
    } catch {
      /* офлайн */
    }
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/sluzhebnoe");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const json = await res.json();
      if (json.ok) {
        setLeads(json.leads as LeadRec[]);
        setReviews(json.reviews as ReviewRec[]);
        setProducts(json.products as ProductRec[]);
        setLog((json.log ?? []) as LogRec[]);
        setAuthed(true);
      }
    } catch {
      setAuthed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/sluzhebnoe/me");
        const json = await res.json();
        if (json.ok && json.authed) {
          setAuthed(true);
          await Promise.all([load(), loadStats()]);
        } else {
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, [load, loadStats]);

  // Обзор: автообновление раз в минуту
  useEffect(() => {
    if (authed !== true || tab !== "overview") return;
    const t = window.setInterval(() => void loadStats(), 60_000);
    return () => window.clearInterval(t);
  }, [authed, tab, loadStats]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/sluzhebnoe/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        setPwd("");
        await Promise.all([load(), loadStats()]);
      } else {
        setAuthed(false);
        toast({ description: "Неверный пароль", variant: "destructive", duration: 2500 });
      }
    } catch {
      toast({ description: "Ошибка соединения", variant: "destructive", duration: 2500 });
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await fetch("/api/sluzhebnoe/logout", { method: "POST" });
    setAuthed(false);
    setStats(null);
    setEditing(null);
    setDraft(null);
  };

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch("/api/sluzhebnoe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      await fetch("/api/sluzhebnoe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (p: ProductRec) => {
    setEditing(p.slug);
    setDraft({
      slug: p.slug,
      brand: p.brand,
      cats: [...p.cats],
      catsBase: [...p.catsBase],
      isNew: false,
      name: p.name,
      short: p.short,
      ru: p.ru,
      uz: p.uz,
      en: p.en,
      hidden: p.hidden,
      photos: { img: p.img, hover: p.hover, gallery: [...p.gallery] },
      photosBase: { img: p.imgBase, hover: p.hoverBase, gallery: [...p.galleryBase] },
      video: p.video,
      videoTitle: p.videoTitle ?? { ru: "", uz: "", en: "" },
      hideVideo: p.videoHidden,
    });
    setSavedFlash(null);
    window.setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const CATS: { slug: string; label: string }[] = [
    { slug: "lyubitelskie", label: "Любительские" },
    { slug: "portativnye", label: "Портативные" },
    { slug: "mobilnye", label: "Мобильные" },
    { slug: "analogovye", label: "Аналоговые" },
    { slug: "poc", label: "POC" },
    { slug: "retranslyatory", label: "Ретрансляторы" },
  ];

  // Единственное число — как надпись выводится на карточке товара
  const CAT_ONE: Record<string, string> = {
    lyubitelskie: "Любительская радиостанция",
    portativnye: "Портативная радиостанция",
    mobilnye: "Мобильная радиостанция",
    analogovye: "Аналоговая радиостанция",
    poc: "Радиостанция POC",
    lte: "Радиостанция LTE",
    retranslyatory: "Ретранслятор",
  };

  const BRANDS_LIST = ["Hytera", "Kenwood", "Kirisun", "Lisheng", "Talkpod", "Telo Systems", "Yanton"];

  const startCreate = () => {
    setEditing("new");
    setDraft({
      slug: "",
      brand: BRANDS_LIST[0],
      cats: ["portativnye"],
      catsBase: [],
      isNew: true,
      name: "",
      short: "",
      ru: "",
      uz: "",
      en: "",
      hidden: false,
      photos: { img: "", hover: "", gallery: [] },
      photosBase: { img: "", hover: "", gallery: [] },
      video: "",
      videoTitle: { ru: "", uz: "", en: "" },
      hideVideo: false,
    });
    setSavedFlash(null);
    window.setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const saveProduct = async () => {
    if (!editing || !draft) return;
    if (draft.isNew) {
      if (!draft.slug.trim() || !draft.name.trim() || !draft.photos.img.trim()) {
        toast({
          description: "Для нового товара обязательны: адрес (slug), название и главное фото",
          variant: "destructive",
          duration: 3500,
        });
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/sluzhebnoe/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.isNew ? draft.slug.trim() : editing,
          name: draft.name,
          short: draft.short,
          brand: draft.isNew ? draft.brand : undefined,
          // Категории: для нового — выбранные; для существующего — только если
          // изменились (первый элемент = тип на карточке)
          cats:
            draft.isNew || JSON.stringify(draft.cats) !== JSON.stringify(draft.catsBase)
              ? draft.cats
              : undefined,
          ru: draft.ru,
          uz: draft.uz,
          en: draft.en,
          hidden: draft.hidden,
          img: draft.photos.img,
          hover: draft.photos.hover,
          gallery: draft.photos.gallery,
          // Видео: "" = эталон, "none" = скрыть, иначе YouTube-ID/ссылка
          video: draft.video === "" ? (draft.hideVideo ? "none" : "") : draft.video,
          videoTitle: draft.videoTitle,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setSavedFlash(editing);
        toast({ description: "Сохранено — изменения применены на сайте", duration: 2500 });
        await load();
      } else {
        toast({ description: "Не удалось сохранить", variant: "destructive", duration: 2500 });
      }
    } finally {
      setBusy(false);
    }
  };

  // Дублирование товара: копия открывается как «Новый товар» со всеми полями,
  // фотографиями и видео исходника — достаточно поправить slug и сохранить.
  const duplicateProduct = (p: ProductRec) => {
    const base = p.slug + "-kopiya";
    let slug = base;
    let n = 2;
    const taken = new Set(products.map((x) => x.slug));
    while (taken.has(slug)) slug = `${base}-${n++}`;
    setEditing("new");
    setDraft({
      slug,
      brand: p.brand,
      cats: [...p.cats],
      catsBase: [],
      isNew: true,
      name: `${p.name} — копия`,
      short: p.short,
      ru: p.ru,
      uz: p.uz,
      en: p.en,
      hidden: false,
      photos: { img: p.img, hover: p.hover, gallery: [...p.gallery] },
      photosBase: { img: p.img, hover: p.hover, gallery: [...p.gallery] },
      video: p.video,
      videoTitle: p.videoTitle ?? { ru: "", uz: "", en: "" },
      hideVideo: p.videoHidden,
    });
    setSavedFlash(null);
    toast({ description: "Копия готова: проверьте адрес (slug) и нажмите «Сохранить»", duration: 4000 });
    window.setTimeout(() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const resetProduct = async (slug: string) => {
    const rec = products.find((p) => p.slug === slug);
    const isCustom = rec?.isCustom ?? false;
    const ok = window.confirm(
      isCustom
        ? "Удалить этот товар с сайта полностью?"
        : "Сбросить все правки этого товара к эталонной версии?",
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sluzhebnoe/products?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        toast({
          description: isCustom ? "Товар удалён с сайта" : "Правки сброшены к эталону",
          duration: 2500,
        });
        setEditing(null);
        setDraft(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  // Автоперевод описаний: RU → UZ / RU → EN (и обратно из UZ) — кнопки в редакторе
  const translateDesc = async (from: "ru" | "uz" | "en", to: "ru" | "uz" | "en") => {
    if (!draft) return;
    const src = draft[from].trim();
    if (!src) {
      toast({
        description: `Описание ${from.toUpperCase()} пустое — сначала заполните его`,
        variant: "destructive",
        duration: 2500,
      });
      return;
    }
    setTranslating(to);
    try {
      const res = await fetch("/api/sluzhebnoe/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: src, from, to }),
      });
      const json = await res.json();
      if (json.ok && json.text) {
        setDraft((d) => (d ? { ...d, [to]: json.text as string } : d));
        toast({ description: `Описание ${to.toUpperCase()} заполнено автопереводом`, duration: 2500 });
      } else {
        toast({
          description: json.hint ?? "Перевод не удался — сервис недоступен, попробуйте позже",
          variant: "destructive",
          duration: 3500,
        });
      }
    } catch {
      toast({ description: "Ошибка соединения с сервисом перевода", variant: "destructive", duration: 3000 });
    } finally {
      setTranslating(null);
    }
  };

  // Пакетный автоперевод каталога: заполняет пустые UZ/EN из RU по всем товарам
  const bulkTranslate = async () => {
    const need = products.filter((p) => p.ru.trim() && (!p.uz.trim() || !p.en.trim()));
    if (!need.length) return;
    const est = Math.max(1, Math.ceil(need.length / 8));
    if (
      !window.confirm(
        `Автоперевод каталога: заполним пустые описания UZ/EN переводом из RU для ${need.length} товаров (~${est} мин). Существующие переводы не изменяются. Продолжить?`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/sluzhebnoe/translate-bulk", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        const tail = json.failed?.length ? `, ошибок: ${json.failed.length}` : "";
        const rem = json.remaining ? `. Осталось ${json.remaining} — нажмите кнопку ещё раз` : "";
        toast({
          description: `Переведено товаров: ${json.done.length}${tail}${rem}`,
          duration: 7000,
        });
        await load();
      } else {
        toast({
          description: "Пакетный перевод не удался, попробуйте позже",
          variant: "destructive",
          duration: 3500,
        });
      }
    } catch {
      toast({ description: "Ошибка соединения", variant: "destructive", duration: 3000 });
    } finally {
      setBusy(false);
    }
  };

  // Импорт каталога из JSON (файл в формате экспорта ?what=catalog)
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяет повторно выбрать тот же файл
    if (!file) return;
    setBusy(true);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        toast({ description: "Файл не является корректным JSON", variant: "destructive", duration: 3500 });
        return;
      }
      const res = await fetch("/api/sluzhebnoe/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        const errTail = json.errors?.length ? `, ошибок: ${json.errors.length}` : "";
        toast({
          description: `Импорт завершён — новых: ${json.created}, обновлено: ${json.updated}, без изменений: ${json.unchanged}${errTail}`,
          duration: 6000,
        });
        await load();
      } else {
        toast({
          description: json.hint ?? "Импорт не удался — проверьте формат файла",
          variant: "destructive",
          duration: 4000,
        });
      }
    } catch {
      toast({ description: "Ошибка чтения файла", variant: "destructive", duration: 3000 });
    } finally {
      setBusy(false);
    }
  };

  // ── Вход ──
  if (authed !== true) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#f1f5f9] text-[#0369a1]">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Панель управления</h1>
          <p className="mt-1 text-sm text-slate-500">Введите пароль администратора.</p>
          <form onSubmit={login} className="mt-5 space-y-3">
            <input
              type="password"
              required
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Пароль"
              aria-label="Пароль администратора"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-[#0284c7] py-3 text-[15px] font-bold text-white transition-colors hover:bg-[#075985] disabled:opacity-60"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filtered = products.filter(
    (p) =>
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.slug.toLowerCase().includes(query.toLowerCase()) ||
      p.brand.toLowerCase().includes(query.toLowerCase()),
  );
  const editedRec = products.find((p) => p.slug === editing) ?? null;
  const maxDay = stats ? Math.max(1, ...stats.days.map((d) => d.count)) : 1;

  // Топ страниц: /product/<slug> показываем названием товара
  const pageLabel = (() => {
    const m = new Map(products.map((p) => [`/product/${p.slug}`, p.name]));
    return (key: string) => m.get(key) ?? key;
  })();

  // Популярные модели: только страницы товаров из топа, максимум 10
  const topModels = stats
    ? stats.topPages.filter((r) => r.key.startsWith("/product/")).slice(0, 10)
    : [];

  // Заявки: фильтр + поиск
  const leadsShown = leads.filter((l) => {
    if (leadFilter === "new" && l.done) return false;
    if (leadFilter === "done" && !l.done) return false;
    const q = leadQuery.trim().toLowerCase();
    if (!q) return true;
    return [l.name, l.phone, l.product ?? "", l.message ?? ""].some((v) => v.toLowerCase().includes(q));
  });

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "overview", label: "Обзор", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "leads", label: "Заявки", icon: <ClipboardList className="h-4 w-4" />, count: leads.filter((l) => !l.done).length },
    { key: "reviews", label: "Отзывы", icon: <MessageSquare className="h-4 w-4" />, count: reviews.length },
    { key: "products", label: "Товары", icon: <Package className="h-4 w-4" />, count: products.length },
    { key: "seo", label: "SEO", icon: <Globe className="h-4 w-4" /> },
    { key: "template", label: "Шаблон", icon: <Palette className="h-4 w-4" /> },
    { key: "content", label: "Контент", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "settings", label: "Настройки", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Панель управления</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void Promise.all([load(), loadStats()])}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-[#0284c7] hover:text-[#0369a1] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Обновить
          </button>
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-red-300 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            aria-current={tab === tb.key}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === tb.key
                ? "bg-[#0284c7] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-[#0284c7] hover:text-[#0369a1]"
            }`}
          >
            {tb.icon}
            {tb.label}
            {tb.count !== undefined && tb.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${tab === tb.key ? "bg-white/20" : "bg-slate-100"}`}>
                {nf.format(tb.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Обзор: посещаемость ── */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          {!stats ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" aria-hidden />
              ))}
            </div>
          ) : (
            <>
              {/* Карточки показателей */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Сегодня" value={stats.today} accent />
                <StatCard label="Вчера" value={stats.yesterday} />
                <StatCard label="7 дней" value={stats.d7} />
                <StatCard label="30 дней" value={stats.d30} />
                <StatCard label="Всего просмотров" value={stats.total} />
                <StatCard label="Уникальные · 24ч" value={stats.unique24} />
              </div>

              {/* Онлайн + график */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                    <BarChart3 className="h-4 w-4 text-[#0284c7]" />
                    Просмотры за 30 дней
                  </h2>
                  <div className="flex items-center gap-2">
                    <a
                      href="/api/sluzhebnoe/stats?format=csv"
                      download
                      title="Скачать просмотры по дням (CSV для Excel)"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-[#0284c7] hover:text-[#0369a1]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Экспорт CSV
                    </a>
                    <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      сейчас на сайте: {nf.format(stats.online)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex h-32 items-end gap-[3px] sm:h-40">
                  {stats.days.map((d) => (
                    <div
                      key={d.date}
                      title={`${shortDate(d.date)} — ${nf.format(d.count)} просм.`}
                      className="group relative flex-1 rounded-t bg-[#0284c7]/85 transition-colors hover:bg-[#0369a1]"
                      style={{ height: `${Math.max(d.count === 0 ? 2 : 6, (d.count / maxDay) * 100)}%`, minWidth: 3 }}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold whitespace-nowrap text-white group-hover:block"
                      >
                        {shortDate(d.date)}: {nf.format(d.count)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>{shortDate(stats.days[0]?.date ?? "")}</span>
                  <span>{shortDate(stats.days[14]?.date ?? "")}</span>
                  <span>сегодня</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Максимум за день: {nf.format(maxDay)} · уникальные посетители за 30 дней: {nf.format(stats.unique30)}
                </p>
              </div>

              {/* Популярные модели: страницы товаров из топа за 30 дней, клик — открыть на редактирование */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                    <Package className="h-4 w-4 text-[#0284c7]" />
                    Популярные модели
                  </h2>
                  <span className="text-xs font-semibold text-slate-400">за 30 дней · страницы товаров</span>
                </div>
                {topModels.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Пока нет просмотров карточек — список появится автоматически.
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {topModels.map((r, i) => {
                      const rec = products.find((q) => q.slug === r.key.slice("/product/".length));
                      return (
                        <li key={r.key}>
                          <button
                            type="button"
                            onClick={() => {
                              setTab("products");
                              if (rec) openEditor(rec);
                            }}
                            title="Открыть модель во вкладке «Товары»"
                            className="group flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-sky-50/70"
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                              {i + 1}
                            </span>
                            <span className="relative h-10 w-10 shrink-0 rounded-md bg-white ring-1 ring-slate-100">
                              {rec && (
                                <Image src={rec.img} alt="" fill sizes="40px" className="object-contain p-0.5" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-[#0284c7]">
                                {rec?.name ?? pageLabel(r.key)}
                              </span>
                              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                {rec?.brand ?? ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-sm font-bold text-slate-900">{nf.format(r.count)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Видно, какие модели интересуют покупателей. Клик по строке открывает модель во вкладке «Товары».
                </p>
              </div>

              {/* Журнал действий администратора */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                  <ClipboardList className="h-4 w-4 text-[#0284c7]" />
                  Последние действия в панели
                </h2>
                {log.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Здесь появится история изменений: товары, SEO, контент, настройки.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2.5">
                    {log.slice(0, 8).map((e, i) => (
                      <li key={`${e.ts}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                        <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-[#0284c7]" aria-hidden />
                        <span className="font-semibold text-slate-700">{e.action}</span>
                        {e.detail && <span className="min-w-0 max-w-[420px] truncate font-mono text-xs text-slate-400">{e.detail}</span>}
                        <span className="ml-auto shrink-0 text-xs text-slate-400">{dtf.format(new Date(e.ts))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Топ страниц + источники */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                    <MousePointerClick className="h-4 w-4 text-[#0284c7]" />
                    Популярные страницы
                  </h2>
                  {stats.topPages.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">Данные появятся после первых визитов.</p>
                  ) : (
                    <ul className="mt-4 space-y-2.5">
                      {stats.topPages.map((r) => (
                        <li key={r.key}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-semibold text-slate-700" title={r.key}>
                              {pageLabel(r.key)}
                            </span>
                            <span className="shrink-0 font-bold text-slate-900">{nf.format(r.count)}</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#0284c7]/70"
                              style={{ width: `${(r.count / stats.topPages[0].count) * 100}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                      <Globe className="h-4 w-4 text-[#0284c7]" />
                      Источники трафика
                    </h2>
                    {stats.refs.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-400">Пока только прямые заходы.</p>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {stats.refs.map((r) => (
                          <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-semibold text-slate-700">{r.key}</span>
                            <span className="shrink-0 font-bold text-slate-900">{nf.format(r.count)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-[15px] font-extrabold text-slate-900">Устройства</h2>
                      <ul className="mt-3 space-y-2">
                        {stats.devices.length === 0 && <li className="text-sm text-slate-400">Нет данных</li>}
                        {stats.devices.map((d) => (
                          <li key={d.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 text-slate-600">
                              {DEVICE_META[d.key]?.icon}
                              {DEVICE_META[d.key]?.label ?? d.key}
                            </span>
                            <span className="font-bold text-slate-900">{nf.format(d.count)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h2 className="text-[15px] font-extrabold text-slate-900">Языки сайта</h2>
                      <ul className="mt-3 space-y-2">
                        {stats.langs.length === 0 && <li className="text-sm text-slate-400">Нет данных</li>}
                        {stats.langs.map((l) => (
                          <li key={l.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-slate-600">{l.key.toUpperCase()}</span>
                            <span className="font-bold text-slate-900">{nf.format(l.count)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Поисковые запросы посетителей */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-slate-900">
                  <Search className="h-4 w-4 text-[#0284c7]" />
                  Популярные поисковые запросы
                  <span className="text-xs font-semibold text-slate-400">за 30 дней · живой поиск в шапке сайта</span>
                </h2>
                {stats.searchTerms.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Пока никто не искал — запросы появятся здесь автоматически.
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.searchTerms.map((r, i) => (
                      <li key={r.key} className="flex items-center gap-3 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{r.key}</span>
                        <span className="shrink-0 font-bold text-slate-900">{nf.format(r.count)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  Запросы показывают, чего не хватает в каталоге: если посетители ищут модель, которой нет на сайте —
                  добавьте её во вкладке «Товары».
                </p>
              </div>

              {/* Фактическая скорость: Core Web Vitals от реальных посетителей (RUM) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold text-slate-900">
                  <Gauge className="h-4 w-4 text-[#0284c7]" />
                  Фактическая скорость — Core Web Vitals
                  <span className="text-xs font-semibold text-slate-400">
                    p75 за 30 дней · замеров: {nf.format(stats.vitals.n)}
                  </span>
                </h2>
                {stats.vitals.n === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">
                    Замеры появятся с первыми визитами: сайт снимает LCP/INP/CLS/TTFB прямо в браузере посетителей —
                    как PageSpeed Insights, но на собственных данных, без лабораторной эмуляции.
                  </p>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {VITAL_META.map((m) => {
                        const v = stats.vitals.all[m.key];
                        return (
                          <div key={m.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                              <span className={`h-2 w-2 rounded-full ${vitalTone(v, m.good, m.mid)}`} />
                              {m.label}
                            </div>
                            <div className="mt-1 text-xl font-extrabold text-slate-900">
                              {vitalText(v, m.frac)}
                              {v != null && m.unit}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">{m.hint}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      {(["mobile", "desktop"] as const).map((d) => (
                        <div key={d} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-slate-100 px-3 py-2.5">
                          <span className="flex items-center gap-1.5 font-bold text-slate-700">
                            {DEVICE_META[d]?.icon}
                            {DEVICE_META[d]?.label}
                          </span>
                          {VITAL_META.map((m) => {
                            const v = stats.vitals[d][m.key];
                            return (
                              <span key={m.key} className="flex items-center gap-1 text-slate-500">
                                <span className={`h-1.5 w-1.5 rounded-full ${vitalTone(v, m.good, m.mid)}`} />
                                {m.label}
                                <b className="text-slate-900">
                                  {vitalText(v, m.frac)}
                                  {v != null && m.unit}
                                </b>
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                      Цвета — по порогам Google для 75% посетителей: LCP ≤ 2,5 с, INP ≤ 200 мс, CLS ≤ 0,1,
                      TTFB ≤ 0,8 с, FCP ≤ 1,8 с — «хорошо» (зелёный); до 4 с / 500 мс / 0,25 / 1,8 с / 3 с — «можно лучше».
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Заявки ── */}
      {tab === "leads" && (
        <div className="mt-6 space-y-4">
          {/* Фильтр, поиск и экспорт */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {(
                [
                  ["all", `Все (${leads.length})`],
                  ["new", `Новые (${leads.filter((l) => !l.done).length})`],
                  ["done", `Обработанные (${leads.filter((l) => l.done).length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setLeadFilter(key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    leadFilter === key ? "bg-[#0284c7] text-white" : "text-slate-500 hover:text-[#0369a1]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={leadQuery}
                onChange={(e) => setLeadQuery(e.target.value)}
                placeholder="Поиск: имя, телефон, товар…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
              />
            </div>
            <a
              href="/api/sluzhebnoe/export?what=leads"
              download
              title="Скачать заявки в CSV (Excel)"
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-500 shadow-sm transition-colors hover:border-[#0284c7] hover:text-[#0369a1]"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт CSV
            </a>
          </div>

          {leads.length === 0 && <Empty text="Заявок пока нет" />}
          {leads.length > 0 && leadsShown.length === 0 && <Empty text="По фильтру ничего не найдено" />}
          {leadsShown.map((l) => (
            <div
              key={l.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-5 shadow-sm transition-opacity ${
                l.done ? "border-slate-100 opacity-60" : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {l.name} <span className="text-sm font-normal text-slate-500">· {l.phone}</span>
                  {l.done && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      <Check className="h-3 w-3" />
                      Обработано
                    </span>
                  )}
                </p>
                {l.product && <p className="mt-0.5 text-sm font-semibold text-[#0369a1]">{l.product}</p>}
                {l.message && <p className="mt-1 text-sm text-slate-600">{l.message}</p>}
                <p className="mt-1 text-xs text-slate-400">{dtf.format(new Date(l.createdAt))}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => void patch({ type: "lead", id: l.id, done: !l.done })}
                  aria-label={l.done ? "Вернуть в работу" : "Отметить обработанной"}
                  title={l.done ? "Вернуть в работу" : "Отметить обработанной"}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                    l.done ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                >
                  <BadgeCheck className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void remove({ type: "lead", id: l.id })}
                  aria-label="Удалить"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Отзывы (модерация) ── */}
      {tab === "reviews" && (
        <div className="mt-6 space-y-4">
          {reviews.length === 0 && <Empty text="Отзывов пока нет" />}
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-5 shadow-sm transition-opacity ${
                r.hidden ? "border-slate-100 opacity-60" : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">
                  {r.name}
                  <span className="ml-2 text-sky-500">{"★".repeat(r.rating)}</span>
                  <span className="text-slate-300">{"★".repeat(5 - r.rating)}</span>
                  {r.hidden && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      <EyeOff className="h-3 w-3" />
                      Скрыт
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {r.productSlug} · {dtf.format(new Date(r.createdAt))}
                </p>
                <p className="mt-1.5 text-sm text-slate-600">{r.text}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => void patch({ type: "review", id: r.id, hidden: !r.hidden })}
                  aria-label={r.hidden ? "Опубликовать" : "Скрыть с сайта"}
                  title={r.hidden ? "Опубликовать" : "Скрыть с сайта"}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-sky-50 hover:text-[#0284c7]"
                >
                  {r.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => void remove({ type: "review", id: r.id })}
                  aria-label="Удалить"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Товары (редактор) ── */}
      {tab === "products" && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]" ref={listRef}>
          {/* Список */}
          <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${editing ? "hidden lg:block" : ""}`}>
            <div className="space-y-2 border-b border-slate-100 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск: модель, бренд…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={startCreate}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0284c7] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0369a1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Добавить товар
                </button>
                <a
                  href="/api/sluzhebnoe/export?what=catalog"
                  download
                  title="Скачать весь каталог в JSON"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-[#0284c7] hover:text-[#0369a1]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Каталог
                </a>
                <label
                  title="Загрузить товары из JSON — новые добавятся, у существующих обновятся отличия"
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-[#0284c7] hover:text-[#0369a1] ${busy ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Импорт
                  <input
                    type="file"
                    accept=".json,application/json"
                    disabled={busy}
                    onChange={(e) => void onImportFile(e)}
                    className="hidden"
                  />
                </label>
              </div>
              {(() => {
                const need = products.filter((p) => p.ru.trim() && (!p.uz.trim() || !p.en.trim())).length;
                return (
                  <button
                    onClick={() => void bulkTranslate()}
                    disabled={busy || need === 0}
                    title={
                      need
                        ? `Заполнить пустые описания UZ/EN переводом из RU для ${need} товаров`
                        : "Все описания уже переведены на все языки"
                    }
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-[#0369a1] transition-colors hover:bg-sky-100 disabled:opacity-40"
                  >
                    <Languages className="h-3.5 w-3.5" />
                    {need ? `Автоперевод каталога (${need})` : "Все описания переведены"}
                  </button>
                );
              })()}
            </div>
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.slug}>
                  <button
                    onClick={() => openEditor(p)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-sky-50/60 ${
                      editing === p.slug ? "bg-sky-50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{p.name}</span>
                      <span className="block text-xs text-slate-400">{p.brand}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {p.isCustom && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">новый</span>
                      )}
                      {p.changed && !p.isCustom && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-[#0369a1]">изменён</span>
                      )}
                      {p.hidden && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">скрыт</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">Ничего не найдено</li>}
            </ul>
          </div>

          {/* Редактор */}
          <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${editing ? "" : "hidden lg:flex lg:items-center lg:justify-center"}`}>
            {!editing || !draft ? (
              <p className="px-6 py-16 text-center text-sm text-slate-400">
                Выберите товар слева — название, описания (RU/UZ/EN) и все фотографии можно править прямо здесь.
              </p>
            ) : (
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditing(null);
                        setDraft(null);
                      }}
                      aria-label="К списку"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:text-slate-800 lg:hidden"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <p className="text-[15px] font-extrabold text-slate-900">
                        {draft.isNew ? "Новый товар" : (editedRec?.name ?? editing)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {draft.isNew ? "появится на сайте сразу после сохранения" : editing}
                      </p>
                    </div>
                  </div>
                  {!draft.isNew && (
                    <button
                      onClick={() => editedRec && duplicateProduct(editedRec)}
                      disabled={busy}
                      title="Создать копию этого товара со всеми фото и описаниями"
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition-colors hover:border-[#0284c7] hover:text-[#0369a1] disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Дублировать
                    </button>
                  )}
                  {!draft.isNew && (editedRec?.changed || editedRec?.hidden || editedRec?.isCustom) && (
                    <button
                      onClick={() => void resetProduct(editing)}
                      disabled={busy}
                      className={`flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                        editedRec?.isCustom
                          ? "border-red-200 text-red-500 hover:border-red-300 hover:bg-red-50"
                          : "border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600"
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {editedRec?.isCustom ? "Удалить товар" : "Сбросить к эталону"}
                    </button>
                  )}
                </div>

                {/* Поля нового товара: адрес, бренд, категория */}
                {draft.isNew && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                        Адрес страницы (slug) — латиницей, через дефис
                      </span>
                      <input
                        value={draft.slug}
                        onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-{2,}/g, "-") })}
                        placeholder="например baofeng-uv-5r"
                        spellCheck={false}
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Страница: /product/{draft.slug || "…"}
                      </span>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Бренд</span>
                      <select
                        value={draft.brand}
                        onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                      >
                        {BRANDS_LIST.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {/* Тип на карточке + категории — для любого товара (нового и эталонного).
                    Первый элемент cats — надпись над названием на карточке. */}
                <div className="mt-4 grid gap-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Надпись на карточке — тип товара
                    </span>
                    <select
                      value={draft.cats[0] ?? ""}
                      onChange={(e) => {
                        const s = e.target.value;
                        if (!s) return;
                        setDraft({ ...draft, cats: [s, ...draft.cats.filter((x) => x !== s)] });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                    >
                      {!draft.cats.length && <option value="">— не выбрано —</option>}
                      {CATS.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {CAT_ONE[c.slug] ?? c.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Единственное число: «Портативная радиостанция», «Мобильная радиостанция», «Ретранслятор». Выбор перемещает тип на первое место — он и выводится над названием.
                    </span>
                  </label>
                  <div>
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
                      Категории (фильтры каталога)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {CATS.map((c) => {
                        const on = draft.cats.includes(c.slug);
                        return (
                          <button
                            key={c.slug}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                cats: on ? draft.cats.filter((x) => x !== c.slug) : [...draft.cats, c.slug],
                              })
                            }
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                              on ? "bg-[#0284c7] text-white" : "border border-slate-200 bg-white text-slate-500 hover:border-[#0284c7] hover:text-[#0369a1]"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    <span className="mt-1 block text-[11px] text-slate-400">
                      Брендовая категория («Радиостанции Kirisun» и т.п.) сохраняется автоматически.
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Название</span>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Краткое имя (карточка)</span>
                    <input
                      value={draft.short}
                      onChange={(e) => setDraft({ ...draft, short: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                    />
                  </label>
                </div>

                {/* Характеристики товара: выбрал модель → задал строки «параметр — значение» */}
                {draft.isNew ? (
                  <p className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-xs leading-relaxed text-slate-400">
                    Характеристики «параметр — значение» можно будет задать сразу после сохранения товара.
                  </p>
                ) : (
                  <div className="mt-5">
                    <ProductSpecsQuick slug={editing} />
                  </div>
                )}

                {(
                  [
                    ["ru", "Описание RU", ["uz"] as const],
                    ["uz", "Описание UZ", ["ru"] as const],
                    ["en", "Описание EN", ["ru"] as const],
                  ] as const
                ).map(([key, label, sources]) => (
                  <label key={key} className="mt-4 block">
                    <span className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {label} — абзацы через пустую строку
                      </span>
                      <span className="flex gap-1.5">
                        {sources.map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => void translateDesc(src, key)}
                            disabled={busy || translating !== null || !draft[src].trim()}
                            title={`Автоперевод описания ${src.toUpperCase()} → ${key.toUpperCase()}`}
                            className="flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-[#0369a1] transition-colors hover:bg-sky-100 disabled:opacity-40"
                          >
                            <Languages className={`h-3 w-3 ${translating === key ? "animate-pulse" : ""}`} />
                            {translating === key ? "Перевод…" : `${src.toUpperCase()} → ${key.toUpperCase()}`}
                          </button>
                        ))}
                      </span>
                    </span>
                    <textarea
                      rows={7}
                      value={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      spellCheck={false}
                      className="w-full resize-y rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                    />
                  </label>
                ))}

                {/* Все фотографии товара */}
                {draft && (
                  <div className="mt-5">
                    <PhotosEditor
                      value={draft.photos}
                      base={draft.photosBase}
                      onChange={(patch) => setDraft({ ...draft, photos: { ...draft.photos, ...patch } })}
                    />
                  </div>
                )}

                {/* Видеообзор (YouTube) — правка из админки приоритетнее эталона */}
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Видеообзор (YouTube)</span>
                  <input
                    value={draft.video}
                    onChange={(e) => setDraft({ ...draft, video: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=… или ID ролика"
                    spellCheck={false}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-[12.5px] outline-none transition-colors focus:border-[#0284c7] focus:ring-2 focus:ring-[#0284c7]/15"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {draft.video && (
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, video: "" })}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:border-amber-300 hover:text-amber-600"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        К эталону
                      </button>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {editedRec?.videoBase && !draft.video
                        ? `Эталонное видео: ${editedRec.videoBase}${draft.hideVideo ? " · скрыто" : ""}`
                        : "Ссылку можно вставить целиком — ID распознается автоматически, превью загрузится с YouTube."}
                    </span>
                  </div>
                  {Boolean(editedRec?.videoBase) && draft.video === "" && (
                    <label className="mt-2.5 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={draft.hideVideo}
                        onChange={(e) => setDraft({ ...draft, hideVideo: e.target.checked })}
                        className="h-4 w-4 accent-[#0284c7]"
                      />
                      <span className="text-sm font-semibold text-slate-600">Скрыть эталонное видео у этого товара</span>
                    </label>
                  )}
                  {(draft.video || draft.videoTitle.ru || draft.videoTitle.uz || draft.videoTitle.en) && (
                    <div className="mt-3">
                      <LangField
                        label="Подпись к видео (RU/UZ/EN) — по умолчанию название товара"
                        value={draft.videoTitle}
                        onChange={(v) => setDraft({ ...draft, videoTitle: v })}
                      />
                    </div>
                  )}
                </div>

                <label className="mt-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={draft.hidden}
                    onChange={(e) => setDraft({ ...draft, hidden: e.target.checked })}
                    className="h-4 w-4 accent-[#0284c7]"
                  />
                  <span className="text-sm font-semibold text-slate-600">
                    Скрыть товар из каталога и с сайта
                  </span>
                </label>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => void saveProduct()}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-lg bg-[#0284c7] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0369a1] disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    Сохранить и применить
                  </button>
                  <button
                    onClick={() => openEditor(editedRec ?? { ...editedRecBase(products, editing) })}
                    disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                  >
                    <X className="h-4 w-4" />
                    Отменить правки
                  </button>
                  {savedFlash === editing && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <Check className="h-4 w-4" />
                      Применено на сайте
                    </span>
                  )}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                  {draft.isNew
                    ? "Новый товар появится в каталоге, поиске, сравнении и sitemap сразу после сохранения. Обязательны: адрес (slug), название, бренд, категория и главное фото."
                    : "Пустое поле = оставить значение эталона. Правки хранятся в базе и применяются ко всему сайту: каталог, карточка товара, поиск, сравнение и sitemap."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── SEO: meta-теги всех страниц и товаров ── */}
      {tab === "seo" && <SeoEditor />}

      {/* ── Шаблон: слайдер, новинки, контакты, логотипы клиентов ── */}
      {tab === "template" && <TemplateEditor />}

      {/* ── Контент: о компании, услуги, статьи, FAQ, словарь ── */}
      {tab === "content" && <ContentEditor />}

      {/* ── Настройки: пароль, Telegram, бэкап, очистка статистики ── */}
      {tab === "settings" && <SettingsEditor />}
    </div>
  );
}

function editedRecBase(products: ProductRec[], slug: string): ProductRec {
  const p = products.find((x) => x.slug === slug);
  if (!p) throw new Error("product not found");
  return p;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        accent ? "border-[#bae6fd] bg-[#f0f9ff]" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${accent ? "text-[#0369a1]" : "text-slate-900"}`}>{nf.format(value)}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
