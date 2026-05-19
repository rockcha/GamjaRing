// src/features/FlowerShop/FlowerShopPage.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flower2, Sprout } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import FlowerShop from "./FlowerShop";
import GardenBackyard from "./GardenBackyard";

type View = "shop" | "garden";

const VIEWS: Record<
  View,
  {
    label: string;
    description: string;
    icon: typeof Flower2;
  }
> = {
  shop: {
    label: "꽃집",
    description: "보유한 꽃을 확인하고 주문 요청을 처리해요.",
    icon: Flower2,
  },
  garden: {
    label: "정원",
    description: "씨앗을 심고 자란 꽃을 수확해요.",
    icon: Sprout,
  },
};

export default function FlowerShopPage() {
  const [view, setView] = useState<View>("shop");
  const touchStartX = useRef<number | null>(null);

  const active = VIEWS[view];
  const ActiveIcon = active.icon;

  const handleSwitch = useCallback((next: View) => setView(next), []);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null) return;

    const dx = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && view === "shop") handleSwitch("garden");
      if (dx > 0 && view === "garden") handleSwitch("shop");
    }

    touchStartX.current = null;
  };

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 md:gap-6 md:py-8 lg:px-8 xl:px-10">
        <Card className="overflow-hidden border-pink-100/80 bg-white/95 shadow-sm">
          <CardHeader className="gap-4 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-bold tracking-normal md:text-3xl">
                    {active.label}
                  </CardTitle>
                  <CardDescription className="leading-6">
                    {active.description}
                  </CardDescription>
                </div>
              </div>

              <div
                role="tablist"
                aria-label="꽃집 화면 전환"
                className="grid w-full grid-cols-2 rounded-lg border bg-muted/40 p-1 lg:w-[320px]"
              >
                {(["shop", "garden"] as const).map((key) => {
                  const item = VIEWS[key];
                  const Icon = item.icon;
                  const selected = view === key;

                  return (
                    <Button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      variant={selected ? "default" : "ghost"}
                      className={cn(
                        "h-10 gap-2 rounded-md",
                        !selected && "text-muted-foreground",
                      )}
                      onClick={() => handleSwitch(key)}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              role="tabpanel"
            >
              {view === "shop" ? <FlowerShop /> : <GardenBackyard />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
