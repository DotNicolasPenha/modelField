package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type APIKeys struct {
	OpenAI     string `json:"openai"`
	Anthropic  string `json:"anthropic"`
	Google     string `json:"google"`
	OpenRouter string `json:"openrouter"`
}

type File struct {
	ID        string   `json:"id"`
	ProjectID string   `json:"projectId"`
	Name      string   `json:"name"`
	Content   string   `json:"content"`
	Created   string   `json:"created"`
	Modified  string   `json:"modified"`
	RefPaths  []string `json:"refPaths,omitempty"`
	Trashed   bool     `json:"trashed"`
	TrashedAt string   `json:"trashedAt,omitempty"`
}

type ModelAlias struct {
	ModelID    string `json:"modelId"`
	CustomName string `json:"customName"`
}

type ModelInfo struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Provider          string  `json:"provider"`
	Description       string  `json:"description"`
	CostPerInputToken float64 `json:"costPerInputToken"`
	CostPerOutputToken float64 `json:"costPerOutputToken"`
}

type CachedModels struct {
	Models    []ModelInfo `json:"models"`
	FetchedAt string      `json:"fetchedAt"`
}

type ModelsCache struct {
	Providers map[string]CachedModels `json:"providers"`
}

type RunRecord struct {
	ID             string   `json:"id"`
	ModelID        string   `json:"modelId"`
	ModelName      string   `json:"modelName"`
	Alias          string   `json:"alias"`
	SpecName      string   `json:"specName"`
	SpecNames      []string `json:"specNames"`
	FilePaths      []string `json:"filePaths"`
	Prompt         string   `json:"prompt"`
	Status         string   `json:"status"`
	Started        string   `json:"started"`
	Finished       string   `json:"finished"`
	Result         string   `json:"result"`
	InputTokens    int      `json:"inputTokens"`
	OutputTokens   int      `json:"outputTokens"`
	Duration       float64  `json:"duration"`
	Cost           float64  `json:"cost"`
	ResultSize     int      `json:"resultSize"`
	ToolCalls      int      `json:"toolCalls"`
	Iterations     int      `json:"iterations"`
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

type DirEntry struct {
	Name     string     `json:"name"`
	Path     string     `json:"path"`
	IsDir    bool       `json:"isDir"`
	Size     int64      `json:"size"`
	Modified string     `json:"modified"`
	Children []DirEntry `json:"children,omitempty"`
}

type FileInfo struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	IsDir    bool   `json:"isDir"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Items    int    `json:"items"`
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

func (a *App) GetModelsCache() ModelsCache {
	var cache ModelsCache
	a.readJSON("models_cache.json", &cache)
	if cache.Providers == nil {
		cache.Providers = make(map[string]CachedModels)
	}
	return cache
}

func (a *App) SaveModelsCache(cache ModelsCache) error {
	return a.writeJSON("models_cache.json", cache)
}

func (a *App) GetRunHistory() []RunRecord {
	var records []RunRecord
	a.readJSON("run_history.json", &records)
	for i := range records {
		if len(records[i].SpecNames) == 0 && records[i].SpecName != "" {
			records[i].SpecNames = []string{records[i].SpecName}
		}
	}
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

func (a *App) SaveProjects(projects []Project) error {
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

var skipDirs = map[string]bool{
	".git": true, "node_modules": true, ".DS_Store": true,
	".vscode": true, ".idea": true, "__pycache__": true,
	".pytest_cache": true, "vendor": true, ".gradle": true,
}

func (a *App) ReadProjectDir(dirPath string) []DirEntry {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil
	}
	var result []DirEntry
	for _, entry := range entries {
		name := entry.Name()
		if skipDirs[name] || strings.HasPrefix(name, ".") {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		e := DirEntry{
			Name:     name,
			Path:     filepath.Join(dirPath, name),
			IsDir:    entry.IsDir(),
			Size:     info.Size(),
			Modified: info.ModTime().Format("2006-01-02T15:04:05Z"),
		}
		if entry.IsDir() {
			e.Children = a.ReadProjectDir(e.Path)
		}
		result = append(result, e)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].IsDir != result[j].IsDir {
			return result[i].IsDir
		}
		return result[i].Name < result[j].Name
	})
	return result
}

func (a *App) ReadFileContent(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	return string(data)
}

func (a *App) SaveFileContent(path string, content string) error {
	return os.WriteFile(path, []byte(content), 0644)
}

func (a *App) GetFileInfo(path string) FileInfo {
	info, err := os.Stat(path)
	if err != nil {
		return FileInfo{}
	}
	fi := FileInfo{
		Name:     info.Name(),
		Path:     path,
		IsDir:    info.IsDir(),
		Size:     info.Size(),
		Modified: info.ModTime().Format("2006-01-02T15:04:05Z"),
	}
	if info.IsDir() {
		entries, err := os.ReadDir(path)
		if err == nil {
			count := 0
			for _, e := range entries {
				name := e.Name()
				if !skipDirs[name] && !strings.HasPrefix(name, ".") {
					count++
				}
			}
			fi.Items = count
		}
	}
	return fi
}
