"use client";

import React from 'react';

/**
 * A standard reusable pagination component.
 * @param {number} currentPage - 0-indexed current page.
 * @param {number} totalCount - Total number of items.
 * @param {number} pageSize - Number of items per page.
 * @param {function} onPageChange - Callback when a new page is clicked (passes the 0-indexed page number).
 */
export default function PaginationControl({ currentPage, totalCount, pageSize, onPageChange }) {
    if (totalCount === 0 || pageSize === 0) return null;

    const totalPages = Math.ceil(totalCount / pageSize);
    if (totalPages <= 1) return null;

    // We want to show a few pages around the current page, and the first/last pages.
    // Logic: [1] ... [current-1] [current] [current+1] ... [last]
    const getPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5; // e.g. [1, 2, 3, 4, 5] or [1, ..., 4, 5, 6, ..., 10]

        if (totalPages <= 7) {
            for (let i = 0; i < totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Complex pagination with ellipses
            if (currentPage <= 3) {
                // Near start
                for (let i = 0; i < 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages - 1);
            } else if (currentPage >= totalPages - 4) {
                // Near end
                pages.push(0);
                pages.push('...');
                for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
            } else {
                // Middle
                pages.push(0);
                pages.push('...');
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push('...');
                pages.push(totalPages - 1);
            }
        }
        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '16px 0', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid #333' }}>
            <div style={{ color: '#888', fontSize: '0.9rem' }}>
                Showing {Math.min(currentPage * pageSize + 1, totalCount)}-{Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount}
            </div>
            
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                    disabled={currentPage === 0}
                    onClick={() => onPageChange(currentPage - 1)}
                    style={{
                        padding: '6px 12px', background: currentPage === 0 ? '#111' : '#222',
                        color: currentPage === 0 ? '#444' : '#fff', border: '1px solid #333', borderRadius: '6px', 
                        cursor: currentPage === 0 ? 'default' : 'pointer', transition: 'background 0.2s',
                        marginRight: '8px'
                    }}
                >
                    Prev
                </button>

                {pages.map((p, idx) => {
                    if (p === '...') {
                        return <span key={`ellipsis-${idx}`} style={{ color: '#666', padding: '0 4px' }}>...</span>;
                    }
                    
                    const isCurrent = p === currentPage;
                    return (
                        <button
                            key={`page-${p}`}
                            onClick={() => onPageChange(p)}
                            style={{
                                padding: '6px 12px', 
                                background: isCurrent ? '#FFC800' : '#222',
                                color: isCurrent ? '#000' : '#ccc', 
                                border: '1px solid #333', 
                                borderRadius: '6px', 
                                fontWeight: isCurrent ? 'bold' : 'normal',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {p + 1}
                        </button>
                    );
                })}

                <button
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => onPageChange(currentPage + 1)}
                    style={{
                        padding: '6px 12px', background: currentPage >= totalPages - 1 ? '#111' : '#222',
                        color: currentPage >= totalPages - 1 ? '#444' : '#fff', border: '1px solid #333', borderRadius: '6px', 
                        cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer', transition: 'background 0.2s',
                        marginLeft: '8px'
                    }}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
