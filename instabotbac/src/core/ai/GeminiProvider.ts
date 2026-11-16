import { GoogleGenAI } from '@google/genai';
import { AIProvider, AIMessage } from './AIProvider';

export class GeminiProvider extends AIProvider {
  private client: GoogleGenAI;

  constructor() {
    super();
    this.client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'dummy_key'
    });
  }

  async generateReply(messages: AIMessage[], systemPrompt: string, knowledgeContext?: string): Promise<string> {
    const fullSystemPrompt = knowledgeContext 
      ? `${systemPrompt}\n\nUse the following knowledge base context to answer:\n${knowledgeContext}`
      : systemPrompt;

    // Convert common AIMessage format to Gemini's expected format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user', // Gemini uses 'model' instead of 'assistant'
      parts: [{ text: msg.content }]
    }));

    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents,
        config: {
          systemInstruction: fullSystemPrompt,
          temperature: 0.7,
        }
      });

      return response.text || 'Sorry, I could not generate a reply.';
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      throw new Error('Failed to generate AI response via Gemini');
    }
  }
}
