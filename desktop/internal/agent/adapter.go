package agent

import (
	"os/exec"

	"github.com/porter-dev/porter/desktop/internal/task"
)

type Adapter interface {
	Name() string
	Detect() (string, bool)
	BuildCommand(task *task.Task, repoPath string) (*exec.Cmd, error)
	ParseProgress(line string) int
}

type Registry struct {
	adapters map[string]Adapter
}

func NewRegistry(adapters ...Adapter) *Registry {
	registry := &Registry{adapters: map[string]Adapter{}}
	for _, adapter := range adapters {
		registry.adapters[adapter.Name()] = adapter
	}
	return registry
}

func (registry *Registry) Get(name string) (Adapter, bool) {
	adapter, ok := registry.adapters[name]
	return adapter, ok
}

func (registry *Registry) List() []Adapter {
	items := make([]Adapter, 0, len(registry.adapters))
	for _, adapter := range registry.adapters {
		items = append(items, adapter)
	}
	return items
}
