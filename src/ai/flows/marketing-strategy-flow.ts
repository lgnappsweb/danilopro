
'use server';
/**
 * @fileOverview Fluxo de IA para estratégias de marketing e reengajamento de clientes.
 *
 * - marketingStrategy - Função que gera sugestões de reengajamento.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClientHistorySchema = z.object({
  id: z.string(),
  name: z.string(),
  lastServiceDate: z.string().describe('Data do último serviço realizado.'),
  totalSpent: z.number().describe('Total gasto pelo cliente até hoje.'),
  servicesSummary: z.string().optional().describe('Resumo dos tipos de serviços já realizados.'),
});

const MarketingStrategyInputSchema = z.object({
  inactiveClients: z.array(ClientHistorySchema).describe('Lista de clientes que não contratam há algum tempo.'),
  businessName: z.string().describe('Nome da sua empresa.'),
  specialOffer: z.string().optional().describe('Uma oferta opcional (ex: 10% de desconto).'),
});

export type MarketingStrategyInput = z.infer<typeof MarketingStrategyInputSchema>;

const MarketingStrategyOutputSchema = z.object({
  recommendations: z.array(z.object({
    clientId: z.string(),
    clientName: z.string(),
    reason: z.string().describe('Por que entrar em contato com este cliente agora.'),
    suggestedMessage: z.string().describe('Mensagem personalizada para enviar via WhatsApp.'),
  })),
  generalAdvice: z.string().describe('Conselho geral para o marketing da empresa.'),
});

export type MarketingStrategyOutput = z.infer<typeof MarketingStrategyOutputSchema>;

export async function marketingStrategy(input: MarketingStrategyInput): Promise<MarketingStrategyOutput> {
  return marketingStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'marketingStrategyPrompt',
  input: { schema: MarketingStrategyInputSchema },
  output: { schema: MarketingStrategyOutputSchema },
  prompt: `Você é um especialista em marketing para pequenas empresas prestadoras de serviço.
Seu objetivo é criar estratégias de reengajamento para clientes que não aparecem há algum tempo.

Nome da Empresa: {{{businessName}}}
Oferta Especial: {{{specialOffer}}}

Clientes Inativos:
{{#each inactiveClients}}
- Cliente: {{{name}}} (Último serviço: {{{lastServiceDate}}}, Gasto total: R$ {{{totalSpent}}})
{{/each}}

Para cada cliente, crie uma recomendação amigável e uma mensagem de WhatsApp que NÃO pareça um robô. 
Use um tom profissional, porém próximo. Mencione que faz tempo que não se falam e ofereça a oferta especial se houver uma.

Retorne no formato JSON especificado.`,
});

const marketingStrategyFlow = ai.defineFlow(
  {
    name: 'marketingStrategyFlow',
    inputSchema: MarketingStrategyInputSchema,
    outputSchema: MarketingStrategyOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
