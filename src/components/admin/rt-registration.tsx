
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Database, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { doc, setDoc, deleteDoc, collection, getDocsFromServer } from "firebase/firestore";

export function RtRegistration() {
  const { toast } = useToast();
  const db = useFirestore();

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
      // DIAGNÓSTICO AMBIENTE
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
        alert(`INFO AMBIENTE:\nProjeto: ${firebaseConfig.projectId}\nURL: ${window.location.href}`);
      }

      // FORÇA busca do servidor ignorando qualquer cache
      const snapshot = await getDocsFromServer(collection(db, collectionName));
      
      if (isAndroid) {
        alert(`RESPOSTA NUVEM: Encontrados ${snapshot.size} registros.`);
      }

      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(docs);
    } catch (e: any) {
      console.error("Erro Nuvem:", e);
      toast({ variant: "destructive", title: "Erro de Rede", description: "O Android não alcançou o servidor." });
      alert(`ERRO REDE: ${e.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [db]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const docId = 'rt_' + Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, collectionName, docId);

    const data = {
      nome: nome.trim(),
      tipoConta: tipoConta.trim(),
      idRT: idRT.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(docRef, data);
      setNome("");
      setTipoConta("");
      setIdRT("");
      toast({ title: "Sucesso", description: "Gravado na nuvem!" });
      loadData();
    } catch (e: any) {
      alert(`ERRO GRAVAÇÃO: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este RT?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Database className="h-5 w-5" /> Cadastro RT (Teste Direto)
          </CardTitle>
          <CardDescription>
            Este formulário usa 'getDocsFromServer' para forçar a conexão com a nuvem.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              <Input placeholder="Tipo Conta" value={tipoConta} onChange={(e) => setTipoConta(e.target.value)} required />
              <Input placeholder="ID RT" value={idRT} onChange={(e) => setIdRT(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Gravar na Nuvem'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Dados em Tempo Real (Sem Cache)</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList}>
            <RefreshCw className={loadingList ? "animate-spin" : ""} size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-10 text-center text-muted-foreground">Conectando ao servidor...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum dado encontrado na nuvem.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>ID</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{item.idRT}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
