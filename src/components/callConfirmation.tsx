import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ConvoType } from "@/redux/chatSlice";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface Props {
  id: string,
  show: boolean, 
  conversations: ConvoType[]
}
  
  export function ConfirmCall({ id, show, conversations }: Props) {
    const router = useRouter();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const conversation = conversations.find(convo => convo.id === id);

    useEffect(() => {
      if(show){
        buttonRef.current?.click()
      }
    }, [show])

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            ref={buttonRef}
            className="hidden" 
            variant="outline"
          >
            Open
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Call</AlertDialogTitle>
            <AlertDialogDescription>
              You have a call from {conversation?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Decline</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/call?id='+id)+'&accept=true'}>Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }
  