
import { NextResponse } from 'next/server';

/**
 * API Route para servir como Proxy do Redash na Web.
 * Resolve o problema de CORS no navegador.
 */
export async function GET() {
  const REDASH_URL = `https://redash.rappi.com/api/queries/130603/results.json?api_key=VqwlaUY9wOLjhUJTvrfuKdFExSsJG8ktuzUXy4fR`;

  try {
    const response = await fetch(REDASH_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 10 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Falha no Redash: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Erro de conexão com o servidor de Proxy.' },
      { status: 500 }
    );
  }
}
