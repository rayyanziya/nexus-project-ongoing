import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankAccounts } from "@/db/schema";

export type BankAccount = typeof bankAccounts.$inferSelect;

export async function listActiveBankAccounts(): Promise<BankAccount[]> {
  return db
    .select()
    .from(bankAccounts)
    .where(and(isNull(bankAccounts.deletedAt), eq(bankAccounts.isActive, true)))
    .orderBy(asc(bankAccounts.bankName), asc(bankAccounts.accountHolderName));
}

export async function listAllBankAccounts(): Promise<BankAccount[]> {
  return db
    .select()
    .from(bankAccounts)
    .where(isNull(bankAccounts.deletedAt))
    .orderBy(asc(bankAccounts.bankName), asc(bankAccounts.accountHolderName));
}

export async function getBankAccountById(
  id: string,
): Promise<BankAccount | null> {
  const [row] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, id), isNull(bankAccounts.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function createBankAccount(input: {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}): Promise<BankAccount> {
  const [row] = await db
    .insert(bankAccounts)
    .values({
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      accountHolderName: input.accountHolderName,
    })
    .returning();
  return row;
}

export async function updateBankAccount(
  id: string,
  patch: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
  },
): Promise<BankAccount | null> {
  const [row] = await db
    .update(bankAccounts)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(bankAccounts.id, id), isNull(bankAccounts.deletedAt)))
    .returning();
  return row ?? null;
}

export async function setBankAccountActive(
  id: string,
  isActive: boolean,
): Promise<BankAccount | null> {
  const [row] = await db
    .update(bankAccounts)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(bankAccounts.id, id), isNull(bankAccounts.deletedAt)))
    .returning();
  return row ?? null;
}

export async function softDeleteBankAccount(id: string): Promise<void> {
  await db
    .update(bankAccounts)
    .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
    .where(eq(bankAccounts.id, id));
}
