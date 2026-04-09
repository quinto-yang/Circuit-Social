import type { Metadata } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Circuit Social",
  description: "Multi-chain EVM social H5 with SIWE authentication"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript =
    "(function(){try{var t=localStorage.getItem('cx_theme');var r=document.documentElement;if(t==='light'||t==='dark'){r.setAttribute('data-theme',t);}else{r.removeAttribute('data-theme');}}catch(e){}})();";
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script id="cx-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
