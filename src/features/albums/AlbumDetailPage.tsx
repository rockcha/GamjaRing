"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAlbum } from "@/features/albums/api";
import type { Album, AlbumPhoto } from "@/features/albums/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const { album, photos } = await getAlbum(id);
        setAlbum(album);
        setPhotos(photos);
      } catch (e) {
        console.error(e);
        setAlbum(null);
        setPhotos([]);
      }
    })();
  }, [id]);

  if (!album || photos === null) {
    return (
      <div className="mx-auto max-w-4xl p-4">
        <Skeleton className="h-7 w-1/3 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-6" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-2">
              <Skeleton className="w-full aspect-[3/4]" />
              <Skeleton className="h-4 w-3/4 mt-2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="text-xl font-semibold">
        {album.title}{" "}
        {album.weather ? <span className="ml-1">{album.weather}</span> : null}
      </h1>
      <div className="text-sm text-muted-foreground">{album.date}</div>
      <Separator className="my-4" />

      <div className="grid sm:grid-cols-2 gap-3">
        {photos.map((p, i) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="w-full aspect-[3/4] bg-muted">
              <img src={p.publicUrl} className="w-full h-full object-cover" />
            </div>
            {p.description && (
              <div className="p-2 text-sm">{p.description}</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
