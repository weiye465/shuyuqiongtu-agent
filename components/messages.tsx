import type { UIMessage as TMessage } from "ai";
import { Message } from "./message";
import { useScrollToBottom } from "@/lib/hooks/use-scroll-to-bottom";

export const Messages = ({
  messages,
  isLoading,
  status,
}: {
  messages: TMessage[];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
}) => {
  const [containerRef, endRef] = useScrollToBottom();
  const isWaitingForResponse = status === "submitted" && messages.length > 0 && messages[messages.length - 1].role === "user";

  return (
    <div className="h-full overflow-y-auto no-scrollbar" ref={containerRef}>
      <div className="max-w-lg sm:max-w-3xl mx-auto py-4">
        {messages.map((m, i) => (
          <Message
            key={i}
            isLatestMessage={i === messages.length - 1}
            isLoading={isLoading}
            message={m}
            status={status}
          />
        ))}
        
        {/* 显示AI正在响应的加载状态 */}
        {isWaitingForResponse && (
          <div className="w-full mx-auto px-4 mb-6">
            <div className="flex gap-4 w-full">
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-muted/50 border border-muted-foreground/10">
                <span className="text-sm text-muted-foreground">AI正在思考</span>
                <span className="inline-flex">
                  <span className="animate-bounce delay-0 text-muted-foreground">.</span>
                  <span className="animate-bounce delay-100 text-muted-foreground">.</span>
                  <span className="animate-bounce delay-200 text-muted-foreground">.</span>
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-1" ref={endRef} />
      </div>
    </div>
  );
};
