
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ClipboardList, Send, Zap, User as UserIcon, Calendar } from "lucide-react";
import { getCollectionBridge } from "@/app/actions/firestore-bridge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function OperationLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await getCollectionBridge('operationLogs');
      if (result.success) {
        // Ordenar por timestamp decrescente
        const sorted = (result.data || []).sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(sorted);
      } else {
        toast({ variant: "destructive", title: "Erro ao carregar logs", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de conexão" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionIcon = (action: string) => {
    if (action === 'cheguei') return <Zap className="h-3 w-3 text-orange-500" />;
    return <Send className="h-3 w-3 text-blue-500" />;
  };

  const getActionLabel = (action: string) => {
    return action === 'cheguei' ? 'CHEGUEI' : 'COPIAR ID';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-xl font-bold text-primary flex items-center gap-2">
            <ClipboardList className="h-6 w-6" /> Histórico de Operações
          </h2>
          <p className="text-xs text-muted-foreground font-medium">Auditoria de ações realizadas no dashboard ativo</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="rounded-full h-9 font-bold text-[10px] uppercase gap-2">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Buscando histórico...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground italic text-sm">
              Nenhuma atividade registrada ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="text-[10px] font-bold uppercase py-4">Data/Hora</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Operador</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Ação</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">Pedido</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase">RT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-muted/10 hover:bg-primary/5 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {format(new Date(log.timestamp), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" /> {format(new Date(log.timestamp), "HH:mm:ss")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{log.userName}</span>
                            <span className="text-[9px] text-muted-foreground">{log.userEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase border",
                          log.action === 'cheguei' ? "bg-orange-50 border-orange-100 text-orange-700" : "bg-blue-50 border-blue-100 text-blue-700"
                        )}>
                          {getActionIcon(log.action)}
                          {getActionLabel(log.action)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-primary">#{log.orderId}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {log.rtId === 'Sem ID' || log.rtId === 'Nuvem' ? (
                            <span className="text-blue-600">Nuvem</span>
                          ) : (
                            `RT ${log.rtId}`
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
