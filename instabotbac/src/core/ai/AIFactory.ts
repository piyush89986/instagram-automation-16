import { AIProvider } from './AIProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';

export class AIFactory {
  static getProvider(providerName: 'OPENAI' | 'GEMINI'): AIProvider {
    switch (providerName) {
      case 'OPENAI':
        return new OpenAIProvider();
      case 'GEMINI':
        return new GeminiProvider();
      default:
        return new OpenAIProvider();
    }
  }
}
