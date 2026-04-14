"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Bike, 
  Loader2, 
  Pencil, 
  Trash2
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
      console.error("ERRO AO CARREGAR:", e);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar dados." });
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
    setName(item.nome || "");
    setIdMotoboy(item.id_motoboy || item.id || "");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja remover?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast({ title: "Removido com sucesso" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const id = editingId || 'rt_' + Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, collectionName, id);

    const data = {
      nome: name.trim(),
      id_motoboy: idMotoboy.trim(),
      updatedAt: new Date().toISOString(),
      ...(editingId ? {} : { createdAt: new Date().toISOString(), id })
    };

    try {
      if (editingId) {
        await updateDoc(docRef, data);
      } else {
        await setDoc(docRef, data);
      }

      toast({ title: "Salvo com sucesso" });
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Erro ao salvar" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'users' ? 'Usuários' : 'Entregadores'}
          </CardTitle>
          <CardDescription>
            Cadastro simples
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            {type === 'couriers' && (
              <Input
                placeholder="ID Motoboy"
                value={idMotoboy}
                onChange={(e) => setIdMotoboy(e.target.value)}
                required
              />
            )}

            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>

        <CardContent>
          {loadingList ? (
            <Loader2 className="animate-spin mx-auto" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.id_motoboy}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleEdit(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button onClick={() => handleDelete(item.id)}>
                        <Trash2 size={14} />
                      </Button>
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