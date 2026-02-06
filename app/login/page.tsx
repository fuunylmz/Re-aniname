'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('登录成功');
        router.push('/');
        router.refresh(); // Refresh to clear cache and update middleware state
      } else {
        toast.error('密码错误');
      }
    } catch (error) {
      toast.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md card-material border-white/10 bg-black/40 backdrop-blur-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Re:aniname</CardTitle>
          <CardDescription>请输入密码以访问</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-white/10 text-center tracking-widest"
                autoFocus
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-material" 
              disabled={loading || !password}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              登录
            </Button>
            <p className="text-xs text-center text-muted-foreground opacity-50">
              默认密码: admin (请在环境变量设置 WEB_PASSWORD)
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
