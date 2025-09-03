'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ConvoType } from '@/lib/types/type';

interface ConfirmCallProps {
  id: string;
  show: boolean;
  conversations: ConvoType[];
  callerName?: string;
  callerAvatar?: string;
}

export function ConfirmCall({ id, show, conversations, callerName, callerAvatar }: ConfirmCallProps) {
  const router = useRouter();
  
  if (!show) return null;
  
  // Find conversation details
  const conversation = conversations.find(conv => conv.id === id);
  const displayName = callerName || conversation?.name || 'Unknown User';
  const displayAvatar = callerAvatar || conversation?.displayPicture;
  
  const handleAccept = () => {
    router.push(`/call?id=${id}&accept=true&from=${id}`);
  };
  
  const handleDecline = () => {
    // Emit decline event if needed
    router.push('/home');
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Phone className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl">Incoming Call</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Caller Info */}
          <div className="text-center">
            <Avatar className="w-16 h-16 mx-auto mb-3">
              <AvatarImage src={displayAvatar} alt={displayName} />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">{displayName}</h3>
            <p className="text-sm text-muted-foreground">
              {conversation?.type === 'Groups' ? 'Group Call' : 'Voice Call'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1 h-12"
            >
              <PhoneOff className="h-5 w-5 mr-2" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-5 w-5 mr-2" />
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
  