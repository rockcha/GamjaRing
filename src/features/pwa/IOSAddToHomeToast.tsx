import { useEffect, useState } from "react";

/** iOS 기기 여부 (아이패드/아이폰 포함) */
function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** 홈 화면에 설치된 PWA 실행 여부 (iOS Safari 전용 플래그) */
function isStandalone() {
  // @ts-ignore
  return window.navigator.standalone === true;
}

/** iOS Safari(브라우저)에서만 노출: 크롬 iOS도 공유버튼 경로 동일하니 보여줘도 무방 */
function isSafariLike() {
  // iOS에서 사파리/사파리 기반 브라우저 식별 (과도한 제한X)
  return /Safari/i.test(navigator.userAgent);
}

type Props = {
  /** 최초 진입 후 토스트 지연(ms). 기본 800ms */
  delayMs?: number;
  /** 다시 보지 않기 기간(일). 기본 3일 */
  snoozeDays?: number;
  /** localStorage key */
  storageKey?: string;
};

export default function IOSAddToHomeToast({
  delayMs = 800,
  snoozeDays = 3,
  storageKey = "iosAddToHomeSnoozeAt",
}: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isIOS()) return;
    if (isStandalone()) return; // 이미 홈화면 앱이면 X
    if (!isSafariLike()) return; // 필요 시 제거 가능

    // 스누즈 체크
    const ts = localStorage.getItem(storageKey);
    if (ts) {
      const last = Number(ts);
      const diffDays = (Date.now() - last) / (1000 * 60 * 60 * 24);
      if (diffDays < snoozeDays) return;
    }

    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, snoozeDays, storageKey]);

  if (!show) return null;

  const snooze = () => {
    localStorage.setItem(storageKey, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="flex items-center gap-2 rounded-xl border bg-white/90 backdrop-blur px-3 py-2 text-sm shadow">
        <span>
          iOS 설치: <b>공유</b> 버튼 → <b>홈 화면에 추가</b> 📲
        </span>
        <button
          onClick={snooze}
          className="ml-1 rounded px-2 py-1 text-sky-600 hover:bg-sky-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
