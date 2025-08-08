import Chat from "@/components/chat";
import { ArtifactProvider } from "@/components/artifact/ArtifactProvider";

export default function Page() {
  return (
    <ArtifactProvider>
      <Chat />
    </ArtifactProvider>
  );
}
