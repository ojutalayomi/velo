// 
import React, { useState } from 'react';
// import { Link } from 'react-router-dom';
import { useRouter } from 'next/navigation';
import { FormData } from './FormProps';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontAwesomeLibrary';
import { setError,setErrors,handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch } from '../../redux/hooks';
import { useSelector } from 'react-redux';

  
const Third: React.FC = () => {
    const navigate = useRouter().push;
    const [isEye, setIsEye] = useState(true);
    const dispatch = useAppDispatch();
    const { currentStep, loading, formData, error, error1, errors } = useSelector((state: RootState) => state.signups);
  
    // const onNext = () => {
    //   dispatch(handleNext(1));
    // };

    const isValidPassword = (password: string) => {
      var re = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[.,\/#!$%\^&\*;:{}=\-_`~()]).{6,20}$/;
      return re.test(password);
    }

    const onInput = (event: React.ChangeEvent<HTMLInputElement>) => {
      // console.log(error);
      const { name, value } = event.target;
      // console.log(event.target);
      const newErrors: Partial<Record<keyof FormData, string>> = {};
      if (name === 'password') {
        if(value.length > 0 ) {
          newErrors.password = '';
          dispatch(setError(!isValidPassword(value)));
        }
      }
      dispatch(setErrors(newErrors))
    }
  
    const onPrevious = () => {
      dispatch(handlePrevious(1));
    };
  
    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      dispatch(updateFormData({ [name]: value }));
    };
  return (
    <>
        <div className='input-tags'>
            <label className="w-600 after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='password'>Password</label>
            <div className='input2'>
                <input className='inps w-600' type={isEye ? 'password' : 'text'} id='password' name='password' onInput={onInput} placeholder='Password...' value={formData.password} onChange={onInputChange}  required/>
                <FontAwesomeIcon onClick={() => setIsEye(!isEye)} icon={isEye ? 'eye-slash' : 'eye'} className='icon-eye' size="lg" />
            </div>
            {errors.password && <div className='warning'>{errors.password}</div>}
        </div>
        <div className='buttons'>
            <button type='button' className='previous' onClick={onPrevious}>
                Previous
                <div className='loader'></div>
            </button>
            <button className='submit' disabled={error}>
            {loading ? <div className='loader show'></div> : <span>Submit</span>}
            </button>
        </div>
    </>
  );
};

export default Third;
