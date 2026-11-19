# Orbitask – presenter image (with solutions)

**Teachers only – do not hand this folder to students.** The student image is in [`../orbitask-workshop`](../orbitask-workshop).

Same app as the students get, but in presenter mode:

- **All 7 manager requests** are in the chat. Click any manager to replay their message on the projector.
- **Solutions page** (rail icon on the left): the reference solution for every request – what changes, IT tools,
  expected gain with numbers, and discussion points.
- **Process editor**: the request panel shows the reference solution next to the request. Use the dropdown at the
  top of the panel to switch requests, and *Show as-is* / *Show to-be solution* to jump to the page.
- The draw.io file has a **green TO-BE page right after each as-is process** (P1, P2, P3, P5, P6, P7, P10).
  Green steps are new or changed; the purple lane is automation by IT systems.

## Start

Needs Docker Desktop. The app code is taken from `../orbitask-workshop`, so keep both folders next to each other.

```
docker compose up -d --build
```

Open **http://localhost:8090** (port 8090, so it can run next to a student container on 8080).

<details><summary>Without docker compose</summary>

```
docker build --build-context workshop=../orbitask-workshop -t orbitask-presenter .
docker run -d -p 8090:8080 -v orbitask-presenter-data:/data --name orbitask-presenter orbitask-presenter
```
</details>

Reset (fresh solution file, all chats unread again): `docker compose down -v`, then `docker compose up -d`.

## Changing the solutions

- Text: [`solutions/solutions.json`](solutions/solutions.json) (key = request number 1–7).
- To-be diagrams: edit the specs in [`build_solutions.py`](build_solutions.py), then run

  ```
  python build_solutions.py
  ```

  It reads the as-is file from `../orbitask-workshop/app/data/` and writes
  `solutions/orbitask_reference_solutions.drawio`. Rebuild the image afterwards (`docker compose up -d --build`)
  and reset the volume (`docker compose down -v`) so the new file is used.

## Groups that finish early

In the student app, a group that is done clicks **Get an extra request** (chat list, Activity or Guide page).
They get the **next request to the right: their number + 1** (7 → 1), in the same container and the same
draw.io file. **Hand in** then downloads one file with both to-be's and one reply page per request – so you still
receive one file per group. The container log shows it: `docker logs orbitask`.

| # | Ticket | Process | → extra request |
|---|--------|---------|-----------------|
| 1 | ORB-1042 | P1 Lead to contract | 2 |
| 2 | ORB-1057 | P2 Customer onboarding | 3 |
| 3 | ORB-1063 | P3 Employee onboarding | 4 |
| 4 | ORB-1071 | P5 Development and release | 5 |
| 5 | ORB-1078 | P6 Customer support | 6 |
| 6 | ORB-1084 | P7 Billing and payment | 7 |
| 7 | ORB-1090 | P10 Monthly management reporting | 1 |
