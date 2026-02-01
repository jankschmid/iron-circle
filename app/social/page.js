"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/connect?tab=circle');
    }, [router]);
    return null;
}
