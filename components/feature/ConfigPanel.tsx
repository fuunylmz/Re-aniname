import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MoreHorizontal, Save, Trash, FolderOpen } from 'lucide-react';
import { DirectoryPicker } from './DirectoryPicker';

export function ConfigPanel() {
  const { 
    config, 
    updateConfig, 
    isScanning,
    presets,
    addPreset,
    removePreset,
    applyPreset
  } = useAppStore();
  
  const [localConfig, setLocalConfig] = useState(config);
  const [newPresetName, setNewPresetName] = useState('');
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  
  // Directory Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<'scan' | 'output' | null>(null);

  // Sync local config when global config changes (e.g. after applying preset)
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleOpenPicker = (type: 'scan' | 'output') => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const handleDirectorySelect = (path: string) => {
    if (pickerType === 'scan') {
      setLocalConfig(prev => ({ ...prev, scanPath: path }));
    } else if (pickerType === 'output') {
      setLocalConfig(prev => ({ ...prev, outputDir: path }));
    }
    // Picker closes automatically via onOpenChange(false) inside component? 
    // Wait, DirectoryPicker calls onOpenChange(false) on select.
  };

  const handleSave = async () => {
    updateConfig(localConfig);
    
    // Also save to server for automation
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig),
      });
      toast.success('配置已保存 (本地 + 服务端)');
    } catch (e) {
      console.error('Failed to save server config', e);
      toast.warning('配置已保存到本地，但服务端同步失败');
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error('预设名称不能为空');
      return;
    }
    
    addPreset({
      name: newPresetName,
      outputMode: localConfig.outputMode,
      minSize: localConfig.minSize,
      apiKey: localConfig.apiKey,
      baseUrl: localConfig.baseUrl,
      model: localConfig.model,
      tmdbApiKey: localConfig.tmdbApiKey,
    });
    
    setIsPresetDialogOpen(false);
    setNewPresetName('');
    toast.success('预设已保存');
  };

  const handleApplyPreset = (id: string) => {
    applyPreset(id);
    toast.success('预设已应用');
  };

  const handleRemovePreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removePreset(id);
    toast.success('预设已删除');
  };

  return (
    <Card className="w-full card-material">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>设置</CardTitle>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-full">
                加载预设
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {presets.length === 0 ? (
                <DropdownMenuItem disabled>暂无保存的预设</DropdownMenuItem>
              ) : (
                presets.map((preset) => (
                  <DropdownMenuItem 
                    key={preset.id} 
                    onClick={() => handleApplyPreset(preset.id)}
                    className="flex justify-between items-center group"
                  >
                    <span>{preset.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 ml-2 rounded-full"
                      onClick={(e) => handleRemovePreset(e, preset.id)}
                    >
                      <Trash className="h-3 w-3 text-destructive" />
                    </Button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                <Save className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>保存当前配置为预设</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>预设名称</Label>
                  <Input 
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="例如: DeepSeek 生产环境"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  将保存: 输出模式, 最小文件大小, API Key, Base URL, 和 Model。
                  <br />
                  扫描路径和输出目录**不会**被保存。
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSavePreset} className="btn-material">保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="scanPath">扫描目录</Label>
            <div className="flex gap-2">
              <Input
                id="scanPath"
                value={localConfig.scanPath}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, scanPath: e.target.value })
                }
                disabled={isScanning}
                placeholder="例如: /media/downloads"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleOpenPicker('scan')}
                disabled={isScanning}
                title="选择目录"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="outputDir">输出目录</Label>
            <div className="flex gap-2">
              <Input
                id="outputDir"
                value={localConfig.outputDir}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, outputDir: e.target.value })
                }
                disabled={isScanning}
                placeholder="例如: /media/emby"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => handleOpenPicker('output')}
                disabled={isScanning}
                title="选择目录"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="outputMode">输出模式</Label>
            <Select
              value={localConfig.outputMode}
              onValueChange={(v: any) =>
                setLocalConfig({ ...localConfig, outputMode: v })
              }
              disabled={isScanning}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择模式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">硬链接 (推荐)</SelectItem>
                <SelectItem value="move">移动</SelectItem>
                <SelectItem value="copy">复制</SelectItem>
                <SelectItem value="symlink">软链接</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minSize">最小文件大小 (MB)</Label>
            <Input
              id="minSize"
              type="number"
              value={localConfig.minSize}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, minSize: Number(e.target.value) })
              }
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key (OpenAI/DeepSeek)</Label>
          <Input
            id="apiKey"
            type="password"
            value={localConfig.apiKey}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, apiKey: e.target.value })
            }
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tmdbApiKey">TMDB API Key (可选)</Label>
          <Input
            id="tmdbApiKey"
            type="password"
            value={localConfig.tmdbApiKey || ''}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, tmdbApiKey: e.target.value })
            }
            placeholder="TMDB API Read Access Token (v3 auth)"
          />
          <p className="text-xs text-muted-foreground">
            配置后，将在重命名时自动从 TMDB 获取官方标题和年份
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">API Base URL (可选)</Label>
            <Input
              id="baseUrl"
              value={localConfig.baseUrl}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, baseUrl: e.target.value })
              }
              placeholder="例如: https://api.deepseek.com"
            />
            <p className="text-xs text-muted-foreground">
              DeepSeek 请使用 <code>https://api.deepseek.com</code> (无需 /v1)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">模型名称</Label>
            <Input
              id="model"
              value={localConfig.model}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, model: e.target.value })
              }
              placeholder="gpt-3.5-turbo"
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={isScanning} className="btn-material w-full">
          保存配置
        </Button>
      </CardContent>

      <DirectoryPicker 
        open={pickerOpen} 
        onOpenChange={setPickerOpen} 
        onSelect={handleDirectorySelect}
        initialPath={pickerType === 'scan' ? localConfig.scanPath : localConfig.outputDir}
        title={pickerType === 'scan' ? '选择扫描目录' : '选择输出目录'}
      />

      <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50 text-sm">
        <h3 className="font-semibold mb-2">qBittorrent 自动化集成</h3>
        <p className="text-muted-foreground mb-2">
          在 qBittorrent 的 "下载完成后运行外部程序" 中填入以下命令：
        </p>
        <div className="bg-background/50 p-2 rounded font-mono text-xs break-all select-all cursor-pointer border border-border/50" onClick={() => {
           const cmd = `curl -X POST -H "Content-Type: application/json" -d "{\\"path\\": \\"%R/%N\\"}" http://localhost:3000/api/hooks/qbittorrent`;
           navigator.clipboard.writeText(cmd);
           toast.success('命令已复制到剪贴板');
        }}>
          {`curl -X POST -H "Content-Type: application/json" -d "{\\"path\\": \\"%R/%N\\"}" http://localhost:3000/api/hooks/qbittorrent`}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          * 确保已点击“保存配置”以同步配置到服务端。<br/>
          * %R/%N 是 qBittorrent 的占位符，代表完整路径。<br/>
          * 如果是 Windows，可能需要安装 curl 或使用 PowerShell 脚本。
        </p>
      </div>
    </Card>
  );
}
