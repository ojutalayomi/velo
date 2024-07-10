'use client'
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import './fontAwesomeLibrary';
import { /*useEffect,*/ useState } from 'react';

interface FormData{
    prePassword: string;
    password: string;
}

const form: FormData = {
    prePassword: '',
    password: '',
};

const url: string = `/api/reset-password`;
const postData = async (data: FormData): Promise<void> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({password: data.password}),
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
};

const ResetPassword: React.FC = () => {
    const [formData, setFormData] = useState<FormData>(form);
    const [isEye, setIsEye] = useState(true);
    const [isEye1, setIsEye1] = useState(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [passwordsMatch, setPasswordsMatch] = useState<boolean>(true);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordsMatch) {
            return;
        }
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

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        if (name === 'password' || name === 'prePassword') {
            setPasswordsMatch(formData.prePassword === value);
        };
    };

    

    return (
        <div className='child'>
            <div className='item'>
                <h1>Fill in your new password.</h1>
                <h2>Don&apos;t have an account? 
                    <Link className='link tom' href='/signup'> Sign Up</Link>
                </h2>
            </div>
            <div className='item'>
                <form onSubmit={handleSubmit}>
                    <div className='input-tags'>
                        <label className='w-600'>Enter Password.</label>
                        <div className='input2'>
                            <input className='inps w-600' name='prePassword' type={isEye ? 'password' : 'text'}  id='pass-word' value={formData.prePassword} placeholder='Password..' onChange={handleInputChange} required/>
                            <FontAwesomeIcon onClick={() => setIsEye(!isEye)} icon={isEye ? 'eye-slash' : 'eye'} className='icon-eye' size="lg" />
                        </div>
                    </div>
                    <div className='input-tags'>
                        <label className='w-600'>Enter password again.</label>
                        <div className='input2'>
                            <input className='inps w-600' name='password' type={isEye1 ? 'password' : 'text'}  id='password' value={formData.password} onInput={handleInput} placeholder='Password...' onChange={handleInputChange} required/>
                            <FontAwesomeIcon onClick={() => setIsEye(!isEye1)} icon={isEye1 ? 'eye-slash' : 'eye'} className='icon-eye' size="lg" />
                        </div>
                        {!passwordsMatch && <div className='warning'>Passwords do not match</div>}
                        {error && <div className='error'>{error}</div>}
                    </div>
                    <button className='submit' disabled={loading}>
                    {loading ? <div className='loader show'></div> : success ? <span>Password changed!</span> : <span>Change your Password</span>}
                    </button>
                </form>
            </div>
        </div>
    ) 
}

export default ResetPassword;