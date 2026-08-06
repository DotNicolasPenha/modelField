package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type APIKeys struct {
	OpenAI     string `json:"openai"`
	Anthropic  string `json:"anthropic"`
	Google     string `json:"google"`
	OpenRouter string `json:"openrouter"`
}

type File struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	Created  string `json:"created"`
	Modified string `json:"modified"`
}

type App struct {
	ctx      context.Context
	dataDir  string
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}

	a.dataDir = filepath.Join(home, ".modelfield")
	os.MkdirAll(a.dataDir, 0755)
}

func (a *App) shutdown(ctx context.Context) {}

func (a *App) getDataPath(filename string) string {
	return filepath.Join(a.dataDir, filename)
}

func (a *App) readJSON(filename string, target interface{}) error {
	path := a.getDataPath(filename)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return json.Unmarshal(data, target)
}

func (a *App) writeJSON(filename string, data interface{}) error {
	path := a.getDataPath(filename)
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, jsonData, 0644)
}

func (a *App) GetAPIKeys() APIKeys {
	var keys APIKeys
	a.readJSON("api_keys.json", &keys)
	return keys
}

func (a *App) SaveAPIKeys(keys APIKeys) error {
	return a.writeJSON("api_keys.json", keys)
}

func (a *App) GetFiles() []File {
	var files []File
	a.readJSON("files.json", &files)
	return files
}

func (a *App) SaveFiles(files []File) error {
	return a.writeJSON("files.json", files)
}

func (a *App) GetDataDir() string {
	return a.dataDir
}

func (a *App) ShowNotification(title string, message string) {
	fmt.Printf("[%s] %s\n", title, message)
}
