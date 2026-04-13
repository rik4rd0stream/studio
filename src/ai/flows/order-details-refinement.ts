
'use server';

/**
 * @fileOverview Flow para refinar detalhes de pedidos via Genkit.
 * 'use server' reativado para processamento seguro no lado do servidor.
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
  const {output} = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are an AI assistant specialized in extracting and refining order details.
    Analyze the provided description and extract information in structured JSON according to the schema.
    Order Description: ${input.description}`,
    output: {schema: OrderDetailsRefinementOutputSchema},
  });
  return output!;
}
