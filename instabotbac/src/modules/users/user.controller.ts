import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { Workspace } from '../../core/database/models/Workspace';

export const getMe = async (req: AuthRequest, res: Response) => {
  // req.user is populated by the authMiddleware (protect)
  // We should remove passwordHash before sending
  const userObj = req.user.toObject();
  delete userObj.passwordHash;

  const workspace = await Workspace.findOne({ ownerId: req.user._id, isActive: true });

  res.status(200).json({
    status: 'success',
    data: {
      user: userObj,
      workspace
    }
  });
};

export const updateKnowledgeBase = async (req: AuthRequest, res: Response) => {
  try {
    const { aiKnowledgeBase } = req.body;
    
    if (typeof aiKnowledgeBase !== 'string') {
      return res.status(400).json({ status: 'error', message: 'aiKnowledgeBase must be a string' });
    }

    const workspace = await Workspace.findOneAndUpdate(
      { ownerId: req.user._id, isActive: true },
      { $set: { aiKnowledgeBase } },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ status: 'error', message: 'Workspace not found' });
    }

    // Automatically create/activate the AI workflow whenever they save the KB
    const { AutomationWorkflow } = await import('../../core/database/models/AutomationWorkflow');
    await AutomationWorkflow.findOneAndUpdate(
      { workspaceId: workspace._id, triggerType: 'DM_RECEIVED' },
      {
        name: 'Default AI Responder',
        isActive: true,
        nodesGraph: [
          { type: 'trigger', id: 'node-1' },
          { 
            type: 'ai_response', 
            id: 'node-2', 
            data: { 
              provider: 'OPENAI', 
              prompt: 'You are the primary AI sales assistant. Always use the provided GLOBAL KNOWLEDGE BASE to answer questions.' 
            } 
          }
        ],
        edgesGraph: [
          { source: 'node-1', target: 'node-2' }
        ]
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        workspace
      }
    });
  } catch (error: any) {
    console.error('Update KnowledgeBase Error:', error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};
