/**
 * 文件验证模块
 * 用于验证上传文件的类型和大小
 */

// 允许的文件类型映射
export const ALLOWED_TYPES = {
  'text/csv': 'csv',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel'
} as const;

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MIN_SIZE: 1 // 1 byte (防止空文件)
} as const;

// 文件验证结果类型
export interface ValidationResult {
  valid: boolean;
  error?: string;
  fileType?: 'csv' | 'excel';
}

/**
 * 验证文件类型
 * @param file 要验证的文件对象
 * @returns 是否为允许的文件类型
 */
export function validateFileType(file: File): boolean {
  return ALLOWED_TYPES.hasOwnProperty(file.type);
}

/**
 * 验证文件大小
 * @param file 要验证的文件对象
 * @returns 是否在允许的大小范围内
 */
export function validateFileSize(file: File): boolean {
  return file.size >= FILE_SIZE_LIMITS.MIN_SIZE && 
         file.size <= FILE_SIZE_LIMITS.MAX_SIZE;
}

/**
 * 综合验证文件
 * @param file 要验证的文件对象
 * @returns 验证结果，包含是否通过和错误信息
 */
export function validateFile(file: File): ValidationResult {
  // 检查文件是否存在
  if (!file) {
    return {
      valid: false,
      error: '请选择文件'
    };
  }

  // 检查文件类型
  if (!validateFileType(file)) {
    const allowedExtensions = Object.values(ALLOWED_TYPES).join(', ');
    return {
      valid: false,
      error: `不支持的文件类型。仅支持 ${allowedExtensions} 格式`
    };
  }

  // 检查文件大小
  if (file.size < FILE_SIZE_LIMITS.MIN_SIZE) {
    return {
      valid: false,
      error: '文件为空'
    };
  }

  if (file.size > FILE_SIZE_LIMITS.MAX_SIZE) {
    const maxSizeMB = FILE_SIZE_LIMITS.MAX_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `文件过大，最大支持 ${maxSizeMB}MB`
    };
  }

  // 验证通过
  return {
    valid: true,
    fileType: ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]
  };
}

/**
 * 根据文件扩展名获取MIME类型
 * @param filename 文件名
 * @returns MIME类型或undefined
 */
export function getMimeTypeFromExtension(filename: string): string | undefined {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'csv':
      return 'text/csv';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return undefined;
  }
}

/**
 * 格式化文件大小为人类可读格式
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件名是否安全（防止路径遍历攻击）
 * @param filename 文件名
 * @returns 是否安全
 */
export function isFilenameSafe(filename: string): boolean {
  // 检查是否包含路径遍历字符
  const dangerousPatterns = [
    '..',
    '~',
    '/',
    '\\',
    '\0'
  ];
  
  return !dangerousPatterns.some(pattern => filename.includes(pattern));
}

/**
 * 生成安全的文件名
 * @param originalFilename 原始文件名
 * @param chatId 聊天ID
 * @returns 安全的文件名
 */
export function generateSafeFilename(originalFilename: string, chatId: string): string {
  // 移除不安全字符
  const safeFilename = originalFilename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  
  // 添加时间戳避免重名
  const timestamp = Date.now();
  const extension = safeFilename.split('.').pop();
  const nameWithoutExt = safeFilename.replace(/\.[^/.]+$/, '');
  
  return `${chatId}/${timestamp}_${nameWithoutExt}.${extension}`;
}