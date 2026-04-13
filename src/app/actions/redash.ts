
/**
 * @fileOverview Funções para buscar dados do Redash.
 * Ajustado para rodar no cliente para compatibilidade com exportação estática (Capacitor/Android).
 */

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

export async function fetchRedashOrders() {
  const url = `https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR`;

  try {
    const response = await fetch(url); 
    if (!response.ok) throw new Error('Falha ao conectar com o Redash');

    const data = await response.json();
    const rows: RedashOrder[] = data.query_result.data.rows;

    return { success: true, data: rows };
  } catch (error: any) {
    console.error('Redash Fetch Error:', error);
    return { success: false, error: error.message };
  }
}
