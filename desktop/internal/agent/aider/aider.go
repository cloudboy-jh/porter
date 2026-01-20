package aider

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/porter-dev/porter/desktop/internal/task"
)

type Adapter struct{}

func New() *Adapter {
	return &Adapter{}
}

func (adapter *Adapter) Name() string {
	return "aider"
}

func (adapter *Adapter) Detect() (string, bool) {
	if override := strings.TrimSpace(os.Getenv("AIDER_PATH")); override != "" {
		if path, err := exec.LookPath(override); err == nil {
			return path, true
		}
	}
	if path, err := exec.LookPath("aider"); err == nil {
		return path, true
	}
	candidates := []string{
		"/usr/local/bin/aider",
		"/opt/homebrew/bin/aider",
		"~/.local/bin/aider",
	}
	for _, candidate := range candidates {
		resolved := expandHome(candidate)
		if resolved == "" {
			continue
		}
		if info, err := os.Stat(resolved); err == nil && !info.IsDir() {
			return resolved, true
		}
	}
	return "", false
}

func (adapter *Adapter) BuildCommand(task *task.Task, repoPath string) (*exec.Cmd, error) {
	path, ok := adapter.Detect()
	if !ok {
		return nil, errors.New("aider binary not found")
	}
	args := []string{
		"--message",
		task.Prompt,
		"--auto-commit",
		"--yes",
	}
	command := exec.Command(path, args...)
	command.Dir = repoPath
	command.Env = append(os.Environ(), fmt.Sprintf("PORTER_TASK_ID=%s", task.ID))
	return command, nil
}

func (adapter *Adapter) ParseProgress(line string) int {
	matcher := regexp.MustCompile(`(\d{1,3})%`)
	match := matcher.FindStringSubmatch(line)
	if len(match) != 2 {
		return -1
	}
	value := strings.TrimSpace(match[1])
	progress, err := strconv.Atoi(value)
	if err != nil {
		return -1
	}
	if progress < 0 {
		return 0
	}
	if progress > 100 {
		return 100
	}
	return progress
}

func expandHome(path string) string {
	if !strings.HasPrefix(path, "~") {
		return path
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, strings.TrimPrefix(path, "~/"))
}
