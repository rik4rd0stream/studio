
/**
 * @fileOverview Genkit flow to refine order details.
 * Removido 'use server' para compatibilidade com build estático.
 * Nota: Funcionalidades de IA que dependem de servidor Node.js (Genkit) 
 * não funcionarão nativamente dentro do APK sem uma API intermediária.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrderDetailsRefinementInputSchema = z.object({
  description: z
    .string()
    .describe(
      'A free-form text description of the order, including items, instructions, and possibly addresses.'
    ),
});
export type OrderDetailsRefinementInput = z.infer<
  typeof OrderDetailsRefinementInputSchema
>;

const OrderDetailsRefinementOutputSchema = z.object({
  extractedItems: z
    .array(z.string())
    .describe('A list of individual items extracted from the description.'),
  suggestedCategories: z
    .array(z.string())
    .describe('Suggested categories for the order items.'),
  deliveryAddress: z
    .string()
    .optional()
    .describe('The extracted delivery address, if present.'),
  pickupAddress: z
    .string()
    .optional()
    .describe('The extracted pickup address, if present.'),
  specialInstructions: z
    .string()
    .optional()
    .describe('Any special instructions for the order.'),
});
export type OrderDetailsRefinementOutput = z.infer<
  typeof OrderDetailsRefinementOutputSchema
>;

export async function refineOrderDetails(
  input: OrderDetailsRefinementInput
): Promise<OrderDetailsRefinementOutput> {
  return orderDetailsRefinementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderDetailsRefinementPrompt',
  input: {schema: OrderDetailsRefinementInputSchema},
  output: {schema: OrderDetailsRefinementOutputSchema},
  prompt: `You are an AI assistant specialized in extracting and refining order details.
Your task is to analyze the provided free-form text description of an order and extract the following information:
-   Individual items mentioned in the order.
-   Suggested categories for these items.
-   A delivery address, if specified.
-   A pickup address, if specified.
-   Any special instructions.

Return the information in a structured JSON format according to the output schema.
If a piece of information is not found, omit it or provide an empty array where appropriate.

Order Description: {{{description}}}`,
});

const orderDetailsRefinementFlow = ai.defineFlow(
  {
    name: 'orderDetailsRefinementFlow',
    inputSchema: OrderDetailsRefinementInputSchema,
    outputSchema: OrderDetailsRefinementOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
