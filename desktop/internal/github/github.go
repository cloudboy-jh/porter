package github

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const APIURL = "https://api.github.com"

type Client struct {
	token     string
	repoOwner string
	repoName  string
}

type IssueComment struct {
	Body string `json:"body"`
}

type PullRequest struct {
	Number int    `json:"number"`
	URL    string `json:"html_url"`
	Title  string `json:"title"`
}

func NewClient(repoOwner, repoName string) *Client {
	return &Client{
		token:     strings.TrimSpace(os.Getenv("GITHUB_TOKEN")),
		repoOwner: repoOwner,
		repoName:  repoName,
	}
}

func (client *Client) CommentIssue(issueNumber int, body string) error {
	if client.token == "" {
		return fmt.Errorf("GITHUB_TOKEN not set")
	}
	url := fmt.Sprintf("%s/repos/%s/%s/issues/%d/comments", APIURL, client.repoOwner, client.repoName, issueNumber)
	payload := IssueComment{Body: body}
	return client.makeRequest("POST", url, payload)
}

func (client *Client) FindPRForIssue(issueNumber int) (*PullRequest, error) {
	if client.token == "" {
		return nil, fmt.Errorf("GITHUB_TOKEN not set")
	}
	url := fmt.Sprintf("%s/repos/%s/%s/pulls?state=all", APIURL, client.repoOwner, client.repoName)
	var pulls []PullRequest
	if err := client.makeRequest("GET", url, nil, &pulls); err != nil {
		return nil, err
	}
	for _, pr := range pulls {
		if strings.Contains(pr.Title, fmt.Sprintf("#%d", issueNumber)) {
			return &pr, nil
		}
	}
	return nil, nil
}

func (client *Client) makeRequest(method, url string, body interface{}, responseTarget ...interface{}) error {
	reqBody, err := json.Marshal(body)
	if err != nil {
		return err
	}

	headers := map[string]string{
		"Authorization":        fmt.Sprintf("Bearer %s", client.token),
		"Accept":               "application/vnd.github+json",
		"Content-Type":         "application/json",
		"X-GitHub-Api-Version": "2022-11-28",
	}

	req, err := client.buildRequest(method, url, headers, reqBody)
	if err != nil {
		return err
	}

	return client.sendRequest(req, responseTarget...)
}

func (client *Client) buildRequest(method, url string, headers map[string]string, body []byte) (*http.Request, error) {
	var bodyReader io.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	return req, nil
}

func (client *Client) sendRequest(req *http.Request, responseTarget ...interface{}) error {
	httpClient := &http.Client{}
	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("request failed: %s", string(body))
	}

	if len(responseTarget) > 0 && responseTarget[0] != nil {
		return json.NewDecoder(resp.Body).Decode(responseTarget[0])
	}

	return nil
}
