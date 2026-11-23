"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { SLIDES } from "@/lib/shop/data";
import { imgSize } from "@/lib/shop/img-size";
import { UI, useShopLangT } from "./shop-i18n-helpers";

/**
 * Слайдер баннеров главной: 10 полноширинных слайдов.
 * Десктоп (lg+): баннер сливается с шапкой, товар справа, текст на светлом
 * градиенте слева; слайд «наезжает» на товар — медленный Ken-Burns zoom-in
 * (полоса прогресса автопрокрутки скрыта — осталась невидимым таймером). Мобильные (<lg): единая карточка (баннер + панель текста),
 * управление свайпом и точками.
 */

/** Логотипы брендов слайдов: официальный цветной файл, показывается в ОБЕИХ
    темах без перекраски (см. scripts/process_final_logos.py).
    Чипы: по умолчанию в тёмной теме белый — чтобы цветной логотип читался.
    tile: Lisheng — аутентичный логотип с белым текстом и оранжевой иконкой,
    чип всегда тёмный. chipLight: Kirisun — чип всегда белый. */
const BRAND_LOGOS: Record<
  string,
  { light: string; w: number; h: number; alt: string; tile?: boolean; chipLight?: boolean }
> = {
  hytera: { light: "/tbs-img/brand/hytera.png", w: 238, h: 64, alt: "Hytera" },
  telosystems: { light: "/tbs-img/brand/telosystems.png", w: 296, h: 64, alt: "TELOX by Telo Systems" },
  kenwood: { light: "/tbs-img/brand/kenwood.png", w: 381, h: 64, alt: "KENWOOD" },
  kirisun: { light: "/tbs-img/brand/kirisun-blue.png", w: 149, h: 38, alt: "Kirisun", chipLight: true },
  lisheng: { light: "/tbs-img/brand/lisheng-clean.png", w: 250, h: 46, alt: "Lisheng", tile: true },
  yanton: { light: "/tbs-img/brand/yanton.png", w: 282, h: 44, alt: "YANTON" },
};

export function HeroSlider() {
  const { lang, tr } = useShopLangT();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  // Автопрокрутка и анимации — целиком на CSS, без эффектов: полоса прогресса
  // (animate-promo-progress, 5s) по завершении листает слайд через onAnimationEnd,
  // а рестарт обеих анимаций (прогресс + Ken-Burns зум) даёт key по слайду —
  // React перемонтирует узел. Пауза при наведении: animation-play-state: paused,
  // после ухода курсора анимация продолжается с замороженного места.
  const go = (d: number) => setI((v) => (v + d + SLIDES.length) % SLIDES.length);

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
  };

  const s = SLIDES[i];
  const logo = s.brand ? BRAND_LOGOS[s.brand] : undefined;

  // Параллакс от мыши: CSS-переменные --px/--py на корневом узле (только
  // десктоп с курсором); баннер и кольца смещаются в противофазе — эффект
  // глубины «стеклянной витрины». SSR-безопасно: значения по умолчанию 0.
  const rootRef = useRef<HTMLDivElement>(null);
  const onParallaxMove = (e: React.MouseEvent) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty("--py", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onParallaxReset = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  };
  const bannerSize = imgSize(s.img);

  const dots = (
    <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
      {SLIDES.map((_, n) => (
        <button
          key={n}
          onClick={() => setI(n)}
          role="tab"
          aria-selected={n === i}
          aria-label={`Slide ${n + 1}`}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            n === i
              ? "w-8 bg-gradient-to-r from-sky-400 to-sky-600"
              : "w-3 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
          }`}
        />
      ))}
    </div>
  );

  const badge = (
    <p className="mb-3 inline-flex items-center gap-2 self-start rounded-full border border-sky-200/80 bg-white/70 px-3.5 py-1.5 text-[12px] font-bold text-[#0369a1] backdrop-blur-sm sm:text-[12.5px] dark:border-sky-500/30 dark:bg-white/10 dark:text-sky-300">
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
      </span>
      {s.badge[lang]}
    </p>
  );

  // Верх текстового блока: надзаголовок, бейдж, заголовок и описание слайда.
  // Кнопки вынесены отдельно — на десктопе они прижаты к низу слайдера,
  // чтобы колонка заполняла высоту без «пустоты» под текстом
  const textTop = (compact: boolean) => (
    <>
      <p className="eyebrow mb-3 flex items-center gap-2 text-[#0369a1] sm:mb-4 dark:text-sky-400">
        <span className="inline-block h-px w-8 bg-gradient-to-r from-[#0ea5e9] to-transparent" aria-hidden />
        {UI.eyebrow[lang]}
      </p>
      {badge}
      {/* Заголовок слайда — h2: у страницы один стабильный h1 (в page.tsx);
          лёгкий градиент по тексту — «дорогое» звучание в обеих темах */}
      <h2
        className={`bg-gradient-to-br from-slate-900 via-slate-900 to-slate-500 bg-clip-text font-extrabold leading-[1.12] text-transparent dark:from-white dark:via-white dark:to-sky-200 ${
          compact ? "text-[26px] sm:text-4xl" : "text-3xl sm:text-4xl lg:text-[36px] xl:text-[46px]"
        }`}
      >
        {s.title[lang]}
      </h2>
      <p
        className={`mt-4 leading-relaxed text-slate-600 dark:text-slate-400 sm:mt-5 ${
          compact ? "max-w-xl text-[14px] sm:text-[15px]" : "max-w-2xl text-[14.5px] xl:text-[15.5px]"
        }`}
      >
        {s.desc[lang]}
      </p>
      {/* Чипы характеристик слайда — короткие факты, стеклянный стиль */}
      {(s.tags ?? []).length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(s.tags ?? []).map((t) => (
            <span
              key={t.en}
              className="rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-[11.5px] font-semibold tracking-wide text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:shadow-none"
            >
              {t[lang]}
            </span>
          ))}
        </div>
      )}
    </>
  );

  const actions = () => (
    <div className="flex flex-wrap items-center gap-3">
        <Link
          href={s.link}
          className={
            s.preorder
              ? "group flex items-center gap-2 rounded-xl border-2 border-[#0284c7] bg-white px-6 py-3 text-[15px] font-bold text-[#0284c7] transition-transform hover:scale-[1.03] sm:px-7 sm:py-3.5 dark:border-sky-500/60 dark:bg-white/10 dark:text-sky-300"
              : "group flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-400 to-sky-600 px-6 py-3 text-[15px] font-bold text-white shadow-glow-sky transition-transform hover:scale-[1.03] sm:px-7 sm:py-3.5"
          }
        >
          {s.preorder
            ? tr({ ru: "Только по предзаказу", uz: "Faqat oldindan buyurtma", en: "Pre-order only" })
            : tr({ ru: "Подробнее", uz: "Batafsil", en: "Learn more" })}
          <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link
          href="/vse-radiostancii"
          className="rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-[15px] font-bold text-slate-800 transition-colors hover:border-[#0284c7] hover:text-[#0284c7] sm:px-7 sm:py-3.5 dark:border-slate-700 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-[#38bdf8]/40 dark:hover:text-[#38bdf8]"
        >
          {UI.allRadios[lang]}
        </Link>
    </div>
  );

  // Таймер автопрокрутки: key по слайду перемонтирует узел и рестартует
  // CSS-анимацию, её завершение (animationend) листает слайд. Визуальную
  // полосу прогресса убрали (запрос заказчика) — элемент невидим (opacity-0,
  // без градиента) и остаётся только таймером; пауза при наведении
  // (slider-paused) сохранена. Элемент кладётся в обе ветки (десктоп/мобайл) —
  // анимирует только видимый (у display:none-ветки CSS-анимации не идут),
  // двойного листания нет.
  const progress = (
    <div
      key={`p-${s.img}`}
      aria-hidden
      onAnimationEnd={() => setI((v) => (v + 1) % SLIDES.length)}
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-[3px] origin-left animate-promo-progress opacity-0 ${
        paused ? "slider-paused" : ""
      }`}
    />
  );

  return (
    <div
      className="relative"
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseMove={onParallaxMove}
      onMouseLeave={() => {
        setPaused(false);
        onParallaxReset();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {/* ── Десктоп (lg+): плавающая карточка со скруглением, тонким контуром
          и глубокой тенью — единая структура в обеих темах; в тёмной теме
          контур светлее (white/10) и тень глубже, чем в светлой ── */}
      <div className="hidden px-3 sm:px-4 lg:block">
        <div className="relative mx-auto mt-6 max-w-[1800px] overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_rgb(2_132_199/0.14)] ring-1 ring-slate-200/70 dark:bg-[#101C2E] dark:shadow-[0_24px_60px_rgb(0_0_0/0.45)] dark:ring-white/10">
        {/* Стеклянный чип с логотипом бренда слайда (правый верхний угол):
            цветной логотип в обеих темах; в тёмной чип белый, чтобы логотип
            читался. tile: аутентичный белый логотип — чип всегда тёмный;
            chipLight: чип всегда белый. Без backdrop-blur (как и на мобиле):
            blur пересчитывается каждый кадр поверх Ken-Burns зума, а над
            плотным фоном визуальной разницы нет */}
        {logo && (
          <div
            className={
              logo.tile
                ? "absolute right-6 top-6 z-10 flex items-center rounded-2xl border border-white/10 bg-[#0d1828]/85 py-2.5 pl-5 pr-4 shadow-sm"
                : logo.chipLight
                  ? "absolute right-6 top-6 z-10 flex items-center rounded-2xl border border-slate-200/80 bg-white py-2.5 pl-5 pr-4 shadow-sm"
                  : "absolute right-6 top-6 z-10 flex items-center rounded-2xl border border-white/60 bg-white/85 py-2.5 pl-5 pr-4 shadow-sm dark:border-slate-200/80 dark:bg-white dark:shadow-none"
            }
          >
            <Image
              src={logo.light}
              alt={logo.alt}
              width={logo.w}
              height={logo.h}
              className="h-6 w-auto"
            />
          </div>
        )}

        {/* Тёплая сцена: правый нижний угол — в тон фону баннеров (#ece7e2),
            поэтому «письмо» баннера сливается со сценой без шва */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-[#ece7e2] dark:from-[#0d1828] dark:via-[#101C2E] dark:to-sky-500/5"
        />
        {/* Декоративные кольца — белые в светлой теме, нежно-голубые в тёмной;
            при параллаксе уходят в противофазу к баннеру (разная «глубина») */}
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[28px] border-white/70 transition-transform duration-500 ease-out will-change-transform dark:border-sky-400/10"
          style={{ transform: "translate3d(calc(var(--px, 0) * -22px), calc(var(--py, 0) * -16px), 0)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 right-40 h-80 w-80 rounded-full border-[24px] border-white/50 transition-transform duration-500 ease-out will-change-transform dark:border-sky-400/10"
          style={{ transform: "translate3d(calc(var(--px, 0) * -32px), calc(var(--py, 0) * -24px), 0)" }}
        />

        {/* Баннер слайда: заливает карточку целиком (object-cover, привязка
            вправо — слева остаётся пустой фон, его гасит подложка), кромки
            изображения совпадают с кромками карточки; Ken-Burns зум */}
        <div key={`kb-${s.img}`} className="absolute inset-0 animate-kenburns-lg motion-reduce:animate-none">
          {/* Параллакс-слой: лёгкий сдвиг за курсором; внутренний — чтобы
              не конфликтовать с 7-секундным Ken-Burns зумом на внешнем */}
          <div
            className="relative h-full w-full transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: "translate3d(calc(var(--px, 0) * 16px), calc(var(--py, 0) * 12px), 0)" }}
          >
            <Image
              src={s.img}
              alt=""
              aria-hidden
              fill
              sizes="(min-width: 1832px) 1800px, calc(100vw - 32px)"
              priority={i === 0}
              className="object-cover object-right"
            />
          </div>
        </div>
        {/* «Световое пятно»: мягкое холодное свечение над фото справа —
            приём «light leak», добавляет глубину и дорогой вид */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(50%_65%_at_76%_42%,rgb(14_165_233/0.10),transparent_70%)] dark:bg-[radial-gradient(50%_65%_at_76%_42%,rgb(56_189_248/0.14),transparent_70%)]"
        />
        {/* Белая подложка под текст: плотная в зоне текста и с длинным
            плавным хвостом — переход к бежевому фону баннера незаметен,
            а буквы не ложатся на тёмный корпус товара */}
        <div
          className="absolute inset-y-0 left-0 w-[78%] bg-gradient-to-r from-white via-white/90 via-60% to-transparent dark:from-[#101C2E] dark:via-[#101C2E]/90 dark:via-60% dark:to-transparent"
          aria-hidden
        />
        {/* Тёплый янтарный отсвет слева внизу — баланс к холодному голубому
            «light leak»: контраст тёплого и холодного, как в премиум-фото */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(42%_52%_at_16%_86%,rgb(251_191_36/0.05),transparent_70%)] dark:bg-[radial-gradient(42%_52%_at_16%_86%,rgb(245_158_11/0.13),transparent_70%)]"
        />
        {/* Блик (sheen): косая полоса света при каждой смене слайда; key
            перезапускает анимацию синхронно со сменой промо-текста */}
        <div
          key={`sheen-${s.img}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 flex justify-center motion-reduce:hidden"
        >
          <div className="animate-sheen h-full w-[55%] bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/15" />
        </div>

        <div className="relative flex min-h-[620px] w-full flex-col px-14 pb-10 pt-14 xl:min-h-[700px] xl:px-20">
          <div className="w-full max-w-3xl">
            <div key={`t-${s.img}`} className="animate-promo">{textTop(false)}</div>
          </div>
          {/* Кнопки и счётчик прижаты к низу: колонка заполняет всю высоту,
              пустоты под текстом не остаётся */}
          <div className="mt-auto w-full max-w-3xl">
            <div key={`a-${s.img}`} className="animate-promo">{actions()}</div>

            {/* Счётчик и точки: крупная светлая цифра текущего слайда,
                тонкая линия-градиент и мелкий общий счёт */}
            <div key={`c-${s.img}`} className="mt-7 flex items-center gap-5 xl:mt-8">
              <p
                className="flex items-center gap-3 text-slate-400 dark:text-slate-500"
                aria-label={`${i + 1} / ${SLIDES.length}`}
              >
                <span className="text-[15px] font-light tracking-[0.2em] text-slate-600 dark:text-slate-300">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="h-px w-10 bg-gradient-to-r from-slate-300 to-slate-300/10 dark:from-slate-600 dark:to-slate-600/10"
                  aria-hidden
                />
                <span className="text-[11px] tracking-[0.3em]">{String(SLIDES.length).padStart(2, "0")}</span>
              </p>
              {dots}
            </div>
          </div>
        </div>

        {/* Стрелки — стеклянные, компактные и прижатые к кромке карточки,
            чтобы не наезжать на текст слайда */}
        <button
          onClick={() => go(-1)}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-all hover:border-[#0284c7] hover:text-[#0284c7] hover:shadow-glow-sky-sm dark:border-[#1c2a3f] dark:bg-[#142234]/80 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition-all hover:border-[#0284c7] hover:text-[#0284c7] hover:shadow-glow-sky-sm dark:border-[#1c2a3f] dark:bg-[#142234]/80 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-300"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {progress}
        </div>
      </div>

      {/* ── Мобильные и планшеты (<lg): единая карточка — баннер + текст,
          та же плавающая структура, что и на десктопе ── */}
      <div className="relative px-3 pb-2 pt-3 sm:px-5 lg:hidden">
        <div className="overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_rgb(2_132_199/0.14)] ring-1 ring-slate-200/70 dark:bg-[#101C2E] dark:shadow-[0_24px_60px_rgb(0_0_0/0.45)] dark:ring-white/10">
          {/* Баннер: обрезка по краям с сохранением товара, зум при смене слайда */}
          <div className="relative h-[280px] overflow-hidden sm:h-[350px]">
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-amber-50/60"
            />
            <div key={`kb-${s.img}`} className="absolute inset-0 animate-kenburns-sm motion-reduce:animate-none">
              <Image
                src={s.img}
                alt=""
                aria-hidden
                width={bannerSize.width}
                height={bannerSize.height}
                sizes="(max-width: 639px) calc(100vw - 24px), calc(100vw - 40px)"
                priority={i === 0}
                className="block h-full w-full object-cover object-[68%_center]"
              />
            </div>
            {/* Мягкая тень перехода от фото к текстовой панели */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent dark:from-[#101C2E]"
            />
            {/* Полоса прогресса — водитель автопрокрутки и на мобиле */}
            {progress}
            {/* Чип с логотипом бренда на баннере (компактная версия);
                в тёмной теме чип белый — цветной логотип читается.
                Без backdrop-blur: чип лежит поверх баннера с Ken-Burns зумом,
                и blur пересчитывался бы в каждый кадр — на слабых телефонах
                это рывки при прокрутке. Плотность фона повышена вместо «морозки». */}
            {logo && (
              <div
                className={
                  logo.tile
                    ? "absolute right-3 top-3 z-10 flex items-center rounded-xl border border-white/10 bg-[#0d1828]/85 px-3.5 py-2"
                    : logo.chipLight
                      ? "absolute right-3 top-3 z-10 flex items-center rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm"
                      : "absolute right-3 top-3 z-10 flex items-center rounded-xl border border-white/60 bg-white/85 px-3.5 py-2 dark:border-slate-200/80 dark:bg-white"
                }
              >
                <Image
                  src={logo.light}
                  alt={logo.alt}
                  width={logo.w}
                  height={logo.h}
                  className="h-5 w-auto"
                />
              </div>
            )}
          </div>

          {/* Текстовая панель — продолжение той же карточки */}
          <div className="bg-gradient-to-b from-white to-sky-50/70 px-5 pb-6 pt-4 sm:px-7 dark:from-[#101C2E] dark:to-sky-500/5">
            <div key={`t-${s.img}`} className="animate-promo">{textTop(true)}</div>
            <div key={`a-${s.img}`} className="mt-6 sm:mt-7">{actions()}</div>
          </div>
        </div>

        {/* Свайп-подсказка */}
        <p className="mt-2.5 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {tr({ ru: "← свайп, чтобы листать →", uz: "← almashtirish uchun suring →", en: "← swipe to browse →" })}
        </p>
      </div>
    </div>
  );
}
