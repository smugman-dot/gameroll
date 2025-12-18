// app/layout.js
import "./globals.css";

export const metadata = {
  title: "Gameroll",
  description: "Discover your next favorite game!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
