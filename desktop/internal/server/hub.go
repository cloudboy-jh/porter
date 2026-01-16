package server

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

type Event struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Hub struct {
	mu      sync.RWMutex
	clients map[*websocket.Conn]bool
}

func NewHub() *Hub {
	return &Hub{clients: map[*websocket.Conn]bool{}}
}

func (hub *Hub) Add(conn *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	hub.clients[conn] = true
}

func (hub *Hub) Remove(conn *websocket.Conn) {
	hub.mu.Lock()
	defer hub.mu.Unlock()
	delete(hub.clients, conn)
}

func (hub *Hub) Broadcast(event Event) {
	payload, err := json.Marshal(event)
	if err != nil {
		return
	}
	hub.mu.RLock()
	clients := make([]*websocket.Conn, 0, len(hub.clients))
	for client := range hub.clients {
		clients = append(clients, client)
	}
	hub.mu.RUnlock()
	for _, client := range clients {
		if err := client.WriteMessage(websocket.TextMessage, payload); err != nil {
			hub.Remove(client)
			_ = client.Close()
		}
	}
}
