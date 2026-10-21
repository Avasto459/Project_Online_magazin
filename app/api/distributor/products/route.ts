import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { createProduct, getUserById, getUserDisplayName, StoreError } from "@/lib/db";
import { db } from "@/lib/db/db";
import { initializeSchema } from "@/lib/db/schema";

export const runtime = "nodejs";

const MAX_FILE = 10 * 1024 * 1024;
const MAX_FILES = 6;
const formats = {
  "image/jpeg": { extension: "jpg", matches: (d: Buffer) => d[0] === 0xff && d[1] === 0xd8 && d[2] === 0xff },
  "image/png": { extension: "png", matches: (d: Buffer) => d.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", matches: (d: Buffer) => d.toString("ascii", 0, 4) === "RIFF" && d.toString("ascii", 8, 12) === "WEBP" },
} as const;

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya", қ: "q", ғ: "g", ӣ: "i", ӯ: "u", ҳ: "h", ҷ: "j",
};

/** Slug из названия (кириллица → латиница) + короткий суффикс, чтобы он всегда был уникальным. */
function makeSlug(name: string) {
  const base = name.toLowerCase().split("").map((ch) => CYR[ch] ?? ch).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `${base || "product"}-${randomUUID().slice(0, 6)}`;
}

/** Доступ только для DISTRIBUTOR и DEALER; администратор тоже может — но товар не помечается как дистрибьюторский. */
async function requirePartner(request: Request) {
  const user = await requireUser(request);
  if (user.role !== "DISTRIBUTOR" && user.role !== "DEALER") throw new StoreError("Недостаточно прав.", 403);
  return user;
}

function fail(error: unknown, fallback: string) {
  if (error && !(error instanceof StoreError)) console.error("Distributor products:", error);
  return NextResponse.json({ error: error instanceof Error && error instanceof StoreError ? error.message : fallback }, {
    status: error instanceof StoreError ? error.status : 500,
  });
}

/** Свои товары дистрибьютора (по distributor_id). */
export async function GET(request: Request) {
  try {
    const user = await requirePartner(request);
    await initializeSchema();
    const r = await db.execute({
      sql: `SELECT id,name,slug,price,stock,image,isPublished,createdAt FROM products WHERE distributor_id=? ORDER BY datetime(createdAt) DESC LIMIT 100`,
      args: [user.id],
    });
    return NextResponse.json({ products: r.rows.map((x) => ({
      id: String(x.id), name: String(x.name), slug: String(x.slug), price: Number(x.price), stock: Number(x.stock),
      image: String(x.image || ""), isPublished: Number(x.isPublished), createdAt: String(x.createdAt),
    })) });
  } catch (error) {
    return fail(error, "Не удалось загрузить товары.");
  }
}

/** Создание товара: multipart/form-data (name, categoryId, brand, price, stock, description, images[]). */
export async function POST(request: Request) {
  try {
    const user = await requirePartner(request);
    const account = await getUserById(user.id);
    if (!account) throw new StoreError("Пользователь не найден.", 404);

    const form = await request.formData();
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const name = text("name");
    const categoryId = text("categoryId");
    const price = Number(text("price"));
    const stock = Number(text("stock") || 0);
    if (!name || name.length > 200) throw new StoreError("Укажите название товара (до 200 символов).", 400);
    if (!categoryId) throw new StoreError("Выберите категорию.", 400);
    if (!Number.isSafeInteger(price) || price < 0) throw new StoreError("Цена должна быть целым неотрицательным числом.", 400);
    if (!Number.isSafeInteger(stock) || stock < 0) throw new StoreError("Количество должно быть целым неотрицательным числом.", 400);
    const description = text("description").slice(0, 5000);

    const files = form.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
    if (files.length > MAX_FILES) throw new StoreError(`Можно загрузить не более ${MAX_FILES} фотографий.`, 400);

    // Сначала проверяем все файлы, и только потом пишем на диск.
    const checked: { data: Buffer; extension: string }[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE) throw new StoreError("Размер каждой фотографии — не более 10 МБ.", 413);
      const format = formats[file.type as keyof typeof formats];
      if (!format) throw new StoreError("Поддерживаются только фотографии JPEG, PNG и WebP.", 400);
      const data = Buffer.from(await file.arrayBuffer());
      if (!format.matches(data)) throw new StoreError("Содержимое фотографии не соответствует её формату.", 400);
      checked.push({ data, extension: format.extension });
    }

    const images: string[] = [];
    if (checked.length) {
      const folder = path.join(process.cwd(), "public", "uploads", "products");
      await mkdir(folder, { recursive: true });
      for (const { data, extension } of checked) {
        const filename = `${randomUUID()}.${extension}`;
        await writeFile(path.join(folder, filename), data, { flag: "wx" });
        images.push(`/uploads/products/${filename}`);
      }
    }

    const product = await createProduct({
      name,
      slug: makeSlug(name),
      brand: text("brand").slice(0, 100),
      shortDescription: description.slice(0, 160),
      description,
      price,
      stock,
      images,
      image: images[0] || "",
      categoryId,
      type: "product",
      // Привязка к дистрибьютору: ID и имя текущего пользователя.
      distributorId: account.id,
      distributorName: getUserDisplayName(account) || account.email,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return fail(error, "Не удалось добавить товар.");
  }
}
