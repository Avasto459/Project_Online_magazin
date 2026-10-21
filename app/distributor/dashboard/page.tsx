import { SiteShell } from "@/components/site-shell";
import { Card, DashboardHeader, Field } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/server-session";
import { getDistributorView } from "@/lib/hasi";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Кабинет дистрибьютора" };

export default async function DistributorDashboardPage() {
  // Сюда попадают дистрибьюторы и дилеры (после входа).
  const account = await requireRole(["DISTRIBUTOR", "DEALER"]);
  const view = await getDistributorView(account.id);

  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <DashboardHeader title={view?.name || account.name} subtitle={account.email} badge={account.role === "DEALER" ? "Дилер" : "Дистрибьютор"} />
        {account.role === "DEALER" ? (
          <Link href="/dealer/dashboard" className="inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500">Перейти в кабинет дилера (заявки)</Link>
        ) : null}
        <Card title="Мои склады">
          {!view || view.warehouses.length === 0 ? (
            <p className="text-sm text-slate-500">Склады ещё не назначены. Обратитесь к администратору HASI.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {view.warehouses.map((w) => (
                <li key={w.id} className="grid gap-3 py-3 sm:grid-cols-3">
                  <Field label="Склад" value={`${w.name} (${w.code})`} />
                  <Field label="Позиций" value={w.positions} />
                  <Field label="Единиц на складе" value={w.units} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </SiteShell>
  );
}
