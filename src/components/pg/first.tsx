'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { FormProps, FormData } from './FormProps';
import { setErrors, handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';


const First: React.FC = () => {
  const navigate = useRouter().push;
  const dispatch = useAppDispatch();
  const { currentStep, formData, errors } = useAppSelector((state: RootState) => state.signups);

  const onNext = () => {
    dispatch(handleNext(1));
  };

  // const onPrevious = () => {
  //   dispatch(handlePrevious(0));
  // };
  
  const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (name === 'firstname') {
      if(value.length > 0 ) newErrors.firstname = '';
    } else if (name === 'lastname'){
      if(value.length > 0 ) newErrors.lastname = '';
    }
    dispatch(setErrors(newErrors))
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(updateFormData({ [name]: value }));
  };
  return (
    <div className=''>
        <div className='input-tags'>
            <label className="w-600 after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='firstname'>Firstname</label>
            <input className='inps w-600 input1' type='text' id='firstname' name='firstname' onInput={onInput} value={formData.firstname} onChange={onInputChange} placeholder='Firstname' required/>
            {errors.firstname && <div className='warning'>{errors.firstname}</div>}
        </div>
        <div className='input-tags'>
            <label className="w-600 after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='lastname'>Lastname</label>
            <input className='inps w-600 input1' type='text' id='lastname' name='lastname' onInput={onInput} value={formData.lastname} onChange={onInputChange} placeholder='Lastname' required/>
            {errors.lastname && <div className='warning'>{errors.lastname}</div>}
        </div>
        <button type='button' className='next bg-gradient-to-r from-purple-500 to-pink-500' onClick={onNext}>
            Next
            <div className='loader'></div>
        </button>
    </div>
  );
};

export default First;
