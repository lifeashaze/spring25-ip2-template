import {
  AnswerResponse,
  Chat,
  ChatResponse,
  Message,
  MessageInChat,
  QuestionResponse,
  User,
} from '../types/types';
import AnswerModel from '../models/answers.model';
import QuestionModel from '../models/questions.model';
import TagModel from '../models/tags.model';
import CommentModel from '../models/comments.model';
import ChatModel from '../models/chat.model';
import UserModel from '../models/users.model';
import MessageModel from '../models/messages.model';

/**
 * Fetches and populates a question or answer document based on the provided ID and type.
 *
 * @param {string | undefined} id - The ID of the question or answer to fetch.
 * @param {'question' | 'answer'} type - Specifies whether to fetch a question or an answer.
 *
 * @returns {Promise<QuestionResponse | AnswerResponse | ChatResponse>} - Promise that resolves to the
 *          populated question or answer, or an error message if the operation fails
 */
/* eslint-disable import/prefer-default-export */
export const populateDocument = async (
  id: string | undefined,
  type: 'question' | 'answer' | 'chat',
): Promise<QuestionResponse | AnswerResponse | ChatResponse> => {
  try {
    if (!id) {
      throw new Error('Provided ID is undefined.');
    }

    let result = null;

    if (type === 'question') {
      result = await QuestionModel.findOne({ _id: id }).populate([
        {
          path: 'tags',
          model: TagModel,
        },
        {
          path: 'answers',
          model: AnswerModel,
          populate: { path: 'comments', model: CommentModel },
        },
        { path: 'comments', model: CommentModel },
      ]);
    } else if (type === 'answer') {
      result = await AnswerModel.findOne({ _id: id }).populate([
        { path: 'comments', model: CommentModel },
      ]);
    } else if (type === 'chat') {
      const chatDoc = await ChatModel.findOne({ _id: id }).populate([
        { path: 'participants', model: UserModel },
        { path: 'messages', model: MessageModel },
      ]);

      if (!chatDoc) {
        throw new Error('Chat not found');
      }

      const messagesWithUser = await Promise.all(
        chatDoc.messages.map(async (messageDoc: Message) => {
          if (!messageDoc) return null;

          let userDoc = null;
          if (messageDoc.msgFrom) {
            userDoc = await UserModel.findOne({ username: messageDoc.msgFrom });
          }

          return {
            _id: messageDoc._id!,
            msg: messageDoc.msg,
            msgFrom: messageDoc.msgFrom,
            msgDateTime: messageDoc.msgDateTime,
            type: messageDoc.type,
            user: userDoc
              ? {
                  _id: userDoc._id!,
                  username: userDoc.username,
                }
              : null,
          };
        }),
      );

      // filters out null values
      const enrichedMessages = messagesWithUser.filter(Boolean);

      const participantUsernames = (chatDoc.participants as unknown as User[]).map(
        participant => participant.username,
      );

      const transformedChat: Chat = {
        ...chatDoc.toObject(),
        participants: participantUsernames,
        messages: enrichedMessages as MessageInChat[],
      };

      return transformedChat;
    }

    if (!result) {
      throw new Error(`Failed to fetch and populate a ${type}`);
    }
    return result;
  } catch (error) {
    return { error: `Error when fetching and populating a document: ${(error as Error).message}` };
  }
};
