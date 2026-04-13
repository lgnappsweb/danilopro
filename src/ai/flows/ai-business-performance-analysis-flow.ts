'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing business performance.
 *
 * - aiBusinessPerformanceAnalysis - A function that analyzes financial and service data to provide business insights.
 * - BusinessPerformanceAnalysisInput - The input type for the aiBusinessPerformanceAnalysis function.
 * - BusinessPerformanceAnalysisOutput - The return type for the aiBusinessPerformanceAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FinanceEntrySchema = z.object({
  date: z.string().describe('The date of the financial entry (e.g., YYYY-MM-DD).'),
  type: z.enum(['revenue', 'expense']).describe('Type of entry: revenue or expense.'),
  category: z.string().describe('Category of the financial entry.'),
  value: z.number().describe('The monetary value of the entry.'),
  description: z.string().optional().describe('An optional description of the entry.'),
  serviceId: z.string().optional().describe('Optional ID of the service associated with this entry.'),
  clientId: z.string().optional().describe('Optional ID of the client associated with this entry.'),
});

const ServiceRecordSchema = z.object({
  id: z.string().describe('Unique ID of the service.'),
  clientName: z.string().describe('Name of the client for whom the service was performed.'),
  serviceType: z.string().describe('The type or category of the service performed.'),
  chargedValue: z.number().describe('The total value charged for the service.'),
  costOfMaterials: z.number().describe('The total cost of materials used for the service.'),
  dateCompleted: z.string().describe('The date the service was completed (e.g., YYYY-MM-DD).'),
});

const StockItemSchema = z.object({
  name: z.string().describe('Name of the stock item.'),
  category: z.string().describe('Category of the stock item.'),
  currentQuantity: z.number().describe('Current quantity of the item in stock.'),
  unitCost: z.number().describe('Cost per unit of the stock item.'),
});

const BusinessPerformanceAnalysisInputSchema = z.object({
  financeEntries: z.array(FinanceEntrySchema).describe('A list of all financial entries (revenues and expenses).'),
  services: z.array(ServiceRecordSchema).describe('A list of all completed service records.'),
  stockItems: z.array(StockItemSchema).describe('A list of current stock items with quantities and costs.'),
});

export type BusinessPerformanceAnalysisInput = z.infer<typeof BusinessPerformanceAnalysisInputSchema>;

const BusinessPerformanceAnalysisOutputSchema = z.object({
  summary: z.string().describe('An overall summary of the business performance based on the provided data.'),
  profitabilityDrivers: z.array(z.string()).describe('Key factors identified as driving business profitability.'),
  highCostAreas: z.array(z.object({
    category: z.string().describe('The category or area with high costs.'),
    reason: z.string().describe('A brief explanation for why this is considered a high cost area.'),
  })).describe('Specific categories or areas identified as having high costs, with a brief explanation.'),
  optimizationSuggestions: z.array(z.string()).describe('Actionable recommendations for improving efficiency and profitability.'),
  strategicGoals: z.array(z.string()).describe('Suggested strategic financial goals based on the analysis.'),
  keyMetrics: z.object({
    monthlyNetProfit: z.number().describe('The calculated net profit for the month, considering all revenues and expenses.'),
    totalRevenue: z.number().describe('The total revenue generated based on the provided finance entries.'),
    totalExpenses: z.number().describe('The total expenses incurred based on the provided finance entries.'),
    mostProfitableServiceType: z.string().describe('The type of service identified as generating the highest profit.'),
    mostExpensiveServiceType: z.string().describe('The type of service identified as incurring the highest average cost.'),
    mostUsedMaterialCategory: z.string().describe('The material category with the highest recorded usage or value in services.'),
    averageServiceProfit: z.number().describe('The average profit per service.'),
    totalStockValue: z.number().describe('The total current value of all items in stock.'),
  }).describe('A collection of key business metrics calculated from the provided data.'),
});

export type BusinessPerformanceAnalysisOutput = z.infer<typeof BusinessPerformanceAnalysisOutputSchema>;

export async function aiBusinessPerformanceAnalysis(
  input: BusinessPerformanceAnalysisInput
): Promise<BusinessPerformanceAnalysisOutput> {
  return businessPerformanceAnalysisFlow(input);
}

const businessPerformanceAnalysisPrompt = ai.definePrompt({
  name: 'businessPerformanceAnalysisPrompt',
  input: { schema: BusinessPerformanceAnalysisInputSchema },
  output: { schema: BusinessPerformanceAnalysisOutputSchema },
  prompt: `You are an expert business analyst specializing in service companies. Your task is to analyze the provided financial and service performance data to identify key profitability drivers, pinpoint areas of high cost, and provide actionable suggestions for optimization and setting strategic financial goals.

Here is the data for your analysis:

### Financial Entries (Revenues and Expenses):
{{#each financeEntries}}
- Date: {{date}}, Type: {{type}}, Category: {{category}}, Value: {{value}}, Description: {{description}}
{{/each}}

### Service Records:
{{#each services}}
- ID: {{id}}, Client: {{clientName}}, Type: {{serviceType}}, Charged: {{chargedValue}}, Material Cost: {{costOfMaterials}}, Completed: {{dateCompleted}}
{{/each}}

### Stock Items:
{{#each stockItems}}
- Item: {{name}}, Category: {{category}}, Qty: {{currentQuantity}}, Unit Cost: {{unitCost}}
{{/each}}

Based on the data provided, perform the following:
1.  **Overall Summary:** Provide a concise summary of the business's current performance.
2.  **Profitability Drivers:** Identify the main factors contributing to the business's profits.
3.  **High-Cost Areas:** Pinpoint specific categories or areas that incur significant expenses, and explain why they are considered high cost.
4.  **Optimization Suggestions:** Offer concrete and actionable recommendations to improve efficiency and increase profitability.
5.  **Strategic Goals:** Suggest 3-5 strategic financial goals that the business owner should consider based on this analysis.
6.  **Key Metrics Calculation:** Calculate the following metrics based on the input data: monthlyNetProfit, totalRevenue, totalExpenses, mostProfitableServiceType, mostExpensiveServiceType, mostUsedMaterialCategory, averageServiceProfit, totalStockValue.

Ensure your output is a JSON object strictly following the provided output schema.`,
});

const businessPerformanceAnalysisFlow = ai.defineFlow(
  {
    name: 'businessPerformanceAnalysisFlow',
    inputSchema: BusinessPerformanceAnalysisInputSchema,
    outputSchema: BusinessPerformanceAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await businessPerformanceAnalysisPrompt(input);
    return output!;
  }
);
