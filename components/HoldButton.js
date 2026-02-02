"use client";

import { useState, useRef, useEffect } from 'react';

export default function HoldButton({ onConfirm, label = "Hold to Confirm", duration = 3000, color = "#ff0000" }) {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const startTimeRef = useRef(null);
    const requestRef = useRef(null);

    const startHold = (e) => {
        // Prevent default to stop text selection or context menu on mobile
        if (e.cancelable) e.preventDefault();

        setIsHolding(true);
        startTimeRef.current = Date.now();
        requestRef.current = requestAnimationFrame(animate);
    };

    const stopHold = () => {
        setIsHolding(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        setProgress(0);
        startTimeRef.current = null;
    };

    const animate = () => {
        if (!startTimeRef.current) return;
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min(elapsed / duration, 1);

        setProgress(newProgress);

        if (newProgress < 1) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Complete
            onConfirm();
            stopHold();
        }
    };

    // Calculate remaining time for display
    const remainingSeconds = Math.ceil((duration - (progress * duration)) / 1000);

    return (
        <button
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={startHold}
            onTouchEnd={stopHold}
            // Add onContextMenu prevent default
            onContextMenu={(e) => e.preventDefault()}
            style={{
                position: 'relative',
                width: '100%',
                height: '60px', // Fixed height for better touch target
                background: 'transparent',
                border: `2px solid ${color}`,
                borderRadius: '8px',
                color: isHolding ? '#fff' : color, // Text color flip
                fontWeight: 'bold',
                cursor: 'pointer',
                overflow: 'hidden',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none', // Prevent scrolling while holding
                fontSize: '1rem',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            {/* Fill Animation */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${progress * 100}%`,
                    background: color,
                    opacity: 1, // Solid fill
                    transition: 'width 0.05s linear', // smooth updates
                    zIndex: 0
                }}
            />

            {/* Text Label */}
            <span style={{ position: 'relative', zIndex: 1 }}>
                {isHolding
                    ? (progress >= 1 ? "Done!" : `Release to Cancel (${remainingSeconds}s)`)
                    : label
                }
            </span>
        </button>
    );
}
