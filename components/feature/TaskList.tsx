import { useAppStore } from '@/lib/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { useState } from 'react';
import { generateDestinationPath } from '@/lib/renamer/namer';
import type { ScannedFile } from '@/lib/ai/schema';

export function TaskList() {
  const { files, updateFile, config, setProcessing } = useAppStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewingFile, setViewingFile] = useState<ScannedFile | null>(null);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };


  const toggleSelectAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.id)));
    }
  };

  const handleAnalyze = async () => {
    const targetFiles = files.filter((f) => selected.has(f.id));
    if (targetFiles.length === 0) return;

    toast.info(`正在分析 ${targetFiles.length} 个文件...`);

    for (const file of targetFiles) {
      updateFile(file.id, { status: 'processing' });
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.originalName,
            config: {
              apiKey: config.apiKey,
              baseUrl: config.baseUrl,
              model: config.model,
              tmdbApiKey: config.tmdbApiKey,
            },
          }),
        });
        const data = await res.json();
        if (data.success) {
          updateFile(file.id, {
            status: 'success',
            mediaInfo: data.mediaInfo,
          });
        } else {
          updateFile(file.id, { status: 'failed', error: data.error });
        }
      } catch (err) {
        updateFile(file.id, { status: 'failed', error: 'Network error' });
      }
    }
    toast.success('分析完成');
  };

  const handleProcess = async () => {
    const targetFiles = files.filter(
      (f) => selected.has(f.id) && f.status === 'success' && f.mediaInfo
    );
    
    if (targetFiles.length === 0) {
      toast.warning('未选择已分析完成的文件');
      return;
    }

    setProcessing(true);
    toast.info(`正在处理 ${targetFiles.length} 个文件...`);

    for (const file of targetFiles) {
      try {
        const res = await fetch('/api/process', {
          method: 'POST',
          body: JSON.stringify({
            file,
            config: {
              outputDir: config.outputDir,
              outputMode: config.outputMode,
            },
          }),
        });
        
        if (res.ok) {
           // In a real app, we might remove the file or mark it as done-done
           updateFile(file.id, { status: 'success' }); // keep as success
           toast.success(`处理成功: ${file.originalName}`);
        } else {
           const data = await res.json();
           updateFile(file.id, { status: 'failed', error: data.error });
           toast.error(`处理失败: ${file.originalName}`);
        }
      } catch (err) {
        toast.error(`处理出错: ${file.originalName}`);
      }
    }
    setProcessing(false);
  };

  const getPreviewPath = (file: ScannedFile) => {
    if (!file.mediaInfo) return '-';
    try {
      return generateDestinationPath(file.mediaInfo, file.extension);
    } catch {
      return '生成路径失败';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">任务列表 ({files.length})</h2>
        <div className="space-x-2">
          <Button variant="secondary" className="btn-material" onClick={handleAnalyze} disabled={selected.size === 0}>
            分析选中项
          </Button>
          <Button onClick={handleProcess} className="btn-material" disabled={selected.size === 0}>
            执行处理 ({config.outputMode})
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px] border-none bg-card rounded-[1.5rem] shadow-sm p-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selected.size === files.length && files.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>原始文件名</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>预览 (目标路径)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id} className="hover:bg-muted/30 border-b border-border/50">
                <TableCell>
                  <Checkbox
                    checked={selected.has(file.id)}
                    onCheckedChange={() => toggleSelect(file.id)}
                  />
                </TableCell>
                <TableCell 
                  className="font-mono text-sm max-w-[300px] truncate cursor-pointer hover:underline hover:text-primary" 
                  title="点击查看详情"
                  onClick={() => setViewingFile(file)}
                >
                  {file.originalName}
                </TableCell>
                <TableCell>
                  <Badge
                    className="rounded-full px-3"
                    variant={
                      file.status === 'success'
                        ? 'default'
                        : file.status === 'failed'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {file.status === 'pending' && '等待中'}
                    {file.status === 'processing' && '处理中'}
                    {file.status === 'success' && '成功'}
                    {file.status === 'failed' && '失败'}
                    {file.status === 'skipped' && '跳过'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground font-mono">
                  {getPreviewPath(file)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>文件详情</DialogTitle>
            <DialogDescription className="font-mono text-xs break-all">
              {viewingFile?.originalName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">处理状态</h4>
              <Badge variant={viewingFile?.status === 'success' ? 'default' : 'secondary'}>
                {viewingFile?.status}
              </Badge>
              {viewingFile?.error && (
                <p className="text-sm text-destructive mt-1">{viewingFile.error}</p>
              )}
            </div>

            {viewingFile?.mediaInfo && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">AI 识别结果 (JSON)</h4>
                <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-[300px] overflow-y-auto">
                  <pre>
                    {JSON.stringify(
                      viewingFile.mediaInfo,
                      (key, value) => (key === 'tmdbInfo' ? undefined : value),
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

            {viewingFile?.mediaInfo && !viewingFile.mediaInfo.tmdbInfo && (
              <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground text-center border border-dashed">
                <p>未获取到 TMDB 信息</p>
                <p className="text-xs mt-1 opacity-70">
                  请检查是否已在设置中配置 TMDB API Key，并点击“分析选中项”重新获取。
                  <br />
                  也可能是因为 TMDB 暂无此条目数据。
                </p>
              </div>
            )}

            {viewingFile?.mediaInfo?.tmdbInfo && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">TMDB 查询结果</h4>
                <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2 w-full max-w-full">
                  <div className="flex gap-4 items-start w-full">
                    {(viewingFile.mediaInfo.tmdbInfo as any).poster_path && (
                      <img 
                        src={`https://image.tmdb.org/t/p/w200${(viewingFile.mediaInfo.tmdbInfo as any).poster_path}`} 
                        alt="Poster" 
                        className="w-24 rounded-md shadow-sm shrink-0"
                      />
                    )}
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="font-bold truncate">{(viewingFile.mediaInfo.tmdbInfo as any).title || (viewingFile.mediaInfo.tmdbInfo as any).name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        原名: {(viewingFile.mediaInfo.tmdbInfo as any).original_title || (viewingFile.mediaInfo.tmdbInfo as any).original_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        日期: {(viewingFile.mediaInfo.tmdbInfo as any).release_date || (viewingFile.mediaInfo.tmdbInfo as any).first_air_date}
                      </div>
                      <p 
                        className="text-xs mt-2 text-foreground/80 break-all whitespace-pre-wrap"
                      >
                        {(viewingFile.mediaInfo.tmdbInfo as any).overview}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border/50 font-mono overflow-x-auto w-full max-w-full">
                    <span className="text-xs font-semibold text-muted-foreground">原始 JSON 数据:</span>
                    <pre className="mt-1 text-xs text-muted-foreground/70 whitespace-pre-wrap break-all">
                      {JSON.stringify(viewingFile.mediaInfo.tmdbInfo, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">文件信息</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">大小</span>
                  <span>{(viewingFile?.size ? (viewingFile.size / 1024 / 1024).toFixed(2) : 0)} MB</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">扩展名</span>
                  <span>{viewingFile?.extension}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-xs text-muted-foreground">完整路径</span>
                  <span className="break-all font-mono text-xs">{viewingFile?.originalPath}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
