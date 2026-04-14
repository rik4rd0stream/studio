
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Database, RefreshCw, Server, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, addDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";
import { firebaseConfig } from "@/firebase/config";

export function RtRegistration() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState("");
  const [tipoConta, setTipoConta] = useState("");
  const [idRT, setIdRT] = useState("");

  const collectionName = 'rt_registry';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        setItems(result.data || []);
      } else {
        toast({ variant: "destructive", title: "Erro na Ponte", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "O servidor Vercel não respondeu." });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
    // Alerta de Diagnóstico para o Android
    if (typeof window !== 'undefined') {
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        console.log("DIAGNOSTICO ANDROID:", {
          project: firebaseConfig.projectId,
          url: window.location.href
        });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      nome: nome.trim(),
      tipoConta: tipoConta.trim(),
      idRT: idRT.trim()
    };

    try {
      const result = await addDocumentBridge(collectionName, data);
      if (result.success) {
        setNome("");
        setTipoConta("");
        setIdRT("");
        toast({ title: "Sucesso", description: "Gravado via Ponte de Dados!" });
        loadData();
      } else {
        toast({ variant: "destructive", title: "Falha na Gravação", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro Crítico", description: "Falha ao enviar para a Vercel." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este RT?")) return;
    try {
      const result = await deleteDocumentBridge(collectionName, id);
      if (result.success) {
        toast({ title: "Removido", description: "Registro excluído via servidor." });
        loadData();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Modo Ponte Ativado</p>
          <p className="text-[10px] text-blue-700 dark:text-blue-400">
            O Android está enviando dados para a Vercel, que repassa ao Firebase. Isso ignora bloqueios de rede do celular.
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Server className="h-5 w-5" /> Cadastro RT
          </CardTitle>
          <CardDescription>Dados sincronizados diretamente com a nuvem.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
              <Input placeholder="Tipo da Conta" value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} required />
              <Input placeholder="ID RT" value={idRT} onChange={(e) => setIdRT(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto font-bold uppercase">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Cadastrar na Nuvem'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" /> Registros na Nuvem
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList}>
            <RefreshCw className={loadingList ? "animate-spin" : ""} size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-10 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto mb-2 text-primary" />Sincronizando...</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>ID RT</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">{item.nome}</TableCell>
                    <TableCell className="text-xs">{item.tipoConta}</TableCell>
                    <TableCell className="font-mono text-[10px]">{item.idRT}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
