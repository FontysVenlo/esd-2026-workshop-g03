# Getting started – run the Orbitask workshop

This repo has two Docker apps for part 3 of the workshop (the Orbitask optimisation challenge):

| App | Folder | Address | For |
|-----|--------|---------|-----|
| **Student app** | [`orbitask-workshop/`](orbitask-workshop/) | http://localhost:8080 | Each group: a manager's request in a Teams-style chat + draw.io with the as-is BPMN processes |
| **Presenter app** | [`orbitask-presenter/`](orbitask-presenter/) | http://localhost:8090 | Presenters only: all 7 requests, the reference solution next to each request and a to-be diagram per process |

Both run fully offline once they are built.

---

## 1. Install the requirements (once)

1. **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   - Windows: let it use the **WSL 2** backend (this is the default).
   - Start Docker Desktop and wait until it says *Engine running*.
2. **Git**: https://git-scm.com/downloads (or download the repo as a ZIP from GitHub).

Check that Docker works (in PowerShell, Terminal or a WSL shell):

```
docker version
```

You should see both a *Client* and a *Server* section. If *Server* is missing, Docker Desktop isn't running yet.

## 2. Get the repo

```
git clone https://github.com/FontysVenlo/esd-2026-workshop-g03.git
cd esd-2026-workshop-g03
```

## 3. Start the student app

```
cd orbitask-workshop
docker compose up -d --build
```

The first build downloads Node.js and draw.io (~1–3 minutes, needs internet). After that it starts in seconds and
works offline.

Open **http://localhost:8080**, enter your group name and click **Start my first day**. After a few seconds a manager
sends you a message with your request.

How to work in the app: see [orbitask-workshop/README.md](orbitask-workshop/README.md).

## 4. Start the presenter app (presenters only)

From the repo root:

```
cd orbitask-presenter
docker compose up -d --build
```

Open **http://localhost:8090**. It opens on the **Solutions** page. Click a manager in the **Chat** to replay their
message on the projector. In **Processes**, the panel on the left shows the solution next to the request, and
*Show to-be solution* jumps to the green to-be diagram.

The presenter app takes the app code from `../orbitask-workshop`, so keep both folders next to each other.
Details: [orbitask-presenter/README.md](orbitask-presenter/README.md).

## 5. Stop, continue, reset

Run these inside the folder of the app (`orbitask-workshop` or `orbitask-presenter`):

| What | Command |
|------|---------|
| Stop (work stays saved) | `docker compose stop` |
| Continue later | `docker compose start` |
| See logs (which request a group got) | `docker compose logs` |
| Update after `git pull` | `docker compose up -d --build` |
| **Reset everything** (deletes the saved work, new random request) | `docker compose down -v` then `docker compose up -d` |

## During the workshop

- **One container per group.** Each group runs the student app on one laptop. On first start it randomly picks one
  of the 7 requests. To give a group a specific request, uncomment `PROBLEM` in
  `orbitask-workshop/docker-compose.yml` (1–7) before starting.
- **Finished early?** The group clicks **Get an extra request** and gets the next request (their number + 1,
  7 → 1) in the same file.
- **Hand in:** in the editor, **Hand in (download)** gives one `.drawio` file with all diagrams and the chat replies
  of every request the group worked on.
- Request numbers:

  | # | Ticket | Process |
  |---|--------|---------|
  | 1 | ORB-1042 | P1 Lead to contract |
  | 2 | ORB-1057 | P2 Customer onboarding |
  | 3 | ORB-1063 | P3 Employee onboarding |
  | 4 | ORB-1071 | P5 Development and release |
  | 5 | ORB-1078 | P6 Customer support |
  | 6 | ORB-1084 | P7 Billing and payment |
  | 7 | ORB-1090 | P10 Monthly management reporting |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `docker: command not found` / *cannot connect to the Docker daemon* | Start Docker Desktop and wait for *Engine running*. In WSL: Docker Desktop → Settings → Resources → WSL integration → enable your distro. |
| *port is already allocated* | Another app uses 8080/8090. Change the left number in `docker-compose.yml` (e.g. `"8081:8080"`) and open that port instead. |
| *container name "/orbitask" is already in use* | An old container exists: `docker rm -f orbitask` (or `orbitask-presenter`), then start again. |
| Presenter build fails with *additional_contexts* / *build-context* | Update Docker Desktop (needs Compose 2.17+), or build by hand: `docker build --build-context workshop=../orbitask-workshop -t orbitask-presenter .` |
| Page opens but the editor stays on *Loading draw.io…* | Hard-reload the page (Ctrl+F5). Check `docker compose logs`. |
| No internet in the classroom | Build once at home. Or share an image: `docker save orbitask-workshop -o orbitask.tar`, then on the other laptop `docker load -i orbitask.tar` and `docker run -d -p 8080:8080 -v orbitask-data:/data --name orbitask orbitask-workshop`. |
| Want to test several groups on one laptop | Use another project name and port, e.g. `docker run -d -p 8081:8080 -v orbitask-g2:/data --name orbitask-g2 orbitask-workshop`. |
