'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Sun, Send } from 'lucide-react';

const WhatsApp = ({size}: {size: number}) => {
  return (
      <svg fill="#ffffff" height={size+'px'} width={size+'px'} version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 220.262 220.262" xmlSpace="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M110.127,0C50.606,0,2.184,48.424,2.184,107.944c0,23.295,9.455,44.211,13.521,52.123 c1.893,3.685,6.416,5.135,10.099,3.243c3.684-1.893,5.136-6.415,3.243-10.099c-3.566-6.941-11.862-25.247-11.862-45.268 C17.184,56.695,58.878,15,110.127,15c51.254,0,92.951,41.695,92.951,92.944c0,51.251-41.697,92.946-92.951,92.946 c-20.044,0-35.971-6.94-41.889-9.925c-1.755-0.886-3.788-1.046-5.66-0.447l-47.242,15.097c-3.945,1.261-6.122,5.481-4.861,9.427 c1.018,3.187,3.968,5.219,7.142,5.219c0.757,0,1.526-0.115,2.285-0.358l44.391-14.186c9.287,4.311,25.633,10.173,45.834,10.173 c59.524,0,107.951-48.424,107.951-107.946C218.078,48.424,169.651,0,110.127,0z"></path> <path d="M88.846,89.537c-3.285,2.523-3.902,7.231-1.38,10.517c2.523,3.285,7.23,3.903,10.517,1.38 c2.299-1.766,8.406-6.456,7.512-14.845c-0.551-4.987-5.417-11.83-9.402-16.691c-5.831-7.114-10.767-11.327-14.643-12.513 c-3.632-1.126-7.354-0.948-11.066,0.53c-7.636,3.052-13.025,8.108-15.585,14.622c-2.493,6.344-2.04,13.443,1.313,20.537 c7.827,16.522,18.288,30.791,31.093,42.413c0.05,0.047,0.101,0.093,0.152,0.139c12.987,11.48,28.352,20.325,45.675,26.293 c3.287,1.129,6.513,1.692,9.611,1.692c3.892,0,7.583-0.888,10.94-2.658c6.191-3.264,10.621-9.177,12.814-17.115 c1.056-3.848,0.82-7.564-0.689-11.024c-1.619-3.745-6.35-8.184-14.064-13.193c-5.269-3.422-12.601-7.5-17.64-7.5 c-0.003,0-0.007,0-0.011,0c-8.406,0.034-12.397,6.621-13.899,9.102c-2.146,3.543-1.014,8.155,2.529,10.301 c3.541,2.146,8.154,1.015,10.301-2.529c0.593-0.98,0.969-1.5,1.205-1.772c4.236,1.23,15.567,8.642,17.889,11.761 c0.038,0.166,0.043,0.417-0.082,0.874c-0.739,2.675-2.268,6.204-5.349,7.828c-2.879,1.516-6.312,0.863-8.677,0.051 c-15.413-5.31-29.053-13.142-40.543-23.279c-0.003-0.003-0.007-0.006-0.01-0.01c-11.377-10.308-20.693-23.023-27.688-37.788 c-1.071-2.268-2.1-5.607-0.91-8.634c1.274-3.242,4.613-5.15,7.183-6.177c0.441-0.176,0.69-0.203,0.871-0.179 c3.358,1.965,11.969,12.402,13.66,16.477C90.229,88.41,89.753,88.84,88.846,89.537z"></path> </g> </g></svg>
  )
}

const X = ({size}: {size: number}) => {
  return (
    <svg fill="#ffffff" viewBox="0 0 24 24" height={size+'px'} width={size+'px'} aria-hidden="true" className=""><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
  )
}

const FeedbackPage = () => {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState('');

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log('Feedback submitted:', message);
    setMessage('');
  };

  return (
    <div className={`min-h-screen dark:bg-neutral-950 dark:text-white bg-white text-gray-900`}>
      <div className="p-4">
        <div className="flex justify-start gap-2.5 items-center mb-8">
          <ArrowLeft className='cursor-pointer dark:text-slate-200' size={20} />
          <h1 className="text-xl font-bold">Feedback</h1>
        </div>
        
        <div className="space-y-4">
          <button 
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 dark:bg-green-600 dark:hover:bg-green-700 bg-green-500 hover:bg-green-600 text-white transition duration-300"
            onClick={() => window.open('https://wa.me/+2349056519477', '_blank')}
          >
            <WhatsApp size={20} />
            <span>Contact via WhatsApp</span>
          </button>
          
          <button 
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 dark:bg-blue-600 dark:hover:bg-blue-700 bg-blue-500 hover:bg-blue-600 text-white transition duration-300"
            onClick={() => window.open('mailto:noreply.noow@gmail.com', '_blank')}
          >
            <Mail size={20} />
            <span>Send Email</span>
          </button>

          <button 
            className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 bg-zinc-950 dark:border dark:border-slate-200 dark:hover:bg-gray-700 hover:bg-gray-200 text-white transition duration-300"
            onClick={() => window.open('https://x.com/messages?recipient_id=1150785912697176064', '_blank')}
          >
            <X size={24} />
            <span>Send Direct Message</span>
          </button>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              placeholder="Enter your feedback here..."
              value={message}
              onChange={(e: { target: { value: React.SetStateAction<string>; }; }) => setMessage(e.target.value)}
              className={`w-full p-2 rounded-lg mb-4 dark:bg-gray-700 dark:text-white bg-gray-100 text-gray-800 border dark:border-gray-600 border-gray-300`}
              rows={5}
            ></textarea>
            <button type="button" className="w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 bg-brand hover:bg-tomatom text-white transition duration-300">
              <Send className="mr-2 h-4 w-4" /> Send Feedback
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;