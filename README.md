# Orbitask workshop – get started

Follow these steps to open the Orbitask app on your laptop. **One laptop per group is enough.**
Once the app is open, the presentation tells you what to do.

## 1. Install Docker Desktop

1. Download and install Docker Desktop: https://www.docker.com/products/docker-desktop/
   - Windows: keep the default setting **Use WSL 2**. Restart your laptop if the installer asks for it.
2. Start **Docker Desktop** and wait until the bottom left says **Engine running**.

Already have Docker? Just start Docker Desktop.

## 2. Download this project

1. On this GitHub page, click the green **Code** button, then **Download ZIP**.
2. Unzip it, for example to your Desktop. You get a folder called `esd-2026-workshop-g03-main`.

(Using git? `git clone https://github.com/FontysVenlo/esd-2026-workshop-g03.git` works too.)

## 3. Open a terminal in the `orbitask-workshop` folder

- **Windows:** open the folder `esd-2026-workshop-g03-main`, right-click the `orbitask-workshop` folder and choose
  **Open in Terminal**.
- **macOS:** right-click the `orbitask-workshop` folder → **Services** → **New Terminal at Folder**.

## 4. Start the app

Type this in the terminal and press Enter:

```
docker compose up -d --build
```

The first time it downloads about 100 MB and takes 1–3 minutes. It is done when you see
`Container orbitask  Started`.

## 5. Open the app

Open **http://localhost:8080** in your browser, enter your group name and click **Start my first day**.

You're in. Wait for the presentation to continue.

---

## Something doesn't work?

| What you see | What to do |
|---|---|
| `docker` is not recognized / *cannot connect to the Docker daemon* | Docker Desktop isn't running. Start it, wait for **Engine running**, then run the command again. |
| *port is already allocated* | Something else uses port 8080. Open `docker-compose.yml` in the `orbitask-workshop` folder, change `"8080:8080"` to `"8081:8080"`, run the command again and open http://localhost:8081. |
| *container name "/orbitask" is already in use* | Run `docker rm -f orbitask`, then start again. |
| The page stays on *Loading draw.io…* | Reload the page with **Ctrl+F5** (macOS: **Cmd+Shift+R**). |
| Still stuck | Ask one of us. |

**Stop for today / continue later** (run in the same terminal folder): `docker compose stop` and `docker compose start`.
Your work stays saved.

---

Workshop team (slides, notes): see [docs/workshop-team.md](docs/workshop-team.md).
