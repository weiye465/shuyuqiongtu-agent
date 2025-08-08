import { NextRequest, NextResponse } from 'next/server';
import { newStorage } from '@/lib/storage';
import { checkBotId } from "botid/server";

export async function POST(request: NextRequest) {
  console.log('📤 Upload API called');
  
  // Check bot protection
  const { isBot, isGoodBot } = await checkBotId();
  
  if (isBot && !isGoodBot) {
    return NextResponse.json(
      { error: "Bot is not allowed to access this endpoint" },
      { status: 401 }
    );
  }
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;
    
    if (!file || !key) {
      console.error('❌ Missing file or key');
      return NextResponse.json(
        { error: 'File and key are required' },
        { status: 400 }
      );
    }
    
    console.log('📁 Processing file:', {
      name: file.name,
      size: file.size,
      type: file.type,
      key
    });
    
    // 转换文件为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('📦 Buffer created, size:', buffer.length);
    
    // 创建storage实例并上传
    const storage = newStorage();
    const result = await storage.uploadFile({
      body: buffer,
      key,
      contentType: file.type,
    });
    
    console.log('✅ Upload successful:', result);
    
    return NextResponse.json({
      success: true,
      url: result.url,
      key: result.key,
      filename: result.filename
    });
    
  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// 配置API路由
export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒超时