// src/pages/CookingPage.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DexInventoryButton from "./DexInventoryButton";
import CookingBoard from "@/features/cooking/CookingBoard";

export default function CookingPage() {
  return (
    <div className={cn("mx-auto w-full max-w-6xl p-4 sm:p-6")}>
      <div className="flex items-center justify-end my-4">
        <DexInventoryButton />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">나만의 요리를 해보세요</CardTitle>
        </CardHeader>
        <CardContent>
          <CookingBoard />
        </CardContent>
      </Card>
    </div>
  );
}
