import type { Metadata } from "next";
import { EmailSelectionPlayground } from "../../../components/import/EmailSelectionPlayground";

export const metadata: Metadata = {
  title: "OpenLoop | Email selection test",
  robots: { index: false, follow: false },
};

export default function EmailSelectionPage() {
  return <EmailSelectionPlayground />;
}
