/** Публичная тестовая заглушка, показывается когда у товара нет фото. */
export const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80";

/** Базовый адрес сайта для абсолютных ссылок на изображения. */
function getSiteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

function encode(value: string): string {
  // data: / blob: кодировать не нужно — иначе сломаем base64.
  if (/^(data:image\/|blob:)/i.test(value)) return value;
  return encodeURI(value);
}

export function productImageSrc(source: string) {
  const base = getSiteBase();
  const value = source.trim();
  if (!value) return DEFAULT_PRODUCT_IMAGE;
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(value)) return encode(value);
  // Протокольно-относительные URL (//hasi.tj/...) — добавляем https:.
  if (value.startsWith("//")) return encode(`https:${value}`);
  // Локальные статичные ассеты проекта (SVG-заглушки /products/*.svg и /hasi-logo.png
  // лежат в public/ и раздаются самим Next.js) — оставляем как есть.
  // Всё остальное локальное (/products/....jpg, products/... и т.п.) — прямая ссылка
  // на оригинал с hasi.tj, чтобы картинка открывалась и локально, и на Vercel.
  if (value === "/hasi-logo.png" || (/^\/products\/.+\.svg(\?.*)?$/i.test(value))) return encode(value);
  if (value.startsWith("public/")) return encode(`${base}/${value.slice("public/".length)}`);
  if (value.startsWith("./")) return encode(`${base}/${value.slice(2)}`);
  if (value.startsWith("/")) {
    // WooCommerce хранит медиа в /wp-content/uploads/...; если в БД лежит
    // укороченный путь /uploads/..., подставляем wp-content/ между хостом и путём.
    if (value.startsWith("/uploads/") && !value.startsWith("/wp-content/")) {
      return encode(`${base}/wp-content${value}`);
    }
    return encode(`${base}${value}`);
  }
  return encode(`${base}/${value}`);
}
