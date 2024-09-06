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
        const unreadCount = data.chat.unreadCounts ? data.chat.unreadCounts[uid] : undefined;
        
        const displayPicture = data.chat.participantsImg
            ? (Object.entries(data.chat.participantsImg).length > 1 ? 
                Object.entries(data.chat.participantsImg).find(([key, value]) => key !== uid)?.[1]
                : data.chat.participantsImg[uid])
            : undefined;
        
        const obj = {
            id: data.chat.id,
            name: data.chat.name,
            chatType: data.chat.chatType,
            displayPicture: displayPicture,
            lastMessage: '', 
            unread: unreadCount,
            favorite: data.chat.favorite,
            pinned: data.chat.pinned,
            deleted: data.chat.deleted,
            archived: data.chat.archived,
            timestamp: data.chat.timestamp,
            lastUpdated: Time(data.chat.lastUpdated as Date),
        }
        dispatch(addConversation(obj));
        dispatch(addSetting(data.chatSetting))
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

    useEffect(() => {
      if (!socket) return;
  
      socket.on('newMessage', handleChatMessage);
      socket.on('newChat', handleChat);
  
      return () => {
        socket.off('newMessage', handleChatMessage);
        socket.off('newChat', handleChat);
      };
    }, [socket, handleChatMessage, handleChat]);

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