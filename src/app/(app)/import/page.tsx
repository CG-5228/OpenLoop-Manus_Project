import type { Metadata } from "next";
import { ImportView } from "@/components/import-flow/import-view";

export const metadata: Metadata = { title: "Add a conversation" };

export default function ImportPage() {
  return <ImportView />;
}
