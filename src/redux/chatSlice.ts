// redux/chatSlice.ts
import ChatRepository from '@/lib/class/ChatRepository';
import ChatSystem from '@/lib/class/chatSystem';
import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { createAsyncThunk, createSlice, Dispatch } from '@reduxjs/toolkit';

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

export interface ConvoType {
  id: number;
  type: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  displayPicture: string
}

const settings = {
  _id: {
    oid: ""
  },
  chatId: {
    oid: ""
  },
  isMuted: false,
  isPinned: false,
  isArchived: false,
  notificationSound: "",
  notificationVolume: 0,
  wallpaper: "",
  theme: "light",
  isPrivate: false,
  inviteLink: "",
  members: [],
  adminIds: [],
  isBlocked: false,
  lastSeen: ""
}
const Time = async (params: string | Date ) => {
  const dateObj = new Date(params);
  
  // Define options for formatting the date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  };
  
  // Format the Date object to the desired format
  const formattedDateStr = dateObj.toLocaleString('en-US', options);
  
  // Print the result
  return formattedDateStr;
}


const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [] as unknown as ConvoType[],
    messages: [] as unknown as MessageAttributes[],
    settings: settings,
    loading: false,
    error: 'hidden',
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      state.conversations.push(action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessages: (state, action) => {
      state.messages.push(action.payload);
    },
    setSettings: (state, action) => {
      state.loading = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  },
});

export const { setConversations, addConversation, setMessages, addMessages, setSettings, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;

// Fetch chats on app load
export const fetchChats = async ( dispatch: Dispatch ) => {
  try {
    dispatch(setLoading(true));
    const chats = await chatSystem.getAllChats();

    function filter(param: string) {
      const filteredResults = chats.messages.filter((msg: MessageAttributes) => msg._id === param );
      if(filteredResults.length > 0 ) { 
        return filteredResults[0].content;
      } else {
        return [];
      }
    }

    const conversations = chats.chats.map(convo => ({
      id: convo._id,
      type: convo.chatType,
      name: convo.name,
      lastMessage: filter(convo.lastMessageId),
      timestamp: convo.lastUpdated!,
      unread: convo.unreadCounts[chats.requestId],
      displayPicture: Object.entries(convo.participantsImg!).find(([key, value]) => key !== chats.requestId)?.[1]
    }));
    dispatch(setConversations(conversations));
    dispatch(setMessages(chats.messages));
    dispatch(setSettings(chats.chatSettings));
    return conversations; // You can return this if needed in the reducer
  } catch (error) {
    dispatch(setError('Failed to fetch chats'));
    throw error; // Rethrow to let createAsyncThunk handle the error state
  } finally {
    dispatch(setLoading(false));
  }
};