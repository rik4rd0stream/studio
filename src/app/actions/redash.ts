'use server';

/**
 * @fileOverview Ação de servidor para buscar e filtrar dados do Redash.
 */

export interface RedashOrder {
  order_id: string;
  point: string;
  es_trusted: string;
  items: string;
  address: string;
  pickup: string;
  [key: string]: any;
}

export async function fetchRedashOrders() {
  const url = `https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR`;

  try {
    const response = await fetch(url, { next: { revalidate: 60 } }); // Cache de 1 minuto
    if (!response.ok) throw new Error('Falha ao conectar com o Redash');

    const data = await response.json();
    const rows: RedashOrder[] = data.query_result.data.rows;

    // Filtros solicitados:
    // 1. Point📍9944
    // 2. es_trusted: Sin RT➖
    const filtered = rows.filter(row => {
      const isPoint9944 = Object.values(row).some(val => 
        String(val).includes('9944') || String(val).includes('Point')
      );
      
      const isSinRT = Object.entries(row).some(([key, val]) => 
        key.toLowerCase().includes('trusted') && String(val).includes('Sin RT')
      );

      return isPoint9944 && isSinRT;
    });

    return { success: true, data: filtered };
  } catch (error: any) {
    console.error('Redash Proxy Error:', error);
    return { success: false, error: error.message };
  }
}
