"use client";

import { useAppStore } from "@/lib/store";
import { ConfigPanel } from "@/components/feature/ConfigPanel";
import { TaskList } from "@/components/feature/TaskList";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { config, setFiles, setScanning, isScanning } = useAppStore();

  const handleScan = async () => {
    if (!config.scanPath) {
      toast.error("请先设置扫描目录");
      return;
    }

    setScanning(true);
    toast.info("正在扫描目录...");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({
          path: config.scanPath,
          minSize: config.minSize,
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setFiles(data.files);
        toast.success(`发现了 ${data.files.length} 个文件`);
      } else {
        toast.error(`扫描失败: ${data.error}`);
      }
    } catch (err) {
      toast.error("扫描时发生网络错误");
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="min-h-screen p-8 text-foreground space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Re:aniname</h1>
          <p className="text-muted-foreground">AI 驱动的媒体文件整理工具</p>
        </div>
        <Button size="lg" className="btn-material" onClick={handleScan} disabled={isScanning}>
          {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isScanning ? "扫描中..." : "开始扫描"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <ConfigPanel />
        </div>
        <div className="lg:col-span-2">
          <TaskList />
        </div>
      </div>
      <Toaster />
    </main>
  );
}
