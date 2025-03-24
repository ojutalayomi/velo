import { Post } from '@/templates/PostProps';
import { useCallback, useState } from 'react';

type PostStorageType = {
  post: Post | null,
  setPost: (post: Post) => void,
  editPost: (update: Partial<Post['post']>) => void,
  removePost: () => void,
}

const usePostStorage = (): PostStorageType => {
  const [post, setPost] = useState<Post | null>(null);

  const editPost = useCallback((update: Partial<Post['post']>) => {
    if(post) setPost({...post, ...update});
  }, []);

  const removePost = useCallback(() => {
    setPost(null);
  }, []);

  return {post, setPost, editPost, removePost};
};

export default usePostStorage