"use client"

import * as React from "react"

import { cn, generateObjectId } from "@/lib/utils"
import { useMediaQuery } from "usehooks-ts"
import {
  Dialog,
  DialogContent
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent
} from "@/components/ui/drawer";
import { MessageAttributes, Reaction } from "@/lib/types/type";
import { useUser } from "../providers/UserProvider"
import { updateMessageReactions } from "@/redux/chatSlice";
import { ObjectId } from "mongodb";
import { useSocket } from "../providers/SocketProvider";
import { useAppDispatch } from "@/redux/hooks";
import EmojiPicker from "@/components/ui/emoji-picker"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SmilePlus } from "lucide-react"
import { Avatar ,AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export function ReactionsInfo({message, setReactionInfoDisplay}: {message: MessageAttributes, setReactionInfoDisplay: React.Dispatch<React.SetStateAction<boolean>>}) {
  const [open, setOpen] = React.useState(true)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  React.useEffect(() => {
    if(!open) setReactionInfoDisplay(false);
  }, [open]);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <ReactionsInfoMain messageId={message._id as string} reactionsInfo={message.reactions} />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent>
        <ReactionsInfoMain className="px-4" messageId={message._id as string} reactionsInfo={message.reactions} />
      </DrawerContent>
    </Drawer>
  )
}

function ReactionsInfoMain({ className, messageId, reactionsInfo }: {className?: string, messageId: string, reactionsInfo: Reaction[]}) {
  const reactionArray: Reaction[] = [];
  const { userdata } = useUser();
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const emojiPickerRef = React.useRef<HTMLButtonElement>(null);

  const onEmojiClick = (emoji: string) => {
    if (messageId) {
      if(socket){
        dispatch(updateMessageReactions({
          id: messageId as string, 
          updates: {
            _id: generateObjectId() as unknown as ObjectId,
            messageId: messageId as string,
            userId: String(userdata._id),
            reaction: emoji,
            timestamp: new Date().toISOString()
          }
        }));
        socket.emit('addReaction', {
          messageId: messageId as string,
          userId: String(userdata._id),
          reaction: emoji,
          timestamp: new Date().toISOString()
        });
      //   setShowEmojiPicker(false);
      }
    }
  };

  const UserCard = ({reaction}: {reaction: Reaction}) => {
    const userData = useSelector((state: RootState) => state.user.userdata);
    const IsMe = reaction.userId === String(userdata._id);
    
    return (
      <li className="flex items-center justify-between gap-2 text-sm cursor-pointer" onClick={() => onEmojiClick(reaction.reaction)}>
        <Avatar>
          <AvatarImage className="size-8 rounded-full" src={IsMe ? userData.displayPicture : reaction.reaction} />
          <AvatarFallback>{IsMe}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col flex-1">
          <span data-user-id={reaction.userId} className="text-xs">{reaction.userId === String(userdata._id) ? 'You' : reaction.userId}</span>
          <span className="text-xs text-gray-500">{IsMe ? 'Tap to remove' : 'Tap to add'}</span>
        </div>
        <span>{reaction.reaction}</span>
      </li>
    )
  }

  return (
    <div
      className={cn("grid items-start gap-2", className)}
    >
      <div className="flex flex-wrap gap-1">
        {reactionsInfo.length} reactions
      </div>
      
      <div className="w-full">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="flex flex-wrap justify-start">
            <TabsTrigger value="emoji" onClick={() => emojiPickerRef.current?.click()}>
              <SmilePlus className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            {reactionsInfo
              .reduce((acc: React.ReactNode[], reaction, index) => {
              if (!reactionArray.find(r => r.reaction === reaction.reaction)) {
                reactionArray.push(reaction);
                const reactionCount = reactionsInfo.filter(r => r.reaction === reaction.reaction).length;
                const check = reactionCount > 1 && reactionsInfo.find(r => r.userId === userdata._id && r.reaction === reaction.reaction);
                acc.push(
                <TabsTrigger 
                    key={index}
                    title={`${reaction.userId}`}
                    value={reaction.reaction}
                    className='cursor-pointer text-xs'
                >
                    {reaction.reaction}{reactionCount > 1 && <sub className="ml-0.5 text-xs">{reactionCount}</sub>}
                </TabsTrigger>
                );
              }
              return acc;
              }, [])
            }
          </TabsList>
          <TabsContent value="emoji" className="mt-2 min-h-[200px]">
            <EmojiPicker onChange={onEmojiClick} ref={emojiPickerRef} triggerClassName="hidden" noPopover />
          </TabsContent>
          <TabsContent value="all" className="mt-2 min-h-[200px]">
            <ul className="space-y-1">
              {reactionsInfo.map((reaction, idx) => (
                <UserCard key={idx} reaction={reaction} />
              ))}
            </ul>
          </TabsContent>
          {reactionArray.map((reaction, idx) => (
            <TabsContent key={idx} value={reaction.reaction} className="mt-2 min-h-[200px]">
              <ul className="space-y-1">
                {reactionsInfo
                  .filter(r => r.reaction === reaction.reaction)
                  .map((r, i) => (
                    <UserCard key={i} reaction={r} />
                  )
                )}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
