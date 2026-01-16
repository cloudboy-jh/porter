package task

import "time"

type Status string

type Task struct {
	ID          string
	Status      Status
	RepoOwner   string
	RepoName    string
	IssueNumber int
	IssueTitle  string
	IssueBody   string
	Agent       string
	Priority    int
	Progress    int
	Prompt      string
	CreatedAt   time.Time
	StartedAt   *time.Time
	CompletedAt *time.Time
	CreatedBy   string
	PRNumber    *int
	Error       string
	Logs        []LogEntry
}

type LogEntry struct {
	Level     string
	Message   string
	Timestamp time.Time
}

const (
	StatusQueued  Status = "queued"
	StatusRunning Status = "running"
	StatusSuccess Status = "success"
	StatusFailed  Status = "failed"
)
