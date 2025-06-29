import { ObjectId } from 'mongodb';
import ChatModel from '../models/chat.model';
import MessageModel from '../models/messages.model';
import UserModel from '../models/users.model';
import { Chat, ChatResponse, CreateChatPayload } from '../types/chat';
import { Message, MessageResponse } from '../types/message';
import { saveMessage } from './message.service';

/**
 * Converts an array of usernames to an array of ObjectIds.
 * @param usernames - Array of usernames to convert.
 * @returns {Promise<ObjectId[]>} - Array of ObjectIds for the users.
 * @throws {Error} - If any user is not found.
 */
const convertUsernamesToObjectIds = async (usernames: string[]): Promise<ObjectId[]> => {
  const userPromises = usernames.map(username => UserModel.findOne({ username }));
  const users = await Promise.all(userPromises);

  const participantObjectIds: ObjectId[] = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (!user) {
      throw new Error(`User not found: ${usernames[i]}`);
    }
    participantObjectIds.push(user._id);
  }
  return participantObjectIds;
};

/**
 * Creates and saves a new chat document in the database, saving messages dynamically.
 *
 * @param chat - The chat object to be saved, including full message objects.
 * @returns {Promise<ChatResponse>} - Resolves with the saved chat or an error message.
 */
export const saveChat = async (chatPayload: CreateChatPayload): Promise<ChatResponse> => {
  try {
    const messageIds: ObjectId[] = [];
    if (chatPayload.messages && chatPayload.messages.length > 0) {
      const messagePromises = chatPayload.messages.map(message => saveMessage(message));
      const savedMessages = await Promise.all(messagePromises);

      for (const savedMessage of savedMessages) {
        if ('error' in savedMessage) {
          throw new Error(savedMessage.error);
        }
        messageIds.push(savedMessage._id!);
      }
    }

    const participantObjectIds = await convertUsernamesToObjectIds(chatPayload.participants);

    const newChat = new ChatModel({
      participants: participantObjectIds,
      messages: messageIds,
    });

    const savedChat = await newChat.save();
    return savedChat;
  } catch (error) {
    return { error: `Error when saving chat: ${(error as Error).message}` };
  }
};

/**
 * Creates and saves a new message document in the database.
 * @param messageData - The message data to be created.
 * @returns {Promise<MessageResponse>} - Resolves with the created message or an error message.
 */
export const createMessage = async (messageData: Message): Promise<MessageResponse> => {
  try {
    const newMessage = new MessageModel(messageData);
    const savedMessage = await newMessage.save();
    return savedMessage;
  } catch (error) {
    return { error: `Error when creating message: ${(error as Error).message}` };
  }
};

/**
 * Adds a message ID to an existing chat.
 * @param chatId - The ID of the chat to update.
 * @param messageId - The ID of the message to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addMessageToChat = async (
  chatId: string,
  messageId: string,
): Promise<ChatResponse> => {
  try {
    const updatedChat = await ChatModel.findByIdAndUpdate(
      chatId,
      { $push: { messages: new ObjectId(messageId) } },
      { new: true },
    );

    if (!updatedChat) {
      return { error: 'Chat not found' };
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error when adding message to chat: ${(error as Error).message}` };
  }
};

/**
 * Retrieves a chat document by its ID.
 * @param chatId - The ID of the chat to retrieve.
 * @returns {Promise<ChatResponse>} - Resolves with the found chat object or an error message.
 */
export const getChat = async (chatId: string): Promise<ChatResponse> => {
  try {
    const chat = await ChatModel.findById(chatId);

    if (!chat) {
      return { error: 'Chat not found' };
    }

    return chat;
  } catch (error) {
    return { error: `Error when retrieving chat: ${(error as Error).message}` };
  }
};

/**
 * Retrieves chats that include all the provided participants.
 * @param p An array of participant usernames to match in the chat's participants.
 * @returns {Promise<Chat[]>} A promise that resolves to an array of chats where the participants match.
 * If no chats are found or an error occurs, the promise resolves to an empty array.
 */
export const getChatsByParticipants = async (p: string[]): Promise<Chat[]> => {
  try {
    const participantObjectIds = await convertUsernamesToObjectIds(p);

    const chats = await ChatModel.find({
      participants: { $all: participantObjectIds },
    });

    return chats || [];
  } catch (error) {
    return [];
  }
};

/**
 * Adds a participant to an existing chat.
 *
 * @param chatId - The ID of the chat to update.
 * @param username - The username of the user to add to the chat.
 * @returns {Promise<ChatResponse>} - Resolves with the updated chat object or an error message.
 */
export const addParticipantToChat = async (
  chatId: string,
  username: string,
): Promise<ChatResponse> => {
  try {
    const user = await UserModel.findOne({ username });
    if (!user) {
      return { error: 'User not found' };
    }

    const updatedChat = await ChatModel.findOneAndUpdate(
      {
        _id: new ObjectId(chatId),
        participants: { $ne: user._id },
      },
      { $push: { participants: user._id } },
      { new: true },
    );

    if (!updatedChat) {
      return { error: 'Chat not found or user already a participant' };
    }

    return updatedChat;
  } catch (error) {
    return { error: `Error when adding participant to chat: ${(error as Error).message}` };
  }
};
