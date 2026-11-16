export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export abstract class AIProvider {
  abstract generateReply(
    messages: AIMessage[],
    systemPrompt: string,
    knowledgeContext?: string,
    options?: { contactId?: string; workspaceId?: string; igAccountId?: string; senderId?: string }
  ): Promise<string>;
}
