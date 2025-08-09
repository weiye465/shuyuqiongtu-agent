import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  /* config options here */
};

const botIdConfig = {
  clientSideProtection: [
    {
      path: '/api/chat',
      method: 'POST',
    },
    {
      path: '/api/chats/[id]',
      method: 'GET',
    },
    {
      path: '/api/chats/[id]',
      method: 'DELETE',
    },
  ],
  developmentOptions: {
    bypass: true, // 开发环境下绕过机器人检测
  },
};

export default withBotId(nextConfig, botIdConfig);
