"use client";

import { useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createAlbum } from "@/features/albums/api";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faTrashCan,
  faImage,
  faCloudArrowUp,
} from "@fortawesome/free-solid-svg-icons";

type LocalPhoto = {
  file: File;
  url: string;
  description: string;
  isCover: boolean;
};

export default function AlbumCreatePage() {
  const { user } = useUser();
  const { couple } = useCoupleContext();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [weather, setWeather] = useState<string>(""); // 이모지
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  const phoneAspect = "aspect-[3/4]"; // 폰 사진 비율(세로 3:4) 미리보기 박스

  // 파일 입력 ref + 수동 트리거
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openFilePicker = () => fileInputRef.current?.click();

  function onSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const next: LocalPhoto[] = files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      description: "",
      isCover: false,
    }));
    setPhotos((prev) => [...prev, ...next]);
    e.currentTarget.value = ""; // 같은 파일 다시 선택 가능
  }

  function setAsCover(idx: number) {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isCover: i === idx })));
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSave() {
    if (!user) return toast.error("로그인이 필요합니다.");
    if (!couple) return toast.error("커플 정보가 필요합니다.");
    if (!title.trim()) return toast.error("제목을 입력해주세요.");
    if (!date) return toast.error("데이트 날짜를 선택해주세요.");

    setBusy(true);
    try {
      const payload = {
        coupleId: couple.id,
        title: title.trim(),
        date,
        weather: weather || undefined,
        photos: photos.map((p) => ({
          file: p.file,
          description: p.description || undefined,
          isCover: p.isCover,
        })),
      };
      const album = await createAlbum(payload);
      toast.success("앨범이 저장되었어요!");
      navigate(`/albums/${album.id}`);
    } catch (e: any) {
      console.error(e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-semibold">앨범 작성</h1>
        <Button onClick={onSave} disabled={busy} type="button">
          <FontAwesomeIcon icon={faCloudArrowUp} className="mr-2" />
          저장
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>제목</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 롯데월드 데이트"
            />
          </div>
          <div>
            <Label>데이트 날짜</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <Label>날씨(이모지)</Label>
            <Input
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              placeholder="예: ☀️ / 🌧️ / ⛅"
            />
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <h2 className="font-medium">사진들</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={openFilePicker}
              type="button"
              aria-label="이미지 추가"
            >
              <FontAwesomeIcon icon={faImage} className="mr-2" />
              이미지 추가
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onSelectFiles}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* 좌: 썸네일 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((p, idx) => (
              <div
                key={idx}
                className="group rounded-lg overflow-hidden border bg-muted/30"
              >
                <div
                  className={cn("w-full", phoneAspect, "bg-black/5 relative")}
                >
                  <img
                    src={p.url}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between p-2 text-xs">
                  <Button
                    variant={p.isCover ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setAsCover(idx)}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faStar} className="mr-1" />
                    {p.isCover ? "대표" : "대표 지정"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePhoto(idx)}
                    type="button"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </Button>
                </div>
              </div>
            ))}
            {photos.length === 0 && (
              <div className="col-span-full text-sm text-muted-foreground">
                아직 추가된 이미지가 없어요. <strong>이미지 추가</strong>{" "}
                버튼으로 업로드하세요.
              </div>
            )}
          </div>

          {/* 우: 설명 편집 패널 */}
          <div>
            <h3 className="text-sm font-medium mb-2">사진 설명</h3>
            <div className="space-y-3">
              {photos.map((p, idx) => (
                <div key={idx} className="rounded-md border p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-muted-foreground">
                      #{idx + 1}
                      {p.isCover && " · 대표"}
                    </div>
                    <span className="text-xs">
                      {(p.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <Textarea
                    placeholder="사진에 대한 설명을 입력하세요"
                    value={p.description}
                    onChange={(e) =>
                      setPhotos((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, description: e.target.value } : x
                        )
                      )
                    }
                    rows={3}
                  />
                </div>
              ))}
              {photos.length === 0 && (
                <div className="text-xs text-muted-foreground">
                  왼쪽에서 사진을 추가하면 여기에서 설명을 작성할 수 있어요.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
