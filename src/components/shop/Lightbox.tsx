"use client";

/**
 * Лайтбокс просмотра фотографий товара — как на основном сайте tbs.uz:
 * полноэкранный просмотр со стрелками, счётчиком, закрытием по Esc/клику
 * вне фото и свайпом на мобильных.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { imgSize } from "@/lib/shop/img-size";

export function Lightbox({
  images,
  index,
  onClose,
  onIndex,
  caption,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  caption?: string;
}) {
  const total = images.length;
  const many = total > 1;
  const touchX = useRef(0);

  const prev = useCallback(
    () => onIndex((index - 1 + total) % total),
    [index, total, onIndex],
  );
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);

  // Клавиатура + блокировка прокрутки страницы
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowLeft") prev();
      if (many && e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next, many]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption ? `Фото: ${caption}` : "Просмотр фото"}
      className="animate-lb-in fixed inset-0 z-[100] flex flex-col bg-slate-950/[0.92] backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Верхняя панель: счётчик и закрытие */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3.5 sm:px-6">
        <span className="rounded-md bg-white/10 px-3 py-1 text-xs font-semibold tracking-widest text-white">
          {index + 1} / {total}
        </span>
        {caption && (
          <span className="hidden max-w-[55vw] truncate text-sm font-semibold text-white/85 sm:block">
            {caption}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:rotate-90 hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Центральная зона: фото + стрелки */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-2 sm:px-16">
        {many && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/25 sm:left-4 sm:h-13 sm:w-13"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
        )}

        <Image
          key={images[index]}
          src={images[index]}
          alt={caption ?? ""}
          width={imgSize(images[index]).width}
          height={imgSize(images[index]).height}
          sizes="92vw"
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (!many) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 42) (dx < 0 ? next : prev)();
          }}
          className="animate-lb-img max-h-[78vh] w-auto max-w-full select-none object-contain drop-shadow-2xl"
        />

        {many && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/25 sm:right-4 sm:h-13 sm:w-13"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        )}
      </div>

      {/* Лента миниатюр */}
      {many && (
        <div
          className="relative z-10 flex items-center justify-center gap-2 overflow-x-auto px-4 pb-5 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((g, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Фото ${i + 1}`}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white/95 transition-all sm:h-16 sm:w-16 ${
                i === index
                  ? "border-[#0ea5e9] opacity-100 shadow-[0_0_0_3px_rgba(14,165,233,0.35)]"
                  : "border-transparent opacity-45 hover:opacity-80"
              }`}
            >
              <Image src={g} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
