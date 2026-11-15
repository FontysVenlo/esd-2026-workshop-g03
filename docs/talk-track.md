# Part 1 talk track

Generated from the speaker notes in `BPMN Workshop.pptx`. If you change the notes in the deck, regenerate this file. `[n]` numbers point to the source lists at the end.

## Part 1a: introduction (Romain)

### Slide 1: BPMN for IT Process Design

Short intro of us and the plan for today: first why BPMN matters and what it is (me), then Jonathan goes through the notation and some tools. After that you model a pizzeria on paper, and in the last part you start your first day at Orbitask, a fictional SaaS company that needs your help.

### Slide 2: Day one at a new client

Give them 2 minutes in pairs, then collect 3 or 4 answers on the whiteboard. You'll usually hear: interview people, watch them work, write it down, draw a flowchart, look at the old system. The point to make: all of these need a way to write down what you heard and check it with the people who do the work. Plain text is ambiguous and your own sketch only makes sense to you. Keep the whiteboard list, we come back to it on the alternatives slide.

### Slide 3: One process, three versions

Same process, three versions: the analyst's Word document, the developer's code, and what's in the employee's head. Every handoff between them is a translation, and things get lost. Camunda surveyed 866 people working on automation at companies with 250+ employees: 58% see a disconnect between IT and business leaders about their processes [4]. Side note from the same survey: the share of automated processes went down from 52% to 50% even though companies spent more. Automating a process nobody really understands doesn't pay off. This gap is literally what BPMN was made for; the spec says so in its first paragraph [1]. Ask: has anyone seen this in a side job or project? Customer says one thing, the code does another.

### Slide 4: An enterprise problem

Make clear this is mainly an enterprise problem. In a pizzeria the owner knows everything. In a big company three things make it hard. Systems: organisations use about 50 endpoints (systems, APIs, bots, people) to run their processes, 19% more than five years ago [4b], and 51% say processes across several systems make things harder [4]. People: one customer touches sales, customer success, finance, support and development, and each only sees their own part [6]. Complexity: 82% of large organisations worry about 'digital chaos' [4b], and 56% have lots of automation but no good way to manage it [4]. That's also why the exercises go from small to big: pizzeria first, then Orbitask with 120 people and 10 linked processes. Ask: how many different tools do you think a company of 120 people uses? (Orbitask alone: email, Excel, Word, Teams, an admin console, an accounting tool, Jira, GitHub, an HR tool.)

### Slide 5: What is BPMN?

BPMN = Business Process Model and Notation. A standard way to draw what happens, in what order, who does it, and where decisions or parallel work happen [1], [6]. Short history: BPMI published 1.0 in 2004 and joined the OMG in 2005 [3]. BPMN 2.0 (2011) added execution rules and an XML format, which is why tools can exchange and even run models [2a]. ISO standard since 2013 [2], current version 2.0.2 from 2014 [1]. Why a standard matters: before that, every consultancy and tool had its own shapes, so diagrams couldn't be shared or compared.

### Slide 6: Three uses of a model

In practice a model does one of three jobs [6], [10]. Understand: draw the current process and find where it's slow or unclear. Specify: draw the improved process so developers or ERP consultants know what to build. Execute: a BPMN 2.0 file is XML, and an engine like Camunda can run it directly, so the diagram is the workflow [10]. Today you do the first two. Ask: for the pizzeria, which of the three would the owner care about most?

### Slide 7: BPMN in your career

Software engineers end up in all kinds of industries, often in a domain they don't know yet, and a process model is the fastest way to learn it. Four places you'll run into BPMN: ERP projects, because SAP publishes its standard processes as BPMN diagrams you can download and import [8]. Business analysis: process modelling is one of the standard techniques in the BABOK, the main reference for analysts [7]. Consulting: most improvement projects go from as-is to to-be [6]. Automation: Zalando runs its order process for about 42 million customers in 20 markets as BPMN on Camunda [9]. Hands up: who could see themselves in one of these? Who works somewhere with an ERP?

### Slide 8: Alternatives to BPMN

Back to the whiteboard list from the start: which of these came up? Flowchart: no rules, so no standard way to show parallel work, handoffs or waiting [11]. UML activity diagram: close to BPMN, but made for software logic and a developer audience [12]. EPC: the classic SAP/ARIS notation, largely replaced by BPMN in many tools [15]. Petri nets: mathematically exact, great for checking concurrency, not something you show a product owner [14]. DFD: shows where data goes, not the order or who does what [11]. Ask: which have you used? Most of you know UML from class.

### Slide 9: Which notation when?

Rule of thumb, not a law [6], [11], [12]. Flowchart when there are no real branches or handoffs, BPMN would be overkill. UML activity diagram when only developers read it and it's about one system. BPMN when it crosses teams, companies or systems and that crossing is what you need to talk about. Orbitask is exactly that case. Ask for one example per row from their own life: making coffee, a login check, ordering pizza.

### Slide 10: Pros and cons

Pros: open ISO standard with an XML format, so you're not locked into one tool [1], [2]. Business and IT read the same diagram [1]. It can run on an engine [10]. Patterns for parallel work, timeouts and errors are already there, otherwise teams rebuild them in code [10]. Cons: lots of symbols, most rarely used [5]. Engines support different parts of the spec, so 'portable' models often need tweaking [13]. Diagrams are hard to diff and review compared to code [13]. Messy, case-by-case work doesn't fit a fixed flow [16]. Ask: which con would bother you most in a real project?

### Slide 11: A small subset is enough

zur Muehlen and Recker looked at 120 real BPMN models [5]. On average a model used about 9 different symbols, and less than 20% of BPMN's symbols were used regularly. Some never showed up at all. So we don't teach the whole spec. Hand over to Jonathan: he goes through the symbols that actually appear in the Orbitask models, using the handout.

## Part 1b: notation and tools (Jonathan)

### Slide 12: Notation

Hand out the cheat sheet now, one per person. Tell them: you don't have to learn this by heart, you'll have it next to you during both exercises.

### Slide 13: Handout walkthrough

Keep the pace up here. The point is that they know where to look on the handout, not that they remember every symbol. Order: building blocks, events, tasks, subprocesses, gateways, flows, pools and lanes, data, annotations. The ARIS-only 'enterprise lanes' page is skipped, it's not standard BPMN.

### Slide 14: 1  The building blocks

Start with the overview so they have a mental map. Read the example out loud: order comes in, we take it, check if we have the ingredients, then bake or cancel. That's already a complete BPMN process [1].

### Slide 15: 2  Events

Point at the border thickness first, that's the part people mix up. Then the icon inside: message and timer are the two that matter for today. In the example the process starts every Monday, and the double circle means we wait until the delivery shows up [1].

### Slide 16: 3  Tasks

Four markers are enough for today: user (someone in a tool), manual (by hand or on the phone), send (an email or message goes out) and service (the system does it on its own). Receive works like send but the other way around. Ask: which of these four is the most expensive for a company? (Usually manual and user tasks, because a person's time is involved.)

### Slide 17: 4  Subprocesses

Keep it short. The handout lists ad-hoc, event and transaction subprocesses as well; for today only the normal collapsed one matters [1].

### Slide 18: 5  Gateways

Common mistake: putting work inside a gateway ('check stock'). The checking is a task, the gateway only routes based on the result. Also mention: if you split with +, you join with + again, and that join waits until every branch is done [1].

### Slide 19: 6  Flows

This is the rule people break most often in the exercise, so say it twice: sequence flows stay inside one pool, between pools you use message flows [1].

### Slide 20: 7  Pools and lanes

Show how the arrow moves from waiter to kitchen: that's a handoff. In Orbitask most problems sit exactly at those lane crossings, so it's worth looking there first.

### Slide 21: 8  Data

Twenty seconds max. Data objects are optional; the Orbitask models mostly name the tools inside the task text instead (Excel, Word, admin console).

### Slide 22: 9  Annotations and groups

Last one. Tell them that in the Orbitask diagrams every known problem is written as an annotation next to the task, often with a measured number. That's their starting point in part 3.

### Slide 23: Let's read one together

INTERACTIVE (3 min): ask one student to 'walk the token' from the start event and read the diagram out loud. 1 Customer sends an email (message flow into the message start event). 2 Agent logs the case in the ticket tool (user task). 3 XOR: can the agent solve it? yes → reply. no → forward to a developer (send task), who investigates and fixes, then the agent replies. 4 Reply goes back to the customer (message flow), end. ASK: Where is the bottleneck? (the developer handoff; the annotation says first replies take 2 days on average.) Which task could be a service task? (e.g. logging the case automatically from the email, auto-reply with status.) This is a simplified version of Orbitask's P6 'Customer support', one of the processes in the challenge.

### Slide 24: Quick check

Ask the room, one question at a time; take answers before revealing. 1 Solid = sequence flow (order of steps inside a pool). Dashed with a circle = message flow (between pools). 2 X = exclusive: exactly one path. + = parallel: all paths, and the joining + waits for all. 3 A timer start event: the process starts at a time or date, e.g. monthly reporting on the 1st working day. 4 A pool is a participant (a company); lanes are roles or departments inside it. Then hand out the cheat sheet and move to the pizzeria exercise.

### Slide 25: As-is vs. to-be: requesting an IT account

Left is how it works now: the employee emails, the manager reads it whenever there's time (2-3 days), IT creates the account by hand, about 5 days in total. Right is the improved version. Point out that the lanes and the decision stay the same; what changes is how the steps are done (form instead of email, the system creates the account). Ask: what would you measure to prove the to-be is better? (Lead time, number of manual steps, errors.)

### Slide 26: Beyond one process: choreographies

Bridge to the bigger picture: one diagram is one process, but a company is a network of them. Choreography diagrams (BPMN chapter 11) zoom out and only show who sends what to whom. We covered this in the BUPR course (chapter 5). For the workshop it's background only.

### Slide 27: Which tool for what

Quick comparison before the individual tools. The column that matters most is whether the tool saves a real BPMN 2.0 file. draw.io doesn't: it looks like BPMN, but it's a drawing. That's fine for workshops and documentation, but you can't hand it to Camunda or SAP Signavio without converting it [22], [23]. Today: paper for the pizzeria, draw.io for Orbitask because it runs offline in our Docker container.

### Slide 28: draw.io

Why we picked it for the workshop: free, no account needed, and it runs completely offline in Docker, so 30 students don't need to install anything. The honest downside: it's a drawing tool. The file looks like BPMN but isn't BPMN 2.0 XML, so in a real project where the model has to go into an engine or a tool like Signavio you'd use something else.

### Slide 29: Camunda Modeler and bpmn.io

This is what you'd use when the model actually has to run. Camunda Modeler is free and writes real BPMN 2.0, and you can deploy to a Camunda engine from inside the app. bpmn.io is the same editor in the browser; demo.bpmn.io is useful to open a .bpmn file quickly, for example one that an AI generated. Last point: Camunda markets 'agentic orchestration', AI agents as participants in a BPMN process. That's where process modelling meets the AI stuff they're all curious about.

### Slide 30: Visual Paradigm

The enterprise option. You pay for it, but you get simulation (where are the bottlenecks if 200 orders come in?) and traceability between the as-is and the to-be model. Some of you might know it from UML courses. We don't use it today because of licences.

### Slide 31: Not BPMN: Netcall's UPN

Included on purpose as a contrast. Some companies find BPMN too technical for their business people and use something simpler like UPN in Netcall's tool. Easier to read, but it's tied to the vendor and you can't execute it. Ask: would you rather have a diagram everyone understands or one a machine can run? (Answer: depends on the goal, see the 'three jobs' slide.)

### Slide 32: Using Claude to draft BPMN

How I actually use it: write down what the people told me, ask Claude for BPMN 2.0 XML, open it in demo.bpmn.io and see what's wrong. It's fast for a first draft, but it's still my job to check it against reality. Two things to stress for future consultants: the AI can't know steps nobody mentioned, and client data doesn't go into public AI tools.

### Slide 33: Sources: notation and tools

Reference list for the notation and tools part. [1] is the same OMG spec as in the introduction.

## Sources

### Notation and tools

- [1] Object Management Group, Business Process Model and Notation (BPMN) v2.0.2, Jan. 2014. omg.org/spec/BPMN
- [17] ARIS (Software GmbH), “ARIS BPMN” cheat sheet, 2024 (cheat-sheet.pdf in this repo).
- [18] M. Weske, Business Process Management: Concepts, Languages, Architectures, 2nd ed. Springer, 2012, ch. 5; Fontys BUPR-BPM ch. 5 slides, 2025.
- [20] JGraph, draw.io source repository, Apache License 2.0. github.com/jgraph/drawio
- [21] Docker Hub, “jgraph/drawio” image. hub.docker.com/r/jgraph/drawio
- [22] bpmn.io forum, “Converting draw.io flows to bpmn.io flows en masse,” Feb. 2025. forum.bpmn.io
- [23] SAP Knowledge Base Article 3160338, “Import of an XML file into Signavio Process Explorer from draw.io is not working.”
- [24] Camunda, Camunda Modeler repository (MIT). github.com/camunda/camunda-modeler
- [25] Camunda Docs, “Desktop Modeler.” docs.camunda.io/docs/components/modeler/desktop-modeler
- [26] bpmn.io, “Web-based tooling for BPMN, DMN and forms,” maintained by Camunda. bpmn.io · demo.bpmn.io
- [27] bpmn.io, bpmnlint: validate BPMN diagrams with lint rules. github.com/bpmn-io/bpmnlint
- [28] Camunda, “Orchestrate processes.” camunda.com/orchestrate/processes
- [29] Visual Paradigm, “BPMN diagram and tools.” visual-paradigm.com/features/bpmn-diagram-and-tools
- [30] Visual Paradigm user guide, “Exporting BPMN 2.0.” visual-paradigm.com/support/documents
- [31] C. Green, “What is UPN (Universal Process Notation)?,” Netcall blog, Sep. 2023, updated May 2025. netcall.com/blog/what-is-upn

### Introduction

- [1] Object Management Group, Business Process Model and Notation (BPMN) v2.0.2, formal/13-12-09, Jan. 2014. omg.org/spec/BPMN
- [2] ISO/IEC 19510:2013, Information technology: OMG BPMN. iso.org/standard/62652.html
- [2a] Object Management Group, BPMN v2.0, formal/2011-01-03, Jan. 2011.
- [3] Trisotech, “BPMN introduction and history.” trisotech.com/bpmn-introduction-and-history
- [4] Camunda, “Camunda survey shows automation growth remains flat despite increased investment” (State of Process Orchestration 2024; n = 866), press release, 16 Jan. 2024.
- [4b] Camunda, “8 in 10 organizations fear digital chaos as business process complexity increases” (State of Process Orchestration & Automation 2025; n = 800), press release, 22 Jan. 2025.
- [5] M. zur Muehlen, J. Recker, “How much language is enough? Theoretical and practical use of BPMN,” CAiSE 2008, LNCS 5074, pp. 465–479. doi:10.1007/978-3-540-69534-9_35
- [6] M. Dumas, M. La Rosa, J. Mendling, H. A. Reijers, Fundamentals of Business Process Management, 2nd ed. Springer, 2018. doi:10.1007/978-3-662-56509-4
- [7] IIBA, A Guide to the Business Analysis Body of Knowledge (BABOK Guide) v3, 2015, §10.35 Process Modelling.
- [8] SAP Community, “Using SAP Best Practices packages with SAP Signavio,” 2022. community.sap.com
- [9] Camunda, “How Zalando orchestrates its sales order process with Camunda,” Jul. 2021. camunda.com/blog
- [10] Camunda, “BPMN and microservices orchestration, part 1: flow languages, engines, and timeless patterns,” Aug. 2018. camunda.com/blog
- [11] C. Green, “Alternatives to Business Process Modelling Notation (BPMN),” Netcall, Jan. 2024. netcall.com/blog
- [12] Visual Paradigm Guides, “A comparative analysis of activity diagrams and BPMN in UML.” guides.visual-paradigm.com
- [13] Y. Kologryvov, “What’s wrong with BPMN?,” Medium. medium.com/@yaroslavkologryvov
- [14] W. M. P. van der Aalst, “The application of Petri nets to workflow management,” J. Circuits, Systems and Computers 8(1), 1998.
- [15] A.-W. Scheer, O. Thomas, O. Adam, “Process modeling using event-driven process chains,” in Process-Aware Information Systems, Wiley, 2005.
- [16] H. Magalhães, “Advantages and disadvantages of choosing BPMN instead of a traditional flowchart,” Helppier, Dec. 2023.
