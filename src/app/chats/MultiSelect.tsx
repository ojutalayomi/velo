import { deleteMessage, editMessage, updateConversation } from "@/redux/chatSlice";
import { RootState } from "@/redux/store";
import { clearSelectedMessages } from "@/redux/utilsSlice";
import { useDispatch, useSelector } from "react-redux";
import { useSocket } from "@/app/providers/SocketProvider";

export const MultiSelect = () => {
    const dispatch = useDispatch();
    const socket = useSocket();
    const { messages } = useSelector((state: RootState) => state.chat);
    const { selectedMessages } = useSelector((state: RootState) => state.utils);

    const forwardMessages = () => {

    }

    const shareMessages = () => {
        
    }

    const deleteMessages = () => {
        selectedMessages.map(msg => {
            const currentMessage = messages.find(msg1 => msg1._id === msg)
            if(!currentMessage?.content.endsWith('≤≤≤')){
                if(socket){
                    dispatch(updateConversation({ id: msg, updates: { lastMessage: 'This msg was deleted' } }));
                    dispatch(editMessage({id: msg, content: 'You deleted this msg.≤≤≤'}))
                    socket.emit('updateConversation',{ id: msg, updates: { deleted: true } })
                }
            } else {
                dispatch(deleteMessage(msg));
            }})
            dispatch(clearSelectedMessages());
    }

    return (
        <div className='bg-white/80 dark:bg-zinc-900/80 w-full max-w-full relative p-4 text-xs flex items-center justify-between'>
            <div>{selectedMessages.length} selected</div>
            <div className='border rounded-md flex max-w-[70%] items-center justify-evenly'>
            <div className='h-auto text-xs p-2 cursor-pointer' onClick={forwardMessages}>Forward</div>
            <div className='h-auto text-xs p-2 cursor-pointer' onClick={shareMessages}>Share</div>
            <div className='h-auto text-xs p-2 cursor-pointer' onClick={deleteMessages}>Delete</div>
            </div>
            <button className="cursor-pointer" onClick={() => dispatch(clearSelectedMessages())}>Cancel</button>
        </div>
    )
}