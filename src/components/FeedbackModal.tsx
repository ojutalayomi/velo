'use client'
import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';

const WhatsApp = ({size}: {size: number}) => {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" height={size+'px'} width={size+'px'} aria-label="WhatsApp" role="img" viewBox="0 0 512 512" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><rect width="512" height="512" rx="15%" fill="#25d366"></rect><path fill="#25d366" stroke="#ffffff" strokeWidth="26" d="M123 393l14-65a138 138 0 1150 47z"></path><path fill="#ffffff" d="M308 273c-3-2-6-3-9 1l-12 16c-3 2-5 3-9 1-15-8-36-17-54-47-1-4 1-6 3-8l9-14c2-2 1-4 0-6l-12-29c-3-8-6-7-9-7h-8c-2 0-6 1-10 5-22 22-13 53 3 73 3 4 23 40 66 59 32 14 39 12 48 10 11-1 22-10 27-19 1-3 6-16 2-18"></path></g></svg>
    )
}

const FeedbackModal: React.FC<{isOpen: () => boolean; onClose: () => void}> = ({ isOpen, onClose }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log('Feedback submitted:', message);
    setMessage('');
    onClose();
  };

  const openWhatsApp = () => {
    window.open('https://wa.me/1234567890', '_blank');
  };

  const openEmail = () => {
    window.location.href = 'mailto:feedback@example.com';
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 dark:bg-gray-900 bg-gray-200`}>
      <div className={`relative w-full max-w-md p-6 rounded-lg shadow-lg dark:bg-gray-800 dark:text-white bg-white text-gray-800`}>
        <button
          onClick={onClose}
          className={`absolute top-2 right-2 p-1 rounded-full dark:hover:bg-gray-700 hover:bg-gray-200`}
        >
          <X size={24} />
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Provide Feedback</h2>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={openWhatsApp}
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 dark:bg-green-600 dark:hover:bg-green-700 bg-green-500 hover:bg-green-600 text-white transition duration-300`}
          >
            <WhatsApp size={20} />
            <span>Contact via WhatsApp</span>
          </button>
          
          <button
            onClick={openEmail}
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 dark:bg-blue-600 dark:hover:bg-blue-700 bg-blue-500 hover:bg-blue-600 text-white transition duration-300`}
          >
            <Mail size={20} />
            <span>Send Email</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your feedback here..."
            className={`w-full p-2 rounded-lg mb-4 'dark:bg-gray-700 dark:text-white bg-gray-100 text-gray-800 border dark:border-gray-600 border-gray-300`}
            rows={4}
          ></textarea>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 dark:bg-purple-600 dark:hover:bg-purple-700 bg-purple-500 hover:bg-purple-600 text-white transition duration-300`}>
            <Send size={20} />
            <span>Submit Feedback</span>
          </button>
        </form>
        
        <div className="mt-4 flex items-center justify-end">
          <label htmlFor="darkModeToggle" className="mr-2">Dark Mode</label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              name="darkModeToggle"
              id="darkModeToggle"
              checked={isDarkMode}
              onChange={toggleDarkMode}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="darkModeToggle"
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer dark:bg-purple-600 bg-gray-300`}
            ></label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;