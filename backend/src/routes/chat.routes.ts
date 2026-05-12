import { Router } from 'express';
import { handleChatMessage } from '../controllers/chat.controller';

export const chatRouter = Router();

chatRouter.post('/message', handleChatMessage);
