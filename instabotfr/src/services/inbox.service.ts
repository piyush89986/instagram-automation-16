import api from '../lib/axios';

export const fetchConversations = async (status: string = 'OPEN') => {
  const { data } = await api.get(`/inbox/conversations?status=${status}`);
  console.log('Conversations API Response:', data);
  return data.data.conversations;
};

export const fetchMessages = async (conversationId: string) => {
  const { data } = await api.get(`/inbox/conversations/${conversationId}/messages`);
  return data.data.messages;
};

export const toggleHumanTakeover = async (conversationId: string, humanTakeover: boolean) => {
  const { data } = await api.patch(`/inbox/conversations/${conversationId}/takeover`, { humanTakeover });
  return data.data.conversation;
};

export const sendManualMessage = async (conversationId: string, message: string) => {
  const { data } = await api.post(`/inbox/conversations/${conversationId}/messages`, { message });
  return data.data.message;
};
