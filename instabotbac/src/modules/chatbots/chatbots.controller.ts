import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { Chatbot } from '../../core/database/models/Chatbot';

export const getChatbots = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatbots = await Chatbot.find({ tenantId: req.workspaceId });
    res.status(200).json({ status: 'success', data: chatbots });
  } catch (error) {
    next(error);
  }
};

export const getChatbotById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatbot = await Chatbot.findOne({ _id: req.params.id, tenantId: req.workspaceId });
    if (!chatbot) return next(new Error('Chatbot not found'));
    res.status(200).json({ status: 'success', data: chatbot });
  } catch (error) {
    next(error);
  }
};

export const createChatbot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const newChatbot = await Chatbot.create({
      ...req.body,
      tenantId: req.workspaceId
    });
    res.status(201).json({ status: 'success', data: newChatbot });
  } catch (error) {
    next(error);
  }
};

export const updateChatbot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatbot = await Chatbot.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.workspaceId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!chatbot) return next(new Error('Chatbot not found'));
    res.status(200).json({ status: 'success', data: chatbot });
  } catch (error) {
    next(error);
  }
};

export const deleteChatbot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chatbot = await Chatbot.findOneAndDelete({ _id: req.params.id, tenantId: req.workspaceId });
    if (!chatbot) return next(new Error('Chatbot not found'));
    res.status(200).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
