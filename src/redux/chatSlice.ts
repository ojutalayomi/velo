// redux/chatSlice.ts
import ChatRepository from '@/lib/class/ChatRepository';
import ChatSystem from '@/lib/class/chatSystem';
import { networkMonitor } from '@/lib/network';
import { AllChats, ChatAttributes, ChatSettings, ConvoType, Err, GroupMessageAttributes, MessageAttributes, NewChat, NewChatResponse, NewChatSettings } from '@/lib/types/type';
import { createAsyncThunk, createSlice, Dispatch, PayloadAction } from '@reduxjs/toolkit';
import moment from 'moment';
export { ConvoType };
const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

interface ChatSetting {
  [x: string]: NewChatSettings 
}

const defaultSettings = {
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
export { defaultSettings };

const stt = {
  '': defaultSettings
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
export function timeFormatter(Time: string) {
  const date = moment(Time, moment.ISO_8601);
  const formattedDate = date.format('MMM D, YYYY h:mm:ss A');
  return formattedDate;
}

export function updateLiveTime(response: "countdown" | "getlivetime" | "chat-time", Time: string): string {

  const time = new Date(timeFormatter(Time)).getTime();
  const now = new Date().getTime();
  let distance: number;

  if(response === "countdown"){
    // Find the distance between now an the count down date
    distance = time - now;
  } else if(response === "getlivetime"){
    // Find the distance between now an the count up date
    distance = now - time;
  } else if(response === "chat-time"){
    // Add hh:mm am/pm
    const timeObj = new Date(Time);
    const formattedTime = timeObj.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return formattedTime;
  } else {
    throw new Error("Invalid response type. Expected 'countdown' or 'getlivetime' or 'chat-time'.");
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
    messages: [] as unknown as (MessageAttributes | GroupMessageAttributes)[],
    settings: stt as unknown as ChatSetting,
    loading: true,
    error: '',
    userId: '',
  },
  reducers: {
    setConversations: (state, action: PayloadAction<ConvoType[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<ConvoType>) => {
      if (!state.conversations.some(convo => convo.id === action.payload.id)) {
        state.conversations.push(action.payload);
      }
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
    updateMessageReactions: (state, action: PayloadAction<{id: string, updates: MessageAttributes['reactions']}>) => {
      const { id, updates } = action.payload;
      state.messages = state.messages.map(msg => {
        if (msg._id === id) {
          return {
            ...msg,
            reactions: updates
          } as MessageAttributes | GroupMessageAttributes;
        }
        return msg;
      });
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(convo => convo.id !== action.payload);
    },
    setMessages: (state, action: PayloadAction<MessageAttributes[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<MessageAttributes>) => {
      if (!state.messages.some(msg => msg._id === action.payload._id)) {
        state.messages.push(action.payload);
      }
    },
    editMessage: (state, action: PayloadAction<{ id: string, content: string }>) => {
      state.messages = state.messages?.map(msg => 
        msg._id === action.payload.id 
          ? { ...msg, content: action.payload.content } 
          : msg
      );
    },
    updateMessage: (state, action: PayloadAction<{id?: string, updates: Partial<MessageAttributes>}>) => {
      const { id, updates } = action.payload;
      
      let targetId = id;
      
      // If id is undefined, find the last message with matching senderId
      if (targetId === undefined) {
        const lastMatchingMessage = state.messages
          .slice()
          .reverse()
          .find(msg => {
            const senderId = 'sender' in msg ? msg.sender.id : msg.senderId;
            senderId === state.userId
          });
        
        if (lastMatchingMessage) {
          targetId = lastMatchingMessage._id as string;
        } else {
          // If no matching message is found, return the state unchanged
          return;
        }
      }

      state.messages = state.messages.map(msg => 
        msg._id === targetId
          ? { 
              ...msg, 
              ...Object.fromEntries(
                Object.entries(updates).map(([key, value]) => 
                  [key, value]
                )
              )
            }
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
    },
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
    }
  },
});

export const { setConversations, addConversation, updateConversation, updateMessageReactions, deleteConversation, setMessages, addMessage, editMessage, updateMessage, deleteMessage, setSettings, addSetting, setLoading, setError, setUserId } = chatSlice.actions;
export default chatSlice.reducer;

// Fetch chats on app load
export const fetchChats = async (dispatch: Dispatch) => {
  try {
    const networkStatus = networkMonitor.getNetworkStatus();

    if(!networkStatus.online) return;
    
    dispatch(setLoading(true));
    const chats = await chatSystem.getAllChats();

    function filter(param: string) {
      if (!chats.messages) return;
      const filteredResults = chats.messages.filter((msg: MessageAttributes | GroupMessageAttributes) => msg._id === param);
      return filteredResults.length > 0 ? filteredResults[0].content : 'Be the first to text';
    }

    const uid = chats.requestId;
    dispatch(setUserId(uid));
    const conversations = chats.chats?.map(convo => {
      const participant = convo.participants.find(p => p.id === uid);
      // const otherParticipant = convo.participants.find(p => p.id !== uid);
      const displayPicture = convo.participants
        ? (convo.participants.length > 1
            ? convo.participants.find(p => p.id !== uid)?.displayPicture
            : convo.participants.find(p => p.id === uid)?.displayPicture)
        : undefined;
      
      const getName = () => convo.participants.length === 1 ? convo.name[uid] : convo.name[Object.keys(convo.name).find(e => !e.includes(uid)) || 'Unknown Participant']
      return {
        id: convo._id,
        type: convo.chatType,
        name: convo.chatType === 'DMs' ? getName() : convo.name.group,
        lastMessage: filter(participant?.lastMessageId || '') || 'Be the first to text',
        timestamp: convo.timestamp,
        unread: participant?.unreadCount || 0,
        displayPicture: convo.chatType === 'DMs' ? displayPicture as string : convo.groupDisplayPicture,
        description: convo.chatType === 'DMs' ? '' : convo.groupDescription,
        verified: convo.verified || false,
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