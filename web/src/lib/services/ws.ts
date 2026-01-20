import { createDesktopWSClient, type WSHandlers, type WSMessage } from '$lib/websocket';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

class WebSocketService {
	private ws: ReturnType<typeof createDesktopWSClient> | null = null;
	public status = $state<ConnectionStatus>('disconnected');

	connect() {
		if (this.status === 'connecting' || this.status === 'connected') {
			return;
		}

		this.status = 'connecting';

		const handlers: WSHandlers = {
			onConnect: () => {
				this.status = 'connected';
			},
			onDisconnect: () => {
				this.status = 'disconnected';
			},
			onError: () => {
				this.status = 'error';
			},
			onTaskUpdate: (data: WSMessage['data']) => {
				if (data.id) {
					window.dispatchEvent(
						new CustomEvent('task-update', {
							detail: data
						})
					);
				}
			},
			onLog: (data: WSMessage['data']) => {
				if (data.taskId) {
					window.dispatchEvent(
						new CustomEvent('task-log', {
							detail: data
						})
					);
				}
			}
		};

		this.ws = createDesktopWSClient(handlers);
		this.ws.connect();
	}

	disconnect() {
		if (this.ws) {
			this.ws.disconnect();
			this.ws = null;
		}
		this.status = 'disconnected';
	}
}

export const wsService = new WebSocketService();
