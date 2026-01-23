"use client";

import { useStore } from '@/lib/store';
import TemplateSelector from '@/components/TemplateSelector';
import WorkoutActive from '@/components/WorkoutActive';
import BottomNav from '@/components/BottomNav';

export default function WorkoutPage() {
    const { activeWorkout } = useStore();

    if (activeWorkout) {
        return <WorkoutActive />;
    }

    return (
        <>
            <TemplateSelector />
            <BottomNav />
        </>
    );
}
