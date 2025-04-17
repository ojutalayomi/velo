'use client'
import React, { useState } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import Link from 'next/link';
import { FormData } from './pg/FormProps';
import First from './pg/first';
import Second from './pg/second';
import Third from './pg/third';
// import ToggleIcon from '../ToggleIcon';

  
const initialFormData: FormData = {
  firstname: '',
  lastname: '',
  email: '',
  displayPicture: '',
  username: '',
  password: '',
  confirmPassword: '',
  file: null
};

const SignUp: React.FC = () => {
        const [formData, setFormData] = useState<FormData>(initialFormData);
        const [errors, setErrors] = useState<FormData>(initialFormData);
        const navigate = useNavigate();
      
      
        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          const { name, value } = event.target;
          setFormData(prevData => ({
            ...prevData,
            [name]: value,
          }));
        };

        const handleValidation = (page: number) => {
            let valid = true;
            const newErrors: FormData = { ...initialFormData };
        
            if (page === 0 || page === 1 || page === 2) {
              if (!formData.firstname) {
                newErrors.firstname = 'Firstname is required';
                valid = false;
              }
              if (!formData.lastname) {
                newErrors.lastname = 'Lastname is required';
                valid = false;
              }
            }
            if (page === 1 || page === 2) {
              if (!formData.email) {
                newErrors.email = 'Email is required';
                valid = false;
              }
              if (!formData.username) {
                newErrors.username = 'Username is required';
                valid = false;
              }
            }
            if (page === 2) {
              if (!formData.password) {
                newErrors.password = 'Password is required';
                valid = false;
              }
            }
        
            setErrors(newErrors);
            return valid;
        };
    
        const handleNext = (currentStep: number) => {
            if (handleValidation(currentStep)) {
                navigate(`/signup/${currentStep + 1}`);
            }
        };

        const handlePrevious = (currentStep: number) => {
            if(currentStep <= 1){
                return navigate(`/signup`);
            } else {
                return navigate(`/signup/${currentStep - 1}`);
            }
        };

        const handleSubmit = () => {}


    return (
        <div className='child'>
            <div className='item'>
                <h1>Create your account today.</h1>
                <h2>Already have an account? 
                    <Link className='link tom' href='/accounts/signin'> Sign In</Link>
                </h2>
            </div>
            <div className='item'>
                <div className='otherOptions'>
                    <button className='google' disabled>
                        <svg width='30px' height='30px' viewBox='-0.5 0 48 48' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' fill='#000000'><g id='SVGRepo_bgCarrier' strokeWidth='0'></g><g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g><g id='SVGRepo_iconCarrier'> <title>Google-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id='Icons' stroke='none' strokeWidth='1' fill='none' fillRule='evenodd'> <g id='Color-' transform='translate(-401.000000, -860.000000)'> <g id='Google' transform='translate(401.000000, 860.000000)'> <path d='M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24' id='Fill-1' fill='#FBBC05'> </path> <path d='M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333' id='Fill-2' fill='#EB4335'> </path> <path d='M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667' id='Fill-3' fill='#34A853'> </path> <path d='M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24' id='Fill-4' fill='#4285F4'> </path> </g> </g> </g> </g></svg>
                        <b className='w-600'>Google</b>
                    </button>
                    <button className='facebook' disabled>
                        <svg width='30px' height='30px' viewBox='0 0 48 48' version='1.1' xmlns='http://www.w3.org/2000/svg' xmlnsXlink='http://www.w3.org/1999/xlink' fill='#000000'><g id='SVGRepo_bgCarrier' strokeWidth='0'></g><g id='SVGRepo_tracerCarrier' strokeLinecap='round' strokeLinejoin='round'></g><g id='SVGRepo_iconCarrier'> <title>Facebook-color</title> <desc>Created with Sketch.</desc> <defs> </defs> <g id='Icons' stroke='none' strokeWidth='1' fill='none' fillRule='evenodd'> <g id='Color-' transform='translate(-200.000000, -160.000000)' fill='#4460A0'> <path d='M225.638355,208 L202.649232,208 C201.185673,208 200,206.813592 200,205.350603 L200,162.649211 C200,161.18585 201.185859,160 202.649232,160 L245.350955,160 C246.813955,160 248,161.18585 248,162.649211 L248,205.350603 C248,206.813778 246.813769,208 245.350955,208 L233.119305,208 L233.119305,189.411755 L239.358521,189.411755 L240.292755,182.167586 L233.119305,182.167586 L233.119305,177.542641 C233.119305,175.445287 233.701712,174.01601 236.70929,174.01601 L240.545311,174.014333 L240.545311,167.535091 C239.881886,167.446808 237.604784,167.24957 234.955552,167.24957 C229.424834,167.24957 225.638355,170.625526 225.638355,176.825209 L225.638355,182.167586 L219.383122,182.167586 L219.383122,189.411755 L225.638355,189.411755 L225.638355,208 L225.638355,208 Z' id='Facebook'> </path> </g> </g> </g></svg>
                        <b className='w-600'>Facebook</b>
                    </button>
                </div>
                <div className='or'>
                    <hr/>
                    <div>Or</div>
                    <hr/>
                </div>
                <form onSubmit={handleSubmit}>
                    <Routes>
                        <Route path="/" element={<First />} />
                        <Route path="/1" element={<Second />} />
                        <Route path="/2" element={<Third />} />
                    </Routes>
                    <div className='forgot-password'>
                        <Link href='/accounts/forgot-password'>Forgot Password?</Link>
                    </div>
                </form>
            </div>
        </div>
    ) 
}

export default SignUp;