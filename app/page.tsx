"use client";

import Chat from "@/components/chat";
import { ArtifactProvider } from "@/components/artifact/ArtifactProvider";
import { ArtifactPreview } from "@/components/artifact/ArtifactPreview";
import { useArtifact } from "@/components/artifact/ArtifactProvider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

function MainPageContent() {
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

export default function Page() {
  return (
    <ArtifactProvider>
      <MainPageContent />
    </ArtifactProvider>
  );
}
