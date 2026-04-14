
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Loader2, 
  Pencil, 
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc, deleteDoc, updateDoc, collection, getDocsFromServer } from "firebase/firestore";

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
      // FORÇA busca do servidor ignorando cache
      const snapshot = await getDocsFromServer(collection(db, collectionName));
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(docs);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível buscar dados da nuvem." });
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
    if (!confirm("Remover registro?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir" });
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
      resetForm();
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Falha na Gravação" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-primary">
            {type === 'users' ? 'Usuários' : 'Entregadores'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
              {type === 'couriers' && (
                <Input placeholder="ID RT" value={idMotoboy} onChange={(e) => setIdMotoboy(e.target.value)} required />
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (editingId ? 'Atualizar' : 'Salvar')}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="pt-6">
          {loadingList ? (
            <div className="text-center py-10"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>ID</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nome || item.name}</TableCell>
                    <TableCell>{item.id_motoboy || item.id}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Pencil size={14} /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>
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
