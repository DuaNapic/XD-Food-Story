import { Component, type ErrorInfo, type ReactNode } from "react";
import { Bot, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Canvas Error Caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-950/20 backdrop-blur-md rounded-2xl border border-white/5 p-6 text-center space-y-4">
          <div className="relative">
             <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
             <Bot className="w-16 h-16 text-blue-400/80 relative z-10" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-medium">西小电暫時休息中</h3>
            <p className="text-blue-200/50 text-xs">WebGL 渲染出現了一點小狀況</p>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 text-sm rounded-full transition-all border border-orange-500/30"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            嘗試喚醒
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
