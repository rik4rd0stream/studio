
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Pencil, Trash2, RefreshCw, Database, Store, MapPin, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCollectionBridge, setDocumentBridge, deleteDocumentBridge } from "@/app/actions/firestore-bridge";
import { cn } from "@/lib/utils";

export function StoreRegistration() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");

  const collectionName = 'storeProfiles';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const result = await getCollectionBridge(collectionName);
      if (result.success) {
        const sortedData = (result.data || []).sort((a: any, b: any) => 
          a.id.localeCompare(b.id)
        );
        setItems(sortedData);
      } else {
        toast({ variant: "destructive", title: "Erro ao carregar", description: result.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão" });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setStoreName(item.id);
    setAddress(item.address || "");
  };

  const resetForm = () => {
    setStoreName("");
    setAddress("");
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este cadastro de coleta?")) return;
    try {
      const result = await deleteDocumentBridge(collectionName, id);
      if (result.success) {
        toast({ title: "Removido com sucesso" });
        loadData();
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const docId = storeName.trim();
    if (!docId || !address.trim()) {
      toast({ variant: "destructive", title: "Campos Obrigatórios" });
      setLoading(false);
      return;
    }

    const data = {
      address: address.trim().substring(0, 50),
      updatedAt: new Date().toISOString()
    };

    try {
      const result = await setDocumentBridge(collectionName, docId, data);
      if (result.success) {
        toast({ title: "Loja Cadastrada", description: "Endereço de coleta salvo." });
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

  const filteredItems = items.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 animate-fade-in">
      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <CardTitle className="text-primary text-xl font-black flex items-center gap-3">
            <Store className="h-6 w-6" />
            {editingId ? 'Editar Coleta' : 'Novo Cadastro de Coleta'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Nome da Loja (conforme Redash)</label>
                <Input 
                  placeholder="Ex: McDonald's - Centro" 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)} 
                  required 
                  disabled={!!editingId}
                  className="h-14 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary shadow-inner text-base font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Endereço de Coleta (Máx 50 caracteres)</label>
                <Input 
                  placeholder="Ex: Rua das Flores, 123 - Box 4" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  maxLength={50}
                  required 
                  className="h-14 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary shadow-inner text-base font-bold"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="h-14 px-12 font-black uppercase rounded-2xl shadow-xl flex-1 md:flex-none text-base">
                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (editingId ? 'Atualizar Endereço' : 'Cadastrar Coleta')}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={resetForm} className="h-14 rounded-2xl text-muted-foreground hover:bg-muted font-bold px-8">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 bg-card/50 p-4 rounded-3xl border border-muted/20">
        <Search className="h-5 w-5 text-muted-foreground ml-2" />
        <Input 
          placeholder="Pesquisar lojas cadastradas..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-none bg-transparent h-10 shadow-none focus-visible:ring-0 text-sm font-bold"
        />
      </div>

      <Card className="border-none shadow-sm bg-card/30 backdrop-blur-sm rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b border-muted/20">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-black uppercase tracking-widest">
            <Database className="h-4 w-4" /> Coletas no Servidor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loadingList} className="h-9 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-full px-5">
            <RefreshCw className={loadingList ? "animate-spin h-4 w-4 mr-2" : "h-4 w-4 mr-2"} /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="px-4">
          {loadingList ? (
            <div className="py-20 text-center flex flex-col items-center gap-3">
              <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
              <p className="text-[10px] font-bold text-muted-foreground animate-pulse uppercase">Sincronizando...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-muted/30">
                    <TableHead className="text-[10px] font-black uppercase px-6 py-4">Loja</TableHead>
                    <TableHead className="text-[10px] font-black uppercase px-6">Endereço de Coleta</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right px-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic text-xs">
                        Nenhum cadastro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.map((item) => (
                    <TableRow key={item.id} className="border-muted/20 hover:bg-primary/5 transition-colors group">
                      <TableCell className="font-black text-sm px-6 py-6">
                        <div className="flex items-center gap-3 text-foreground">
                          <Store className="h-4 w-4 text-primary" />
                          {item.id}
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.address}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-11 w-11 text-blue-600 hover:bg-blue-100 rounded-2xl shadow-sm border border-blue-100">
                            <Pencil size={18} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-11 w-11 text-destructive hover:bg-red-100 rounded-2xl shadow-sm border border-red-100">
                            <Trash2 size={18} />
                          </Button>
                        </div>
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
