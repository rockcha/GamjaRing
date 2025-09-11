// scripts/generateAquariumSQL.ts
// -----------------------------------------------------------------------------
// Aquarium seed SQL generator (UTF-8 safe file writer)
// Usage:
//   npx tsx ./scripts/generateAquariumSQL.ts
//   npx tsx ./scripts/generateAquariumSQL.ts --out ./seed_aquarium_entities.sql
// -----------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { FISHES } from "../src/features/aquarium/fishes";

// ===== config =================================================================
/** size 소수점 자리수 (DB가 numeric/decimal일 때 권장) */
const SIZE_DECIMALS = 2;
/** swimY는 퍼센트이므로 int4range로 저장 시 정수 반올림 */
const ROUND_SWIMY = true;
/** 출력 파일 기본 경로 */
const DEFAULT_OUT = "seed_aquarium_entities.sql";

// ===== helpers ================================================================
const now = () => new Date().toISOString();

/** SQL 문자열 이스케이프 */
function escSQL(s: string): string {
  return s.replace(/'/g, "''");
}
const q = (s: string) => `'${escSQL(s)}'`;

/** 숫자 포맷터 */
function fmtNum(n: number, decimals: number = 0): string {
  if (Number.isInteger(n) && decimals === 0) return String(n);
  return n.toFixed(decimals);
}

/** int4range 생성자 (양끝 포함) */
function int4range(lo: number, hi: number): string {
  const a = ROUND_SWIMY ? Math.round(lo) : lo;
  const b = ROUND_SWIMY ? Math.round(hi) : hi;
  return `int4range(${a},${b},'[]')`;
}

// ===== rows ===================================================================
type Row = {
  id: string;
  name_ko: string;
  price: number;
  size: number;
  food: string; // ingredient
  swim_y: string; // int4range(...)
  is_movable: string; // 'true' | 'false'
  rarity: string;
  description: string;
};

const rows: Row[] = FISHES.map((f) => {
  const [y1, y2] = f.swimY;
  return {
    id: f.id,
    name_ko: f.labelKo,
    price: f.cost ?? 0,
    size: Number(fmtNum(f.size ?? 1, SIZE_DECIMALS)),
    food: f.ingredient,
    swim_y: int4range(y1, y2),
    is_movable: f.isMovable ? "true" : "false",
    rarity: f.rarity,
    description: f.description ?? "",
  };
});

// ===== SQL ====================================================================
const valuesSql = rows
  .map(
    (r) =>
      `(${q(r.id)}, ${q(r.name_ko)}, ${r.price}, ${fmtNum(
        r.size,
        SIZE_DECIMALS
      )}, ${q(r.food)}, ${r.swim_y}, ${r.is_movable}, ${q(r.rarity)}, ${q(
        r.description
      )})`
  )
  .join(",\n");

const sql = `-- auto-generated: ${now()}
-- source: src/features/aquarium/fishes.ts
-- rows: ${rows.length}

BEGIN;

insert into public.aquarium_entities
(id, name_ko, price, size, food, swim_y, is_movable, rarity, description)
values
${valuesSql}
on conflict (id) do update set
  name_ko     = excluded.name_ko,
  price       = excluded.price,
  size        = excluded.size,
  food        = excluded.food,
  swim_y      = excluded.swim_y,
  is_movable  = excluded.is_movable,
  rarity      = excluded.rarity,
  description = excluded.description;

COMMIT;
`;

// ===== write file (UTF-8) =====================================================
const outArg = process.argv.find((a) => a.startsWith("--out="));
const outPath = path.resolve(
  outArg ? outArg.slice("--out=".length) : DEFAULT_OUT
);
fs.writeFileSync(outPath, sql, { encoding: "utf8" });

console.error(`[gen] rows=${rows.length} -> ${outPath}`);
