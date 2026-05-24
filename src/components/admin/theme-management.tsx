
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Check, RefreshCw, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

const COLOR_THEMES = [
  { id: 'default', name: 'Rappi Original', color: '#E65C1A', description: 'O clássico laranja Rappi.' },
  { id: 'blue', name: 'Midnight Blue', color: '#1D4ED8', description: 'Focado em profundidade e clareza.' },
  { id: 'green', name: 'Emerald Fleet', color: '#059669', description: 'Sóbrio, profissional e calmo.' },
  { id: 'purple', name: 'Vivid Purple', color: '#7C3AED', description: 'Moderno com alto contraste.' },
  { id: 'red', name: 'Crimson Force', color: '#DC2626', description: 'Alerta máximo e energia.' },
  { id: 'slate', name: 'Slate Steel', color: '#334155', description: 'Minimalismo e elegância neutra.' },
];

export function ThemeManagement() {
  const { toast } = useToast();
  const [activeTheme, setActiveTheme] = useState('default');

  useEffect(() => {
    const savedTheme = localStorage.getItem('rappi_commander_color_theme') || 'default';
    setActiveTheme(savedTheme);
  }, []);

  const handleApplyTheme = (themeId: string) => {
    setActiveTheme(themeId);
    localStorage.setItem('rappi_commander_color_theme', themeId);
    
    if (themeId === 'default') {
      document.documentElement.removeAttribute('data-color-theme');
    } else {
      document.documentElement.setAttribute('data-color-theme', themeId);
    }

    toast({
      title: "Tema Aplicado",
      description: `A nova paleta de cores foi configurada com sucesso.`,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-fade-in">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <Palette className="h-6 w-6" /> Personalização de Cores
          </h2>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Altere a identidade visual do sistema</p>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-md rounded-3xl overflow-hidden mb-6">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-black text-sm uppercase tracking-tight">Modo de Exibição</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Alternar entre modo claro e escuro</p>
          </div>
          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl">
            <ThemeToggle />
            <span className="text-[10px] font-black uppercase tracking-widest mr-2">Trocar Brilho</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {COLOR_THEMES.map((theme) => {
          const isActive = activeTheme === theme.id;
          return (
            <Card 
              key={theme.id} 
              className={cn(
                "border-2 transition-all cursor-pointer rounded-3xl overflow-hidden group",
                isActive ? "border-primary shadow-lg scale-105" : "border-muted hover:border-primary/40 hover:shadow-md"
              )}
              onClick={() => handleApplyTheme(theme.id)}
            >
              <div 
                className="h-24 w-full" 
                style={{ backgroundColor: theme.color }}
              />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-sm tracking-tight">{theme.name}</h3>
                  {isActive && (
                    <div className="bg-primary text-white p-1 rounded-full">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed mb-4">
                  {theme.description}
                </p>
                <Button 
                  variant={isActive ? "default" : "outline"} 
                  className="w-full h-10 text-[10px] font-black uppercase rounded-2xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyTheme(theme.id);
                  }}
                >
                  {isActive ? "Tema Ativo" : "Selecionar"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-none shadow-sm bg-muted/20 rounded-3xl p-6 flex items-center gap-4">
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
          <RefreshCw className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-bold">Dica de Operação</p>
          <p className="text-[10px] text-muted-foreground">
            Temas escuros ou com cores frias (Azul/Slate) são recomendados para turnos noturnos para reduzir a fadiga ocular.
          </p>
        </div>
      </Card>
    </div>
  );
}
