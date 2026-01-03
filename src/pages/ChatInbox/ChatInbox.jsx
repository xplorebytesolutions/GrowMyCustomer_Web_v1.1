import { useChatInboxController } from "./hooks/useChatInboxController";
import { ChatInboxView } from "./components/ChatInboxView";

export default function ChatInbox() {
  const vm = useChatInboxController();
  return <ChatInboxView {...vm} />;
}
