"use client";

import Chat from "@/components/chat";
import { getUserId } from "@/lib/user-id";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ArtifactProvider } from "@/components/artifact/ArtifactProvider";
import { ArtifactPreview } from "@/components/artifact/ArtifactPreview";
import { useArtifact } from "@/components/artifact/ArtifactProvider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ChatPage() {
  const params = useParams();
  const chatId = params?.id as string;
  const queryClient = useQueryClient();
  const userId = getUserId();

  // Prefetch chat data
  useEffect(() => {
    async function prefetchChat() {
      if (!chatId || !userId) return;

      // Check if data already exists in cache
      const existingData = queryClient.getQueryData(["chat", chatId, userId]);
      if (existingData) return;

      // Prefetch the data
      await queryClient.prefetchQuery({
        queryKey: ["chat", chatId, userId] as const,
        queryFn: async () => {
          const response = await fetch(`/api/chats/${chatId}`, {
            headers: {
              "x-user-id": userId,
            },
          });

          if (!response.ok) {
            // For 404, return empty chat data instead of throwing
            if (response.status === 404) {
              return {
                id: chatId,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
            throw new Error("Failed to load chat");
          }

          return response.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }

    prefetchChat();
  }, [chatId, userId, queryClient]);

  return (
    <ArtifactProvider>
      <ChatPageContent />
    </ArtifactProvider>
  );
}

function ChatPageContent() {
  const { previewVisible, togglePreview } = useArtifact();
  const isMobile = useIsMobile();
  
  return (
    <>
      <div className="flex h-full w-full overflow-hidden">
        <div className={`flex-1 min-w-0 ${previewVisible && !isMobile ? 'lg:w-1/2' : 'w-full'}`}>
          <Chat />
        </div>
        {previewVisible && !isMobile && (
          <div className="hidden lg:block lg:w-1/2 h-full overflow-hidden min-w-0">
            <ArtifactPreview />
          </div>
        )}
      </div>
      
      {/* Mobile Sheet */}
      {isMobile && (
        <Sheet open={previewVisible} onOpenChange={togglePreview}>
          <SheetContent side="bottom" className="h-[80vh] p-0">
            <ArtifactPreview onClose={() => togglePreview(false)} />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
