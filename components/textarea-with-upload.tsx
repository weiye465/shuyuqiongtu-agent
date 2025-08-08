"use client";

import { modelID } from "@/ai/providers";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";
import { ModelPicker } from "./model-picker";
import { FileUpload, FileUploadButton } from "./file-upload";
import { FileInfo } from "@/lib/db/schema";
import { useRef } from "react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  status: string;
  stop: () => void;
  selectedModel: modelID;
  setSelectedModel: (model: modelID) => void;
  chatId: string;
  files: FileInfo[];
  onFilesChange: (files: FileInfo[]) => void;
}

export const TextareaWithUpload = ({
  input,
  handleInputChange,
  isLoading,
  status,
  stop,
  selectedModel,
  setSelectedModel,
  chatId,
  files,
  onFilesChange,
}: InputProps) => {
  const isStreaming = status === "streaming" || status === "submitted";
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const handleFileUploadClick = () => {
    console.log('🔘 Upload button clicked');
    // 直接触发FileUpload组件内部的input
    const internalInput = document.querySelector(`#file-upload-internal-${chatId}`) as HTMLInputElement;
    console.log('🔍 Internal input found:', internalInput);
    if (internalInput) {
      internalInput.click();
    } else {
      console.error('❌ Internal file input not found');
    }
  };

  return (
    <div className="relative w-full">
      {/* 文件胶囊展示区和文件上传组件 */}
      <FileUpload
        ref={fileUploadRef}
        chatId={chatId}
        files={files}
        onFilesChange={onFilesChange}
        disabled={isLoading}
      />

      {/* 输入框 */}
      <div className="relative">
        <ShadcnTextarea
          className="resize-none bg-background/50 dark:bg-muted/50 backdrop-blur-sm w-full rounded-2xl pr-12 pt-4 pb-16 border-input focus-visible:ring-ring placeholder:text-muted-foreground"
          value={input}
          autoFocus
          placeholder="发送消息或上传Excel/CSV文件..."
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isLoading && (input.trim() || files.length > 0)) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        {/* 底部工具栏 */}
        <div className="absolute left-2 bottom-2 flex items-center gap-1">
          {/* 模型选择器 - 隐藏 */}
          {/* <ModelPicker
            setSelectedModel={setSelectedModel}
            selectedModel={selectedModel}
          /> */}
          
          {/* 文件上传按钮 */}
          <FileUploadButton
            onClick={handleFileUploadClick}
            disabled={isLoading}
            hasFiles={files.length > 0}
          />
        </div>

        {/* 发送按钮 */}
        <button
          type={isStreaming ? "button" : "submit"}
          onClick={isStreaming ? stop : undefined}
          disabled={
            (!isStreaming && !input.trim() && files.length === 0) ||
            (isStreaming && status === "submitted")
          }
          className="absolute right-2 bottom-2 rounded-full p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-all duration-200"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4 text-primary-foreground" />
          )}
        </button>
      </div>
    </div>
  );
};