import { Router, Request, Response } from 'express';
import fs from 'fs';
import { retrieveSkillBridgeContext } from '../services/ragService.js';
import { ChatTurn, generateGeminiResponse, generateSkillBridgeAIResponse } from '../services/geminiService.js';
import { verifyAuthToken } from '../services/authToken.js';
import { ChatMessageModel } from '../models/ChatMessage.js';
import { uploadChatFile, getSecureChatFilePath } from '../services/uploadService.js';

export const chatRouter = Router();
const conversations = new Map<string, ChatTurn[]>();
const MAX_TURNS = 20;

// ── AI Chatbot Endpoints ──

chatRouter.post('/', async (req: Request, res: Response) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const conversationId = typeof req.body?.conversationId === 'string' && req.body.conversationId.trim()
    ? req.body.conversationId.trim()
    : `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  if (message.length > 8000) return res.status(413).json({ error: 'Message is too long' });

  const token = typeof req.headers.authorization === 'string' ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '';
  const auth = token ? verifyAuthToken(token) : null;
  const history = conversations.get(conversationId) || [];

  try {
    const context = await retrieveSkillBridgeContext(message, auth?.userId).catch(() => '');
    const answer = await generateGeminiResponse(message, history, context);
    const nextHistory = [...history, { role: 'user' as const, text: message }, { role: 'model' as const, text: answer }].slice(-MAX_TURNS);
    conversations.set(conversationId, nextHistory);
    return res.json({ message: answer, conversationId });
  } catch (error) {
    console.warn('[Chat:fallback] Providing SkillBridge AI response:', error instanceof Error ? error.message : error);
    const fallbackAnswer = generateSkillBridgeAIResponse(message, history, '');
    const nextHistory = [...history, { role: 'user' as const, text: message }, { role: 'model' as const, text: fallbackAnswer }].slice(-MAX_TURNS);
    conversations.set(conversationId, nextHistory);
    return res.json({ message: fallbackAnswer, conversationId });
  }
});

chatRouter.delete('/:conversationId', (req: Request, res: Response) => {
  conversations.delete(req.params.conversationId);
  return res.json({ success: true });
});

// ── Campus Community Chat Endpoints ──

// Seed messages for initial room populating if empty
const INITIAL_ROOM_SEEDS: Record<string, any[]> = {
  general: [
    {
      id: 'msg-seed-1',
      roomId: 'general',
      senderId: 'u-2',
      senderName: 'Priya Mukherjee (Senior)',
      senderRole: 'senior',
      senderYear: '3rd Year (Senior)',
      text: 'Hey freshers! Welcome to SkillBridge campus chat! Feel free to ask questions or share study resources here.',
      attachments: [],
      reactions: { '👏': ['u-1'], '❤️': ['u-2'] },
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'msg-seed-2',
      roomId: 'general',
      senderId: 'u-1',
      senderName: 'Aarav Sharma',
      senderRole: 'student',
      senderYear: '1st Year (Fresher)',
      text: 'Thanks! Where can we find the CSE Sem 3 Data Structures notes?',
      attachments: [],
      reactions: { '👍': ['u-2'] },
      createdAt: new Date(Date.now() - 1800000),
    },
    {
      id: 'msg-seed-3',
      roomId: 'general',
      senderId: 'u-2',
      senderName: 'Priya Mukherjee (Senior)',
      senderRole: 'senior',
      senderYear: '3rd Year (Senior)',
      text: 'Check the Branch Hub (CSE) section in the top menu! I also uploaded past year PYQs there.',
      attachments: [],
      reactions: { '🔥': ['u-1'] },
      createdAt: new Date(Date.now() - 900000),
    },
  ],
};

const roomMessagesStore: Record<string, any[]> = { ...INITIAL_ROOM_SEEDS };
/**
 * GET /api/chat/community/rooms/:roomId/messages
 * Retrieves stored messages for a chat room.
 */

chatRouter.get('/community/rooms/:roomId/messages', async (req: Request, res: Response) => {
  const { roomId } = req.params;

  try {
    let messages = await ChatMessageModel.find({ roomId })
      .sort({ createdAt: 1 })
      .lean();

    // Seed initial messages only when this room is empty.
    if (messages.length === 0 && INITIAL_ROOM_SEEDS[roomId]) {
      try {
        await ChatMessageModel.insertMany(INITIAL_ROOM_SEEDS[roomId], {
          ordered: false,
        });
      } catch (seedError) {
        // A concurrent request may have inserted the seed messages already.
        console.warn('Chat seed insertion warning:', seedError);
      }

      messages = await ChatMessageModel.find({ roomId })
        .sort({ createdAt: 1 })
        .lean();
    }

    return res.json(messages);
  } catch (error) {
    console.error('Failed to fetch Campus Chat messages:', error);
    return res.status(500).json({
      error: 'Failed to load chat messages from the database',
    });
  }
});

/**
 * POST /api/chat/community/rooms/:roomId/messages
 * Posts a new message to a chat room.
 */

chatRouter.post('/community/rooms/:roomId/messages', async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const {
    senderId,
    senderName,
    senderRole,
    senderYear,
    text,
    attachments,
  } = req.body;

  const messageText = typeof text === 'string' ? text : '';
  const messageAttachments = Array.isArray(attachments) ? attachments : [];

  if (!messageText.trim() && messageAttachments.length === 0) {
    return res.status(400).json({
      error: 'Message content or attachment is required',
    });
  }

  const newMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    roomId,
    senderId: senderId || 'u-guest',
    senderName: senderName || 'Anonymous Student',
    senderRole: senderRole || 'student',
    senderYear: senderYear || '1st Year',
    text: messageText,
    attachments: messageAttachments,
    reactions: {},
    createdAt: new Date(),
  };

  try {
    // Save to MongoDB before returning success.
    const savedMessage = await ChatMessageModel.create(newMessage);

    return res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Failed to save Campus Chat message:', error);

    return res.status(500).json({
      error: 'Message could not be saved. Please try again.',
    });
  }
});

/**
 * POST /api/chat/community/messages/:messageId/react
 * Toggles an emoji reaction on a message.
 */
chatRouter.post('/community/messages/:messageId/react', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { emoji, userId } = req.body;

  if (!emoji || !userId) {
    return res.status(400).json({ error: 'Emoji and userId are required' });
  }

  try {
    const msg = await ChatMessageModel.findOne({ id: messageId });
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    const currentReactions: Record<string, string[]> = msg.reactions || {};
    const userList: string[] = currentReactions[emoji] || [];

    if (userList.includes(userId)) {
      // Toggle off
      currentReactions[emoji] = userList.filter((id) => id !== userId);
      if (currentReactions[emoji].length === 0) {
        delete currentReactions[emoji];
      }
    } else {
      // Toggle on
      currentReactions[emoji] = [...userList, userId];
    }

    msg.reactions = currentReactions;
    msg.markModified('reactions');
    await msg.save();

    return res.json(msg);
  } catch (error) {
    console.error('Error reacting to message:', error);
    return res.status(500).json({ error: 'Failed to update reaction' });
  }
});

/**
 * POST /api/chat/community/upload
 * Handles chat file attachment uploads (images, PDFs, documents, audio, video).
 */
chatRouter.post('/community/upload', uploadChatFile.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const mime = req.file.mimetype;
  let type: 'image' | 'video' | 'pdf' | 'doc' | 'audio' | 'other' = 'other';
  if (mime.startsWith('image/')) type = 'image';
  else if (mime.startsWith('video/')) type = 'video';
  else if (mime.startsWith('audio/')) type = 'audio';
  else if (mime === 'application/pdf') type = 'pdf';
  else if (mime.includes('word') || mime.includes('document') || mime.includes('excel') || mime.includes('powerpoint')) type = 'doc';

  const attachment = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: req.file.originalname,
    type,
    url: `/api/chat/community/files/${req.file.filename}`,
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  return res.json(attachment);
});

/**
 * GET /api/chat/community/files/:filename
 * Securely streams uploaded chat attachments.
 */
chatRouter.get('/community/files/:filename', (req: Request, res: Response) => {
  try {
    const filePath = getSecureChatFilePath(req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    return res.sendFile(filePath);
  } catch {
    return res.status(403).json({ error: 'Access denied' });
  }
});
