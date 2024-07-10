'use client'
import React, { ReactNode, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setLoading, setError1, setSuccess } from '@/redux/signupSlice';
import { RootState } from '@/redux/store';
import { useAppDispatch } from '@/redux/hooks';
import SubmitForm from '@/components/pg/submitButton';
import { FormData } from '@/components/pg/FormProps';
import First from '@/components/pg/first';
import Second from '@/components/pg/second';
import Third from '@/components/pg/third';

  
const initialFormData: FormData = {
    firstname: '',
    lastname: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
};

interface CompsProps {
    children: ReactNode;
}

const Comps: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentStep, loading, formData, error, error1 } = useSelector((state: RootState) => state.signups);
        
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // if (!passwordsMatch) return;
        setLoading(true);
        setError1(null);
        try {
            await SubmitForm(formData);
            setSuccess(true);
        } catch (error: any) {
            setError1(error.message);
        } finally {
            setLoading(false);
        }
      };

        return (
          <form onSubmit={handleSubmit}>
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
              <Link href='/accounts/forgot-password'>Forgot Password?</Link>
            </div>
          </form>
        )
        
}

export default Comps;