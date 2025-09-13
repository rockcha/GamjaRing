import { useEffect, useRef, useState } from "react";

type Snap = "closed" | "half" | "full";

const SNAP_PX = {
  closed: 64, // 닫힘 높이
  half: 0.5, // 화면의 50%
  full: 0.85, // 화면의 85%
} as const;

function vh(pxOrRatio: number | string) {
  const h = window.innerHeight;
  return typeof pxOrRatio === "number" ? pxOrRatio : 0;
}

function snapToY(snap: Snap) {
  const H = window.innerHeight;
  if (snap === "closed") return H - SNAP_PX.closed;
  if (snap === "half") return H * (1 - SNAP_PX.half);
  return H * (1 - SNAP_PX.full);
}

export default function BottomSheet({
  children,
  initial = "closed",
  onSnapChange,
}: {
  children: React.ReactNode;
  initial?: Snap;
  onSnapChange?: (s: Snap) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startTop = useRef(0);
  const [snap, setSnap] = useState<Snap>(initial);
  const [dragging, setDragging] = useState(false);
  const velocity = useRef<{ y: number; t: number }>({ y: 0, t: 0 });

  // 스냅 적용
  const applySnap = (s: Snap, withAnim = true) => {
    const el = sheetRef.current;
    if (!el) return;
    const y = snapToY(s);
    if (withAnim) el.style.transition = "transform .22s ease-out";
    el.style.transform = `translateY(${y}px)`;
    if (withAnim) {
      setTimeout(() => (el.style.transition = ""), 240);
    }
    setSnap(s);
    onSnapChange?.(s);
    document.body.style.overflow = s === "full" || s === "half" ? "hidden" : "";
  };

  useEffect(() => {
    applySnap(snap, false);
    // 초기 사이즈 대응
    const onResize = () => applySnap(snap, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    startY.current = e.clientY;
    const matrix = new DOMMatrixReadOnly(
      getComputedStyle(sheetRef.current!).transform
    );
    startTop.current = matrix.m42; // translateY
    velocity.current = { y: e.clientY, t: performance.now() };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const el = sheetRef.current!;
    const dy = e.clientY - startY.current;
    const next = Math.max(0, startTop.current + dy);
    // 위로는 0까지만(헤더 닿으면 더 못올라가게)
    const maxY = window.innerHeight - 48; // 거의 바닥까지
    const clamped = Math.min(next, maxY);
    el.style.transform = `translateY(${clamped}px)`;

    // 속도 추적
    const now = performance.now();
    const dt = now - velocity.current.t;
    if (dt > 16) velocity.current = { y: e.clientY, t: now };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    const el = sheetRef.current!;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    const curY = matrix.m42;

    // 빠른 스와이프 방향 우선
    const dy = e.clientY - velocity.current.y;
    const fast = Math.abs(dy) > 28;

    let target: Snap = snap;
    if (fast) {
      target =
        dy > 0
          ? snap === "full"
            ? "half"
            : "closed"
          : snap === "closed"
          ? "half"
          : "full";
    } else {
      // 위치 기반 스냅
      const H = window.innerHeight;
      const ratio = 1 - curY / H;
      if (ratio > 0.72) target = "full";
      else if (ratio > 0.25) target = "half";
      else target = "closed";
    }
    applySnap(target, true);
  };

  return (
    <div
      ref={sheetRef}
      className="fixed left-0 right-0 z-[60] touch-none md:hidden"
      style={{
        top: 0,
        height: "100vh",
        transform: `translateY(${snapToY(initial)}px)`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* 헤더(그랩 핸들) */}
      <div className="h-10 grid place-items-center bg-white/90 backdrop-blur border-t border-x rounded-t-2xl shadow">
        <div className="h-1.5 w-10 rounded-full bg-zinc-300" />
      </div>
      {/* 내용 */}
      <div className="h-[calc(100vh-40px)] overflow-y-auto bg-white border-x border-b rounded-b-2xl p-3">
        {children}
      </div>
    </div>
  );
}
