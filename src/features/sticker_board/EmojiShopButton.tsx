// src/features/emoji_shop/EmojiShopButton.tsx
"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Store,
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// 가격 상수
const PRICE_PER_UNIT = 15;

// 카테고리/이모지 데이터
const THEMES: { key: string; displayName: string; emojis: string[] }[] = [
  {
    key: "status",
    displayName: "☑️ 체크·경고·표시",
    emojis: [
      "✅",
      "☑️",
      "✔️",
      "✖️",
      "❌",
      "❎",
      "➕",
      "➖",
      "➗",
      "➰",
      "➿",
      "✳️",
      "✴️",
      "❇️",
      "❓",
      "❔",
      "❕",
      "❗",
      "‼️",
      "⁉️",
      "⚠️",
      "🚫",
      "⛔️",
    ],
  },
  {
    key: "arrows",
    displayName: "↔️ 화살표·순환",
    emojis: [
      "⬅️",
      "➡️",
      "⬆️",
      "⬇️",
      "↔️",
      "↕️",
      "↩️",
      "↪️",
      "⤴️",
      "⤵️",
      "🔀",
      "🔁",
      "🔂",
      "🔃",
      "🔄",
      "⏪",
      "⏩",
      "⏫",
      "⏬",
    ],
  },
  {
    key: "medal",
    displayName: "🥇 메달 & 트로피",
    emojis: ["🥇", "🏅", "🎖️", "🏆", "🏵️"],
  },

  {
    key: "party",
    displayName: "🎉 파티 & 꾸미기",
    emojis: ["🎈", "🎉", "🎊", "🎀", "🎁", "🪅", "🧸", "🕯️"],
  },
  {
    key: "love",
    displayName: "💖 감정 & 상징",
    emojis: ["💖", "💕", "💓", "💜", "💛", "💚", "💙", "🤍", "🌟", "✨"],
  },
  {
    key: "border",
    displayName: "🧱 울타리 & 박스 (테두리 재료)",
    emojis: ["🧱", "🪵", "🚧", "⛓️", "🟧", "🟨", "🟩", "🟦", "🟪", "🟫", "📦"],
  },
  {
    key: "animals",
    displayName: "🐾 동물",
    emojis: [
      "🐱",
      "🐶",
      "🐰",
      "🐹",
      "🐻",
      "🦊",
      "🐸",
      "🐥",
      "🐧",
      "🐠",
      "🐟",
      "🐢",
      "🦋",
      "🐝",
      "🦀",
      "🐙",
      "🦑",
      "🐬",
      "🦄",
      "🐨",
      "🐼",
      "🦉",
      "🦕",
      "🦖",
      "🐌",
      "🐞",
      "🪲",
      "🪱",
      "🦥",
      "🦔",
      "🐿️",
      "🦢",
    ],
  },
  {
    key: "foods",
    displayName: "🍓 음식 & 과일/디저트",
    emojis: [
      "🍓",
      "🍒",
      "🍑",
      "🍋",
      "🍏",
      "🍪",
      "🍬",
      "🍭",
      "🧀",
      "🍎",
      "🍇",
      "🫐",
      "🍊",
    ],
  },
  {
    key: "plants",
    displayName: "🌿 자연 & 식물",
    emojis: ["🌵", "🌲", "🌳", "🌴", "🪻", "🌺", "🪷", "🌾", "🌱", "🪴"],
  },
  {
    key: "places",
    displayName: "🏛️ 장소 & 건축물",
    emojis: ["🗻", "🏯", "🏰", "🗼", "🗽", "🕌", "⛩️", "⛲", "🏟️", "🎡"],
  },
  {
    key: "play",
    displayName: "🎮 놀이 & 액티비티",
    emojis: ["🎮", "🎲", "🧩", "♟️", "🎯", "🏓", "🏸", "⛸️", "🎳", "🛼"],
  },
  {
    key: "arts",
    displayName: "🎭 예술 & 소품",
    emojis: ["🎪", "🎭", "🎨", "🖌️", "🖍️", "✂️", "🧵", "🪡", "🛎️", "🔔"],
  },
  {
    key: "music",
    displayName: "🎼 음악 & 악기",
    emojis: [
      "🎹",
      "🎻",
      "🎷",
      "🎺",
      "🪗",
      "🎸",
      "🪕",
      "🥁",
      "🪘",
      "🎤",
      "🎧",
      "🎼",
      "🎙️",
    ],
  },
  {
    key: "vehicles",
    displayName: "🚗 탈것 & 교통",
    emojis: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🚑",
      "🚒",
      "🚓",
      "🚂",
      "🚆",
      "✈️",
      "🚁",
      "🚤",
      "⛴️",
      "🚲",
      "🛵",
      "🏍️",
      "🛺",
      "🚡",
      "🚠",
    ],
  },
  {
    key: "electronics",
    displayName: "💻 전자기기",
    emojis: [
      "💻",
      "🖥️",
      "🖨️",
      "⌨️",
      "🖱️",
      "🖲️",
      "📱",
      "📲",
      "📞",
      "☎️",
      "📺",
      "📷",
      "📸",
      "🎥",
      "📹",
      "📼",
      "💽",
      "💾",
      "💿",
      "📀",
      "📡",
    ],
  },
  {
    key: "weather",
    displayName: "🌦️ 날씨 & 하늘",
    emojis: [
      "☀️",
      "🌤️",
      "⛅",
      "🌥️",
      "☁️",
      "🌧️",
      "⛈️",
      "🌩️",
      "🌨️",
      "❄️",
      "🌪️",
      "🌈",
      "☔",
      "⚡",
      "🔥",
      "🌊",
      "🌫️",
      "🌙",
      "🌌",
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// 유틸: 장바구니 자료구조
type Cart = Record<string, number>;
const totalQty = (cart: Cart) => Object.values(cart).reduce((a, b) => a + b, 0);
const totalCost = (cart: Cart) => totalQty(cart) * PRICE_PER_UNIT;

// ─────────────────────────────────────────────────────────────

export default function EmojiShopButton() {
  const { couple, spendGold, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(THEMES[0]?.key ?? "party");
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<Cart>({});

  const activeTheme = useMemo(
    () => THEMES.find((t) => t.key === activeKey) ?? THEMES[0],
    [activeKey]
  );

  const qty = useMemo(() => totalQty(cart), [cart]);
  const cost = useMemo(() => totalCost(cart), [cart]);

  function addOne(emoji: string) {
    setCart((c) => ({ ...c, [emoji]: (c[emoji] ?? 0) + 1 }));
  }
  function decOne(emoji: string) {
    setCart((c) => {
      const next = Math.max(0, (c[emoji] ?? 0) - 1);
      const copy = { ...c };
      if (next <= 0) delete copy[emoji];
      else copy[emoji] = next;
      return copy;
    });
  }
  function setQty(emoji: string, n: number) {
    setCart((c) => {
      const next = Math.max(0, Math.floor(n || 0));
      const copy = { ...c };
      if (next <= 0) delete copy[emoji];
      else copy[emoji] = next;
      return copy;
    });
  }
  function removeEmoji(emoji: string) {
    setCart((c) => {
      const copy = { ...c };
      delete copy[emoji];
      return copy;
    });
  }
  function clearCart() {
    setCart({});
  }

  async function purchase() {
    if (!coupleId) return toast.error("커플 정보가 없습니다.");
    if (qty <= 0) return toast.error("장바구니가 비어있어요.");
    setBusy(true);

    const pay = await spendGold(cost);
    if (pay.error) {
      setBusy(false);
      if (/골드가 부족/.test(pay.error.message ?? "")) {
        return toast.error("골드가 부족합니다.");
      }
      return toast.error(pay.error.message ?? "결제 중 오류가 발생했어요.");
    }

    try {
      const titles = Object.keys(cart);
      const { data: existing, error: selErr } = await supabase
        .from("sticker_inventory")
        .select("title, qty")
        .eq("couple_id", coupleId)
        .in("title", titles);
      if (selErr) throw selErr;

      const existMap = new Map<string, number>();
      existing?.forEach((r: any) => existMap.set(r.title, r.qty ?? 0));
      const now = new Date().toISOString();

      const inserts = titles
        .filter((t) => !existMap.has(t))
        .map((title) => ({
          couple_id: coupleId,
          title,
          type: "emoji",
          emoji: title,
          url: null,
          qty: cart[title],
          base_w: 80,
          base_h: 80,
          created_at: now as any,
          updated_at: now as any,
        }));

      if (inserts.length > 0) {
        const { error: insErr } = await supabase
          .from("sticker_inventory")
          .insert(inserts);
        if (insErr) throw insErr;
      }

      const updates = titles.filter((t) => existMap.has(t));
      for (const title of updates) {
        const newQty = (existMap.get(title) ?? 0) + cart[title];
        const { error: updErr } = await supabase
          .from("sticker_inventory")
          .update({ qty: newQty, updated_at: now as any })
          .eq("couple_id", coupleId)
          .eq("title", title);
        if (updErr) throw updErr;
      }

      toast.success(`구매 완료! 이모지 ${qty}개를 지급했어요.`);
      window.dispatchEvent(
        new CustomEvent("sticker-inventory-updated", { detail: { coupleId } })
      );

      clearCart();
      setOpen(false);
    } catch (e: any) {
      await addGold?.(cost);
      console.error(e);
      toast.error("구매 처리 중 오류가 생겨 환불했어요.");
    } finally {
      setBusy(false);
    }
  }

  // 우측 여백 활용: 빠른 담기 프리셋 / 최근 담은 이모지(간단)
  const quickPacks: { name: string; items: string[] }[] = [
    { name: "하트+반짝이", items: ["💖", "💕", "✨", "🌟"] },
    { name: "바다 세트", items: ["🐠", "🐟", "🐬", "🌊"] },
    { name: "파티 스타터", items: ["🎈", "🎉", "🎊", "🎁"] },
  ];
  const recentlyAdded = useMemo(
    () =>
      Object.entries(cart)
        .slice(-6)
        .map(([e]) => e),
    [cart]
  );

  return (
    <>
      {/* 상점 열기 버튼: Lucide Store 아이콘 */}
      <Button
        variant="default"
        onClick={() => setOpen(true)}
        className="rounded-lg gap-2"
      >
        <Store className="h-4 w-4" />
        이모지 상점
      </Button>

      {/* 상점 다이얼로그 (고정 사이즈 + 내부 스크롤) */}
      <Dialog open={open} onOpenChange={(o) => (busy ? null : setOpen(o))}>
        <DialogContent className="sm:max-w-[1100px] w-[92vw] p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              이모지 상점
            </DialogTitle>
          </DialogHeader>

          {/* 레이아웃: 좌(카트) / 중(카테고리+그리드) / 우(유틸) */}
          <div className="h-[72vh] grid grid-cols-1 lg:grid-cols-[300px_1fr_280px]">
            {/* 왼쪽: 장바구니 (첫 번째 배치) */}
            <aside className="min-w-0 border-r bg-white/60">
              {/* 좌측 컬럼 자체를 꽉 채움 */}
              <div className="h-full flex flex-col">
                {/* padding을 주되, 그 안의 카드가 전체 높이를 차지하도록 */}
                <div className="p-4 h-full">
                  {/* 카드: 전체 높이 고정 + 내부 flex 분할 */}
                  <div className="h-full flex flex-col rounded-xl border bg-white">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                      <div className="text-sm text-neutral-700 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        장바구니
                      </div>
                      <button
                        className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1 disabled:opacity-50"
                        onClick={clearCart}
                        disabled={busy || qty === 0}
                        title="비우기"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        비우기
                      </button>
                    </div>

                    {/* 리스트: 남은 공간 전부 사용 + 스크롤 */}
                    <div className="flex-1 overflow-auto px-3 py-2 space-y-2">
                      {qty === 0 ? (
                        <div className="text-sm text-neutral-500">
                          담은 이모지가 없어요.
                        </div>
                      ) : (
                        Object.entries(cart).map(([emoji, n]) => (
                          <div
                            key={emoji}
                            className="flex items-center gap-2 justify-between"
                          >
                            <div className="text-2xl leading-none">{emoji}</div>
                            <div className="flex items-center gap-1">
                              <button
                                className="px-2 h-8 rounded border hover:bg-neutral-50"
                                onClick={() => decOne(emoji)}
                                disabled={busy}
                                aria-label="decrease"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={n}
                                onChange={(e) =>
                                  setQty(emoji, Number(e.target.value || 0))
                                }
                                className="w-14 h-8 text-center rounded border"
                                disabled={busy}
                              />
                              <button
                                className="px-2 h-8 rounded border hover:bg-neutral-50"
                                onClick={() => addOne(emoji)}
                                disabled={busy}
                                aria-label="increase"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="ml-1 text-xs text-neutral-500 underline"
                                onClick={() => removeEmoji(emoji)}
                                disabled={busy}
                              >
                                제거
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* 푸터: 항상 카드 하단 고정 */}
                    <div className="border-t px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600">수량</span>
                        <span className="font-medium">{qty}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600">합계</span>
                        <span className="font-semibold">🪙 {cost}</span>
                      </div>
                      <Button
                        className="w-full mt-2"
                        onClick={purchase}
                        disabled={busy || qty === 0}
                      >
                        {busy ? "구매 중…" : "구매하기"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* 중앙: 카테고리(위) + 이모지 그리드(아래) */}
            <section className="min-w-0 flex flex-col">
              {/* 카테고리 바: 위쪽에 고정(스크롤 시 상단에 붙음) */}
              <div className="sticky top-0 z-10 px-5 py-3 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.key}
                      className={[
                        "text-xs px-3 py-1.5 rounded-full border transition",
                        activeKey === t.key
                          ? "bg-black text-white border-black"
                          : "bg-white hover:bg-neutral-50",
                      ].join(" ")}
                      onClick={() => setActiveKey(t.key)}
                      disabled={busy}
                    >
                      {t.displayName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 이모지 목록: 카테고리 아래쪽, 내부 스크롤 */}
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12 gap-2">
                  {activeTheme.emojis.map((emoji) => {
                    const inCart = cart[emoji] ?? 0;
                    return (
                      <button
                        key={emoji}
                        className="relative aspect-square rounded-lg border bg-white hover:shadow-sm grid place-items-center text-2xl"
                        onClick={() => addOne(emoji)}
                        disabled={busy}
                        title={`${emoji} (개당 ${PRICE_PER_UNIT}골드)`}
                      >
                        <span>{emoji}</span>
                        {inCart > 0 && (
                          <span className="absolute right-1 bottom-1 text-[11px] px-1 rounded bg-black/70 text-white">
                            x{inCart}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="fixed bottom-6 right-1/2 translate-x-1/2 text-xs text-neutral-500">
                  이모지는 1개당 {PRICE_PER_UNIT}골드입니다. 구매 후 스티커
                  인벤토리에 추가됩니다.
                </p>
              </div>
            </section>

            {/* 오른쪽: 유틸 패널(여백 똑똑 활용) */}
            <aside className="hidden lg:flex flex-col border-l min-h-0">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4" />
                  빠른 담기
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {quickPacks.map((pack) => (
                    <button
                      key={pack.name}
                      onClick={() => {
                        if (busy) return;
                        setCart((c) => {
                          const copy = { ...c };
                          pack.items.forEach(
                            (e) => (copy[e] = (copy[e] ?? 0) + 1)
                          );
                          return copy;
                        });
                      }}
                      className="rounded-lg border bg-white hover:bg-neutral-50 px-3 py-2 text-left"
                      title={`${pack.name} 담기`}
                    >
                      <div className="text-xs text-neutral-600">
                        {pack.name}
                      </div>
                      <div className="text-lg leading-none mt-1">
                        {pack.items.join(" ")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 text-xs text-neutral-600 space-y-2 overflow-auto">
                <div className="font-medium">TIP</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>이모지를 클릭하면 바로 1개가 담겨요.</li>
                  <li>
                    좌측 장바구니에서 수량을 직접 입력해 조절할 수 있어요.
                  </li>
                  <li>카테고리 탭을 눌러 원하는 테마로 전환하세요.</li>
                </ul>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
