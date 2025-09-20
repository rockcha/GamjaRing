"use client";

import { useEffect, useState } from "react";
import { listMyAlbums } from "@/features/albums/api";
import type { Album } from "@/features/albums/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

export default function AlbumsPage() {
  const [items, setItems] = useState<Album[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const rows = await listMyAlbums();
        setItems(rows);
      } catch (e) {
        console.error(e);
        setItems([]);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">나의 앨범</h1>
        <Button onClick={() => navigate("/albums/new")}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          앨범 추가하기
        </Button>
      </div>

      {items === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-2">
              <Skeleton className="w-full aspect-[3/4] mb-2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-1" />
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          아직 앨범이 없어요. <b>앨범 추가하기</b>로 첫 앨범을 만들어보세요.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((a) => (
            <Card
              key={a.id}
              className="overflow-hidden cursor-pointer"
              onClick={() => navigate(`/albums/${a.id}`)}
            >
              <div className="w-full aspect-[3/4] bg-muted">
                {a.cover_url ? (
                  <img
                    src={a.cover_url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Cover
                  </div>
                )}
              </div>
              <div className="p-2">
                <div className="font-medium truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.date} {a.weather ? ` · ${a.weather}` : ""}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
