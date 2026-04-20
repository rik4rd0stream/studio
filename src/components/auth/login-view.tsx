
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface LoginViewProps {
  onLogin: (email: string, pass: string) => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(email, password);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-none shadow-none bg-transparent">
        <CardHeader className="text-center space-y-1">
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="bg-primary/5 p-4 rounded-full overflow-hidden flex items-center justify-center w-28 h-28 mb-2">
              <Image 
                src="/logo.png" 
                alt="Rappi Commander Logo" 
                width={100} 
                height={100} 
                className="object-contain animate-pulse"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://picsum.photos/seed/robot-login/100/100";
                }}
              />
            </div>
            <p className="text-sm font-bold text-primary uppercase tracking-widest">Robot ta on</p>
          </div>
          <CardTitle className="text-4xl font-headline font-bold text-primary tracking-tight">
            Rappi Commander
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Entre com suas credenciais para gerenciar operações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rappi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted/50 border-none h-12 rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground ml-1">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted/50 border-none h-12 rounded-2xl"
              />
            </div>
            <Button type="submit" className="w-full text-lg h-14 rounded-2xl font-bold shadow-lg mt-4" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Acessar Sistema"}
            </Button>
            <div className="text-center mt-6">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
                onClick={() => alert("Acesse o painel master para redefinir senhas.")}
              >
                Esqueceu a senha?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
