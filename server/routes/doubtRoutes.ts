import { Router, Request, Response } from 'express';
import { DoubtModel } from '../models/Doubt.js';

export const doubtRouter = Router();

// GET /api/doubts

doubtRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const doubts = await DoubtModel.find().sort({ createdAt: -1 });
    return res.json(doubts);
  } catch (error) {
    console.error('Error fetching doubts from MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to fetch doubts from the database',
    });
  }
});

// POST /api/doubts (Ask new doubt)

doubtRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      codeSnippet,
      branch,
      subject,
      authorName,
      authorRole,
      authorRollNo,
      tags,
    } = req.body;

    if (!title || !description || !subject) {
      return res.status(400).json({
        error: 'Title, description, and subject are required',
      });
    }

    const doubtData = {
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      description,
      codeSnippet,
      branch: branch || 'Computer Science & Engg',
      subject,
      authorName: authorName || 'Student',
      authorRole: authorRole || 'student',
      authorRollNo: authorRollNo || '24CS000',
      tags: Array.isArray(tags) ? tags : [subject, 'Doubt'],
      date: new Date().toISOString().split('T')[0],
      upvotes: 0,
      solved: false,
      replies: [],
    };

    const savedDoubt = await DoubtModel.create(doubtData);
    return res.status(201).json(savedDoubt);
  } catch (error) {
    console.error('Error creating doubt in MongoDB:', error);
    return res.status(500).json({
      error: 'Failed to save doubt to the database',
    });
  }
});

// POST /api/doubts/:id/replies (Reply to doubt)

doubtRouter.post('/:id/replies', async (req: Request, res: Response) => {
  try {
    const { authorName, authorRole, authorRollNo, content, codeSnippet } = req.body;

    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const isSenior = authorRole === 'senior' || authorRole === 'admin';

    const reply = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorName: authorName || 'Peer Scholar',
      authorRole: authorRole || 'student',
      authorRollNo: authorRollNo || '24CS000',
      content: content.trim(),
      codeSnippet,
      date: new Date().toISOString().split('T')[0],
      isSeniorVerified: isSenior,
      upvotes: 0,
    };

    const update: Record<string, any> = {
      $push: { replies: reply },
    };

    if (isSenior) {
      update.$set = { solved: true };
    }

    const updatedDoubt = await DoubtModel.findOneAndUpdate(
      { id: req.params.id },
      update,
      { new: true, runValidators: true }
    );

    if (!updatedDoubt) {
      return res.status(404).json({ error: 'Doubt not found' });
    }

    return res.status(201).json(reply);
  } catch (error) {
    console.error('Error saving doubt reply:', error);
    return res.status(500).json({
      error: 'Failed to save reply to the database',
    });
  }
});

// PUT /api/doubts/:id/replies/:replyId/verify (Senior verification)

doubtRouter.put('/:id/replies/:replyId/verify', async (req: Request, res: Response) => {
  try {
    const { id, replyId } = req.params;
    const doubt = await DoubtModel.findOne({ id });

    if (!doubt) {
      return res.status(404).json({ error: 'Doubt not found' });
    }

    const reply = doubt.replies.find((item) => item.id === replyId);

    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    reply.isSeniorVerified = true;
    doubt.solved = true;

    await doubt.save();

    return res.json({
      success: true,
      message: 'Solution marked as Senior Verified',
    });
  } catch (error) {
    console.error('Error verifying doubt reply:', error);
    return res.status(500).json({
      error: 'Failed to verify reply in the database',
    });
  }
});


// DELETE /api/doubts/:id

doubtRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await DoubtModel.findOneAndDelete({
      id: req.params.id,
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Doubt not found' });
    }

    return res.json({ success: true, message: 'Doubt removed' });
  } catch (error) {
    console.error('Error deleting doubt:', error);
    return res.status(500).json({
      error: 'Failed to delete doubt from the database',
    });
  }
});


// DELETE /api/doubts/:id/replies/:replyId

doubtRouter.delete('/:id/replies/:replyId', async (req: Request, res: Response) => {
  try {
    const { id, replyId } = req.params;
    const doubt = await DoubtModel.findOne({ id });

    if (!doubt) {
      return res.status(404).json({ error: 'Doubt not found' });
    }

    const replyIndex = doubt.replies.findIndex(
      (item) => item.id === replyId
    );

    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    doubt.replies.splice(replyIndex, 1);
    await doubt.save();

    return res.json({ success: true, message: 'Reply removed' });
  } catch (error) {
    console.error('Error deleting doubt reply:', error);
    return res.status(500).json({
      error: 'Failed to delete reply from the database',
    });
  }
});


// POST /api/doubts/:id/upvote

doubtRouter.post('/:id/upvote', async (req: Request, res: Response) => {
  try {
    const updated = await DoubtModel.findOneAndUpdate(
      { id: req.params.id },
      { $inc: { upvotes: 1 } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Doubt not found' });
    }

    return res.json({ upvotes: updated.upvotes });
  } catch (error) {
    console.error('Error upvoting doubt:', error);
    return res.status(500).json({
      error: 'Failed to save doubt upvote',
    });
  }
});


// POST /api/doubts/:id/replies/:replyId/upvote

doubtRouter.post('/:id/replies/:replyId/upvote', async (req: Request, res: Response) => {
  try {
    const { id, replyId } = req.params;
    const doubt = await DoubtModel.findOne({ id });

    if (!doubt) {
      return res.status(404).json({
        error: 'Doubt not found',
      });
    }

    const reply = doubt.replies.find((item) => item.id === replyId);

    if (!reply) {
      return res.status(404).json({
        error: 'Reply not found',
      });
    }

    reply.upvotes += 1;
    await doubt.save();

    return res.json({ upvotes: reply.upvotes });
  } catch (error) {
    console.error('Error upvoting doubt reply:', error);
    return res.status(500).json({
      error: 'Failed to save reply upvote',
    });
  }
});
