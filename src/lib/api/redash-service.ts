
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface RedashOrder {
  order_id: string;
  store_name?: string;
  direccion_entrega?: string;
  point?: string;
  es_trusted?: string;
  rt_asignado_orden?: string;
  estado_detallado_actual?: string;
  [key: string]: any;
}

/**
 * Serviço Inteligente de Redash.
 * Detecta a plataforma e escolhe a melhor estratégia de rede.
 */
export const redashService = {
  async fetchOrders(): Promise<{ success: boolean; data?: RedashOrder[]; error?: string }> {
    // 1. Estratégia Nativa (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await CapacitorHttp.get({
          url: 'https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR',
          headers: { 'Accept': 'application/json' }
        });

        if (response.status !== 200) {
          return { success: false, error: `Erro Nativo: ${response.status}` };
        }

        const rows = response.data?.query_result?.data?.rows || [];
        return { success: true, data: rows };
      } catch (e: any) {
        return { success: false, error: 'Erro na requisição nativa Capacitor.' };
      }
    }

    // 2. Estratégia Web (Browser via API Route Proxy)
    try {
      const response = await fetch('/api/redash');
      
      if (!response.ok) {
        return { success: false, error: 'Erro no Proxy da Web.' };
      }

      const data = await response.json();
      const rows = data?.query_result?.data?.rows || [];
      return { success: true, data: rows };
    } catch (e: any) {
      return { success: false, error: 'Erro ao conectar com o Proxy da Web.' };
    }
  }
};
