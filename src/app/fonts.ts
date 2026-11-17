import { Outfit, Space_Grotesk, Encode_Sans_Expanded, Archivo } from "next/font/google";

export const outfit = Outfit({ subsets: ["latin"], weight: ["400", "700"] });

export const wideFont = Archivo({
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
});

