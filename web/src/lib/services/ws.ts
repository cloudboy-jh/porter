import { createDesktopWSClient, type WSHandlers, type WSMessage } from '$lib/websocket';
import { writable } from 'svelte/store';

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

class WebSocketService {
	private ws: ReturnType<typeof createDesktopWSClient> | null = null;
	private statusValue: ConnectionStatus = 'disconnected';
	public status = writable<ConnectionStatus>(this.statusValue);

	private setStatus(status: ConnectionStatus) {
		this.statusValue = status;
		this.status.set(status);
	}

	connect() {
		if (this.statusValue === 'connecting' || this.statusValue === 'connected') {
			return;
		}

		this.setStatus('connecting');

		const handlers: WSHandlers = {
			onConnect: () => {
				this.setStatus('connected');
			},
			onDisconnect: () => {
				this.setStatus('disconnected');
			},
			onError: () => {
				this.setStatus('error');
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
		this.setStatus('disconnected');
	}
}

export const wsService = new WebSocketService();
