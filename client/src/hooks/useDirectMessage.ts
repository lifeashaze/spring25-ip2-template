import { useEffect, useState } from 'react';
import { Chat, ChatUpdatePayload, Message, User } from '../types';
import useUserContext from './useUserContext';
import { createChat, getChatById, getChatsByUser, sendMessage } from '../services/chatService';

/**
 * useDirectMessage is a custom hook that provides state and functions for direct messaging between users.
 * It includes a selected user, messages, and a new message state.
 */

const useDirectMessage = () => {
  const { user, socket } = useUserContext();
  const [showCreatePanel, setShowCreatePanel] = useState<boolean>(false);
  const [chatToCreate, setChatToCreate] = useState<string>('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const handleJoinChat = (chatID: string) => {
    // TODO: Task 3 - Emit a 'joinChat' event to the socket with the chat ID function argument.
    socket.emit('joinChat', chatID);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat?._id) {
      return;
    }

    try {
      const messageData: Omit<Message, 'type'> = {
        msg: newMessage,
        msgFrom: user.username,
        msgDateTime: new Date(),
      };

      await sendMessage(messageData, selectedChat._id);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleChatSelect = async (chatID: string | undefined) => {

    if (!chatID) {
      return;
    }

    try {
      const chat = await getChatById(chatID);
      setSelectedChat(chat);
      handleJoinChat(chatID);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  const handleUserSelect = (selectedUser: User) => {
    setChatToCreate(selectedUser.username);
  };

  const handleCreateChat = async () => {
    if (!chatToCreate) {
      return;
    }

    try {
      const newChat = await createChat([user.username, chatToCreate]);
      setSelectedChat(newChat);
      handleJoinChat(newChat._id!);
      setShowCreatePanel(false);
      setChatToCreate('');
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const userChats = await getChatsByUser(user.username);
        setChats(userChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    const handleChatUpdate = (chatUpdate: ChatUpdatePayload) => {

      switch (chatUpdate.type) {
        case 'created':
          setChats(prevChats => {
            const chatExists = prevChats.some(chat => chat._id === chatUpdate.chat._id);
            if (chatExists) {
              return prevChats;
            }
            return [...prevChats, chatUpdate.chat];
          });
          break;
        case 'newMessage':
          if (selectedChat && selectedChat._id === chatUpdate.chat._id) {
            setSelectedChat(chatUpdate.chat);
          }
          setChats(prevChats =>
            prevChats.map(chat => (chat._id === chatUpdate.chat._id ? chatUpdate.chat : chat)),
          );
          break;
        default:
          throw new Error(`Invalid chatUpdate type: ${chatUpdate.type}`);
      }
    };

    fetchChats();

    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
      if (selectedChat?._id) {
        socket.emit('leaveChat', selectedChat._id);
      }
    };
  }, [user.username, socket, selectedChat?._id]);

  return {
    selectedChat,
    chatToCreate,
    chats,
    newMessage,
    setNewMessage,
    showCreatePanel,
    setShowCreatePanel,
    handleSendMessage,
    handleChatSelect,
    handleUserSelect,
    handleCreateChat,
  };
};

export default useDirectMessage;
