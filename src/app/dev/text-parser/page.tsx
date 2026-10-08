import type { Metadata } from "next";
import { QuickTextParser } from "../../../components/import/QuickTextParser";

export const metadata: Metadata = {
  title: "OpenLoop | Text parser test",
  robots: { index: false, follow: false },
};

export default function TextParserTestPage() {
  return <QuickTextParser />;
}
