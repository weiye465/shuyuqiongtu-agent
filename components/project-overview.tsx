import { 
  MessageSquare, 
  BarChart3, 
  FileSpreadsheet, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  Database,
  LineChart
} from "lucide-react";

export const ProjectOverview = () => {
  const features = [
    {
      icon: FileSpreadsheet,
      title: "智能数据分析",
      description: "上传Excel或CSV文件，AI自动分析数据趋势"
    },
    {
      icon: BarChart3,
      title: "可视化图表",
      description: "自动生成专业的数据图表和报告"
    },
    {
      icon: Database,
      title: "多源数据处理",
      description: "支持多种数据格式，灵活处理各类业务数据"
    },
    {
      icon: TrendingUp,
      title: "洞察建议",
      description: "基于数据分析提供智能业务建议"
    }
  ];

  const quickStarts = [
    "分析我的销售数据趋势",
    "生成月度财务报表",
    "对比不同产品的业绩",
    "预测下季度销售额"
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* 欢迎标题 */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            数驭穹图智能体
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            您的智能数据分析助手，让数据分析变得简单高效
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-xl border bg-card/50 backdrop-blur hover:bg-card/80 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 快速开始提示 */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground mb-3">
              快速开始
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickStarts.map((prompt, index) => (
                <button
                  key={index}
                  className="group inline-flex items-center gap-1 px-4 py-2 rounded-full border bg-background/50 hover:bg-background hover:border-primary/50 transition-all duration-200"
                  onClick={() => {
                    const input = document.querySelector('textarea');
                    if (input) {
                      input.value = prompt;
                      input.focus();
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                  }}
                >
                  <span className="text-sm text-muted-foreground group-hover:text-foreground">
                    {prompt}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 开始提示 */}
        <div className="text-center space-y-2 pt-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <p className="text-sm">
              输入您的问题或上传数据文件开始分析
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
