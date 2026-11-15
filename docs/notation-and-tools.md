# Notation and tools (Jonathan's part)

Slides 12–33 of `BPMN Workshop.pptx`. Background notes and sources for the notation walkthrough and the tool showcase. What I actually say per slide is in [talk-track.md](talk-track.md).

## Notation: going through the handout

The handout is the ARIS BPMN cheat sheet (`cheat-sheet.pdf`) [17]. Instead of explaining every symbol, I go through it in nine short parts, about 20 seconds each, with a small pizzeria example for each part. That way the pizzeria exercise afterwards already feels familiar.

| # | Handout part | What students need to take away | Example on the slide |
| --- | --- | --- | --- |
| 1 | Control flow elements | Circle = something happens, box = someone does something, diamond = the path splits | Take order → in stock? → bake or cancel |
| 2 | Events | Thin / double / thick border = start / in between / end; the icon says what kind (message, timer) | Every Monday: order dough, wait for delivery |
| 3 | Activities | One task = one piece of work, named verb + object; the marker says how (user, manual, send, receive, service) | Enter order in the till, bake, email receipt, charge card |
| 4 | Subprocesses | A collapsed task with + hides more steps, keeps big diagrams readable | "Make pizza" opens into dough → toppings → bake |
| 5 | Gateways | X = exactly one path, + = all paths in parallel; gateways route, they don't do work | Dine in? → serve at table / box the pizza |
| 6 | Flows | Solid = order of steps inside a pool, dashed = message between pools, dotted = association | Customer message → take order → bake |
| 7 | Swimlanes | Pool = participant, lane = role; crossing a lane = a handoff | Waiter takes order, kitchen bakes |
| 8 | Data | Data object = information a task uses or produces, data store = kept longer | Order ticket, till/POS |
| 9 | Further elements | Annotations and groups add context, they don't change the flow | "Takes 25 min on Friday nights" |

Two pages of the handout are hidden in the slideshow but still in the file: the ARIS "enterprise lanes" page (an ARIS extension, not standard BPMN) and a duplicate of the gateways page.

After the walkthrough:

- **Read one together**: a support-ticket process, simplified from the Orbitask process P6 "Customer support". This replaces the ARIS "applicant selection" example. Our own note on that slide said it should be an IT process, so that slide is hidden now.
- **Quick check**: four questions (solid vs. dashed arrow, X vs. +, timer start, pool vs. lane).
- **As-is vs. to-be**: the IT account request example. The process stays the same, but the email becomes a form and account creation is automated. This is the step students take in the Orbitask challenge.
- **Choreographies**: background only. One process = one pool; a choreography models only the messages between participants (OMG BPMN 2.0.2 ch. 11 [1]; Weske ch. 5 [18], which we had in BUPR).

Why only part of the notation: real-world models use few symbols. In a study of 120 models the average model used about 9 different ones (zur Muehlen & Recker 2008, reference [22] in [research-notes.md](research-notes.md)).

## Tools

| Tool | Cost | Saves real BPMN 2.0? | Good for | In this workshop |
| --- | --- | --- | --- | --- |
| Pen and paper | Free | No | First drafts with the people who do the work | Part 2: pizzeria |
| draw.io | Free, Apache 2.0 [20] | No, own `.drawio` XML [22], [23] | Quick diagrams, documentation | Part 3: Orbitask (runs offline in Docker) |
| Camunda Modeler / bpmn.io | Free, MIT [24] | Yes, `.bpmn` [24] | Models an engine can run, checking AI output | Showcase |
| Visual Paradigm | Paid, trial available | Yes, import and export [30] | Large modelling projects, simulation, linked as-is/to-be [29] | Showcase |
| Netcall Liberty Spark | Paid | No, uses UPN [31] | Simple drill-down maps for business users | Showcase (as a contrast) |

### draw.io

- Free and open source (Apache License 2.0) [20]. Runs in the browser, as a desktop app, or self-hosted via Docker (`jgraph/drawio`, about 380 MB) [21]. Our Orbitask container builds on it, so it works offline in class.
- Has a full BPMN shape library (pools, events, gateways, task markers).
- Downside: the file is draw.io's own mxGraph XML. According to the bpmn.io maintainers it is "quite far away" from BPMN 2.0 XML [22], and SAP has a knowledge base article about draw.io imports into Signavio failing [23]. So for a real project where the model has to go into an engine or a BPM suite, draw.io is the wrong tool.

### Camunda Modeler and bpmn.io

- Camunda Modeler: free desktop app (MIT) for BPMN, DMN and forms, built on bpmn.io [24]. Saves real `.bpmn` files and can deploy straight to a Camunda 7 or Camunda 8 engine [25].
- Lint rules flag modelling mistakes while you draw [25], [27].
- bpmn.io is the web editor behind it, maintained by Camunda; demo.bpmn.io works in the browser without installing anything [26].
- Camunda now calls its approach "agentic orchestration": AI agents act as steps inside a BPMN process, and the model sets the guardrails [28].

### Visual Paradigm

- Commercial suite with a BPMN 2.0 editor [29]; imports and exports BPMN 2.0 XML [30].
- Paid editions add process simulation and as-is → to-be models that stay linked [29]. It also has an AI diagram generator [29].

### Netcall UPN (not BPMN)

- Universal Process Notation: one box per activity, with its output and who does it. Each activity can be opened into a lower level, with no depth limit. Based on a simplified IDEF0 and aimed at non-technical readers [31].
- Included as a contrast: easier to read, but not an open standard and not executable.

### Drafting BPMN with Claude

The workflow I show: describe the process from the interview notes → ask for BPMN 2.0 XML with pools, lanes and gateways → open it in demo.bpmn.io or Camunda Modeler [26] → run the linter [27] and walk through it with the people who do the work → fix and repeat.

Things to watch out for: the AI only knows what you tell it, the generated layout is often messy, and confidential client data does not go into public AI tools.

## Other changes in my section

- "Simple pizza example" moved to after Practical Part 1 and renamed "Compare: a simple pizza process", so it doesn't give away the exercise.
- The old "Agenda" slide is now "How we'll go through the handout".

## Sources

[1] Object Management Group, *Business Process Model and Notation (BPMN)*, v2.0.2, Jan. 2014. https://www.omg.org/spec/BPMN/

[17] ARIS (Software GmbH), "ARIS BPMN" cheat sheet, 2024. `cheat-sheet.pdf` in this repo.

[18] M. Weske, *Business Process Management: Concepts, Languages, Architectures*, 2nd ed. Springer, 2012, ch. 5. Also Fontys BUPR-BPM chapter 5 slides (C. Salz, 2025), `Old Slides/BUPR-BPM-CH05-ProcessChoreographies.pdf`.

[20] JGraph, draw.io source repository, Apache License 2.0. https://github.com/jgraph/drawio

[21] Docker Hub, `jgraph/drawio`. https://hub.docker.com/r/jgraph/drawio

[22] bpmn.io forum, "Converting draw.io flows to bpmn.io flows en masse," Feb. 2025. https://forum.bpmn.io/t/converting-draw-io-flows-to-bpmn-io-flows-en-masse/14330

[23] SAP Knowledge Base Article 3160338, "Import of an XML file into Signavio Process Explorer from draw.io is not working." https://userapps.support.sap.com/sap/support/knowledge/en/3160338

[24] Camunda, Camunda Modeler repository (MIT). https://github.com/camunda/camunda-modeler

[25] Camunda Docs, "Desktop Modeler." https://docs.camunda.io/docs/components/modeler/desktop-modeler/

[26] bpmn.io (maintained by Camunda). https://bpmn.io/ and https://demo.bpmn.io/

[27] bpmn.io, bpmnlint. https://github.com/bpmn-io/bpmnlint

[28] Camunda, "Orchestrate processes." https://camunda.com/orchestrate/processes/

[29] Visual Paradigm, "BPMN diagram and tools." https://www.visual-paradigm.com/features/bpmn-diagram-and-tools/

[30] Visual Paradigm user guide, "Exporting BPMN 2.0." https://www.visual-paradigm.com/support/documents/vpuserguide/124/2193/57197_exportingbpm.html

[31] C. Green, "What is UPN (Universal Process Notation)?," Netcall blog, Sep. 2023, updated May 2025. https://www.netcall.com/blog/what-is-upn/
