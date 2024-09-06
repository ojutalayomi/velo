// redux/chatSlice.ts
import ChatRepository from '@/lib/class/ChatRepository';
import ChatSystem from '@/lib/class/chatSystem';
import { AllChats, ChatAttributes, ChatSettings, Err, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { createAsyncThunk, createSlice, Dispatch, PayloadAction } from '@reduxjs/toolkit';

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

export interface ConvoType {
  id: string;
  type: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  displayPicture: string;
  favorite: boolean,
  pinned: boolean,
  deleted: boolean,
  archived: boolean,
  lastUpdated: string,
}

interface ChatSetting {
  [x: string]: NewChatSettings 
}

const settings = {
  _id: "",
  chatId: "",
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
const stt = {
  '': settings
}
export const Time = (params: string | Date ) => {
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

export function updateLiveTime(response: "countdown" | "getlivetime", Time: string): string {

  const time = new Date(Time).getTime();
  const now = new Date().getTime();
  let distance: number;

  if(response === "countdown"){
    // Find the distance between now an the count down date
    distance = time - now;
  } else if(response === "getlivetime"){
    // Find the distance between now an the count up date
    distance = now - time;
  } else {
    throw new Error("Invalid response type. Expected 'countdown' or 'getlivetime'.");
  }
  
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  let liveTime: string;
  
  if (days > 0) {
  const [date/*,time*/] = Time.split(',');
    liveTime = date;
  } else if (hours > 0) {
    liveTime = hours + (hours === 1 ? " hr" : " hrs");
  } else if (minutes > 0) {
    liveTime = minutes + (minutes === 1 ? " min" : " mins");
  } else {
    liveTime = seconds + (seconds === 1 ? " sec" : " secs");
  }
  return liveTime;
}


const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [] as unknown as ConvoType[],
    messages: [] as unknown as MessageAttributes[],
    settings: stt as unknown as ChatSetting,
    loading: true,
    error: '',
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action) => {
      state.conversations.push(action.payload);
    },
    updateConversation: (state, action) => {
      const { id, updates } = action.payload;
      state.conversations = state.conversations.map(convo => 
        convo.id === id
          ? { 
              ...convo, 
              ...Object.fromEntries(
                Object.entries(updates).map(([key, value]) => 
                  [key, typeof value === 'function' ? value(convo[key as keyof ConvoType]) : value]
                )
              )
            }
          : convo
      );
    },
    deleteConversation: (state, action) => {
      state.conversations = state.conversations.filter(convo => convo.id !== action.payload);
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessages: (state, action) => {
      state.messages.push(action.payload);
    },
    editMessage: (state, action) => {
      state.messages = state.messages?.map(msg => 
        msg._id === action.payload.id 
          ? { ...msg, content: action.payload.content } 
          : msg
      );
    },
    deleteMessage: (state, action) => {
      state.messages = state.messages.filter(msg => msg._id !== action.payload);
    },
    setSettings: (state, action) => {
      state.settings = action.payload;
    },
    addSetting: (state, action) => {
      const { key, value } = action.payload;
      state.settings[key] = value;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  },
});

export const { setConversations, addConversation, updateConversation, deleteConversation, setMessages, addMessages, editMessage, deleteMessage, setSettings, addSetting, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;

// Fetch chats on app load
export const fetchChats = async ( dispatch: Dispatch ) => {
  try {
    dispatch(setLoading(true));
    const chats = await chatSystem.getAllChats();

    function filter(param: string) {
      if(!chats.messages) return;
      const filteredResults = chats.messages.filter((msg: MessageAttributes) => msg._id === param );
      if(filteredResults.length > 0 ) { 
        return filteredResults[0].content;
      } else {
        return 'Start chatting now';
      }
    }
    const uid = chats.requestId;
    const conversations = chats.chats?.map(convo => {
      const unreadCount = convo.unreadCounts ? convo.unreadCounts[uid] : undefined;
      // console.log(convo.unreadCounts)
      const displayPicture = convo.participantsImg
        ? (Object.entries(convo.participantsImg).length > 1 ? 
            Object.entries(convo.participantsImg).find(([key, value]) => key !== uid)?.[1]
            : convo.participantsImg[uid])
        : undefined;

      return {
        id: convo._id,
        type: convo.chatType,
        name: convo.name,
        lastMessage: filter(convo.lastMessageId),
        timestamp: convo.timestamp,
        unread: unreadCount,
        displayPicture: displayPicture,
        favorite: convo.favorite,
        pinned: convo.pinned,
        deleted: convo.deleted,
        archived: convo.archived,
        lastUpdated: Time(convo.lastUpdated as Date),
      };
    });
    // console.log(conversations)

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