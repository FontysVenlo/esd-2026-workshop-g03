# Orbitask – BPMN process-optimisation workshop (Docker)

One container = one group's workspace. When students open it in their browser they "start their first day" at
**Orbitask**, a fictional SaaS company. A manager sends them a chat message (Teams-style) with a problem in one of the
company's processes. The draw.io editor with all of Orbitask's as-is BPMN processes is built in, so they can start
optimising immediately. Everything runs **offline** inside the container and is **saved automatically**.

---

## For students

You only need **Docker** (Docker Desktop on Windows / macOS).

### 1. Start (first time)

Open a terminal in this folder and run:

```
docker compose up -d --build
```

The first start downloads Node.js and draw.io (a few minutes, needs internet). After that it works offline.

<details><summary>Without docker compose</summary>

```
docker build -t orbitask-workshop .
docker run -d -p 8080:8080 -v orbitask-data:/data --name orbitask orbitask-workshop
```
</details>

### 2. Open

Go to **http://localhost:8080**, enter your team name and click **Start my first day**.
Wait for the notification, read the manager's message, and click **Open in the process editor**.

### 3. Work

- Your process opens in draw.io. Duplicate the page (right-click the page tab → *Duplicate*) and rename the copy *To-be*.
- BPMN shapes are in the left panel. To make a task automatic, select it → right panel → *Property* list →
  *Task Marker* → *Service*.
- The **Request** button shows the manager's request next to the editor at any time.
- Write your proposal (tools, expected gain) as a **reply in the chat**.
- Everything is saved automatically ("All changes saved" at the top).

### 4. Hand in

In the editor click **Hand in (download)**. You get one `.drawio` file containing your diagrams plus an extra page
with your chat replies. Give that file to your teacher.

### Stop / continue later

```
docker compose stop        # stop – your work stays saved
docker compose start       # continue later
```
(Without compose: `docker stop orbitask` / `docker start orbitask`.)

**Port 8080 already in use?** Change `"8080:8080"` to `"8081:8080"` in `docker-compose.yml` (or use `-p 8081:8080`)
and open http://localhost:8081.

---

## For the teacher

### How problems are assigned
On its first start each container randomly picks **one of the 7 problems** and keeps it (it is stored in the data
volume, so restarting does not change it). Because each group's container picks independently, **two groups can get
the same problem**. To control it, give a group a fixed problem:

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
The answer key is **not** in the container (keep the PDF for yourself).

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
