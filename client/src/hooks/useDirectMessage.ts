import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const selectedChatRef = useRef<Chat | null>(null);
  selectedChatRef.current = selectedChat;

  const handleJoinChat = (chatID: string) => {
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
    } catch (err) {
      setError(`Error sending message: ${err}`);
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
    } catch (err) {
      setError(`Error fetching chat: ${err}`);
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
    } catch (err) {
      setError(`Error creating chat: ${err}`);
    }
  };

  const handleChatUpdate = useCallback((chatUpdate: ChatUpdatePayload) => {
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
        if (selectedChatRef.current && selectedChatRef.current._id === chatUpdate.chat._id) {
          setSelectedChat(chatUpdate.chat);
        }
        setChats(prevChats =>
          prevChats.map(chat => (chat._id === chatUpdate.chat._id ? chatUpdate.chat : chat)),
        );
        break;
      default:
        throw new Error(`Invalid chatUpdate type: ${chatUpdate.type}`);
    }
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const userChats = await getChatsByUser(user.username);
        setChats(userChats);
      } catch (err) {
        setError(`Error fetching chats: ${err}`);
      }
    };

    fetchChats();

    socket.on('chatUpdate', handleChatUpdate);

    return () => {
      socket.off('chatUpdate', handleChatUpdate);
      if (selectedChatRef.current?._id) {
        socket.emit('leaveChat', selectedChatRef.current._id);
      }
    };
  }, [user.username, socket, handleChatUpdate]);

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
    error,
  };
};

export default useDirectMessage;
