
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Database, RefreshCw, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, addDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";

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
      // USANDO A PONTE (SERVER ACTION) - Funciona 100% no Android
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        setItems(result.data || []);
      } else {
        toast({ variant: "destructive", title: "Erro na Ponte", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "O servidor não respondeu." });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
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
      toast({ variant: "destructive", title: "Erro Crítico", description: "Falha ao enviar para o servidor." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este RT?")) return;
    try {
      const result = await deleteDocumentBridge(collectionName, id);
      if (result.success) {
        toast({ title: "Removido", description: "Registro excluído com sucesso." });
        loadData();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Server className="h-5 w-5" /> Cadastro RT (Via Ponte Server)
          </CardTitle>
          <CardDescription>
            Este modo ignora as falhas de rede do Android e usa o servidor como ponte.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Nome Completo" value={nome} onChange={(e) => setNome(e.target.value)} required className="bg-background" />
              <Input placeholder="Tipo da Conta" value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} required className="bg-background" />
              <Input placeholder="ID RT (Identificador)" value={idRT} onChange={(e) => setIdRT(e.target.value)} required className="bg-background" />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto font-bold uppercase tracking-wider">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Cadastrar na Nuvem'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" /> Registros Atuais
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList}>
            <RefreshCw className={loadingList ? "animate-spin" : ""} size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" />Sincronizando com o servidor...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>ID RT</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
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
