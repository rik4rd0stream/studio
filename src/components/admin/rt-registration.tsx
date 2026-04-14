
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { firebaseConfig } from "@/firebase/config";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

/**
 * Componente de teste para nova coleção 'rt_registry'.
 * Inclui diagnósticos críticos para Android/Capacitor.
 */
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

  // Alerta de diagnóstico ao montar o componente
  useEffect(() => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      alert(`DIAGNÓSTICO ANDROID:\n\nProjeto: ${firebaseConfig.projectId}\nURL Atual: ${window.location.href}\n\nSe o Projeto não for 'motoboy-13742', o APK está desatualizado!`);
    }
    loadData();
  }, [db]);

  const loadData = async () => {
    setLoadingList(true);
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(docs);
    } catch (e: any) {
      console.error("Erro ao carregar RTs:", e);
      toast({ 
        variant: "destructive", 
        title: "Erro de Conexão", 
        description: "O Android não conseguiu ler o banco." 
      });
    } finally {
      setLoadingList(false);
    }
  };

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
      // Timer de segurança para evitar o rodando infinito no Android
      const savePromise = setDoc(docRef, data);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout de rede")), 10000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      
      toast({ title: "Sucesso!", description: "Gravado no Firestore." });
      setNome("");
      setTipoConta("");
      setIdRT("");
      loadData();
    } catch (e: any) {
      console.error("Erro ao gravar RT:", e);
      alert(`ERRO DE GRAVAÇÃO:\n${e.message}\n\nVerifique se o domínio 'localhost' está autorizado no console.`);
      toast({ 
        variant: "destructive", 
        title: "Falha na Rede", 
        description: "O celular não alcançou o servidor." 
      });
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
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardHeader className="py-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-tighter">
            <AlertTriangle className="h-4 w-4" /> Status do Ambiente
          </div>
          <p className="text-[10px] opacity-70">
            Projeto: <span className="font-mono font-bold">{firebaseConfig.projectId}</span><br />
            Config: <span className="font-mono font-bold">Long Polling (Android Ready)</span>
          </p>
        </CardHeader>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Database className="h-5 w-5" /> Cadastro RT (Teste Android)
          </CardTitle>
          <CardDescription>
            Tente gravar um dado. Se o alerta de diagnóstico aparecer, saberemos a causa.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Nome do RT"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <Input
                placeholder="Tipo de Conta"
                value={tipoConta}
                onChange={(e) => setTipoConta(e.target.value)}
                required
              />
              <Input
                placeholder="ID do RT"
                value={idRT}
                onChange={(e) => setIdRT(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto h-11 font-bold">
              {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Gravar e Testar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">RTs Sincronizados</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList}>
            <RefreshCw className={loadingList ? "animate-spin" : ""} size={14} />
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-10 text-center text-muted-foreground">Buscando do servidor...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">Nenhum dado encontrado no servidor para este projeto.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.tipoConta}</TableCell>
                      <TableCell className="font-mono text-xs">{item.idRT}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
