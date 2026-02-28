'use client';

import React from 'react';

interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-xl">
                    <h2 className="text-lg font-bold text-red-700 mb-2">⚠️ Component Error</h2>
                    <pre className="text-xs text-red-600 bg-red-100 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                        {this.state.error?.message}
                        {'\n\n'}
                        {this.state.error?.stack}
                    </pre>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
                    >
                        Thử lại
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
