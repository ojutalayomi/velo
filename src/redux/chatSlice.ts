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
  participants: string[],
  online: boolean,
  isTyping: {
    [x: string]: boolean
  }
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
    setConversations: (state, action: PayloadAction<ConvoType[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<ConvoType>) => {
      state.conversations.push(action.payload);
    },
    updateConversation: (state, action: PayloadAction<{id: string, updates: Partial<ConvoType>}>) => {
      const { id, updates } = action.payload;
      state.conversations = state.conversations.map(convo => 
        convo.id === id
          ? { 
              ...convo, 
              ...Object.fromEntries(
                Object.entries(updates).map(([key, value]) => 
                  [key, value]
                )
              )
            }
          : convo
      );
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(convo => convo.id !== action.payload);
    },
    setMessages: (state, action: PayloadAction<MessageAttributes[]>) => {
      state.messages = action.payload;
    },
    addMessages: (state, action: PayloadAction<MessageAttributes>) => {
      state.messages.push(action.payload);
    },
    editMessage: (state, action: PayloadAction<{ id: string, content: string }>) => {
      state.messages = state.messages?.map(msg => 
        msg._id === action.payload.id 
          ? { ...msg, content: action.payload.content } 
          : msg
      );
    },
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages?.filter(msg => msg._id !== action.payload);
    },
    setSettings: (state, action: PayloadAction<ChatSetting>) => {
      state.settings = action.payload;
    },
    addSetting: (state, action: PayloadAction<{[key: string]: NewChatSettings}>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  },
});

export const { setConversations, addConversation, updateConversation, deleteConversation, setMessages, addMessages, editMessage, deleteMessage, setSettings, addSetting, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;

// Fetch chats on app load
export const fetchChats = async (dispatch: Dispatch) => {
  try {
    dispatch(setLoading(true));
    const chats = await chatSystem.getAllChats();

    function filter(param: string) {
      if (!chats.messages) return;
      const filteredResults = chats.messages.filter((msg: MessageAttributes) => msg._id === param);
      return filteredResults.length > 0 ? filteredResults[0].content : 'Start chatting now';
    }

    const uid = chats.requestId;
    const conversations = chats.chats?.map(convo => {
      const participant = convo.participants.find(p => p.id === uid);
      // const otherParticipant = convo.participants.find(p => p.id !== uid);
      const displayPicture = convo.participants
        ? (convo.participants.length > 1
            ? convo.participants.find(p => p.id !== uid)?.displayPicture
            : convo.participants.find(p => p.id === uid)?.displayPicture)
        : undefined;

      return {
        id: convo._id,
        type: convo.chatType,
        name: convo.name,
        lastMessage: filter(participant?.lastMessageId || '') || 'Start chatting now',
        timestamp: convo.timestamp,
        unread: participant?.unreadCount || 0,
        displayPicture: displayPicture || '',
        favorite: participant?.favorite || false,
        pinned: participant?.pinned || false,
        deleted: participant?.deleted || false,
        archived: participant?.archived || false,
        lastUpdated: Time(convo.lastUpdated),
        participants: convo.participants.map(p => p.id),
        online: false,
        isTyping: convo.participants.reduce((p: { [x: string]: boolean }, r) => {
          p[r.id] = false;
          return p;
        }, {} as { [x: string]: boolean })
      };
    });

    dispatch(setConversations(conversations));
    dispatch(setMessages(chats.messages as MessageAttributes[]));
    dispatch(setSettings(chats.chatSettings));
    return conversations;
  } catch (error) {
    dispatch(setError('Failed to fetch chats'));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};