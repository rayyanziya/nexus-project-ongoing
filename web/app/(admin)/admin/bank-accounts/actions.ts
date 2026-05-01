"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit";
import {
  createBankAccount,
  setBankAccountActive,
  softDeleteBankAccount,
  updateBankAccount,
} from "@/lib/queries/bank-accounts";

export async function createBankAccountAction(formData: FormData) {
  await requireAdmin();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const accountHolderName = String(
    formData.get("accountHolderName") ?? "",
  ).trim();
  if (!bankName || !accountNumber || !accountHolderName) return;

  const account = await createBankAccount({
    bankName,
    accountNumber,
    accountHolderName,
  });
  await logAdminAction({
    action: "bank_account.create",
    targetType: "bank_account",
    targetId: account.id,
    metadata: { bankName, accountHolderName },
  });
  revalidatePath("/admin/bank-accounts");
  redirect(`/admin/bank-accounts/${account.id}`);
}

export async function updateBankAccountAction(
  id: string,
  formData: FormData,
) {
  await requireAdmin();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim();
  const accountHolderName = String(
    formData.get("accountHolderName") ?? "",
  ).trim();
  if (!bankName || !accountNumber || !accountHolderName) return;

  const updated = await updateBankAccount(id, {
    bankName,
    accountNumber,
    accountHolderName,
  });
  if (!updated) return;

  await logAdminAction({
    action: "bank_account.update",
    targetType: "bank_account",
    targetId: id,
    metadata: { bankName, accountHolderName },
  });
  revalidatePath("/admin/bank-accounts");
  revalidatePath(`/admin/bank-accounts/${id}`);
}

export async function setBankAccountActiveAction(
  id: string,
  isActive: boolean,
) {
  await requireAdmin();
  const updated = await setBankAccountActive(id, isActive);
  if (!updated) return;
  await logAdminAction({
    action: isActive ? "bank_account.activate" : "bank_account.deactivate",
    targetType: "bank_account",
    targetId: id,
  });
  revalidatePath("/admin/bank-accounts");
  revalidatePath(`/admin/bank-accounts/${id}`);
}

export async function deleteBankAccountAction(id: string) {
  await requireAdmin();
  await softDeleteBankAccount(id);
  await logAdminAction({
    action: "bank_account.delete",
    targetType: "bank_account",
    targetId: id,
  });
  revalidatePath("/admin/bank-accounts");
  redirect("/admin/bank-accounts");
}
