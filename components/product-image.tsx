"use client";

import Image from "next/image";
import { useState } from "react";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/product-images";

/** Стандартная картинка-заглушка товара — показывается, когда фото нет или не загрузилось. */
export function ProductImagePlaceholder({ label = "", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div role="img" aria-label="Фотография товара" className={`flex h-full w-full items-center justify-center bg-neutral-100 dark:bg-neutral-800/50 ${compact ? "p-1" : "p-3"}`}>
      <Image
        src={DEFAULT_PRODUCT_IMAGE}
        alt="Фото товара"
        width={600}
        height={370}
        unoptimized
        className={`${compact ? "w-10 h-10" : "w-28 sm:w-32 h-auto"} object-contain opacity-80 dark:opacity-90`}
      />
      {label && !compact ? <span className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span> : null}
    </div>
  );
}

type Props = {
  /** Уже нормализованные адреса (см. productImageSrc); первый рабочий будет показан. */
  sources: string[];
  alt: string;
  /** Классы контейнера: по умолчанию квадратная область 4:3. */
  className?: string;
  /** `contain` — товар целиком без обрезки (по умолчанию), `cover` — заполнение с обрезкой. */
  fit?: "contain" | "cover";
  hoverZoom?: boolean;
};

/**
 * Изображение товара с фиксированным aspect-ratio: картинка никогда не растягивается
 * и не искажается (object-fit), а при отсутствии/ошибке загрузки показывается заглушка.
 */
export function ProductImage({ sources, alt, className = "aspect-square", fit = "contain", hoverZoom = true }: Props) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = sources.find((value) => value && !failed.includes(value)) || "";
  return (
    <div className={`relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800/50 ${className}`}>
      {source ? (
        <Image
          src={source}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          unoptimized
          onError={() => setFailed((current) => (current.includes(source) ? current : [...current, source]))}
          className={`${fit === "contain" ? "object-contain p-3" : "object-cover"} transition-transform duration-500 ${hoverZoom ? "group-hover:scale-105" : ""}`}
        />
      ) : (
        <ProductImagePlaceholder />
      )}
    </div>
  );
}

/**
 * Маленькое превью (корзина, поиск): фиксированный квадрат, object-fit без искажений,
 * при пустой или битой ссылке — компактная заглушка с логотипом HASI.
 */
export function ProductThumb({ src, alt = "", size = 96, rounded = "rounded-xl" }: { src?: string | null; alt?: string; size?: number; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;
  return (
    <div style={{ width: px, height: px }} className={`relative shrink-0 overflow-hidden border border-slate-100 bg-neutral-100 dark:border-slate-800 dark:bg-neutral-800/50 ${rounded}`}>
      {src && !failed ? (
        <Image src={src} alt={alt} fill sizes={px} unoptimized onError={() => setFailed(true)} className="object-contain p-1" />
      ) : (
        <ProductImagePlaceholder compact />
      )}
    </div>
  );
}
