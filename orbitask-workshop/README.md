# Orbitask – BPMN process-optimisation workshop (Docker)

One container = one group's workspace. When students open it in their browser they "start their first day" at
**Orbitask**, a fictional SaaS company. A manager sends them a chat message (Teams-style) with a problem in one of the
company's processes. The draw.io editor with all of Orbitask's as-is BPMN processes is built in, so they can start
optimising immediately. Everything runs **offline** inside the container and is **saved automatically**.

---

## For students

Students follow the step-by-step guide in the [main README](../README.md) until the app is open; the presentation
explains the rest.

---

## For the teacher

### How problems are assigned
Give every group a **group number** (1, 2, 3…) before they start. They type it on the welcome screen together with
their names, and the number decides the problem: group 1 → problem 1 … group 7 → problem 7, group 8 → problem 1 again.
So with up to 7 groups, nobody gets the same problem. The choice is stored in the data volume (restarting does not
change it) and can't be changed once the group has read the manager's first message. To force a problem anyway
(this overrides the group number):

```
docker run -d -p 8080:8080 -v orbitask-data:/data -e PROBLEM=3 --name orbitask orbitask-workshop
```
or uncomment `PROBLEM` in `docker-compose.yml`.

| # | Ticket | Process page | Requester |
|---|--------|--------------|-----------|
| 1 | ORB-1042 | P1 Lead to contract | Head of Sales |
| 2 | ORB-1057 | P2 Customer onboarding | Head of Customer Success |
| 3 | ORB-1063 | P3 Employee onboarding | HR Director & IT Manager |
| 4 | ORB-1071 | P5 Development and release | CTO |
| 5 | ORB-1078 | P6 Customer support | CEO |
| 6 | ORB-1084 | P7 Billing and payment | CFO |
| 7 | ORB-1090 | P10 Monthly management reporting | CEO |

The container log shows which problem a group got: `docker logs orbitask`.

### Groups that finish early
A group that is done clicks **Get an extra request** and gets the next problem: **their number + 1** (7 → 1).
It goes into the same container and the same file, so **Hand in** gives you one file per group with both requests
(one reply page per request). The log shows extra requests too.

### Avoid 30 downloads in class (optional)
Build once on your laptop and share the image file (USB / shared drive):

```
docker build -t orbitask-workshop .
docker save orbitask-workshop -o orbitask-workshop.tar
```
Students then run (no internet needed):
```
docker load -i orbitask-workshop.tar
docker run -d -p 8080:8080 -v orbitask-data:/data --name orbitask orbitask-workshop
```

### Getting files out / resetting
- Download a group's current work without the browser: `docker cp orbitask:/data/work.drawio .`
- Automatic backups (every 5 minutes while editing, last 30 kept) are in `/data/backups` inside the container.
- **New problem / start over**: `docker compose down -v` (deletes the data volume), then `docker compose up -d`.
- In the app, **Restore original** resets the diagram (a backup of the current work is kept).

### What's inside
- `app/server.js` – small Node.js server (no npm packages): chat API, autosave, hand-in export.
- `app/public/` – the Teams-style front end.
- `app/data/` – the as-is processes (`orbitask_as_is_processes.drawio`) and the 7 manager messages (`tickets.json`).
- draw.io itself (official release, version pinned in the `Dockerfile`) is downloaded during the build.
