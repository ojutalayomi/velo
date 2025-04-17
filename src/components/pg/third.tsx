// 
import React, { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';
import { useRouter } from 'next/navigation';
import { FormData } from './FormProps';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontAwesomeLibrary';
import { setError,setErrors,handleNext, handlePrevious, updateFormData } from '../../redux/signupSlice';
import { RootState } from '../../redux/store';
import { useAppDispatch } from '../../redux/hooks';
import { useSelector } from 'react-redux';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X } from 'lucide-react';

  
const Third: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEye, setIsEye] = useState(true);
  const dispatch = useAppDispatch();
  const { currentStep, loading, formData, error, error1, errors } = useSelector((state: RootState) => state.signups);

  // const onNext = () => {
  //   dispatch(handleNext(1));
  // };

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

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
      if (value.length > 0) {
        if (!isValidPassword(value)) {
          newErrors.password = 'Password must be 6-20 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.';
        } else {
          newErrors.password = '';
        }
        dispatch(setError(!!newErrors.password));
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
    <div className='space-y-4'>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Input
            id="file"
            type="file"
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files[0]) {
                dispatch(updateFormData({ file: files[0] }));
                const objectUrl = URL.createObjectURL(files[0]);
                setPreview(objectUrl);
              }
            }}
            accept="image/png, image/jpeg"
          />
          <label 
            htmlFor="file" 
            className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-brand transition-colors"
          >
            {preview ? (
              <div className="relative w-32 h-32">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                    setPreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-1 text-sm text-gray-600">Click to upload image</p>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG up to 10MB</p>
              </div>
            )}
          </label>
        </div>
      </div>
      <div className='flex flex-col justify-between gap-2'>
        <label className="text-start font-semibold after:content-['*'] after:ml-0.5 after:text-red-500 text-xs hover:text-base" htmlFor='password'>Password</label>
        <div className='relative'>
            <Input className='font-semibold' type={isEye ? 'password' : 'text'} id='password' name='password' onInput={onInput} placeholder='Password...' value={formData.password} onChange={onInputChange}  required/>
            <FontAwesomeIcon onClick={() => setIsEye(!isEye)} icon={isEye ? 'eye-slash' : 'eye'} className='icon-eye absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400' size="lg" />
        </div>
        {errors.password && <div className='warning'>{errors.password}</div>}
      </div>
      <div className='flex items-center justify-between gap-2'>
        <Button type='button' className='bg-brand w-1/2' onClick={onPrevious}>
            Previous
            <div className='loader'></div>
        </Button>
        <Button className='bg-brand w-1/2' disabled={!formData.password || error || loading}>
        {loading ? <div className='loader show'></div> : <span>Submit</span>}
        </Button>
      </div>
    </div>
  );
};

export default Third;
