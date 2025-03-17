// 
import React from 'react';
// import { Link } from 'react-router-dom';
import { FormProps, FormData } from './FormProps';
import { useRouter } from 'next/navigation';
import { setErrors,handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch } from '../../redux/hooks';
import { useSelector } from 'react-redux';
import { Input } from '../ui/input';
import { Button } from '../ui/button';


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
    <div className='space-y-4'>
      <div className='flex flex-col justify-between gap-2'>
        <label className="font-semibold text-start after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='email'>Email</label>
        <Input className='font-semibold' type='text' id='email' name='email' placeholder='Emaill...' onInput={onInput} value={formData.email} onChange={onInputChange}  required/>
        {errors.email && <div className='warnring'>{errors.email}</div>}
      </div>
      <div className='flex flex-col justify-between gap-2'>
        <label className="font-semibold text-start after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='username'>Username</label>
        <Input className='font-semibold' type='text' id='username' name='username' placeholder='Username...' onInput={onInput} value={formData.username} onChange={onInputChange} required/>
        {errors.username && <div className='warnring'>{errors.username}</div>}
      </div>
      <div className='flex items-center justify-between gap-2'>
        <Button type='button' className='bg-brand w-1/2' onClick={onPrevious}>
          Previous
          <div className='loader'></div>
        </Button>
        <Button type='button' className='bg-brand w-1/2' onClick={onNext} disabled={!formData.email || !formData.username}>
          Next
          <div className='loader'></div>
        </Button>
      </div>
    </div>
  );
};

export default Second;
