# Worker Local Testing

Use this to smoke test the Porter worker container before pushing images to Fly.

## 1) Start Docker

Make sure Docker Desktop is running and `docker ps` works.

## 2) Build image

```bash
docker build -f worker/Dockerfile -t porter-worker:local .
```

## 3) Start a local callback receiver

```bash
node -e "require('http').createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{console.log(req.method, req.url);console.log(req.headers);console.log(b);res.writeHead(200,{'content-type':'application/json'});res.end('{\"ok\":true}');});}).listen(8787,()=>console.log('callback listening on 8787'));"
```

## 4) Create a local bare git remote (one-time)

```bash
mkdir -p /tmp/porter-remote.git
git init --bare /tmp/porter-remote.git
mkdir -p /tmp/porter-seed && cd /tmp/porter-seed
git init
printf "# smoke\n" > README.md
git add README.md
git commit -m "seed"
git branch -M main
git remote add origin /tmp/porter-remote.git
git push -u origin main
```

## 5) Run worker in mock mode

`mock` mode makes a deterministic test commit so you can verify clone/branch/push/callback without API keys.

```bash
docker run --rm \
  -e TASK_ID=task_local_smoke_1 \
  -e REPO_FULL_NAME=local/smoke \
  -e REPO_CLONE_URL=/tmp/porter-remote.git \
  -e AGENT=mock \
  -e PROMPT="smoke test" \
  -e CALLBACK_URL=http://host.docker.internal:8787/api/callbacks/complete \
  -e CALLBACK_TOKEN=local-callback-token \
  -e BRANCH_NAME=porter/task_local_smoke_1 \
  porter-worker:local
```

Expected result:

- Container exits successfully.
- Callback server logs a `POST /api/callbacks/complete` payload with `status=complete`.
- Remote now has branch `porter/task_local_smoke_1` with `porter-smoke.txt`.

## 6) Production parity test (optional)

Switch to `AGENT=opencode|claude-code|amp`, remove `REPO_CLONE_URL`, set `GITHUB_TOKEN` + provider API key, and point `CALLBACK_URL` to your local app callback endpoint.
