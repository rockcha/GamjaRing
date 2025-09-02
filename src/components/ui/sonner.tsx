// src/components/ui/sonner.tsx
"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Sonner가 허용하는 theme 문자열 판별 (undefined 차단)
function isSonnerTheme(v: unknown): v is NonNullable<ToasterProps["theme"]> {
  return v === "light" || v === "dark" || v === "system";
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme, resolvedTheme } = useTheme();

  // 실제 적용 중인 테마 우선(resolvedTheme), 없으면 theme
  const candidate = resolvedTheme ?? theme;
  const themeProp = isSonnerTheme(candidate) ? candidate : undefined;

  return (
    <Sonner
      // ✅ theme이 유효할 때만 전달 (undefined 방지)
      {...(themeProp
        ? ({ theme: themeProp } as Pick<ToasterProps, "theme">)
        : {})}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
