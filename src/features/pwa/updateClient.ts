import { registerSW } from "virtual:pwa-register";

type OnNeedRefresh = (updateNow: () => void) => void;
type OnOfflineReady = () => void;

/**
 * PWA 업데이트를 앱에 연결하는 초기화 함수.
 * - onNeedRefresh: 새 버전 준비되면 호출. UI에서 "업데이트" 버튼 노출.
 * - onOfflineReady: 최초 설치 완료 등 알림 용도(선택).
 */
export function initPwaClient({
  onNeedRefresh,
  onOfflineReady,
}: {
  onNeedRefresh: OnNeedRefresh;
  onOfflineReady?: OnOfflineReady;
}) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // 버튼을 눌렀을 때 updateSW(true) 실행하도록 콜백 전달
      onNeedRefresh(() => updateSW(true));
    },
    onOfflineReady() {
      onOfflineReady?.();
    },
    onRegisterError(err: unknown) {
      console.error("SW register failed", err);
    },
  });
}
