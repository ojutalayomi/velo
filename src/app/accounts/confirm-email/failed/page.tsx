'use client'
import { Button } from "@/components/ui/button";
import { Link, BadgeX, Loader, X } from "lucide-react";
import { generateCode } from "./action";
import { Input } from "@/components/ui/input";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export default function FailedPage() {
    return (
        <Suspense fallback={<></>}>
            <FailedPageClient />
        </Suspense>
    )
}

function FailedPageClient() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams?.get('message');
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (!errorMessage) return;
        toast({
            title: 'Error',
            description: errorMessage,
        })
    }, [errorMessage])

    useEffect(() => {
        setTimeout(() => {
            setMessage('')
        }, 3000);
    }, [message])

    async function handleClick() {
        setLoading(true)
        const response = await generateCode({ 
            email: email
        });
        console.log(response)
        setMessage(response.message)
        setLoading(false)
    }

    return (
        <div className='dark:text-white'>
            <div className='flex flex-col items-center justify-center gap-2'>
                <BadgeX size={60} className="text-red-600"/>
                <h1>We are sorry your email couldn&apos;t be confirmed. Please try again.</h1>
                {message && (
                    <div className="cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-700 shadow-inner shadow-gray-300 dark:shadow-zinc-700 transition-colors rounded-lg flex flex-1 break-words text-sm dark:text-slate-200 overflow-hidden">
                        <div className="w-1 h-12 bg-brand rounded-full flex-shrink-0"></div>
                        <div className="line-clamp-2 mx-4 my-auto break-all">{message}</div>
                    </div>
                )}
                <Input type="email" className="border-brand dark:text-white" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)}/>
                <Button
                    disabled={loading || !email}
                    onClick={handleClick}
                    className="bg-brand flex items-center justify-center gap-2 text-white px-4 py-3 rounded-lg hover:bg-tomatom focus:outline-none focus:ring-2 focus:ring-brand"
                >
                    {loading ?
                    <>
                        <span>Loading...</span>
                        <Loader className="animate-spin" size={20} />
                    </> 
                    :
                    <>
                        <span>Get Confirmation Link</span>
                        <Link size={20} />
                    </>}
                </Button>
            </div>
        </div>
      )
}