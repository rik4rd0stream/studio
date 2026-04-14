
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  Pencil, 
  Trash2,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocs } from "firebase/firestore";

interface RegistrationProps {
  type: 'users' | 'couriers';
}

export function Registration({ type }: RegistrationProps) {
  const { toast } = useToast();
  const db = useFirestore();

  const [items, setItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [idMotoboy, setIdMotoboy] = useState("");

  const collectionName = type === 'users' ? 'userProfiles' : 'entregadores';

  const loadData = async () => {
    setLoadingList(true);
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(docs);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar a lista do Firestore." });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [db, collectionName]);

  const resetForm = () => {
    setName("");
    setIdMotoboy("");
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setName(item.nome || item.name || "");
    setIdMotoboy(item.id_motoboy || item.id || "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este registro?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast({ title: "Removido", description: "Registro excluído com sucesso." });
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Verifique sua conexão." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const id = editingId || 'id_' + Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, collectionName, id);

    const data = {
      nome: name.trim(),
      ...(type === 'couriers' ? { id_motoboy: idMotoboy.trim() } : {}),
      updatedAt: new Date().toISOString(),
      ...(editingId ? {} : { createdAt: new Date().toISOString(), id })
    };

    try {
      if (editingId) {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, data);
      }

      toast({ title: "Sucesso", description: "Dados salvos na nuvem." });
      resetForm();
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Falha na Gravação", description: "Os dados não puderam ser enviados ao Firestore." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            {type === 'users' ? 'Gestão de Usuários' : 'Gestão de Entregadores'}
          </CardTitle>
          <CardDescription>
            Adicione ou edite registros diretamente no banco de dados.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Input
                  placeholder="Nome Completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              {type === 'couriers' && (
                <div className="space-y-2">
                  <Input
                    placeholder="ID do Motoboy (RT)"
                    value={idMotoboy}
                    onChange={(e) => setIdMotoboy(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="h-11 px-8 font-bold gap-2">
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (editingId ? 'Atualizar Registro' : 'Salvar Novo')}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="h-11">
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Registros Ativos</CardTitle>
            <CardDescription>Lista sincronizada com o Firebase</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadData} className="text-[10px] font-bold uppercase">
            Sincronizar
          </Button>
        </CardHeader>

        <CardContent>
          {loadingList ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="animate-spin h-6 w-6 text-primary" />
              <p className="text-xs text-muted-foreground">Buscando dados...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum registro encontrado nesta coleção.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Nome</TableHead>
                    <TableHead className="font-bold">Identificador</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nome || item.name}</TableCell>
                      <TableCell className="text-xs font-mono">{item.id_motoboy || item.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleEdit(item)}>
                            <Pencil size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 size={14} />
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
