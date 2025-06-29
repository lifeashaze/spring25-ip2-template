import mongoose, { Model } from 'mongoose';
import chatSchema from './schema/chat.schema';
import { Chat } from '../types/chat';

/**
 * Mongoose model for the `Chat` collection.
 *
 * This model is created using the `Chat` interface and the `chatSchema`, representing the
 * `Chat` collection in the MongoDB database, and provides an interface for interacting with
 * the stored chats.
 *
 * @type {Model<Chat>}
 */
const ChatModel: Model<Chat> = mongoose.model<Chat>('Chat', chatSchema);

export default ChatModel;
