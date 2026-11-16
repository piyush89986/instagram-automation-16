import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { Workspace } from '../../core/database/models/Workspace';

export const getKnowledgeBase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspace = await Workspace.findById(req.workspaceId);
    const kbData = [
      {
        id: req.workspaceId,
        name: 'Main Knowledge Base',
        content: workspace ? workspace.aiKnowledgeBase : ''
      }
    ];

    res.status(200).json({ status: 'success', data: kbData });
  } catch (error) {
    next(error);
  }
};

export const updateKnowledgeBase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    let workspace = await Workspace.findById(req.workspaceId);
    
    if (!workspace) {
      // Create missing workspace automatically
      workspace = new Workspace({
        _id: req.workspaceId,
        name: 'Auto Created Workspace',
        ownerId: req.user._id || req.workspaceId,
        aiKnowledgeBase: content
      });
      await workspace.save();
    } else {
      workspace.aiKnowledgeBase = content;
      await workspace.save();
    }

    res.status(200).json({ status: 'success', data: workspace.aiKnowledgeBase });
  } catch (error) {
    next(error);
  }
};
