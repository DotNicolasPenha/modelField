package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type APIKeys struct {
	OpenAI     string `json:"openai"`
	Anthropic  string `json:"anthropic"`
	Google     string `json:"google"`
	OpenRouter string `json:"openrouter"`
}

type File struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	Name      string `json:"name"`
	Content   string `json:"content"`
	Created   string `json:"created"`
	Modified  string `json:"modified"`
}

type ModelAlias struct {
	ModelID    string `json:"modelId"`
	CustomName string `json:"customName"`
}

type RunRecord struct {
	ID           string  `json:"id"`
	ModelID      string  `json:"modelId"`
	ModelName    string  `json:"modelName"`
	Alias        string  `json:"alias"`
	SpecName     string  `json:"specName"`
	Status       string  `json:"status"`
	Started      string  `json:"started"`
	Finished     string  `json:"finished"`
	Result       string  `json:"result"`
	InputTokens  int     `json:"inputTokens"`
	OutputTokens int     `json:"outputTokens"`
	Duration     float64 `json:"duration"`
	Cost         float64 `json:"cost"`
	ResultSize   int     `json:"resultSize"`
}

type CheckItem struct {
	ID          string `json:"id"`
	Text        string `json:"text"`
	Description string `json:"description"`
	Checked     bool   `json:"checked"`
}

type Project struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Path      string      `json:"path"`
	Created   string      `json:"created"`
	Checklist []CheckItem `json:"checklist"`
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

func (a *App) GetModelAliases() []ModelAlias {
	var aliases []ModelAlias
	a.readJSON("model_aliases.json", &aliases)
	return aliases
}

func (a *App) SaveModelAliases(aliases []ModelAlias) error {
	return a.writeJSON("model_aliases.json", aliases)
}

func (a *App) GetRunHistory() []RunRecord {
	var records []RunRecord
	a.readJSON("run_history.json", &records)
	return records
}

func (a *App) SaveRunHistory(records []RunRecord) error {
	return a.writeJSON("run_history.json", records)
}

func (a *App) DeleteRunRecord(id string) error {
	var records []RunRecord
	a.readJSON("run_history.json", &records)
	filtered := make([]RunRecord, 0, len(records))
	for _, r := range records {
		if r.ID != id {
			filtered = append(filtered, r)
		}
	}
	return a.writeJSON("run_history.json", filtered)
}

func (a *App) GetProjects() []Project {
	var projects []Project
	a.readJSON("projects.json", &projects)
	return projects
}

func (a *App) SaveProject(project Project) error {
	var projects []Project
	a.readJSON("projects.json", &projects)
	for i, p := range projects {
		if p.ID == project.ID {
			projects[i] = project
			return a.writeJSON("projects.json", projects)
		}
	}
	projects = append(projects, project)
	return a.writeJSON("projects.json", projects)
}

func (a *App) DeleteProject(id string) error {
	var projects []Project
	a.readJSON("projects.json", &projects)
	filtered := make([]Project, 0, len(projects))
	for _, p := range projects {
		if p.ID != id {
			filtered = append(filtered, p)
		}
	}
	return a.writeJSON("projects.json", filtered)
}

func (a *App) SelectDirectory() string {
	result, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Project Directory",
	})
	if err != nil || result == "" {
		return ""
	}
	return result
}

func (a *App) ShowNotification(title string, message string) {
	fmt.Printf("[%s] %s\n", title, message)
}
