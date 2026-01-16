package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/porter-dev/porter/desktop/internal/agent"
	"github.com/porter-dev/porter/desktop/internal/agent/opencode"
	"github.com/porter-dev/porter/desktop/internal/server"
	"github.com/porter-dev/porter/desktop/internal/task"
)

func main() {
	store := task.NewStore()
	registry := agent.NewRegistry(opencode.New())
	address := ":3000"
	if env := os.Getenv("PORTER_ADDR"); env != "" {
		address = env
	}
	daemon := server.New(store, registry, address)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	if err := daemon.Start(ctx); err != nil {
		log.Fatal(err)
	}
}
