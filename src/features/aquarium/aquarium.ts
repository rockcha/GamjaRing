// src/lib/events/aquarium.ts
export function emitAquariumUpdated(coupleId: string, tankNo?: number) {
  window.dispatchEvent(
    new CustomEvent("aquarium-updated", {
      detail: { coupleId, tankNo, ts: Date.now() },
    })
  );
}
