import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { AutomationWorkflow } from '../../core/database/models/AutomationWorkflow';
import { AppError } from '../../core/middlewares/errorHandler';

export const getWorkflows = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workflows = await AutomationWorkflow.find({ workspaceId: req.workspaceId });
    res.status(200).json({ status: 'success', data: { workflows } });
  } catch (error: any) {
    next(error);
  }
};

export const getWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workflow = await AutomationWorkflow.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!workflow) return next(Object.assign(new Error('Workflow not found'), { statusCode: 404, isOperational: true }));
    res.status(200).json({ status: 'success', data: { workflow } });
  } catch (error: any) {
    next(error);
  }
};

export const createWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, triggerType, triggerConfig, nodesGraph, edgesGraph } = req.body;
    
    const workflow = await AutomationWorkflow.create({
      workspaceId: req.workspaceId,
      name,
      triggerType,
      triggerConfig,
      nodesGraph: nodesGraph || [],
      edgesGraph: edgesGraph || [],
      isActive: false
    });

    res.status(201).json({ status: 'success', data: { workflow } });
  } catch (error: any) {
    next(error);
  }
};

export const updateWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, triggerType, triggerConfig, nodesGraph, edgesGraph, isActive } = req.body;
    
    const workflow = await AutomationWorkflow.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      { name, triggerType, triggerConfig, nodesGraph, edgesGraph, isActive },
      { new: true, runValidators: true }
    );

    if (!workflow) return next(Object.assign(new Error('Workflow not found'), { statusCode: 404, isOperational: true }));

    res.status(200).json({ status: 'success', data: { workflow } });
  } catch (error: any) {
    next(error);
  }
};

export const deleteWorkflow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workflow = await AutomationWorkflow.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!workflow) return next(Object.assign(new Error('Workflow not found'), { statusCode: 404, isOperational: true }));
    res.status(204).send();
  } catch (error: any) {
    next(error);
  }
};
