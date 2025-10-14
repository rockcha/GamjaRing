import supabase from "@/lib/supabase";

/* ---------- Types ---------- */
/** 상품 정보 */
export type Product = {
  id: number;
  name: string;
  term_days: number;
  min_daily_amount: number;
  apy_bps: number; // 복리 이율(APY), BPS (예: 8500 = 85.00%)
  tagline?: string | null;
  completion_bonus_bps?: number; // 완주 보너스율(BPS) - is_perfect일 경우만 적용
};

/** 계좌 상태 */
export type AccountStatus = "active" | "matured" | "failed" | "closed";

/** 계좌 정보 */
export type Account = {
  id: number;
  couple_id: string;
  product_id: number;
  status: AccountStatus;
  is_perfect: boolean; // ✅ 한 번이라도 미납하면 false
  daily_amount: number;
  started_date: string; // YYYY-MM-DD
  current_day: number; // 지금 진행 회차 (1..term_days+1)
  paid_days: number;
  last_paid_at: string | null;
  created_at: string;
  product?: Product; // 조인된 상품 정보
};

/* ---------- Fetch Products ---------- */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("savings_products")
    .select(
      `
      id,
      name,
      term_days,
      min_daily_amount,
      apy_bps,
      tagline,
      completion_bonus_bps
    `
    )
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/* ---------- Fetch Accounts (with product join) ---------- */
export async function fetchAccounts(coupleId: string): Promise<Account[]> {
  const { data, error } = await supabase
    .from("savings_accounts")
    .select(
      `
      id,
      couple_id,
      product_id,
      status,
      is_perfect,
      daily_amount,
      started_date,
      current_day,
      paid_days,
      last_paid_at,
      created_at,
      product:savings_products (
        id,
        name,
        term_days,
        min_daily_amount,
        apy_bps,
        tagline,
        completion_bonus_bps
      )
    `
    )
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Account[];
}

/* ---------- Open Account ---------- */
export async function openAccount(params: {
  couple_id: string;
  product_id: number;
  daily_amount: number;
}): Promise<Account> {
  const { data, error } = await supabase
    .from("savings_accounts")
    .insert(params)
    .select(
      `
      id,
      couple_id,
      product_id,
      status,
      is_perfect,
      daily_amount,
      started_date,
      current_day,
      paid_days,
      last_paid_at,
      created_at
    `
    )
    .single();

  if (error) throw error;
  return data as Account;
}

/* ---------- Deposit Today ---------- */
export async function depositToday(params: {
  account_id: number;
  couple_id: string;
  amount: number;
}): Promise<void> {
  const { error } = await supabase.from("savings_txns").insert({
    account_id: params.account_id,
    couple_id: params.couple_id,
    kind: "installment",
    amount: params.amount,
    meta: {},
  });
  if (error) throw error;
}
