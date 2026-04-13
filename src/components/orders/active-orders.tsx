"use client";

import { Order } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck, CheckCircle2, MoreVertical, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActiveOrdersProps {
  orders: Order[];
}

export function ActiveOrders({ orders }: ActiveOrdersProps) {
  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-none">Pendente</Badge>;
      case 'accepted': return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none">Aceito</Badge>;
      case 'delivering': return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none">Em Entrega</Badge>;
      case 'completed': return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">Concluído</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Monitoramento</h1>
          <p className="text-muted-foreground">Acompanhe o status de todos os pedidos em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1">{orders.length} Total</Badge>
          <Badge variant="outline" className="px-3 py-1 text-yellow-600 bg-yellow-50 border-yellow-200">
            {orders.filter(o => o.status === 'pending').length} Pendentes
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-xl border-2 border-dashed">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Nenhum pedido ativo</h3>
            <p className="text-muted-foreground">Novos pedidos aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">#{order.id}</p>
                        <h3 className="text-lg font-bold truncate max-w-[200px]">{order.items.join(', ')}</h3>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(order.status)}
                        <div className="flex items-center text-[10px] text-muted-foreground gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5" />
                            <div className="w-0.5 flex-1 bg-border my-1" />
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                          </div>
                          <div className="space-y-4 flex-1">
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Coleta</p>
                              <p className="text-sm font-medium leading-none">{order.pickupAddress}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Entrega</p>
                              <p className="text-sm font-medium leading-none">{order.deliveryAddress}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {order.specialInstructions && (
                          <div className="p-3 bg-muted rounded-lg text-xs italic text-muted-foreground">
                            "{order.specialInstructions}"
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Truck className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">Entregador</p>
                              <p className="text-xs font-medium">{order.courierId ? `ID: ${order.courierId}` : 'Aguardando...'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t md:border-t-0 md:border-l p-4 flex md:flex-col justify-center gap-2 bg-muted/30">
                    <Button variant="ghost" size="icon" className="h-10 w-10"><MoreVertical className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="hidden md:flex">Detalhes</Button>
                    {order.status === 'pending' && (
                      <Button className="flex-1 md:flex-none">Priorizar</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}