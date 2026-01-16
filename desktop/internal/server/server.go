package server

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/porter-dev/porter/desktop/internal/agent"
	"github.com/porter-dev/porter/desktop/internal/task"
)

type Server struct {
	store     *task.Store
	registry  *agent.Registry
	hub       *Hub
	address   string
	upgrader  websocket.Upgrader
	shutdown  chan struct{}
	shutdownW sync.Once
}

type CreateTaskRequest struct {
	RepoOwner   string `json:"repoOwner"`
	RepoName    string `json:"repoName"`
	RepoPath    string `json:"repoPath"`
	IssueNumber int    `json:"issueNumber"`
	IssueTitle  string `json:"issueTitle"`
	IssueBody   string `json:"issueBody"`
	Agent       string `json:"agent"`
	Priority    int    `json:"priority"`
	CreatedBy   string `json:"createdBy"`
	Prompt      string `json:"prompt"`
}

type AgentStatus struct {
	Name        string `json:"name"`
	Enabled     bool   `json:"enabled"`
	Path        string `json:"path"`
	Status      string `json:"status"`
	CurrentTask string `json:"currentTaskId"`
}

type TaskUpdate struct {
	ID       string      `json:"id"`
	Status   task.Status `json:"status"`
	Progress int         `json:"progress"`
	Error    string      `json:"errorMessage,omitempty"`
	Started  *time.Time  `json:"startedAt,omitempty"`
	Ended    *time.Time  `json:"completedAt,omitempty"`
}

type LogPayload struct {
	TaskID    string    `json:"taskId"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

func New(store *task.Store, registry *agent.Registry, address string) *Server {
	return &Server{
		store:    store,
		registry: registry,
		hub:      NewHub(),
		address:  address,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return true },
		},
		shutdown: make(chan struct{}),
	}
}

func (server *Server) Start(ctx context.Context) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/tasks", server.handleTasks)
	mux.HandleFunc("/api/tasks/", server.handleTaskAction)
	mux.HandleFunc("/api/agents", server.handleAgents)
	mux.HandleFunc("/api/agents/", server.handleAgentStatus)
	mux.HandleFunc("/ws", server.handleWebsocket)

	httpServer := &http.Server{Addr: server.address, Handler: mux}

	go func() {
		<-ctx.Done()
		server.shutdownW.Do(func() { close(server.shutdown) })
		_ = httpServer.Shutdown(context.Background())
	}()

	return httpServer.ListenAndServe()
}

func (server *Server) handleTasks(writer http.ResponseWriter, request *http.Request) {
	switch request.Method {
	case http.MethodGet:
		server.respondJSON(writer, http.StatusOK, server.store.List())
	case http.MethodPost:
		var payload CreateTaskRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			server.respondError(writer, http.StatusBadRequest, err)
			return
		}
		createdTask, err := server.createTask(payload)
		if err != nil {
			server.respondError(writer, http.StatusBadRequest, err)
			return
		}
		server.respondJSON(writer, http.StatusAccepted, createdTask)
	default:
		writer.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (server *Server) handleTaskAction(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/api/tasks/")
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 2 {
		writer.WriteHeader(http.StatusNotFound)
		return
	}
	id := parts[0]
	action := parts[1]
	if request.Method != http.MethodPut {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	switch action {
	case "stop":
		server.updateTaskStatus(id, task.StatusFailed, "stopped by user")
		server.respondJSON(writer, http.StatusOK, map[string]string{"status": "stopped"})
	case "retry":
		server.updateTaskStatus(id, task.StatusQueued, "")
		server.respondJSON(writer, http.StatusOK, map[string]string{"status": "queued"})
		go server.runTask(id, "")
	default:
		writer.WriteHeader(http.StatusNotFound)
	}
}

func (server *Server) handleAgents(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	statuses := make([]AgentStatus, 0)
	for _, adapter := range server.registry.List() {
		path, ok := adapter.Detect()
		status := "idle"
		if !ok {
			status = "error"
		}
		statuses = append(statuses, AgentStatus{
			Name:    adapter.Name(),
			Enabled: ok,
			Path:    path,
			Status:  status,
		})
	}
	server.respondJSON(writer, http.StatusOK, statuses)
}

func (server *Server) handleAgentStatus(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	name := strings.TrimPrefix(request.URL.Path, "/api/agents/")
	adapter, ok := server.registry.Get(strings.Trim(name, "/"))
	if !ok {
		writer.WriteHeader(http.StatusNotFound)
		return
	}
	path, found := adapter.Detect()
	status := "idle"
	if !found {
		status = "error"
	}
	server.respondJSON(writer, http.StatusOK, AgentStatus{
		Name:    adapter.Name(),
		Enabled: found,
		Path:    path,
		Status:  status,
	})
}

func (server *Server) handleWebsocket(writer http.ResponseWriter, request *http.Request) {
	conn, err := server.upgrader.Upgrade(writer, request, nil)
	if err != nil {
		return
	}
	server.hub.Add(conn)
	defer server.hub.Remove(conn)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			_ = conn.Close()
			return
		}
	}
}

func (server *Server) createTask(payload CreateTaskRequest) (*task.Task, error) {
	if payload.Agent == "" {
		return nil, errors.New("agent is required")
	}
	if payload.RepoName == "" {
		return nil, errors.New("repoName is required")
	}
	prompt := payload.Prompt
	if prompt == "" {
		prompt = buildPrompt(payload)
	}
	newTask := &task.Task{
		ID:          newTaskID(),
		Status:      task.StatusQueued,
		RepoOwner:   payload.RepoOwner,
		RepoName:    payload.RepoName,
		IssueNumber: payload.IssueNumber,
		IssueTitle:  payload.IssueTitle,
		IssueBody:   payload.IssueBody,
		Agent:       payload.Agent,
		Priority:    payload.Priority,
		Progress:    0,
		Prompt:      prompt,
		CreatedAt:   time.Now(),
		CreatedBy:   payload.CreatedBy,
		Logs:        []task.LogEntry{},
	}
	server.store.Add(newTask)
	server.hub.Broadcast(Event{Type: "task_update", Data: TaskUpdate{ID: newTask.ID, Status: newTask.Status, Progress: newTask.Progress}})
	go server.runTask(newTask.ID, payload.RepoPath)
	return newTask, nil
}

func (server *Server) runTask(id string, repoPath string) {
	updated, ok := server.store.Update(id, func(item *task.Task) {
		now := time.Now()
		item.Status = task.StatusRunning
		item.StartedAt = &now
	})
	if !ok {
		return
	}
	server.hub.Broadcast(Event{Type: "task_update", Data: TaskUpdate{ID: updated.ID, Status: updated.Status, Progress: updated.Progress, Started: updated.StartedAt}})
	adapter, ok := server.registry.Get(updated.Agent)
	if !ok {
		server.updateTaskStatus(id, task.StatusFailed, "agent not registered")
		return
	}
	repoDir, err := ensureRepoPath(repoPath, updated)
	if err != nil {
		server.updateTaskStatus(id, task.StatusFailed, err.Error())
		return
	}
	command, err := adapter.BuildCommand(updated, repoDir)
	if err != nil {
		server.updateTaskStatus(id, task.StatusFailed, err.Error())
		return
	}
	stdout, _ := command.StdoutPipe()
	stderr, _ := command.StderrPipe()
	if err := command.Start(); err != nil {
		server.updateTaskStatus(id, task.StatusFailed, err.Error())
		return
	}
	var wait sync.WaitGroup
	wait.Add(2)
	go func() {
		defer wait.Done()
		server.streamOutput(id, "info", stdout, adapter)
	}()
	go func() {
		defer wait.Done()
		server.streamOutput(id, "error", stderr, adapter)
	}()
	err = command.Wait()
	wait.Wait()
	if err != nil {
		server.updateTaskStatus(id, task.StatusFailed, err.Error())
		return
	}
	server.updateTaskStatus(id, task.StatusSuccess, "")
}

func (server *Server) streamOutput(id string, level string, reader io.Reader, adapter agent.Adapter) {
	if reader == nil {
		return
	}
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		message := strings.TrimSpace(scanner.Text())
		if message == "" {
			continue
		}
		entry := task.LogEntry{Level: level, Message: message, Timestamp: time.Now()}
		server.store.Update(id, func(item *task.Task) {
			item.Logs = append(item.Logs, entry)
		})
		server.hub.Broadcast(Event{Type: "log", Data: LogPayload{TaskID: id, Level: level, Message: message, Timestamp: entry.Timestamp}})
		if progress := adapter.ParseProgress(message); progress >= 0 {
			server.store.Update(id, func(item *task.Task) {
				item.Progress = progress
			})
			server.hub.Broadcast(Event{Type: "task_update", Data: TaskUpdate{ID: id, Progress: progress}})
		}
	}
}

func (server *Server) updateTaskStatus(id string, status task.Status, errorMessage string) {
	updated, ok := server.store.Update(id, func(item *task.Task) {
		item.Status = status
		item.Error = errorMessage
		if status == task.StatusFailed || status == task.StatusSuccess {
			now := time.Now()
			item.CompletedAt = &now
		}
	})
	if !ok {
		return
	}
	server.hub.Broadcast(Event{Type: "task_update", Data: TaskUpdate{ID: updated.ID, Status: updated.Status, Progress: updated.Progress, Error: updated.Error, Ended: updated.CompletedAt}})
}

func (server *Server) respondJSON(writer http.ResponseWriter, status int, payload interface{}) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(payload)
}

func (server *Server) respondError(writer http.ResponseWriter, status int, err error) {
	server.respondJSON(writer, status, map[string]string{"error": err.Error()})
}

func ensureRepoPath(input string, taskItem *task.Task) (string, error) {
	if input != "" {
		return input, nil
	}
	if taskItem.RepoOwner == "" || taskItem.RepoName == "" {
		return "", errors.New("repoPath or repo details required")
	}
	path, err := os.MkdirTemp("", "porter-repo-*")
	if err != nil {
		return "", err
	}
	repoURL := fmt.Sprintf("https://github.com/%s/%s.git", taskItem.RepoOwner, taskItem.RepoName)
	if token := strings.TrimSpace(os.Getenv("GITHUB_TOKEN")); token != "" {
		repoURL = fmt.Sprintf("https://%s@github.com/%s/%s.git", token, taskItem.RepoOwner, taskItem.RepoName)
	}
	command := exec.Command("git", "clone", repoURL, path)
	if output, err := command.CombinedOutput(); err != nil {
		return "", fmt.Errorf("git clone failed: %s", strings.TrimSpace(string(output)))
	}
	return path, nil
}

func buildPrompt(payload CreateTaskRequest) string {
	builder := strings.Builder{}
	builder.WriteString("## Issue\n")
	builder.WriteString(strings.TrimSpace(payload.IssueTitle))
	builder.WriteString("\n")
	if payload.IssueBody != "" {
		builder.WriteString(strings.TrimSpace(payload.IssueBody))
		builder.WriteString("\n")
	}
	builder.WriteString("\n## Instructions\n")
	builder.WriteString("Complete this issue by making the necessary changes.\n")
	builder.WriteString("Open a PR when done.\n")
	return builder.String()
}

func newTaskID() string {
	return fmt.Sprintf("task-%d", time.Now().UnixNano())
}
