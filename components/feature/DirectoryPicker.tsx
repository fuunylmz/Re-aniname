import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Folder, HardDrive, ArrowUp, Loader2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DirectoryItem {
  name: string;
  isDirectory: boolean;
  path: string;
  isDrive?: boolean;
}

interface DirectoryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (path: string) => void;
  initialPath?: string;
  title?: string;
}

export function DirectoryPicker({
  open,
  onOpenChange,
  onSelect,
  initialPath = '',
  title = '选择目录',
}: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [parentPath, setParentPath] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadDirectory(initialPath);
    }
  }, [open, initialPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`);
      if (!res.ok) {
        throw new Error('Failed to load directory');
      }
      const data = await res.json();
      setItems(data.items);
      setCurrentPath(data.currentPath || ''); // If root, currentPath is empty
      setParentPath(data.parentPath || '');
    } catch (error) {
      console.error(error);
      toast.error('无法读取目录，请检查权限或路径是否存在');
      // If error, maybe go to root?
      if (path !== '') {
        loadDirectory('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
  };

  const handleSelect = () => {
    if (!currentPath) {
      toast.error('请选择一个有效的目录');
      return;
    }
    onSelect(currentPath);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md font-mono mt-2 overflow-hidden">
            <Folder className="h-4 w-4 shrink-0" />
            <div className="truncate direction-rtl" title={currentPath || '此电脑'}>
              {currentPath || '此电脑'}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-1">
              {/* Parent Directory Link */}
              {/* Always show "Up" unless we are at true root/drives list and it has no parent? 
                  Actually API returns parentPath='' when at root of drive (C:\). 
                  And if currentPath is '', parent is undefined.
              */}
              {(currentPath !== '' || parentPath !== '') && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left font-normal h-9 px-2"
                  onClick={() => loadDirectory(parentPath)}
                >
                  <ArrowUp className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">.. (返回上级)</span>
                </Button>
              )}

              {/* Items */}
              {items.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className="w-full justify-start text-left font-normal h-9 px-2"
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.isDrive ? (
                    <HardDrive className="h-4 w-4 mr-2 text-blue-500" />
                  ) : (
                    <Folder className="h-4 w-4 mr-2 text-yellow-500" />
                  )}
                  <span className="truncate">{item.name}</span>
                </Button>
              ))}
              
              {!loading && items.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  空文件夹
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="p-4 pt-2 border-t flex items-center justify-between sm:justify-between">
           <Button variant="outline" size="sm" onClick={() => loadDirectory('')} title="回到根目录">
             <Home className="h-4 w-4" />
           </Button>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => onOpenChange(false)}>
               取消
             </Button>
             <Button onClick={handleSelect} disabled={!currentPath}>
               选择此目录
             </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
