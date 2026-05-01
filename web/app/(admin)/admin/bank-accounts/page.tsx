import Link from "next/link";
import { listAllBankAccounts } from "@/lib/queries/bank-accounts";
import { createBankAccountAction } from "./actions";

export default async function AdminBankAccountsPage() {
  const accounts = await listAllBankAccounts();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Bank accounts
      </h1>
      <p className="mt-1 text-sm text-subtle">
        Where clients send their payments. Add an account once and reuse it on
        invoices. Inactive accounts stay on past invoices but disappear from the
        dropdown.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-foreground">
          Add a new account
        </h2>
        <form
          action={createBankAccountAction}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[200px_220px_1fr_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Bank
            </span>
            <input
              name="bankName"
              required
              placeholder="e.g. BCA"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Nomor rekening
            </span>
            <input
              name="accountNumber"
              required
              inputMode="numeric"
              placeholder="1234567890"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm tabular-nums transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Atas nama
            </span>
            <input
              name="accountHolderName"
              required
              placeholder="e.g. PT Global Digital Innovasi"
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <button
            type="submit"
            className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
          >
            Add account
          </button>
        </form>
      </section>

      <h2 className="mt-12 text-base font-semibold text-foreground">
        All accounts
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Bank</th>
              <th className="px-4 py-2 text-left font-medium">Nomor rekening</th>
              <th className="px-4 py-2 text-left font-medium">Atas nama</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-subtle"
                >
                  No bank accounts yet. Add your first one above.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr
                  key={a.id}
                  className="border-t border-border transition-colors hover:bg-brand-soft/60"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/bank-accounts/${a.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {a.bankName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-subtle">
                    {a.accountNumber}
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {a.accountHolderName}
                  </td>
                  <td className="px-4 py-2 text-subtle">
                    {a.isActive ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
