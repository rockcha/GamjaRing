// src/features/bucketlist/components/BucketListEmpty.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NotebookPen } from "lucide-react";

export default function BucketListEmpty({
  onCreate,
}: {
  onCreate: () => void;
}) {
  return (
    <Card className="p-10 text-center rounded-2xl border-dashed ">
      <div className="flex flex-col items-center gap-3">
        <NotebookPen className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          아직 버킷리스트가 없어요. 함께 첫 버킷을 만들어볼까요?
        </p>
        <Button onClick={onCreate}>버킷 추가</Button>
      </div>
    </Card>
  );
}
