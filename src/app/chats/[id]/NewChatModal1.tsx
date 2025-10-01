import React, { useState } from "react";
import { X } from "lucide-react";
interface User {
  id: string | number;
  name: string;
  avatar?: string;
  email?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (chatData: { name: string; participants: (string | number)[] }) => void;
  availableUsers: User[];
}

type UserId = string | number;

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
  availableUsers,
}) => {
  const [chatName, setChatName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserId[]>([]);

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onCreateChat({ name: chatName, participants: selectedUsers });
    onClose();
  };

  const toggleUser = (userId: UserId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Start a New Chat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="chatName" className="block text-sm font-medium text-gray-700 mb-2">
              Chat Name
            </label>
            <input
              type="text"
              id="chatName"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participants
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md">
              {availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => toggleUser(user.id as UserId)}
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id as UserId)}
                    onChange={() => {}}
                    className="mr-2"
                  />
                  <span>{user.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Chat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;
export type { NewChatModalProps, User };
