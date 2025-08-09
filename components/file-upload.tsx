"use client";

import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { nanoid } from "nanoid";
import { FileInfo } from "@/lib/db/schema";
import { X, FileSpreadsheet, Loader2, Upload, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  validateFile, 
  formatFileSize, 
  generateSafeFilename,
  ALLOWED_TYPES 
} from "@/lib/validators/file-validator";

interface FileUploadProps {
  chatId: string;
  files: FileInfo[];
  onFilesChange: (files: FileInfo[]) => void;
  disabled?: boolean;
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ chatId, files, onFilesChange, disabled }, ref) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 暴露fileInputRef给父组件
  useImperativeHandle(ref, () => fileInputRef.current!);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 handleFileSelect triggered');
    const selectedFile = e.target.files?.[0];
    console.log('📁 Selected file:', selectedFile);
    if (!selectedFile) {
      console.log('❌ No file selected');
      return;
    }

    // 使用独立的验证模块验证文件
    console.log('🔍 Validating file:', {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type
    });
    const validationResult = validateFile(selectedFile);
    console.log('✅ Validation result:', validationResult);
    if (!validationResult.valid) {
      console.error('❌ File validation failed:', validationResult.error);
      setError(validationResult.error || '文件验证失败');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    console.log('🚀 Starting upload...');

    try {
      // 准备文件上传
      const safeFilename = generateSafeFilename(selectedFile.name, chatId);
      console.log('📝 Safe filename:', safeFilename);
      
      // 创建FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('key', safeFilename);
      
      console.log('☁️ Uploading to R2 via API...');
      
      // 使用XMLHttpRequest来跟踪上传进度
      const xhr = new XMLHttpRequest();
      
      // 模拟的进度值，用于平滑显示
      let simulatedProgress = 0;
      let actualProgress = 0;
      // 开始模拟进度（缓慢增长到90%）
      const progressInterval = setInterval(() => {
        if (simulatedProgress < 90 && simulatedProgress < actualProgress + 20) {
          // 缓慢增长，但不超过实际进度太多
          simulatedProgress += 0.5; // 每50ms增加0.5%
          setUploadProgress(Math.min(simulatedProgress, 90));
        }
      }, 50);
      
      // 设置进度监听
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          actualProgress = (event.loaded / event.total) * 100;
          console.log(`📊 Upload progress: ${actualProgress.toFixed(1)}%`);
          
          // 如果实际进度超过模拟进度，更新模拟进度
          if (actualProgress > simulatedProgress) {
            simulatedProgress = Math.min(actualProgress, 90);
            setUploadProgress(simulatedProgress);
          }
        }
      });
      
      // 创建Promise来处理异步上传
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.onload = function() {
          clearInterval(progressInterval);
          
          if (xhr.status === 200) {
            // 快速完成最后的10%
            setUploadProgress(95);
            setTimeout(() => setUploadProgress(100), 100);
            
            const response = JSON.parse(xhr.responseText);
            console.log('✅ Upload complete:', response);
            
            // 延迟一点返回，让100%显示一会儿
            setTimeout(() => resolve(response), 300);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        
        xhr.onerror = function() {
          clearInterval(progressInterval);
          reject(new Error('Network error during upload'));
        };
        
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
      
      const result = await uploadPromise;

      // 创建文件信息
      const fileInfo: FileInfo = {
        id: nanoid(),
        name: selectedFile.name,
        url: result.url,
        size: selectedFile.size,
        type: validationResult.fileType!,
        uploadedAt: Date.now()
      };
      console.log('📋 File info created:', fileInfo);

      // 更新文件列表
      console.log('=== Before updating files ===');
      console.log('Current files:', JSON.stringify(files, null, 2));
      console.log('New file to add:', JSON.stringify(fileInfo, null, 2));
      const updatedFiles = [...files, fileInfo];
      console.log('Updated files array:', JSON.stringify(updatedFiles, null, 2));
      onFilesChange(updatedFiles);
      console.log('✅ onFilesChange called with updated files');
      console.log('=== After updating files ===');
      
      // 重置输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        console.log('🔄 Input reset');
      }
    } catch (err) {
      console.error('❌ File upload failed:', err);
      setError('文件上传失败，请重试');
    } finally {
      // 延迟重置进度条，让用户看到完成状态
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
      console.log('🏁 Upload process completed');
    }
  };

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-2">
      {/* 文件胶囊列表 */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 rounded-full text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-100 max-w-[150px] truncate">
                {file.name}
              </span>
              <span className="text-blue-600 dark:text-blue-400 text-xs">
                {formatFileSize(file.size)}
              </span>
              {!disabled && (
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传进度条 */}
      {uploading && (
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {uploadProgress < 100 ? '上传中' : '处理中'}... {Math.round(uploadProgress)}%
            </span>
          </div>
          <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out relative"
              style={{ width: `${uploadProgress}%` }}
            >
              {/* 添加动画光效 */}
              {uploadProgress < 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        id={`file-upload-internal-${chatId}`}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

// 文件上传按钮（集成到输入框工具栏）
export function FileUploadButton({ 
  onClick, 
  disabled, 
  hasFiles 
}: { 
  onClick: () => void; 
  disabled?: boolean;
  hasFiles?: boolean;
}) {
  const handleClick = () => {
    console.log('📤 FileUploadButton clicked');
    console.log('📤 Button disabled:', disabled);
    console.log('📤 Has files:', hasFiles);
    onClick();
  };
  
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "p-2 rounded-lg transition-colors",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        hasFiles && "text-blue-600 dark:text-blue-400"
      )}
      title="上传Excel或CSV文件"
    >
      <Upload className="w-5 h-5" />
    </button>
  );
}