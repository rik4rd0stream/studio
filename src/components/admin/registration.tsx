
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Trash2, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, setDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";

interface RegistrationProps {
  type: 'users' | 'couriers';
}

export function Registration({ type }: RegistrationProps) {
  const { toast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [customId, setCustomId] = useState("");

  const collectionName = type === 'users' ? 'userProfiles' : 'entregadores';
  const title = type === 'users' ? 'Usuários' : 'Entregadores';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        setItems(result.data || []);
      } else {
        toast({ variant: "destructive", title: "Erro na Ponte", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Falha ao acessar servidor." });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.nome || item.name || "");
    setCustomId(item.id_motoboy || item.id || "");
  };

  const resetForm = () => {
    setName("");
    setCustomId("");
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover registro da nuvem?")) return;
    try {
      const result = await deleteDocumentBridge(collectionName, id);
      if (result.success) {
        toast({ title: "Removido" });
        loadData();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const docId = editingId || customId.trim();
    
    if (!docId) {
      toast({ variant: "destructive", title: "Erro", description: "O campo ID é obrigatório." });
      setLoading(false);
      return;
    }

    const data = {
      ...(type === 'users' ? { name: name.trim() } : { nome: name.trim() }),
      ...(type === 'couriers' ? { id_motoboy: customId.trim() } : { email: customId.trim() }),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await setDocumentBridge(collectionName, docId, data);
      if (result.success) {
        toast({ title: "Sucesso", description: "Gravado via Ponte de Dados!" });
        resetForm();
        loadData();
      } else {
        toast({ variant: "destructive", title: "Falha na Gravação", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro Crítico" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-fade-in">
      <Card className="border-none shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-primary text-2xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground px-1">Nome Completo</p>
                <Input 
                  placeholder="Ex: Ricardo Silva" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  className="h-12 bg-muted/50 border-none rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground px-1">{type === 'users' ? 'Email (ID)' : 'ID RT / Motoboy'}</p>
                <Input 
                  placeholder={type === 'users' ? "email@exemplo.com" : "Ex: usr_12345"} 
                  value={customId} 
                  onChange={(e) => setCustomId(e.target.value)} 
                  required 
                  disabled={!!editingId}
                  className="h-12 bg-muted/50 border-none rounded-xl font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="h-12 px-8 font-bold uppercase rounded-xl shadow-lg">
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (editingId ? 'Atualizar Dados' : 'Cadastrar na Nuvem')}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="h-12 rounded-xl border-none bg-muted hover:bg-muted/80">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Database className="h-4 w-4" /> Registros Ativos
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList} className="h-8 text-[10px] font-bold uppercase tracking-tight text-blue-600">
            <RefreshCw className={loadingList ? "animate-spin h-3.5 w-3.5 mr-1" : "h-3.5 w-3.5 mr-1"} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-primary opacity-20" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-muted">
                  <TableHead className="text-[10px] font-bold uppercase">Nome</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">ID / Identificador</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic text-xs">Nenhum registro encontrado.</TableCell></TableRow>
                ) : items.map((item) => (
                  <TableRow key={item.id} className="border-muted/50 hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">{item.nome || item.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.id_motoboy || item.id}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-8 w-8 text-blue-600 hover:bg-blue-50"><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-destructive hover:bg-red-50"><Trash2 size={14} /></Button>
                      </div>
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
