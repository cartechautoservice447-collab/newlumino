import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type ErrorBoundaryState = { hasError: boolean; message: string };

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state = { hasError: false, message: "" };

<<<<<<< HEAD
  static getDerivedStateFromError(error) {
=======
  static getDerivedStateFromError(error: unknown) {
>>>>>>> 1231699 (Update NewLumino project)
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "The application encountered an unexpected error.",
    };
  }

<<<<<<< HEAD
  componentDidCatch(error, info) {
=======
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
>>>>>>> 1231699 (Update NewLumino project)
    console.error("[NewLumino] Unhandled render error:", error, info.componentStack);
  }

  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="app-backdrop flex min-h-[100dvh] w-full items-center justify-center p-6">
        <div className="glass-panel w-full max-w-[420px] rounded-3xl border border-white/10 p-6 text-center shadow-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">NewLumino Recovery</div>
          <h1 className="mt-2 text-xl font-bold text-foreground">The workspace hit an unexpected error</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">{this.state.message}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
          >
            Reload NewLumino
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
