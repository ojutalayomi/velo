'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Users, Hash } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { ConvoType, setConversations, addConversation } from '@/redux/chatSlice';
import ImageContent, { UserProfileLazyLoader }  from '@/components/imageContent';
import { UserData } from '@/redux/userSlice';
import ChatSystem from '@/lib/class/chatSystem';
import ChatRepository from '@/lib/class/ChatRepository'; 
import NewChatModal from './NewChatModal';
import { RootState } from '@/redux/store';

type ChatType = "Chats" | "Groups" | "Channels";
type ChatSettingsTheme = "light" | "dark";

const chatRepository = new ChatRepository();

const chatSystem = new ChatSystem(chatRepository);

interface Props {
  [x: string]: any
}

interface NewChatMenuProps {
  openCreatePage: Dispatch<SetStateAction<boolean>>;
}

interface ConvoTypeProp {
  conversations: ConvoType[];
}

const NewChatMenu: React.FC<NewChatMenuProps> = ({openCreatePage}) => {
    const router = useRouter();
    const dispatch = useDispatch();
    const {userdata, loading, error, refetchUser} = useUser();
    const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
    const [searchQuery, setSearchQuery] = useState('');
    const [noUser, setNoUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<Props>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPerson,setNewPerson] = useState<{[x: string]: any}>([]);
    const setSearch = async (arg: string) => {
      try {
        setSearchQuery(arg);
        setNoUser(false);
        setIsLoading(true);
        if(arg){
          const response = await fetch(`/api/users?query=${encodeURIComponent(arg)}`);
          if (!response.ok) {
            throw new Error('Failed to fetch');
          }
          const data = await response.json();
          data.length < 1 ? setNoUser(true) : setNoUser(false);
          const newData = data.filter((user: UserData) => 
            user.username !== userdata.username
          );
          setResults(newData);
          setIsLoading(false);
        } else {
          setResults([]);
          setNoUser(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error searching people:', error);
      }
    }
    const createNewChat = async (arg: string) => {
  
      const newChatAttributes = {
        name: newPerson.name,
        chatType: arg as ChatType,
        participants: [
          userdata._id as string,
          newPerson._id  as string,
        ],
        participantsImg: {
          [userdata._id]: '',
          [newPerson._id]: '',
        },
        lastMessageId: '',
        unreadCounts: {
          [userdata._id]: 0,
          [newPerson._id]: 1,
        },
        favorite: false,
        pinned: false,
        deleted: false,
        archived: false,
      };
  
      const result = await chatSystem.addChat(newChatAttributes);
      setIsModalOpen(false);
      openCreatePage(false);
      dispatch(addConversation({
        id: result._id,
        type: result.chatType,
        name: result.name,
        lastMessage: '',
        timestamp: result.timestamp,
        unread: 0
      }));
      router.push(`/chats/${result._id}`);
      dispatch(showChat(''));
    }

    const openChat = (_id: string) => {
      const filteredResults = results.filter((user: UserData) => user._id === _id )
      const newData = _id === userdata._id ? userdata : filteredResults[0];
      setNewPerson(newData);
      setIsModalOpen(true);
    }

    useEffect(() => {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
  
      return () => clearTimeout(timer);
    }, []);
    
    const keyHolder = [
      {
        tag: 'New Group',
        icon: <Users className="w-7 h-7 border-gray-400 border-2 rounded-full mr-3 text-gray-400" />
      },
      {
        tag: 'New Channel',
        icon: <Hash className="w-7 h-7 border-gray-400 border-2 rounded-full mr-3 text-gray-400" />
      }
    ]
    return (
        <>
          <div className='flex bg-white dark:bg-black top-0 sticky gap-4 items-center justify-between w-full my-1 px-3 py-2'>
            <FontAwesomeIcon onClick={() => openCreatePage(false)} icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
            <FontAwesomeIcon icon={'ellipsis-h'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
          </div>
          <div className='dark:text-slate-200 flex gap-2 items-center justify-between w-full my-2 px-3'>
            <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-2 rounded-full shadow-bar'>
              <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
                  <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
              </svg>
              <input className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' value={searchQuery} onChange={(e) => setSearch(e.target.value)} type='text' placeholder='Search for people...'/>
            </div>
          </div>
          {keyHolder.map((attr,key) => (
            <div  key={key} className="flex justify-between items-center my-3 px-3">
              <div className="flex items-center">
                  {attr.icon}
                <div>
                  <p className="font-semibold text-gray-500 dark:text-slate-200 text-sm">{attr.tag}</p>
                </div>
              </div>
              <button className="flex flex-col items-center text-brand font-semibold">+</button>
            </div>
          ))}
          <div className='flex flex-col gap-2 my-3 px-3'>
          <div className='text-sm dark:text-slate-200'>You</div>
          {loading 
          ? <UserProfileLazyLoader />
          : <ImageContent userdata={userdata} onClick={openChat}/>
          }
          {noUser ?
            <div className='text-center text-sm dark:text-slate-200'>Oops! No user found<br/>Check for correct spelling.</div>
            :
            (results.length > 1 ? 
              <div className='text-sm dark:text-slate-200'>Others</div>
            : '')
          }
          {isLoading ? (
            <div className='flex flex-col gap-2'>
            <UserProfileLazyLoader />
            <UserProfileLazyLoader />
            <UserProfileLazyLoader />
            <UserProfileLazyLoader />
            <UserProfileLazyLoader />
            </div>
          ) : (
            results.map((person: any, index: any) => (
              <ImageContent key={index} userdata={person} onClick={openChat}/>
            ))
          )}
          </div>
          <NewChatModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={createNewChat}
            username={newPerson?.username}
          />
        </>
    )
}

export default NewChatMenu;