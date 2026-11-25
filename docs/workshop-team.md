# Workshop team guide

This repo has a Docker app for part 3 of the workshop (the Orbitask optimisation challenge):

| App | Folder | Address | For |
|-----|--------|---------|-----|
| **Student app** | [`orbitask-workshop/`](../orbitask-workshop/) | http://localhost:8080 | Each group: a manager's request in a Teams-style chat + draw.io with the as-is BPMN processes |

It runs fully offline once it is built.

---

## Materials

| What | Where |
| --- | --- |
| Slide deck (intro, notation, tools, exercises) | `BPMN Workshop.pptx` |
| Workshop plan (parts 1–4, timings, materials) | [workshop-plan.md](workshop-plan.md) |
| Research notes with references | [research-notes.md](research-notes.md) |
| Notation walkthrough and tool showcase (notes + sources) | [notation-and-tools.md](notation-and-tools.md) |
| Speaker notes for all of part 1 | [talk-track.md](talk-track.md) |
| Student app (technical details, assigning requests) | [orbitask-workshop/README.md](../orbitask-workshop/README.md) |
| BPMN 2.0.2 specification / ARIS cheat sheet | `bpmn-formal.pdf`, `cheat-sheet.pdf` |
| Course slides used as background | `Old Slides/` |
| Open tasks | [TODO.md](../TODO.md) |

Students only get the [main README](../README.md): it takes them step by step until they are in the app. Everything
after that (where to click, what to model, how to hand in) is explained in the presentation.

## Student app

Same steps as the [main README](../README.md): install Docker Desktop, then in `orbitask-workshop/` run
`docker compose up -d --build` and open http://localhost:8080.

## Stop, continue, reset

Run these inside `orbitask-workshop`:

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
| *port is already allocated* | Another app uses 8080. Change the left number in `docker-compose.yml` (e.g. `"8081:8080"`) and open that port instead. |
| *container name "/orbitask" is already in use* | An old container exists: `docker rm -f orbitask`, then start again. |
| Page opens but the editor stays on *Loading draw.io…* | Hard-reload the page (Ctrl+F5). Check `docker compose logs`. |
| No internet in the classroom | Build once at home. Or share an image: `docker save orbitask-workshop -o orbitask.tar`, then on the other laptop `docker load -i orbitask.tar` and `docker run -d -p 8080:8080 -v orbitask-data:/data --name orbitask orbitask-workshop`. |
| Want to test several groups on one laptop | Use another project name and port, e.g. `docker run -d -p 8081:8080 -v orbitask-g2:/data --name orbitask-g2 orbitask-workshop`. |
