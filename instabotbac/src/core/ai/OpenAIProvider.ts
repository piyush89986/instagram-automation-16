import OpenAI from 'openai';
import { AIProvider, AIMessage } from './AIProvider';
import { Contact } from '../database/models/Contact';
import { Product } from '../database/models/Product';

export class OpenAIProvider extends AIProvider {
  private client: OpenAI;

  constructor() {
    super();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
    });
  }

  async generateReply(messages: AIMessage[], systemPrompt: string, knowledgeContext?: string, options?: { contactId?: string; workspaceId?: string; igAccountId?: string; senderId?: string }): Promise<string> {
    const fullSystemPrompt = knowledgeContext 
      ? `${systemPrompt}\n\nUse the following knowledge base context to answer:\n${knowledgeContext}`
      : systemPrompt;

    const payload: any[] = [
      { role: 'system', content: fullSystemPrompt },
      ...messages
    ];

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'update_contact_details',
          description: 'Call this function to save user contact details (name, email, phone) when they provide them.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'book_meeting',
          description: 'Call this function when the user asks to book a meeting or demo. It provides a scheduling link.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_products',
          description: 'CRITICAL: ALWAYS call this function whenever the user asks about a specific product, mentions a product name, or asks to see options. Even if you already know the product exists from your knowledge base, you MUST call this tool to trigger the visual product card (image, price, buttons) for the user.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The EXACT word or phrase the user typed to ask for the product. Do NOT normalize or change it (e.g. "hunter 350"). Just pass exactly what they typed.' }
            },
            required: ['query']
          }
        }
      }
    ];

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o', // Or configured model
        messages: payload,
        temperature: 0.7,
        tools: tools,
        tool_choice: 'auto'
      });

      const responseMessage = response.choices[0]?.message;

      // Handle tool calls if any
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
        payload.push(responseMessage); // Append the assistant's tool call message

        let contextToInject = ''; // Track if we sent products so we can inject context
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.type !== 'function') continue;

          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let functionResponse = '';

          if (functionName === 'update_contact_details') {
            if (options?.contactId) {
              await Contact.findByIdAndUpdate(options.contactId, {
                $set: {
                  ...(args.name && { name: args.name }),
                  ...(args.email && { email: args.email }),
                  ...(args.phone && { phone: args.phone }),
                  status: 'QUALIFIED'
                }
              });
              functionResponse = 'Contact details successfully saved to the database. Acknowledge this to the user.';
            } else {
              functionResponse = 'Error: No contact ID provided.';
            }
          } else if (functionName === 'book_meeting') {
            functionResponse = 'Here is your booking link: https://calendly.com/your-business/demo . Provide this link to the user.';
          } else if (functionName === 'search_products') {
            if (options?.workspaceId) {
              // Extract safe alphanumeric keywords
              const words = args.query.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/).filter((w: string) => w.length > 1);
              const regexConditions = words.map((w: string) => ({
                $or: [
                  { name: { $regex: w, $options: 'i' } },
                  { description: { $regex: w, $options: 'i' } }
                ]
              }));
              
              let products: any[] = [];
              if (regexConditions.length > 0) {
                products = await Product.find({ 
                  workspaceId: options.workspaceId,
                  $or: regexConditions
                }).limit(5);
              }
              
              if (products.length > 0) {
                if (options.igAccountId && options.senderId) {
                  const elements = products.map(p => ({
                    title: p.name,
                    image_url: p.imageUrl || 'https://via.placeholder.com/600x600?text=No+Image',
                    subtitle: `$${p.price} | ${p.description.substring(0, 70)}...`,
                    buttons: [
                      {
                        type: 'web_url',
                        url: p.linkUrl || 'https://yourwebsite.com',
                        title: 'View Details'
                      }
                    ]
                  }));
                  const { sendGenericTemplate } = await import('../../modules/instagram/messaging.service');
                  await sendGenericTemplate(options.igAccountId, options.senderId, elements);
                  functionResponse = 'A visual product carousel (with images and buttons) was successfully sent to the user. Say something very short like "Here are the products I found:" and DO NOT include any markdown links or product text in your reply.';
                } else {
                  functionResponse = `Found ${products.length} products:\n` + products.map(p => `- ${p.name} ($${p.price}): ${p.description}. Link: ${p.linkUrl || 'N/A'}, Image: ${p.imageUrl || 'N/A'}`).join('\n');
                }
              } else {
                functionResponse = `No visual product cards found for '${args.query}'. You must answer the user naturally using your knowledge base.`;
              }
            } else {
              functionResponse = 'Error: No workspace ID provided for search.';
            }
          }

          if (functionName === 'search_products' && options?.igAccountId && options?.senderId && args.query) {
             contextToInject = ` [HIDDEN_CONTEXT: I just showed the user a product carousel for "${args.query}". Keep this in mind if they ask follow-up questions.]`;
          }

          payload.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: functionResponse,
          });
        }

        // Second call to get the final message after tool execution
        const secondResponse = await this.client.chat.completions.create({
          model: 'gpt-4o',
          messages: payload,
          temperature: 0.7,
        });

        const finalContent = secondResponse.choices[0]?.message?.content || 'Sorry, I could not generate a reply.';
        
        // Inject context if we have one (it will be saved to DB but we'll strip it before sending to Meta)
        return contextToInject ? finalContent + contextToInject : finalContent;
      }

      return responseMessage?.content || 'Sorry, I could not generate a reply.';
    } catch (error) {
      console.error('OpenAI Generation Error:', error);
      throw new Error('Failed to generate AI response via OpenAI');
    }
  }
}
