package main

import (
	"context"

	"github.com/porter-dev/porter/desktop/internal/agent"
	"github.com/porter-dev/porter/desktop/internal/agent/opencode"
	"github.com/porter-dev/porter/desktop/internal/server"
	"github.com/porter-dev/porter/desktop/internal/task"
)

type App struct {
	server *server.Server
}

func NewApp() *App {
	store := task.NewStore()
	registry := agent.NewRegistry(opencode.New())
	return &App{server: server.New(store, registry, ":3000")}
}

func (app *App) Startup(ctx context.Context) {
	go func() {
		_ = app.server.Start(ctx)
	}()
}

func (app *App) Shutdown(ctx context.Context) {
	_ = ctx
}
