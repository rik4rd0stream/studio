'use server';

/**
 * @fileOverview Ação de servidor para buscar dados do Redash sem filtros fixos,
 * permitindo que os componentes filtrem conforme a necessidade (Envio vs Monitoramento).
 */

export interface RedashOrder {
  order_id: string;
  store_name?: string;
  direccion_entrega?: string;
  point?: string;
  es_trusted?: string;
  rt_asignado_orden?: string;
  [key: string]: any;
}

export async function fetchRedashOrders() {
  const url = `https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR`;

  try {
    const response = await fetch(url, { next: { revalidate: 30 } }); // Cache de 30 segundos
    if (!response.ok) throw new Error('Falha ao conectar com o Redash');

    const data = await response.json();
    const rows: RedashOrder[] = data.query_result.data.rows;

    // Retorna todos os dados para que o componente decida o que filtrar
    return { success: true, data: rows };
  } catch (error: any) {
    console.error('Redash Proxy Error:', error);
    return { success: false, error: error.message };
  }
}
