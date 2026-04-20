
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Bot } from "lucide-react";

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
            <div className="bg-primary/10 p-4 rounded-full">
              <Bot className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Robot ta on</p>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@rappi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-muted border-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-muted border-none"
              />
            </div>
            <Button type="submit" className="w-full text-lg h-12" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Acessar Sistema"}
            </Button>
            <div className="text-center mt-4">
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium"
                onClick={() => alert("Funcionalidade de recuperação enviada para o email cadastrado.")}
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
