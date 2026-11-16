import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/authMiddleware';
import { Contact } from '../../core/database/models/Contact';

export const getContacts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query: any = { workspaceId: req.workspaceId };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const contacts = await Contact.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Contact.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        contacts,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, workspaceId: req.workspaceId }).populate('tags');
    if (!contact) return next(Object.assign(new Error('Contact not found'), { statusCode: 404, isOperational: true }));
    
    res.status(200).json({ status: 'success', data: { contact } });
  } catch (error) {
    next(error);
  }
};

export const updateContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, leadScore, status, tags, customFields } = req.body;
    
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, workspaceId: req.workspaceId },
      { name, email, phone, leadScore, status, tags, customFields },
      { new: true, runValidators: true }
    );

    if (!contact) return next(Object.assign(new Error('Contact not found'), { statusCode: 404, isOperational: true }));

    res.status(200).json({ status: 'success', data: { contact } });
  } catch (error) {
    next(error);
  }
};
