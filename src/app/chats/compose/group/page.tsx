'use client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { Users, Hash, Plus, X } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/hooks/useSocket';
import { useDispatch, useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { ConvoType, setConversations, addConversation } from '@/redux/chatSlice';
import ImageContent, { UserProfileLazyLoader }  from '@/components/imageContent';
import { UserData } from '@/redux/userSlice';
import ChatSystem from '@/lib/class/chatSystem';
import ChatRepository from '@/lib/class/ChatRepository'; 
import NewChatModal from '../../NewChatModal';
import { RootState } from '@/redux/store';

type ChatType = "DMs" | "Groups" | "Channels";
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

interface UserDataPartial extends Partial<UserData> {
    displayPicture: string;
}

const NewChatMenu = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const {userdata, loading, error, refetchUser} = useUser();
    const socket = useSocket(userdata?._id);
    const { conversations } = useSelector<RootState, ConvoTypeProp>((state) => state.chat);
    const [searchQuery, setSearchQuery] = useState('');
    const [noUser, setNoUser] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<Props>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPerson,setNewPerson] = useState<{[x: string]: any}>([]);
    const { chaT } = useSelector((state: RootState) => state.navigation);
    const [selectedUsers, setSelectedUsers] = useState<UserDataPartial[]>([]);
    const [selectedUsersIds, setSelectedUsersIds] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const url = 'https://s3.amazonaws.com/profile-display-images/';

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
          // Get all participant IDs from existing conversations
          const existingParticipantIds = conversations.flatMap(convo => convo.participants);

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
        name: groupName, // Use the provided group name
        chatType: 'Groups' as ChatType,
        groupDescription: groupDescription,
        groupDisplayPicture: '',
        participants: [
          ...selectedUsersIds,
        ],
        participantsImg: {
          ...selectedUsers.reduce((acc, user) => ({
            ...acc,
            [`${user._id}`]: user.dp || user.displayPicture
          }), {}),
        },
        lastMessageId: '',
        unreadCounts: {
          ...selectedUsersIds.reduce((acc, id) => ({
            ...acc,
            [id]: 1
          }), {}),
        },
        favorite: false,
        pinned: false,
        deleted: false,
        archived: false,
      };
  
      const result = await chatSystem.addChat(newChatAttributes);
      if (!result) return;
      setIsModalOpen(false);
      if (socket) socket.emit('addChat', result)
      
      router.push(`/chats/${result.chat._id}`);
      dispatch(showChat(''));
    }

    const toggleUserSelection = (_id: string) => {
      const filteredResults = results.filter((user: UserData) => user._id === _id);
      const newData = _id === userdata._id ? userdata : filteredResults[0];
      
      setSelectedUsers(prevUsers => {
        const isAlreadySelected = prevUsers.some(user => user._id === _id);
        if (isAlreadySelected) {
          return prevUsers.filter(user => user._id !== _id);
        } else {
          return [...prevUsers, newData];
        }
      });
      setSelectedUsersIds(prevIds => {
        const isAlreadySelected = prevIds.includes(_id);
        if (isAlreadySelected) {
          return prevIds.filter(id => id !== _id);
        } else {
          return [...prevIds, _id];
        }
      });
    }

    const createGroup = () => {
      if (selectedUsers.length < 2) {
        // Show an error message or alert that at least 2 users are required for a group
        alert('Please select at least 2 users to create a group');
        setIsModalOpen(false);
        return;
      }
      setIsModalOpen(true);
      createNewChat(groupName);
    }

    useEffect(() => {
        dispatch(showChat(''));
    }, [dispatch]);
    
    const keyHolder = [
      {
        tag: 'Create New Group',
        icon: <Users size={28} className="border-gray-400 border-2 rounded-full mr-3 text-gray-400" />,
        icon2: <Plus size={28} className='text-brand' />
      }/*,
      {
        tag: 'New Channel',
        icon: <Hash size={28} className="border-gray-400 border-2 rounded-full mr-3 text-gray-400" />,
        icon2: <Plus size={28} className='text-brand' />
      }*/
    ]
    return (
        <div className={`mobile:bg-white mobile:dark:bg-zinc-900 tablets1:flex ${chaT} dark:bg-bgDark shadow-md flex flex-col min-h-screen max-h-screen flex-1 rounded-lg overflow-hidden mobile:absolute tablets1:w-auto h-full w-full z-10`}>
          <div className={`flex bg-gray-100 dark:bg-zinc-900 top-0 sticky gap-4 items-center justify-between w-full my-1 px-3 py-2`}>
            <FontAwesomeIcon onClick={() => {
                dispatch(showChat(''));
                router.back()}
            } icon={'arrow-left'} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' size="lg" />
            <h2 className="text-sm dark:text-slate-200 font-semibold text-center">Create New Group</h2>
            <button
              disabled={selectedUsers.length < 2}
              onClick={() => {if (selectedUsers.length > 2) setIsModalOpen(true)}}
              className="px-4 py-1 disabled:bg-gray-400 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors duration-300 ease-in-out text-sm font-medium"
            >
              Create
            </button>
          </div>
          <div className='flex flex-col gap-2 my-3 px-3'>
          <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar'>
            <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
                <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
            </svg>
            <input className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' value={searchQuery} onChange={(e) => setSearch(e.target.value)} type='text' placeholder='Search for people...'/>
          </div>
          <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar mt-2'>
            <Users size={18} className="text-gray-500 dark:text-gray-400" />
            <input 
              className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' 
              type='text' 
              placeholder='Enter group name...'
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
          <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar mt-2'>
            <textarea 
              className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' 
              placeholder='Enter group description...'
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
            />
          </div>
          <div className='text-sm text-center dark:text-slate-200'>Add people to your group</div>
          {noUser && <div className='text-center text-sm dark:text-slate-200'>Oops! No user found<br/>Check for correct spelling.</div>}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 pb-4 border-b dark:border-gray-700">
                {selectedUsers.map((user) => (
                  <div key={user._id} className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
                    <Image 
                      src={
                        user.dp || user.displayPicture  
                        ? (user.dp ? url+user.dp : (
                          user.displayPicture.includes('ila-') 
                          ? '/default.jpeg'
                          : url +  user.displayPicture
                          )) 
                        : '/default.jpeg'}
                      className='w-6 h-6 rounded-full mr-2'
                      width={24}
                      height={24}
                      alt={user.name || `${user.firstname} ${user.lastname}`}
                    />
                    <span className="text-sm dark:text-slate-200">
                      {user.name || `${user.firstname} ${user.lastname}`}
                    </span>
                    <button 
                      onClick={() => toggleUserSelection(user._id as string)}
                      className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {loading 
          ? <UserProfileLazyLoader />
          : <ImageContent userdata={userdata} onClick={toggleUserSelection}/>
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
              <ImageContent key={index} userdata={person} onClick={toggleUserSelection}/>
            ))
          )}
          </div>
          <NewChatModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={createGroup}
            username={newPerson?.username}
          />
        </div>
    )
}

export default NewChatMenu;