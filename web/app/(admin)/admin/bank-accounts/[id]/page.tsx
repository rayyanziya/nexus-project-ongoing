import { notFound } from "next/navigation";
import { getBankAccountById } from "@/lib/queries/bank-accounts";
import { ConfirmActionButton } from "@/app/_components/confirm-action-button";
import { deleteBankAccountAction, updateBankAccountAction } from "../actions";
import { ActiveToggleButton } from "./active-toggle";

export default async function AdminBankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getBankAccountById(id);
  if (!account) notFound();

  const updateAction = updateBankAccountAction.bind(null, id);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {account.bankName}
        </h1>
        {account.isActive ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Active
          </span>
        ) : (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
            Inactive
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-subtle">
        {account.accountHolderName} · {account.accountNumber}
      </p>

      <form action={updateAction} className="mt-8 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_220px_1fr]">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              Bank
            </span>
            <input
              name="bankName"
              required
              defaultValue={account.bankName}
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
              defaultValue={account.accountNumber}
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
              defaultValue={account.accountHolderName}
              className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
        </div>

        <button
          type="submit"
          className="cursor-pointer rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover active:bg-brand-active"
        >
          Save changes
        </button>
      </form>

      <section className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Visibility</h2>
        <p className="mt-1 text-sm text-subtle">
          Inactive accounts disappear from the invoice dropdown but stay on past
          invoices that already use them.
        </p>
        <div className="mt-4">
          <ActiveToggleButton id={id} isActive={account.isActive} />
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-subtle">
          Soft-deletes the account. Historical invoice snapshots are preserved.
        </p>
        <div className="mt-4">
          <ConfirmActionButton
            action={deleteBankAccountAction.bind(null, id)}
            message="Delete this bank account? Past invoices keep their snapshot, but you cannot pick it on new invoices."
            label="Delete account"
            pendingLabel="Deleting…"
            variant="danger"
          />
        </div>
      </section>
    </main>
  );
}
