'use client'
// import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useCallback, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Bottombar from '@/components/Bottombar';
import Root from '@/components/Root';
import ErrorBoundary from '@/components/ErrorBoundary';
import Error from './error';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ConvoType, setConversations, updateConversation, setMessages, addMessages, deleteMessage, addSetting, fetchChats, addConversation, Time } from '@/redux/chatSlice';
import { usePathname, useRouter } from 'next/navigation';
import Loading from './loading'; 
import UserPhoto from "@/components/UserPhoto";
import VideoPlayer from '@/components/PostPreview';
import { RootState } from '@/redux/store';
import { MessageAttributes, NewChat_ } from '@/lib/types/type';
import { useSocket } from '@/hooks/useSocket';

interface ClientComponentsProps {
    children: React.ReactNode;
}

interface ConvoTypeProp {
    conversations: ConvoType[];
}

const ClientComponents = ({children}: ClientComponentsProps) => {
    const dispatch = useDispatch();
    const pathname = usePathname();
    const isModalRoute  = pathname?.endsWith('/photo');
    const isModalRoute1  = pathname?.includes('/photo/');
    const router = useRouter();
    const { userdata, loading, error: err, refetchUser } = useUser();
    const path = pathname?.replace('/','') || '';
    const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
    const [activeRoute, setActiveRouteState] = useState<string>(path);
    const [isMoreShown, setMoreStatus] = useState(false);
    const [error, setError] = useState(null);
    const [load,setLoad] = useState<boolean>(false);
    const socket = useSocket(userdata._id);

    useEffect(() => {
        setLoad(false)
        if(pathname?.includes('/chats/')) setActiveRouteState('chats')
    }, [pathname, setActiveRouteState]);
  
    useEffect(() => {
        async function fetchData() {
            await fetchChats(dispatch);
        }
        fetchData();
    
    }, [dispatch]);

    const gt = useCallback((chatid: string) => {
        return conversations.find(obj => obj.id === chatid);
    }, [conversations])
  
    const handleChat = useCallback((data: NewChat_) => {
        const uid = data.requestId;
        const participant = data.chat.participants.find(p => p.id === uid);
        const otherParticipant = data.chat.participants.find(p => p.id !== uid);

        const obj = {
            id: data.chat._id,
            type: data.chat.chatType,
            name: data.chat.name,
            displayPicture: otherParticipant?.displayPicture || '',
            lastMessage: '',
            unread: participant?.unreadCount || 0,
            favorite: participant?.favorite || false,
            pinned: participant?.pinned || false,
            deleted: participant?.deleted || false,
            archived: participant?.archived || false,
            timestamp: data.chat.timestamp,
            lastUpdated: Time(data.chat.lastUpdated),
            participants: data.chat.participants.map(p => p.id),
            online: false,
            isTyping: data.chat.participants.reduce((p: { [x: string]: boolean }, r) => {
                p[r.id] = false;
                return p;
            }, {} as { [x: string]: boolean })
        };
        dispatch(addConversation(obj));
        if (participant?.chatSettings) {
            dispatch(addSetting({ [data.chat._id]: participant.chatSettings }));
        }
        console.log(data);
    }, [dispatch]);
  
    const handleChatMessage = useCallback((msg: MessageAttributes) => {
      dispatch(addMessages(msg));
      const conversationId = msg.chatId as string;
      const conversation = gt(conversationId);
      if (conversation) {
        dispatch(updateConversation({
          id: conversationId,
          updates: {
            unread: msg.isRead[userdata._id] ? conversation.unread : (conversation.unread ?? 0) + 1,
            lastMessage: msg.content,
            lastUpdated: msg.timestamp
          }
        }));
      }
    }, [dispatch, gt, userdata._id]);

    const handleUserStatus = useCallback((data: { userId: string, status: string }) => {
        dispatch(updateConversation({ id: data.userId, updates: { online: data.status === 'online' } }));
    }, [dispatch]);

    const handleTyping = useCallback((data: { userId: string, chatId: string }) => {
        dispatch(updateConversation({ id: data.chatId, updates: { isTyping: { [data.userId]: true } } }));
    }, [dispatch]);

    const handleStopTyping = useCallback((data: { userId: string, chatId: string }) => {
        dispatch(updateConversation({ id: data.chatId, updates: { isTyping: { [data.userId]: false } } }));
    }, [dispatch]);

    useEffect(() => {
      if (!socket) return;
  
        socket.on('newMessage', handleChatMessage);
        socket.on('userTyping', handleTyping);
        socket.on('userStopTyping', handleStopTyping);
      socket.on('newChat', handleChat);
      socket.on('batchUserStatus', (updates: [string, string][]) => {
        updates.forEach(([userId, status]) => {
          handleUserStatus({ userId, status });
        });
      });
  
      return () => {
        socket.off('newMessage', handleChatMessage);
        socket.off('newChat', handleChat);
        socket.off('batchUserStatus');
      };
    }, [socket, handleChatMessage, handleChat, handleUserStatus, handleTyping, handleStopTyping]);

    const setActiveRoute = useCallback((route: string) => {
        setActiveRouteState(route);
    }, []);
  
    const handleReset = () => {
      setError(null);
    };

    useEffect(() => {
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
        };

        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    return(
        <>
            <Sidebar setLoad={setLoad} isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                <Root activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
                {/* <pre data-testid="client-component">{JSON.stringify(user, null, 2)}</pre>; */}
                <div id='detail' className={`${pathname === '/home' ? 'hidden' : ''} tablets1:block`}>
                    <ErrorBoundary fallback={<Error error={error} reset={handleReset} />}>
                        {load ? <Loading /> : children}
                        {isModalRoute && <UserPhoto />}
                        {isModalRoute1 && <VideoPlayer />}
                    </ErrorBoundary>
                </div>
            <Bottombar setLoad={setLoad} isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
        </>
    )
}
export default ClientComponents;