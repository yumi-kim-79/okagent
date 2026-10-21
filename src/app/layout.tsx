import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OK Agent — 에이전트 승인",
  description: "AI 에이전트가 돈을 쓰거나 되돌릴 수 없는 일을 하기 전에, 사람이 한 번 탭으로 승인하거나 거부합니다.",
  robots: { index: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
