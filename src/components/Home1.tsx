"use client";
import React, { useEffect, useState } from 'react';
import { getStatus, getPosts } from './getStatus';
import Posts from '../templates/posts';
import { PostData } from '../templates/PostProps';
import NavBar from '../templates/navbar';

const Homepage: React.FC = () => {
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string[] | null>(null);

    const [postsLoading, setpostsLoading] = useState<boolean>(true);
    const [postsError, setpostsError] = useState<string | null>(null);
    const [postsSuccess, setpostsSuccess] = useState<PostData[] | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                const statusResponse = await getStatus();
                setSuccess(statusResponse);
            } catch (error) {
                setError((error as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    useEffect(() => {
        const fetchData = async () => {
            setpostsLoading(true);

            try {
                const postsResponse = await getPosts();
                setpostsSuccess(postsResponse);
            } catch (error) {
                setpostsError((error as Error).message);
            } finally {
                setpostsLoading(false);
            }
        };

        fetchData();
    }, []);
    
    return (
      <>
        <NavBar route='home'/>
        <div id='home'>

            <div className='pre-status'>
                <div className='status'>
                {loading ? <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '10%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>
                    : 
                    success && success.length ? (
                        success.map((status: string, index: number) => (
                            <div key={index} id={`status-${index}`} className='status-child' style={{ backgroundImage: `url(https://s3.amazonaws.com/profile-display-images/${status})`}} ></div>
                        ))) 
                    : 
                    error && <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '10%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>}
                </div>
            </div>

            <div className='h3'>
                <h3>Connect with friends and the world around you on noow.</h3>
            </div>

            <>
                {postsLoading ?<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>
                    :
                    postsSuccess && postsSuccess.length ? (
                        postsSuccess.map((post) => (
                            <Posts key={post._id} postData={post}/>
                        )))
                    :
                    postsError && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '80%'}}><div style={{height: '30px', width: '30px'}} className='loader show'></div></div>
                }
            </>
        </div>
      </>
    );
}
export default Homepage;