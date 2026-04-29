import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "YouTube Viral Report Dashboard",
  description: "Generate viral YouTube content analysis reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
