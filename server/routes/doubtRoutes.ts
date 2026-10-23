import { Router, Request, Response } from 'express';
import { DoubtModel } from '../models/Doubt.js';
import { db } from '../db.js';

export const doubtRouter = Router();

// GET /api/doubts
doubtRouter.get('/', async (_req: Request, res: Response) => {
  try {
    try {
      const doubts = await DoubtModel.find().sort({ createdAt: -1 });
      if (doubts && doubts.length > 0) return res.json(doubts);
    } catch {
      // MongoDB query failed, fall back to persistent local store
    }
    return res.json(db.getDoubts());
  } catch (error) {
    console.error('Error fetching doubts:', error);
    return res.json(db.getDoubts());
  }
});

// POST /api/doubts (Ask new doubt)
doubtRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, codeSnippet, branch, subject, authorName, authorRole, authorRollNo, tags } = req.body;
    if (!title || !description || !subject) {
      return res.status(400).json({ error: 'Title, description, and subject are required' });
    }

    const doubtData = {
      id: `d-${Date.now()}`,
      title,
      description,
      codeSnippet,
      branch: branch || 'Computer Science & Engg',
      subject,
      authorName: authorName || 'Student',
      authorRole: authorRole || 'student',
      authorRollNo: authorRollNo || '24CS000',
      tags: tags || [subject, 'Doubt'],
      date: new Date().toISOString().split('T')[0],
      upvotes: 0,
      solved: false,
      replies: [],
    };

    let doc: any = null;
    try {
      doc = await DoubtModel.create(doubtData);
    } catch {
      // MongoDB unavailable — fall through to local store
    }
    const localDoubt = db.postDoubt(doubtData);
    return res.status(201).json(doc || localDoubt);
  } catch (error) {
    console.error('Error creating doubt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/doubts/:id/replies (Reply to doubt)
doubtRouter.post('/:id/replies', async (req: Request, res: Response) => {
  try {
    const { authorName, authorRole, authorRollNo, content, codeSnippet } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const isSenior = authorRole === 'senior' || authorRole === 'admin';
    const reply = {
      id: `rep-${Date.now()}`,
      authorName: authorName || 'Peer Scholar',
      authorRole: authorRole || 'student',
      authorRollNo: authorRollNo || '24CS000',
      content,
      codeSnippet,
      date: new Date().toISOString().split('T')[0],
      isSeniorVerified: isSenior,
      upvotes: 0,
    };

    const updateQuery: Record<string, any> = {
      $push: { replies: reply },
    };
    if (isSenior) {
      updateQuery.$set = { solved: true };
    }

    let saved = false;
    try {
      const updated = await DoubtModel.findOneAndUpdate(
        { id: req.params.id },
        updateQuery,
        { new: true }
      );
      if (updated) saved = true;
    } catch {
      // fallback to local store
    }

    if (!saved) {
      const localReply = db.replyToDoubt(req.params.id, reply);
      if (!localReply) {
        return res.status(404).json({ error: 'Doubt not found' });
      }
    }

    return res.status(201).json(reply);
  } catch (error) {
    console.error('Error posting doubt reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

    const reply = doubt.replies.find(r => r.id === replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    reply.isSeniorVerified = true;
    doubt.solved = true;
    await doubt.save();

    return res.json({ success: true, message: 'Solution marked as Senior Verified' });
  } catch (error) {
    console.error('Error verifying reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/doubts/:id
doubtRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    try {
      await DoubtModel.findOneAndDelete({ id: req.params.id });
    } catch {
      // fallback
    }
    db.removeDoubt(req.params.id);
    return res.json({ success: true, message: 'Doubt removed' });
  } catch (error) {
    console.error('Error deleting doubt:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    const replyIndex = doubt.replies.findIndex(r => r.id === replyId);
    if (replyIndex === -1) {
      return res.status(404).json({ error: 'Reply not found' });
    }
    doubt.replies.splice(replyIndex, 1);
    await doubt.save();
    return res.json({ success: true, message: 'Reply removed' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/doubts/:id/upvote
doubtRouter.post('/:id/upvote', async (req: Request, res: Response) => {
  try {
    let upvotes: number | null = null;
    try {
      const updated = await DoubtModel.findOneAndUpdate(
        { id: req.params.id },
        { $inc: { upvotes: 1 } },
        { new: true }
      );
      if (updated) upvotes = updated.upvotes;
    } catch {
      // fallback
    }
    if (upvotes === null) {
      upvotes = db.upvoteDoubt(req.params.id);
    }
    if (upvotes === null) {
      return res.status(404).json({ error: 'Doubt not found' });
    }
    return res.json({ upvotes });
  } catch (error) {
    console.error('Error upvoting doubt:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/doubts/:id/replies/:replyId/upvote
doubtRouter.post('/:id/replies/:replyId/upvote', async (req: Request, res: Response) => {
  try {
    const { id, replyId } = req.params;
    let upvotes: number | null = null;
    try {
      const doubt = await DoubtModel.findOne({ id });
      if (doubt) {
        const reply = doubt.replies.find(r => r.id === replyId);
        if (reply) {
          reply.upvotes += 1;
          await doubt.save();
          upvotes = reply.upvotes;
        }
      }
    } catch {
      // fallback
    }
    if (upvotes === null) {
      upvotes = db.upvoteReply(id, replyId);
    }
    if (upvotes === null) {
      return res.status(404).json({ error: 'Doubt or reply not found' });
    }
    return res.json({ upvotes });
  } catch (error) {
    console.error('Error upvoting reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
