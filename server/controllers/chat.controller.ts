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
    // TODO: Task 3 - Implement the createChatRoute function
    // Emit a `chatUpdate` event to share the creation of a new chat
    res.status(501).send('Not implemented');
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
    // TODO: Task 3 - Implement the addMessageToChatRoute function
    // Emit a `chatUpdate` event to share the updated chat, specifically to
    // the chat room where the message was added (hint: look into socket rooms)
    // NOTE: Make sure to define the message type to be a direct message when creating it.
    res.status(501).send('Not implemented');
  };

  /**
   * Retrieves a chat by its ID, optionally populating participants and messages.
   * @param req The request object containing the chat ID.
   * @param res The response object to send the result.
   * @returns {Promise<void>} A promise that resolves when the chat is retrieved.
   * @throws {Error} Throws an error if the chat retrieval fails.
   */
  const getChatRoute = async (req: ChatIdRequest, res: Response): Promise<void> => {
    // TODO: Task 3 - Implement the getChatRoute function
    res.status(501).send('Not implemented');
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
    // TODO: Task 3 - Implement the getChatsByUserRoute function
    res.status(501).send('Not implemented');
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
    // TODO: Task 3 - Implement the addParticipantToChatRoute function
    res.status(501).send('Not implemented');
  };

  socket.on('connection', conn => {
    // TODO: Task 3 - Implement the `joinChat` event listener on `conn`
    // The socket room will be defined to have the chat ID as the room name
    // TODO: Task 3 - Implement the `leaveChat` event listener on `conn`
    // You should only leave the chat if the chat ID is provided/defined
  });

  // Register the routes
  // TODO: Task 3 - Add appropriate HTTP verbs and endpoints to the router

  return router;
};

export default chatController;
