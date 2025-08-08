import { Sparkles } from "lucide-react";

export const ProjectOverview = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
          数驭穹图智能体
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          您的智能数据分析助手，让数据分析变得简单高效
        </p>
      </div>
    </div>
  );
};
