import Nav from "./navbar/page";
import Main from "./mainview/page";
import "./globals.css";
import { inter } from "./fonts/font";
const res = await fetch("http://localhost:3000/api/games", {
  cache: "no-store",
});
const data = await res.json();
export default function Home() {
  return (
    <div className="flex flex-col w-screen h-screen max-h-screen">
      <Main data={data} />
    </div>
  );
}
