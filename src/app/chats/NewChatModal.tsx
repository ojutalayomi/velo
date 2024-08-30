import React from 'react';

interface NewChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (arg: string) => void;
    username: string | string[];
}

const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onConfirm, username }) => {
  if (!isOpen) return null;
  const chattype = typeof username === 'string' ? 'Chats' : 'Groups';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Start new chat
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Are you sure you want to start a new chat with <b className='text-brand'>@{username}</b>?
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              No
            </button>
            <button
              onClick={() => onConfirm(chattype)}
              className="px-4 py-2 bg-brand/90 border border-transparent rounded-md text-sm font-medium text-white hover:bg-brand focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Yes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;