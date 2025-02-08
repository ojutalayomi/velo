'use client'
import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import Bottombar from '@/components/Bottombar';
import ErrorBoundary from '@/components/ErrorBoundary';
import Error from './error';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '@/hooks/useUser';
import { ConvoType, updateConversation, addMessage, addSetting, fetchChats, addConversation, Time, updateMessage } from '@/redux/chatSlice';
import { usePathname } from 'next/navigation';
import UserPhoto from "@/components/UserPhoto";
import VideoPlayer from '@/components/PostPreview';
import { RootState } from '@/redux/store';
import { MessageAttributes, msgStatus, NewChat_ } from '@/lib/types/type';
import { useSocket } from '@/app/providers';
import VideoChat from '../components/CallPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmCall } from '@/components/callConfirmation';
import { FileStorageProvider } from '@/hooks/useFileStorage';

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
    const callRoute  = pathname?.startsWith('/call');
    const { userdata } = useUser();
    const path = pathname?.replace('/','') || '';
    const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
    const [activeRoute, setActiveRouteState] = useState<string>(path);
    const [isMoreShown, setMoreStatus] = useState(false);
    const [error, setError] = useState(null);
    const [load,setLoad] = useState<boolean>(false);
    const callIdRef = useRef<string>('');
    const callNoticeRef = useRef<boolean>(false);
    const socket = useSocket();
    const routes = ['accounts/login','accounts/signup','accounts/forgot-password','accounts/reset-password']

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
        // name: convo.chatType === 'DMs' ? convo.name[Object.keys(convo.name).find(e => !e.includes(uid)) || ''] : convo.name.group,
        const obj = {
            id: data.chat._id,
            type: data.chat.chatType,
            name: data.chat.chatType === 'DMs' ? data.chat.name[Object.keys(data.chat.name).find(e => !e.includes(uid)) || ''] : data.chat.name.group,
            displayPicture: otherParticipant?.displayPicture || 'Be the first to text',
            description: data.chat.groupDescription || '',
            verified: data.chat.verified || false,
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
        // console.log(data);
        return data;
    }, [dispatch]);
  
    const handleChatMessage = useCallback((msg: MessageAttributes) => {
      dispatch(addMessage(msg));
      dispatch(updateMessage({
        id: String(msg._id),
        updates: {
          status: 'sent' as msgStatus,
        }
      }));
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

    const handleTyping = useCallback((data: { userId: string, to: string, chatId: string }) => {
        if (data.userId === userdata._id) return null;
        dispatch(updateConversation({ id: data.chatId, updates: { isTyping: { [data.userId]: true } } }));
    }, [dispatch, userdata._id]);

    const handleStopTyping = useCallback((data: { userId: string, to: string, chatId: string }) => {
        if (data.userId === userdata._id) return null;
        dispatch(updateConversation({ id: data.chatId, updates: { isTyping: { [data.userId]: false } } }));
    }, [dispatch, userdata._id]);

    useEffect(() => {
      if (!socket) return;
  
        socket.on('newMessage', handleChatMessage);
        socket.on('userTyping', handleTyping);
        socket.on('userStopTyping', handleStopTyping);
        socket.on("lastActive", ({ userId, lastActive }) => {
            const convo = conversations.find(c =>  c.participants.includes(userId) && c.type === 'DMs')
            dispatch(updateConversation({ id: convo?.id ?? '', updates: { timestamp: lastActive }}))
        })
        socket.on('newChat', (data: NewChat_) => {
            handleChat(data);
            socket.emit('joinChat', { chatId: data.chat._id });
        });
        socket.on('callOffer', async ( data: { offer: RTCSessionDescription, room: string } ) => {
            const { room } = data;
            callIdRef.current = room;
            callNoticeRef.current = true;            
            alert('Incoming call from:');
        });
  
      return () => {
        socket.off('newMessage', handleChatMessage);
        socket.off('userTyping', handleTyping);
        socket.off('userStopTyping', handleStopTyping);
        socket.off("lastActive")
        socket.off('newChat', handleChat);
        socket.off('offer');
      };
    }, [socket, handleChatMessage, handleChat, handleTyping, handleStopTyping, conversations]);

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
        <ErrorBoundary fallback={<Error error={error} reset={handleReset} />}>
            <FileStorageProvider>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {callIdRef.current && callNoticeRef.current && (
                <ConfirmCall id={String(callIdRef.current)} show={Boolean(callNoticeRef)} conversations={conversations}/>
            )}
            {!callRoute ?
            <Sidebar setLoad={setLoad} isMoreShown={isMoreShown} activeRoute={activeRoute} setActiveRoute={setActiveRoute} setMoreStatus={setMoreStatus} />
            : null}
                {/* <pre data-testid="client-component">{JSON.stringify(user, null, 2)}</pre>; */}
                <div id='detail' className="">
                    {children}
                    {isModalRoute && <UserPhoto />}
                    {isModalRoute1 && <VideoPlayer />}
                    {callRoute && <VideoChat />}
                </div>
                {(!pathname?.includes('posts') && 
                !pathname?.includes('chats') && 
                !routes.includes(activeRoute) && 
                !callRoute) ? 
                    <Bottombar 
                    setLoad={setLoad} 
                    isMoreShown={isMoreShown} 
                    activeRoute={activeRoute} 
                    setActiveRoute={setActiveRoute} 
                    setMoreStatus={setMoreStatus} 
                    /> 
                : null
            } 
            </FileStorageProvider>   
        </ErrorBoundary>
    )
}
export default ClientComponents;