'use client'
import React, { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { setLoading, setError1, setSuccess, updateFormData } from '@/redux/signupSlice';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import SubmitForm from '@/components/pg/submitButton';
import First from '@/components/pg/first';
import Second from '@/components/pg/second';
import Third from '@/components/pg/third';
import Wrapper from '@/components/AccountComponentWrapper';
import { setUserData } from '@/redux/userSlice';
import { fetchChats } from '@/redux/chatSlice';
import { useSocket } from '@/app/providers/SocketProvider';
import { toast } from '@/hooks/use-toast';


const Comps: React.FC = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const backTo = searchParams?.get('backto');
  const userData = useSelector((state: RootState) => state.user.userdata);
  const { currentStep, loading, formData, success, error, error1 } = useSelector((state: RootState) => state.signups);

  useEffect(() => {
    if(success) router.push(backTo || '/home');
    const fetchData = async () => {
        await fetchChats(dispatch);
    };
    fetchData();
    if(socket) {
        socket.on('connect', () => {
          console.log('Connected to server');
          socket.emit('register', userData._id);
        });
    }
  }, [success, router, backTo, dispatch, socket, userData]);
        
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!passwordsMatch) return;
    dispatch(setLoading(true));
    dispatch(setError1(null));
    try {
      if (formData.file && formData.file.name && formData.file.type) {

        const response = await fetch(
          '/api/upload',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ filename: formData.file.name, contentType: formData.file.type, bucketName: 'profile-display-images' }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to upload image');
        }

        const { url, fields } = await response.json();
        const formData1 = new FormData();

        for (const key in fields) {
          formData1.append(key, fields[key]);
        }

        formData1.append('file', formData.file);

        const uploadResponse = await fetch(url, {
          method: 'POST',
          body: formData1,
        });

        if (!uploadResponse.ok) { 
          throw new Error('Failed to upload image');
        } else {
          dispatch(updateFormData({ file: null, displayPicture: url + fields.key }));
        }

      } else {
        throw new Error('File must be uploaded before submitting the form');
      }

      const response = await SubmitForm(formData);
      dispatch(setUserData(response));
      dispatch(setSuccess(true));

    } catch (error: any) {
      dispatch(setError1(error.message));
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Wrapper
    auth='Sign up'
    header={
      <div className='flex flex-col gap-2'>
        <h1 className="text-2xl font-bold text-center">Sign Up</h1>
        <h2>
          Already have an account? 
          <Link className='text-brand hover:underline transition-all' href='/accounts/login'> Log In</Link>
        </h2>
      </div>
    }
    body={
      <form className='space-y-2 p-2' onSubmit={handleSubmit}>
        {(() => {
          switch (currentStep) {
            case 0:
              return <First />;
            case 1:
              return <Second />;
            case 2:
              return <Third />;
            default:
              return null;
          }
        })()}
        <div className='forgot-password'>
          <Link className='text-brand hover:underline transition-all' href='/accounts/forgot-password'>Forgot Password?</Link>
        </div>
      </form>
    }/>
  )
        
}

export default Comps;