"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("GlobalErrorBoundary Caught Error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
                    <div className="bg-red-500/10 p-4 rounded-full mb-6">
                        <AlertTriangle className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Something Went Wrong</h2>
                    <p className="text-gray-400 mb-6 max-w-sm">
                        The application encountered an unexpected error.
                        We've logged the issue and notified the team.
                    </p>

                    <div className="bg-gray-900 p-4 rounded-lg w-full max-w-md mb-6 overflow-auto text-left border border-gray-800">
                        <p className="text-red-400 font-mono text-xs break-all">
                            {this.state.error && this.state.error.toString()}
                        </p>
                    </div>

                    <button
                        onClick={this.handleReload}
                        className="flex items-center gap-2 bg-primary text-black px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default GlobalErrorBoundary;
