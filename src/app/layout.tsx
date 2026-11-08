import "./globals.css";

import { outfit } from "./fonts";

export const metadata = {
  title: "Gameroll",
  description: "Discover your next favorite game!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={outfit.className}>
      <body>{children}</body>
    </html>
  );
}
