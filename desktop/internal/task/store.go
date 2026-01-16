package task

import "sync"

type Store struct {
	mu    sync.RWMutex
	tasks map[string]*Task
}

func NewStore() *Store {
	return &Store{tasks: map[string]*Task{}}
}

func (store *Store) Add(task *Task) {
	store.mu.Lock()
	defer store.mu.Unlock()
	store.tasks[task.ID] = task
}

func (store *Store) Get(id string) (*Task, bool) {
	store.mu.RLock()
	defer store.mu.RUnlock()
	task, ok := store.tasks[id]
	return task, ok
}

func (store *Store) List() []*Task {
	store.mu.RLock()
	defer store.mu.RUnlock()
	items := make([]*Task, 0, len(store.tasks))
	for _, task := range store.tasks {
		items = append(items, task)
	}
	return items
}

func (store *Store) Update(id string, update func(task *Task)) (*Task, bool) {
	store.mu.Lock()
	defer store.mu.Unlock()
	task, ok := store.tasks[id]
	if !ok {
		return nil, false
	}
	update(task)
	return task, true
}
