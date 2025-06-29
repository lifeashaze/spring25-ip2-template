import express, { Response } from 'express';
import {
  saveChat,
  createMessage,
  addMessageToChat,
  getChat,
  addParticipantToChat,
  getChatsByParticipants,
} from '../services/chat.service';
import { populateDocument } from '../utils/database.util';
import {
  CreateChatRequest,
  AddMessageRequestToChat,
  AddParticipantRequest,
  ChatIdRequest,
  GetChatByParticipantsRequest,
} from '../types/chat';
import { FakeSOSocket } from '../types/socket';

/*
 * This controller handles chat-related routes.
 * @param socket The socket instance to emit events.
 * @returns {express.Router} The router object containing the chat routes.
 * @throws {Error} Throws an error if the chat creation fails.
 */
const chatController = (socket: FakeSOSocket) => {
  const router = express.Router();

  /**
   * Validates that the request body contains all required fields for a chat.
   * @param req The incoming request containing chat data.
   * @returns `true` if the body contains valid chat fields; otherwise, `false`.
   */
  const isCreateChatRequestValid = (req: CreateChatRequest): boolean => {
    const { participants } = req.body;

    if (!participants) {
      return false;
    }

    if (!Array.isArray(participants)) {
      return false;
    }

    if (participants.length === 0) {
      return false;
    }

    return true;
  };

  /**
   * Validates that the request body contains all required fields for a message.
   * @param req The incoming request containing message data.
   * @returns `true` if the body contains valid message fields; otherwise, `false`.
   */
  const isAddMessageRequestValid = (req: AddMessageRequestToChat): boolean => {
    const { chatId } = req.params;
    const { msg, msgFrom } = req.body;

    if (!chatId) {
      return false;
    }

    if (!msg) {
      return false;
    }

    if (!msgFrom) {
      return false;
    }

    return true;
  };

  /**
   * Validates that the request body contains all required fields for a participant.
   * @param req The incoming request containing participant data.
   * @returns `true` if the body contains valid participant fields; otherwise, `false`.
   */
  const isAddParticipantRequestValid = (req: AddParticipantRequest): boolean => {
    const { chatId } = req.params;
    const { username } = req.body;

    if (!chatId) {
      return false;
    }

    if (!username) {
      return false;
    }

    return true;
  };

  /**
   * Creates a new chat with the given participants (and optional initial messages).
   * @param req The request object containing the chat data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is created.
   * @throws {Error} Throws an error if the chat creation fails.
   */
  const createChatRoute = async (req: CreateChatRequest, res: Response): Promise<void> => {
    if (!isCreateChatRequestValid(req)) {
      res.status(400).send('Invalid chat creation request');
      return;
    }

    const { participants, messages } = req.body;
    const formattedMessages = messages
      ? messages.map(m => ({ ...m, type: 'direct' as 'direct' | 'global' }))
      : [];

    try {
      const savedChat = await saveChat({ participants, messages: formattedMessages });
      if ('error' in savedChat) {
        throw new Error(savedChat.error);
      }

      const populatedChat = await populateDocument(savedChat._id.toString(), 'chat');
      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      socket.emit('chatUpdate', { chat: populatedChat, type: 'created' });
      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error creating a chat: ${(err as Error).message}`);
    }
  };

  /**
   * Adds a new message to an existing chat.
   * @param req The request object containing the message data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the message is added.
   * @throws {Error} Throws an error if the message addition fails.
   */
  const addMessageToChatRoute = async (
    req: AddMessageRequestToChat,
    res: Response,
  ): Promise<void> => {
    if (!isAddMessageRequestValid(req)) {
      res.status(400).send('Invalid message request');
      return;
    }

    const { chatId } = req.params;
    const { msg, msgFrom, msgDateTime } = req.body;

    try {
      const messageData = {
        msg,
        msgFrom,
        msgDateTime: msgDateTime || new Date(),
        type: 'direct' as const,
      };
      const createdMessage = await createMessage(messageData);

      if ('error' in createdMessage) {
        throw new Error(createdMessage.error);
      }

      const chatWithNewMessage = await addMessageToChat(
        chatId,
        createdMessage._id?.toString() || '',
      );

      if ('error' in chatWithNewMessage) {
        throw new Error(chatWithNewMessage.error);
      }

      const enrichedChat = await populateDocument(chatId, 'chat');

      if ('error' in enrichedChat) {
        throw new Error(enrichedChat.error);
      }

      socket.to(chatId).emit('chatUpdate', { chat: enrichedChat, type: 'newMessage' });
      res.json(enrichedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error adding message to chat: ${(err as Error).message}`);
    }
  };
  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    const { chatId } = req.params;

    try {
      const foundChat = await getChat(chatId);

      if ('error' in foundChat) {
        throw new Error(foundChat.error);
      }

      const populatedChat = await populateDocument(foundChat._id.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving chat: ${(err as Error).message}`);
    }
  };

  /**
   * Retrieves chats for a user based on their username.
   * @param req The request object containing the username parameter in `req.params`.
   * @param res The response object to send the result, either the populated chats or an error message.
   * @returns {Promise<void>} A promise that resolves when the chats are successfully retrieved and populated.
   */
  const getChatsByUserRoute = async (
    req: GetChatByParticipantsRequest,
    res: Response,
  ): Promise<void> => {
    const { username } = req.params;

    try {
      const chats = await getChatsByParticipants([username]);

      const populatedChats = await Promise.all(
        chats.map(chat => populateDocument(chat._id.toString(), 'chat')),
      );

      if (populatedChats.some(chat => 'error' in chat)) {
        throw new Error('Failed populating all retrieved chats');
      }

      res.json(populatedChats);
    } catch (err: unknown) {
      res.status(500).send(`Error retrieving chat: ${(err as Error).message}`);
    }
  };
  /**
   * Adds a participant to an existing chat.
   * @param req The request object containing the participant data.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the participant is added.
   * @throws {Error} Throws an error if the participant addition fails.
   */
  const addParticipantToChatRoute = async (
    req: AddParticipantRequest,
    res: Response,
  ): Promise<void> => {
    if (!isAddParticipantRequestValid(req)) {
      res.status(400).send('Invalid participant request');
      return;
    }

    const { chatId } = req.params;
    const { username } = req.body;

    try {
      const updatedChat = await addParticipantToChat(chatId, username);

      if ('error' in updatedChat) {
        throw new Error(updatedChat.error);
      }

      const populatedChat = await populateDocument(updatedChat._id.toString(), 'chat');

      if ('error' in populatedChat) {
        throw new Error(populatedChat.error);
      }

      socket.emit('chatUpdate', {
        chat: populatedChat,
        type: 'newParticipant',
      });
      res.json(populatedChat);
    } catch (err: unknown) {
      res.status(500).send(`Error adding participant to chat: ${(err as Error).message}`);
    }
  };

  socket.on('connection', conn => {
    conn.on('joinChat', (chatID: string) => {
      conn.join(chatID);
    });

    conn.on('leaveChat', (chatID: string | undefined) => {
      if (chatID) {
        conn.leave(chatID);
      }
    });
  });

  // Register the routes
  router.get('/getChatsByUser/:username', getChatsByUserRoute);
  router.get('/:chatId', getChatRoute);
  router.post('/createChat', createChatRoute);
  router.post('/:chatId/addMessage', addMessageToChatRoute);
  router.post('/:chatId/addParticipant', addParticipantToChatRoute);

  return router;
};

export default chatController;
