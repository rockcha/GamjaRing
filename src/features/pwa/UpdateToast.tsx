import { useEffect, useState } from "react";
import { initPwaClient } from "./updateClient";

/**
 * "새 버전이 있어요" 토스트를 전역 1회 렌더.
 * Tailwind 기준 간단 스타일. 원하는 UI로 커스텀 가능.
 */
export default function UpdateToast() {
  const [show, setShow] = useState(false);
  const [doUpdate, setDoUpdate] = useState<null | (() => void)>(null);

  useEffect(() => {
    // onNeedRefresh가 불리면 업데이트 실행 함수를 보관하고 토스트 노출
    initPwaClient({
      onNeedRefresh(updateNow) {
        setDoUpdate(() => updateNow);
        setShow(true);
      },
      // onOfflineReady: 최초 설치 등 안내용. 쓰고 싶으면 토스트 추가 가능.
    });
  }, []);

  if (!show) return null;

  const handleUpdate = () => {
    // updateNow() 호출 -> SW가 즉시 skipWaiting, 클라이언트 리로드
    doUpdate?.();
    // 안전 차원에서 버튼 중복클릭 방지
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="flex items-center gap-3 rounded-xl border bg-zinc-900 text-white px-3 py-2 shadow">
        <span>새 버전이 준비됐어요.</span>
        <button
          onClick={handleUpdate}
          className="rounded bg-white text-zinc-900 px-2 py-1 text-sm hover:bg-zinc-100"
        >
          지금 업데이트
        </button>
        <button
          onClick={() => setShow(false)}
          className="rounded px-2 py-1 text-sm text-zinc-300 hover:text-white"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
