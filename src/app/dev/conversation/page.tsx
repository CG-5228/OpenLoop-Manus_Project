import type { Metadata } from "next";
import { ConversationImportPlayground } from "../../../components/import/ConversationImportPlayground";

export const metadata: Metadata = {
  title: "OpenLoop | Conversation parser test",
  description: "Member 2 parser-only test playground. No AI extraction or message storage.",
  robots: { index: false, follow: false },
};

export default function ConversationParserTestPage() {
  return <ConversationImportPlayground />;
}
