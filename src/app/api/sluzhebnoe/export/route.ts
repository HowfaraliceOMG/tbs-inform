import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/shop/admin-auth";
import { PRODUCTS } from "@/lib/shop/data";

export const dynamic = "force-dynamic";

/**
 * Экспорт данных для менеджера (вкладки «Заявки» и «Товары»):
 *  • ?what=leads    — заявки в CSV (Excel: разделитель «;», UTF-8 BOM)
 *  • ?what=catalog  — весь каталог в JSON (массив товаров)
 */

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const what = req.nextUrl.searchParams.get("what");
  const stamp = new Date().toISOString().slice(0, 10);

  if (what === "leads") {
    const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" } });
    const rows = [
      ["Дата", "Имя", "Телефон", "Товар", "Сообщение", "Обработана"].join(";"),
      ...leads.map((l) =>
        [
          new Date(l.createdAt).toLocaleString("ru-RU"),
          l.name,
          l.phone,
          l.product ?? "",
          (l.message ?? "").replace(/\r?\n/g, " "),
          l.done ? "да" : "нет",
        ]
          .map(csvEscape)
          .join(";"),
      ),
    ];
    return new NextResponse("\uFEFF" + rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tbs-leads-${stamp}.csv"`,
      },
    });
  }

  if (what === "catalog") {
    return new NextResponse(JSON.stringify(PRODUCTS, null, 1), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="tbs-catalog-${stamp}.json"`,
      },
    });
  }

  return NextResponse.json({ ok: false, error: "VALIDATION" }, { status: 400 });
}
