'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Dispatch, SetStateAction, Suspense, useEffect, useState, useRef } from 'react';
import { Users, Plus, X, ArrowLeft, Ellipsis, Camera } from 'lucide-react';
import { useUser } from '@/app/providers/UserProvider';
import { useSelector } from 'react-redux';
import { showChat } from '@/redux/navigationSlice';
import { ConvoType, setNewGroupMembers } from '@/redux/chatSlice';
import ImageContent, { UserProfileLazyLoader } from '@/components/imageContent';
import { UserDataPartial } from '@/redux/userSlice';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import { useNavigateWithHistory } from '@/hooks/useNavigateWithHistory';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from './ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useGlobalFileStorage } from '@/hooks/useFileStorage';
import { UserData } from '@/lib/types/type';

interface Props {
  [x: string]: any
}

const setSearch = async (arg: string, setSearchQuery: Dispatch<SetStateAction<string>>, setNoUser: Dispatch<SetStateAction<boolean>>, setIsLoading: Dispatch<SetStateAction<boolean>>, setResults: Dispatch<SetStateAction<Props>>, conversations: ConvoType[], userdata: UserData) => {
  try {
    arg = arg.replace(/[^a-zA-Z0-9\s]/g, '');
    setSearchQuery(arg);
    setNoUser(false);
    setIsLoading(true);
    if(arg.trim() !== ''){
      const response = await fetch('/api/users?query=' + encodeURIComponent(arg));
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

const DirectChatMenu = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const navigate = useNavigateWithHistory();
  const {userdata, loading } = useUser();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [noUser, setNoUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Props>([]);
  const [isDisabled, setIsDisabled] = useState(false);

  const openChat = (_id: string) => {
    const existingConvo = conversations.find(convo => 
      _id === userdata._id ? convo.participants.length === 1 && convo.participants.includes(_id) : convo.participants.length === 2 && convo.participants.includes(_id)
    );
    setIsDisabled(true);
    if (existingConvo) {
      router.replace(`/chats/${existingConvo.id}`);
    } else if (_id === userdata._id) {
      router.replace(`/chats/me`);
    } else {
      router.replace(`/chats/new?otherId=${_id}`);
    }
    dispatch(showChat(''));
    return;
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
    <>
      <div className={`bg-white dark:bg-zinc-900 sm:!bg-transparent flex top-0 sticky gap-4 items-center justify-between w-full px-3 py-2`}>
        <ArrowLeft 
          onClick={() => {
            dispatch(showChat(''));
            navigate()
          }} className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' 
        />
        <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar dark:shadow-bar-dark'>
          <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
              <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
          </svg>
          <input 
            className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' value={searchQuery} 
            onChange={(e) => setSearch(e.target.value, setSearchQuery, setNoUser, setIsLoading, setResults, conversations, userdata)} 
            type='text' 
            placeholder='Search for people...'
          />
        </div>
        <Ellipsis className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' />
      </div>
      {keyHolder.map((attr,key) => (
        <div  key={key} className="cursor-pointer flex justify-between items-center my-3 px-3" onClick={() => {
          if (attr.tag === 'Create New Group') {
            router.push(`/chats/compose?type=group`);
          }
        }}>
          <div className="flex items-center">
              {attr.icon}
            <div>
              <p className="font-semibold text-gray-500 dark:text-slate-200 text-sm">{attr.tag}</p>
            </div>
          </div>
          <button className="flex flex-col items-center text-brand font-semibold">{attr.icon2}</button>
        </div>
      ))}
      <div className='flex flex-col gap-2 items-start my-3 px-3'>
        <div className='text-sm dark:text-slate-200'>You</div>
        {loading 
        ? <UserProfileLazyLoader />
        : <ImageContent userdata={userdata} onClick={openChat}/>
        }
        {noUser ?
          <div className='text-sm dark:text-slate-200'><p>Oops! No user found</p><p>Check for correct spelling.</p></div>
          :
          (results.length > 1 ? 
            <div className='text-sm dark:text-slate-200'>Others</div>
          : '')
        }
        <div className={`overflow-y-auto ${isDisabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}>
          {isLoading ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 5 }).map((_, index) => (
              <UserProfileLazyLoader key={index} />
            ))}
          </div>
          ) : (
            results.map((person: any, index: any) => (
              <ImageContent key={index} userdata={person} onClick={openChat}/>
            ))
          )}
        </div>
      </div>
    </>
  )
}

const GroupChatMenu = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const navigate = useNavigateWithHistory();
  const {userdata} = useUser();
  const { conversations } = useSelector((state: RootState) => state.chat);
  const [searchQuery, setSearchQuery] = useState('');
  const [noUser, setNoUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Props>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserDataPartial[]>([]);
  const [selectedUsersIds, setSelectedUsersIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setGroupDisplayPicture } = useGlobalFileStorage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupDisplayPicture(file);
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const createNewChat = async () => {
    dispatch(setNewGroupMembers(selectedUsers));
    
    try {
      router.replace(`/chats/new?type=group&groupName=${groupName}&groupDescription=${groupDescription}`);
      dispatch(showChat(''));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    }
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
      toast({
        title: 'Please select at least 2 users to create a group',
        description: 'You need at least 2 users to create a group',
        variant: 'destructive',
      });
      return;
    }
    createNewChat();
  }

  useEffect(() => {
    dispatch(showChat(''));
  }, [dispatch]);

  useEffect(() => {
    if (userdata._id) {
      setSelectedUsersIds([String(userdata._id)]);
      setSelectedUsers([userdata as UserDataPartial]);
    }
  }, [userdata._id]);

  return (
    <>
    <div className={`bg-white dark:bg-zinc-900 sm:!bg-transparent sm:backdrop-blur-sm flex top-0 sticky gap-4 items-center justify-between w-full px-3 py-2 z-10`}>
      <ArrowLeft 
        onClick={() => {
          dispatch(showChat(''));
          navigate()
        }} 
        className='icon-arrow-left text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer transition-colors duration-300 ease-in-out max-h-[21px]' 
      />
      <h2 className="text-sm dark:text-slate-200 font-semibold text-center">Create New Group</h2>
      <button
        disabled={groupName.trim() === ''}
        onClick={createGroup}
        className="px-4 py-1 disabled:bg-gray-400 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors duration-300 ease-in-out text-sm font-medium"
      >
        Create
      </button>
    </div>
    <div className='flex flex-col gap-2 my-3 px-3'>
      <div className="flex justify-center mb-4">
        <div 
          onClick={handleImageClick}
          className="relative w-24 h-24 rounded-full cursor-pointer overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-brand transition-colors duration-300"
        >
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Group preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Users size={32} className="text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
            <Camera size={24} className="text-white opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
      <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar dark:shadow-bar-dark'>
        <svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18' fill='none'>
          <path className='dark:fill-slate-200' fillRule='evenodd' clipRule='evenodd' d='M8.68945 1C12.9293 1 16.3781 4.3727 16.3781 8.51907C16.3781 10.4753 15.6104 12.2595 14.3542 13.5986L16.8261 16.0109C17.0574 16.2371 17.0582 16.6031 16.8269 16.8294C16.7116 16.9436 16.5592 17 16.4076 17C16.2568 17 16.1052 16.9436 15.9892 16.8309L13.4874 14.3912C12.1714 15.4219 10.5028 16.0389 8.68945 16.0389C4.44955 16.0389 1 12.6655 1 8.51907C1 4.3727 4.44955 1 8.68945 1ZM8.68945 2.15821C5.10251 2.15821 2.18433 5.01125 2.18433 8.51907C2.18433 12.0269 5.10251 14.8807 8.68945 14.8807C12.2756 14.8807 15.1938 12.0269 15.1938 8.51907C15.1938 5.01125 12.2756 2.15821 8.68945 2.15821Z' fill='#78828A'></path>
        </svg>
        <input 
          className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' 
          value={searchQuery} 
          onChange={(e) => setSearch(e.target.value, setSearchQuery, setNoUser, setIsLoading, setResults, conversations, userdata)} 
          type='text' 
          placeholder='Search for people...'
        />
      </div>
      <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-full shadow-bar dark:shadow-bar-dark mt-2'>
        <Users size={18} className="text-gray-500 dark:text-gray-400" />
        <input 
        className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' 
        type='text' 
        placeholder='Enter group name...'
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        />
      </div>
      <div className='dark:shadow-slate-200 flex flex-grow gap-3 items-center px-3 py-1 rounded-lg shadow-bar dark:shadow-bar-dark mt-2'>
        <textarea 
        className='bg-transparent border-0 dark:text-slate-200 outline-0 w-full' 
        placeholder='Enter group description...'
        value={groupDescription}
        onChange={(e) => setGroupDescription(e.target.value)}
        />
      </div>
      <div className='text-sm text-center dark:text-slate-200'>Add people to your group</div>
      {noUser && <div className='text-sm dark:text-slate-200'><p>Oops! No user found</p><p>Check for correct spelling.</p></div>}
      {selectedUsers.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 pb-4 border-b dark:border-gray-700">
            {selectedUsers.map((user) => (
            <div key={String(user._id)} className="flex items-center gap-2 shadow bg-gray-100 dark:bg-zinc-900 rounded-full px-2 py-1">
              <Avatar>
                <AvatarFallback className='shadow-inner'>{user.name?.slice(0,2) || `${user.firstname?.[0] || ''} ${user.lastname?.[0] || ''}`}</AvatarFallback>
                <AvatarImage 
                src={user.displayPicture || ''}
                className='rounded-full mr-2 shadow-inner'
                alt={user.name || `${user.firstname} ${user.lastname}`}
                />
              </Avatar>
              <span className="text-sm dark:text-slate-200">
                {user.name || `${user.firstname} ${user.lastname}`}
              </span>
              {user._id !== userdata._id && (
                <button 
                onClick={() => toggleUserSelection(user._id as string)}
                className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            ))}
          </div>
        </div>
      )}
      <div className='overflow-y-auto'>
        <div className='flex flex-col gap-2 items-start my-3'>
        {isLoading ? (
          <div className='flex flex-col gap-2'>
            {Array.from({ length: 5 }).map((_, index) => (
              <UserProfileLazyLoader key={index} />
            ))}
          </div>
        ) : (
          <>
          {results.length > 0 && <div className='text-sm dark:text-slate-200'>Others</div>}
          {results.map((person: any, index: any) => (
            <ImageContent key={index} userdata={person} onClick={toggleUserSelection} selectedUsers={selectedUsersIds}/>
          ))}
          </>
        )}
        </div>
      </div>
    </div>
    </>
  )
}

const NewChatMenuClient = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const type = searchParams?.get('type') || 'direct';
  return (
    <Dialog open={pathname?.includes('chats/compose')} onOpenChange={() => {}}>
      <DialogContent className='h-screen w-screen p-0 block sm:grid sm:p-4 sm:!max-h-[90vh] sm:!h-min sm:!max-w-lg sm:w-full overflow-auto' closeBtn={false}>
        {type === 'direct' ? <DirectChatMenu /> : <GroupChatMenu />}
      </DialogContent>
    </Dialog>
  )
}

export default function NewChatMenu() {
  return (
    <Suspense fallback={<></>}>
      <NewChatMenuClient />
    </Suspense>
  );
}