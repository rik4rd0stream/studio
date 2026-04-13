'use client';

import { EventEmitter } from 'events';

/**
 * Emissor de eventos global para erros de permissão do Firestore.
 * Usado para capturar erros de Security Rules e exibir feedback contextual.
 */
export const errorEmitter = new EventEmitter();
