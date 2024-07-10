// 
import React from 'react';
// import { Link } from 'react-router-dom';
import { FormProps, FormData } from './FormProps';
import { useRouter } from 'next/navigation';
import { setErrors,handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch } from '../../redux/hooks';
import { useSelector } from 'react-redux';


const Second: React.FC = () => {
  const navigate = useRouter().push;
  const dispatch = useAppDispatch();
  const { currentStep, formData, errors } = useSelector((state: RootState) => state.signups);

  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (name === 'email') {
      if(value.length > 0 ) newErrors.email = '';
    } else if (name === 'username'){
      if(value.length > 0 ) newErrors.username = '';
    }
    dispatch(setErrors(newErrors))
  }
  
  const onNext = () => {
    dispatch(handleNext(2));
  };

  const onPrevious = () => {
    dispatch(handlePrevious(0));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(updateFormData({ [name]: value }));
  };

  return (
    <>
        <div className='input-tags'>
            <label className="w-600 after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='email'>Email</label>
            <input className='inps w-600 input1' type='text' id='email' name='email' placeholder='Emaill...' onInput={onInput} value={formData.email} onChange={onInputChange}  required/>
            {errors.email && <div className='warnring'>{errors.email}</div>}
        </div>
        <div className='input-tags'>
            <label className="w-600 after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='username'>Username</label>
            <input className='inps w-600 input1' type='text' id='username' name='username' placeholder='Username...' onInput={onInput} value={formData.username} onChange={onInputChange} required/>
            {errors.username && <div className='warnring'>{errors.username}</div>}
        </div>
        <div className='buttons'>
                <button type='button' className='previous' onClick={onPrevious}>
                    Previous
                    <div className='loader'></div>
                </button>
                <button type='button' className='next' onClick={onNext}>
                  Next
                  <div className='loader'></div>
                </button>
        </div>
    </>
  );
};

export default Second;
