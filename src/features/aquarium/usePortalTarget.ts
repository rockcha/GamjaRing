"use client";

import { useEffect, useState } from "react";

export function usePortalTarget() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? document.body : null;
}
