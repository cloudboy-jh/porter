package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed frontend/dist/*
var assetsFS embed.FS

func main() {
	app := NewApp()
	if err := wails.Run(&options.App{
		Title:            "Porter",
		Width:            1020,
		Height:           650,
		MinWidth:         960,
		MinHeight:        600,
		DisableResize:    false,
		Frameless:        false,
		OnStartup:        app.Startup,
		OnShutdown:       app.Shutdown,
		BackgroundColour: &options.RGBA{R: 0, G: 0, B: 0, A: 1},
		AssetServer: &assetserver.Options{
			Assets: assetsFS,
		},
	}); err != nil {
		log.Fatal(err)
	}
}
