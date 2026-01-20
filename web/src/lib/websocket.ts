export type WSMessage = {
	type: 'task_update' | 'log';
	data: {
		id?: string;
		status?: string;
		progress?: number;
		errorMessage?: string;
		startedAt?: string;
		completedAt?: string;
		taskId?: string;
		level?: string;
		message?: string;
		timestamp?: string;
	};
};

export type WSHandlers = {
	onTaskUpdate?: (data: WSMessage['data']) => void;
	onLog?: (data: WSMessage['data']) => void;
	onConnect?: () => void;
	onDisconnect?: () => void;
	onError?: (error: Event) => void;
};

export class WebSocketClient {
	private ws: WebSocket | null = null;
	private url: string;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 3000;
	private handlers: WSHandlers;
	private shouldReconnect = true;

	constructor(url: string, handlers: WSHandlers) {
		this.url = url;
		this.handlers = handlers;
	}

	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		this.ws = new WebSocket(this.url);
		this.shouldReconnect = true;
		this.reconnectAttempts = 0;

		this.ws.onopen = () => {
			this.reconnectAttempts = 0;
			this.handlers.onConnect?.();
		};

		this.ws.onmessage = (event) => {
			try {
				const message: WSMessage = JSON.parse(event.data);
				if (message.type === 'task_update') {
					this.handlers.onTaskUpdate?.(message.data);
				} else if (message.type === 'log') {
					this.handlers.onLog?.(message.data);
				}
			} catch (error) {
				console.error('Failed to parse WebSocket message:', error);
			}
		};

		this.ws.onerror = (error) => {
			this.handlers.onError?.(error);
		};

		this.ws.onclose = () => {
			this.handlers.onDisconnect?.();
			if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
				this.reconnectAttempts++;
				setTimeout(() => this.connect(), this.reconnectDelay);
			}
		};
	}

	disconnect() {
		this.shouldReconnect = false;
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	send(data: Record<string, unknown>) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}
}

export function createDesktopWSClient(handlers: WSHandlers) {
	const url = 'ws://localhost:3000/ws';
	return new WebSocketClient(url, handlers);
}
