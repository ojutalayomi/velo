"use client";
import { useParams } from 'next/navigation';
import Image from "next/image";
import { Comments, Post } from '../../../../templates/PostProps';
import PostCard from '../../../../templates/posts';
import { useEffect, useRef, useState } from 'react';
import { getComments, getPost } from '../../../../components/getStatus';
import NavBar from '../../../../components/navbar';
import { useUser } from '@/hooks/useUser';
import { Skeleton } from '@/components/ui/skeleton';

const PostContent: React.FC = () => {
    const params = useParams();
    const { userdata, loading, error, refetchUser } = useUser();
    const [loading0, setLoading] = useState<boolean>(true);
    const [error0, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<Post>();
    const [loading1, setLoading1] = useState<boolean>(true);
    const [error1, setError1] = useState<string | null>(null);
    const [success1, setSuccess1] = useState<Comments>();
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
          if(params && params.id){
            try {
                const postsResponse = await getPost(params.id);
                setSuccess(postsResponse);
            } catch (error) {
                setError((error as Error).message);
            } finally {
                setLoading(false);
            }
          }
        };

        fetchData();
    }, [params,params?.id]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading1(true);
          if(params && params.id){
            try {
                const commentsResponse = await getComments(params.id);
                setSuccess1(commentsResponse);
            } catch (error) {
                setError1((error as Error).message);
            } finally {
                setLoading1(false);
            }
          }
        };

        fetchData();
    }, [params,params?.id]);

    useEffect(() => {
        const handleInput = () => {
            const textArea = textAreaRef.current;
            if (textArea) {
                textArea.style.height = '30px';
                textArea.style.height = `${textArea.scrollHeight}px`;
            }
        };

        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.addEventListener('input', handleInput);
            return () => {
                textArea.removeEventListener('input', handleInput);
            };
        }
    }, []);

    return(
        <div className='flex flex-col h-full w-full'>
            <NavBar route='post'/>
            <div id='postpage' className='dark:text-slate-200'>
                {loading0 
                ? 
                <div className="flex flex-col w-full space-y-3 cursor-progress mt-4 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-md">
                    <div className='flex items-center justify-start gap-2'>
                        <Skeleton className="size-10 rounded-full" />
                        <div className='flex flex-col space-y-2'>
                            <Skeleton className="h-4 w-16 rounded-xl" />
                            <Skeleton className="h-4 w-12 rounded-xl" />
                        </div>
                    </div>
                    <Skeleton className="h-8 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                    <Skeleton className="h-4 w-16 rounded-xl" />
                    <div className="flex items-center justify-around gap-2">
                        {[...Array(4)].map((_,i) => (
                            <Skeleton key={i++} className="size-8" />
                        ))}
                    </div>
                </div>
                :
                success
                ?
                <><PostCard key={success.post._id} postData={success.post} /></>
                : 
                error0 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '', fontSize: '1.5em'}} className=''>No comments!</div></div>
                }

                <div className='commentSection'>
                    {!error1 ? <div className='commentHeader'>Comments</div> : null}
                    {loading1 ? 
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>
                    :
                    success1 && success1.comments.length > 0 
                    ? 
                    (success1.comments.map((comment) => ( <PostCard key={comment._id} postData={comment} /> ))) 
                    : 
                    <div className='noComments'>No comments yet.</div>
                    }
                    {error1 && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '', fontSize: '1.5em'}} className=''>Post not found!</div></div>}
                </div>

            </div>
            <div className='commentBar relative w-full'>
                <Image src={userdata.dp ? 'https://s3.amazonaws.com/profile-display-images/'+userdata.dp : '/default.jpeg'} className='userPhoto' width={35} height={35} alt='logo'/>
                <div className='commentBarContent'>
                    <textarea className='make-comment' ref={textAreaRef} placeholder='Comment here...'></textarea>
                    <svg xmlns='http://www.w3.org/2000/svg' className='smile-emoji' viewBox='0 0 24 24' fill='none'>
                        <path d='M8.5 11C9.32843 11 10 10.3284 10 9.5C10 8.67157 9.32843 8 8.5 8C7.67157 8 7 8.67157 7 9.5C7 10.3284 7.67157 11 8.5 11Z' className='dark:fill-slate-200' fill='#242742fd'></path>
                        <path d='M17 9.5C17 10.3284 16.3284 11 15.5 11C14.6716 11 14 10.3284 14 9.5C14 8.67157 14.6716 8 15.5 8C16.3284 8 17 8.67157 17 9.5Z' className='dark:fill-slate-200' fill='#242742fd'></path>
                        <path d='M8.88875 13.5414C8.63822 13.0559 8.0431 12.8607 7.55301 13.1058C7.05903 13.3528 6.8588 13.9535 7.10579 14.4474C7.18825 14.6118 7.29326 14.7659 7.40334 14.9127C7.58615 15.1565 7.8621 15.4704 8.25052 15.7811C9.04005 16.4127 10.2573 17.0002 12.0002 17.0002C13.7431 17.0002 14.9604 16.4127 15.7499 15.7811C16.1383 15.4704 16.4143 15.1565 16.5971 14.9127C16.7076 14.7654 16.8081 14.6113 16.8941 14.4485C17.1387 13.961 16.9352 13.3497 16.4474 13.1058C15.9573 12.8607 15.3622 13.0559 15.1117 13.5414C15.0979 13.5663 14.9097 13.892 14.5005 14.2194C14.0401 14.5877 13.2573 15.0002 12.0002 15.0002C10.7431 15.0002 9.96038 14.5877 9.49991 14.2194C9.09071 13.892 8.90255 13.5663 8.88875 13.5414Z' className='dark:fill-slate-200' fill='#242742fd'></path>
                        <path fillRule='evenodd' clipRule='evenodd' d='M12 23C18.0751 23 23 18.0751 23 12C23 5.92487 18.0751 1 12 1C5.92487 1 1 5.92487 1 12C1 18.0751 5.92487 23 12 23ZM12 20.9932C7.03321 20.9932 3.00683 16.9668 3.00683 12C3.00683 7.03321 7.03321 3.00683 12 3.00683C16.9668 3.00683 20.9932 7.03321 20.9932 12C20.9932 16.9668 16.9668 20.9932 12 20.9932Z' className='dark:fill-slate-200' fill='#242742fd'></path>
                    </svg>
                    <svg className='upload-emoji' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
                        <path d='M12 15L12 2M12 2L15 5.5M12 2L9 5.5' className='dark:stroke-slate-200' stroke='#242742fd' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'></path>
                        <path className='dark:stroke-slate-200' d='M8 22.0002H16C18.8284 22.0002 20.2426 22.0002 21.1213 21.1215C22 20.2429 22 18.8286 22 16.0002V15.0002C22 12.1718 22 10.7576 21.1213 9.8789C20.3529 9.11051 19.175 9.01406 17 9.00195M7 9.00195C4.82497 9.01406 3.64706 9.11051 2.87868 9.87889C2 10.7576 2 12.1718 2 15.0002L2 16.0002C2 18.8286 2 20.2429 2.87868 21.1215C3.17848 21.4213 3.54062 21.6188 4 21.749' stroke='#242742fd' strokeWidth='1.1' strokeLinecap='round'></path>
                    </svg>
                    <svg xmlns='http://www.w3.org/2000/svg' className='send-comment' viewBox='0 0 24 24' fill='none'>
                        <path className='dark:stroke-slate-200' d='M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z' stroke='#242742fd' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'></path>
                    </svg>
                </div>
            </div>

        </div>
    )
}
export default PostContent;