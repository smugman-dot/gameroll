// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Game Scroller",
  description: "Discover random games by genre",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
