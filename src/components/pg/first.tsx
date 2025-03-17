'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { FormProps, FormData } from './FormProps';
import { setErrors, handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { Input } from '../ui/input';
import { Button } from '../ui/button';


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
    <div className='space-y-4'>
        <div className='flex flex-col justify-between gap-2'>
            <label className="text-start font-semibold after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='firstname'>Firstname</label>
            <Input className='font-semibold' type='text' id='firstname' name='firstname' onInput={onInput} value={formData.firstname} onChange={onInputChange} placeholder='Firstname' required/>
            {errors.firstname && <div className='warning'>{errors.firstname}</div>}
        </div>
        <div className='flex flex-col justify-between gap-2'>
            <label className="text-start font-semibold after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='lastname'>Lastname</label>
            <Input className='font-semibold' type='text' id='lastname' name='lastname' onInput={onInput} value={formData.lastname} onChange={onInputChange} placeholder='Lastname' required/>
            {errors.lastname && <div className='warning'>{errors.lastname}</div>}
        </div>
        <Button type='button' className='w-full bg-brand text-white p-2 rounded-lg shadow font-semibold' onClick={onNext} disabled={!formData.firstname || !formData.lastname}>
            Next
            <div className='loader'></div>
        </Button>
    </div>
  );
};

export default First;
