'use client'
// import { useEffect } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import Wrapper from './AccountComponentWrapper';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface FormData{
    email: string;
}

const initialFormData: FormData = {
    email: '',
};

const url: string = `${process.env.REACT_APP_LOCAL_DOMAIN}/forgot-password`;
const postData = async (data: FormData): Promise<void> => {
    const response = await fetch( url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email: data.email}),
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
};

const ForgotPassword: React.FC = () => {
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData(prevData => ({
          ...prevData,
          [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await postData(formData);
            setSuccess(true);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Wrapper 
        header={
            <div className='flex flex-col gap-2'>
                <h1>Fill in your email to reset your password.</h1>
                <h2>Don&apos;t have an account? 
                    <Link className='' href='/accounts/signup'> Sign Up</Link>
                </h2>
            </div>
        }
        body={
            <form className='space-y-2 p-2' onSubmit={handleSubmit}>
                <div className='flex flex-col justify-between gap-2'>
                    <label className='font-semibold text-start'>Email</label>
                    <Input className='font-semibold input1' type='email' name='email' id='email' value={formData.email} placeholder='Email..' onChange={handleInputChange} disabled={loading} required/>
                    {error && <div className='error'>{error}</div>}
                </div>
                <Button className='submit' disabled={loading}>
                    {loading ? <div className='loader show'></div> : success ? <span>Reset link sent!</span> : <span>Get link</span>}
                </Button>
            </form>
        }/>
    ) 
}

export default ForgotPassword;