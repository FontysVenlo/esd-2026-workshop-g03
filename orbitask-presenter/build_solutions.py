"""Builds the presenter's draw.io file: all as-is pages of Orbitask, with a TO-BE reference page right after
each process that has a ticket (P1, P2, P3, P5, P6, P7, P10).

    python build_solutions.py

Input : ../orbitask-workshop/app/data/orbitask_as_is_processes.drawio
Output: solutions/orbitask_reference_solutions.drawio   (copied into the presenter image)

The to-be models are defined below as simple specs and laid out on a grid in the same style as the as-is pages.
Green = new or changed step.
"""
import os
import re
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
AS_IS = os.path.join(HERE, '..', 'orbitask-workshop', 'app', 'data', 'orbitask_as_is_processes.drawio')
OUT = os.path.join(HERE, 'solutions', 'orbitask_reference_solutions.drawio')

LANE_COLORS = ['#DAE8FC', '#D5E8D4', '#FFF2CC', '#F8CECC', '#E1D5E7']
SYS_COLOR = '#E1D5E7'
NEW_FILL = '#D5F5E3'
NEW_STROKE = '#2E7D32'

# ---------------------------------------------------------------- specs
# lanes: (key, label, is_system)
# nodes: (id, lane, col, row, kind, label, new?)
#   kinds: start / start-msg / start-timer / end / task-<marker> / xor / and / catch-msg / catch-timer
#   markers: user, service, send, receive, manual, script, abstract
# flows: (src, tgt, label)   msgs: (src|'EXT', tgt|'EXT', label)   notes: (node, text)
SPECS = {}

SPECS['p1'] = dict(
    name='P1 – Lead to contract', ext='Prospect (potential customer)',
    lanes=[('SYS', 'CRM + Power Automate (system)', True), ('SM', 'Sales manager', False), ('SR', 'Sales rep', False)],
    nodes=[
        ('s', 'SYS', 0, 0, 'start-msg', 'Demo request via website form', 0),
        ('t1', 'SYS', 1, 0, 'task-service', 'Create lead in CRM from form data', 1),
        ('t2', 'SYS', 2, 0, 'task-service', 'Check duplicates (email / company domain)', 1),
        ('g1', 'SYS', 3, 0, 'xor', 'Duplicate?', 0),
        ('t3', 'SYS', 4, 1, 'task-service', 'Merge into existing lead (owner kept)', 1),
        ('t4', 'SYS', 5, 0, 'task-service', 'Assign rep by rule (territory / round-robin)', 1),
        ('t5', 'SYS', 6, 0, 'task-send', 'Notify rep in Teams, send Bookings link to prospect', 1),
        ('t6', 'SR', 7, 0, 'task-user', 'Call prospect and give demo (SLA: 24 h)', 0),
        ('g2', 'SR', 8, 0, 'xor', 'Interested?', 0),
        ('t7', 'SR', 9, 1, 'task-user', "Set status 'lost' + reason in CRM", 1),
        ('e0', 'SR', 10, 1, 'end', 'Lead lost', 0),
        ('t8', 'SR', 9, 0, 'task-user', 'Create quote in CRM from current price list', 1),
        ('g3', 'SR', 10, 0, 'xor', 'Discount above limit?', 0),
        ('t9', 'SM', 11, 0, 'task-user', 'Approve discount (Teams approval)', 1),
        ('t10', 'SYS', 12, 0, 'task-send', 'Send quote for e-signature', 1),
        ('c1', 'SYS', 13, 0, 'catch-msg', 'Quote signed', 0),
        ('t11', 'SYS', 14, 0, 'task-service', "Mark deal 'won', notify Finance + CS", 1),
        ('e1', 'SYS', 15, 0, 'end', 'Contract signed', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 'g1', ''), ('g1', 't3', 'Yes'), ('g1', 't4', 'No'),
           ('t3', 't4', ''), ('t4', 't5', ''), ('t5', 't6', ''), ('t6', 'g2', ''), ('g2', 't7', 'No'),
           ('t7', 'e0', ''), ('g2', 't8', 'Yes'), ('t8', 'g3', ''), ('g3', 't9', 'Yes'), ('g3', 't10', 'No'),
           ('t9', 't10', ''), ('t10', 'c1', ''), ('c1', 't11', ''), ('t11', 'e1', '')],
    msgs=[('EXT', 's', 'Fills in form'), ('t5', 'EXT', 'Booking link'), ('t10', 'EXT', 'Quote (e-sign)'),
          ('EXT', 'c1', 'Signature')],
    notes=[('t1', 'No retyping: 10 h/week of manual entry → 0.'),
           ('t4', 'Every lead gets an owner: 10% forgotten leads → 0.'),
           ('t6', '24 h timer: if not called, sales manager is alerted. 3 days → < 24 h.'),
           ('t8', 'Always current prices. Approval only above the limit.')],
)

SPECS['p2'] = dict(
    name='P2 – Customer onboarding', ext='New customer (admin + users)',
    lanes=[('SYS', 'Provisioning automation (system)', True), ('SE', 'Support engineer', False),
           ('CS', 'Customer Success manager', False)],
    nodes=[
        ('s', 'SYS', 0, 0, 'start-msg', "Deal 'won' in CRM", 0),
        ('t1', 'SYS', 1, 0, 'task-service', 'Create onboarding record + workspace', 1),
        ('t2', 'SYS', 2, 0, 'task-send', 'Invite customer admin to self-service portal', 1),
        ('c1', 'SYS', 3, 0, 'catch-msg', 'User list uploaded / SSO connected', 0),
        ('t3', 'SYS', 4, 0, 'task-service', 'Validate list (format, emails, domain)', 1),
        ('g1', 'SYS', 5, 0, 'xor', 'Errors?', 0),
        ('t4', 'SYS', 5, 1, 'task-send', 'Show errors to admin in the portal', 1),
        ('g2', 'SYS', 6, 0, 'xor', 'Special case (SSO, >1000 users)?', 0),
        ('t5', 'SE', 7, 0, 'task-user', 'Configure special setup', 0),
        ('t6', 'SYS', 8, 0, 'task-service', 'Create all user accounts in bulk (API)', 1),
        ('t7', 'SYS', 9, 0, 'task-send', 'Send activation links (own password + MFA)', 1),
        ('t8', 'SYS', 10, 0, 'task-send', 'Notify CS in Teams: accounts ready', 1),
        ('t9', 'CS', 11, 0, 'task-send', 'Send kickoff booking link', 1),
        ('t10', 'CS', 12, 0, 'task-user', 'Give training (+ help-center videos)', 0),
        ('t11', 'SYS', 13, 0, 'task-service', "Set status 'onboarded' automatically", 1),
        ('e1', 'SYS', 14, 0, 'end', 'Customer onboarded', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 'c1', ''), ('c1', 't3', ''), ('t3', 'g1', ''),
           ('g1', 't4', 'Yes'), ('t4', 'c1', ''), ('g1', 'g2', 'No'), ('g2', 't5', 'Yes'), ('g2', 't6', 'No'),
           ('t5', 't6', ''), ('t6', 't7', ''), ('t7', 't8', ''), ('t8', 't9', ''), ('t9', 't10', ''),
           ('t10', 't11', ''), ('t11', 'e1', '')],
    msgs=[('t2', 'EXT', 'Invite'), ('EXT', 'c1', 'Users / SSO'), ('t7', 'EXT', 'Activation links'),
          ('t9', 'EXT', 'Booking link')],
    notes=[('t3', 'Customer fixes errors himself, right away (was: 1 list in 3 sent back).'),
           ('t6', '300 users: ~22 h by hand → minutes.'),
           ('t7', 'No passwords by email: audit finding closed.'),
           ('t8', 'Contract → first login: 6 days → < 1 day.')],
)

SPECS['p3'] = dict(
    name='P3 – Employee onboarding', ext='Laptop supplier',
    lanes=[('HR', 'HR officer', False), ('SYS', 'HR system + Power Automate (system)', True),
           ('IT', 'IT support', False), ('HM', 'Hiring manager', False)],
    nodes=[
        ('s', 'HR', 0, 0, 'start', 'New hire signs contract (e-signature)', 0),
        ('t1', 'HR', 1, 0, 'task-user', 'Enter new hire once in HR system (mandatory fields)', 1),
        ('t2', 'SYS', 2, 0, 'task-service', 'Start onboarding workflow', 1),
        ('g1', 'SYS', 3, 0, 'and', '', 1),
        ('t3', 'SYS', 4, 0, 'task-service', 'Create identity in Entra ID; access to all tools by role', 1),
        ('t4', 'IT', 5, 0, 'task-send', 'Order standard laptop (catalogue)', 1),
        ('c1', 'IT', 6, 0, 'catch-msg', 'Laptop delivered', 0),
        ('t5', 'IT', 7, 0, 'task-service', 'Laptop sets itself up (Autopilot + Intune)', 1),
        ('t6', 'HM', 4, 0, 'task-user', 'Check role access, prepare first-day plan + buddy', 0),
        ('g2', 'SYS', 8, 0, 'and', '', 1),
        ('t7', 'SYS', 9, 0, 'task-send', 'Send welcome mail with passwordless setup (TAP)', 1),
        ('t8', 'HM', 10, 0, 'task-user', 'Welcome employee, hand over ready laptop', 0),
        ('e1', 'HM', 11, 0, 'end', 'Employee can start working on day 1', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 'g1', ''), ('g1', 't3', ''), ('g1', 't4', ''),
           ('g1', 't6', ''), ('t4', 'c1', ''), ('c1', 't5', ''), ('t3', 'g2', ''), ('t5', 'g2', ''),
           ('t6', 'g2', ''), ('g2', 't7', ''), ('t7', 't8', ''), ('t8', 'e1', '')],
    msgs=[('t4', 'EXT', 'Order'), ('EXT', 'c1', 'Delivery')],
    notes=[('t1', 'Entered once, mandatory fields: 50% incomplete forms → 0.'),
           ('t3', '6 tools by hand (16 h/month) → automatic via role groups.'),
           ('t7', 'No passwords on paper.'),
           ('t8', 'Idle 2–3 days → 0. Workflow starts ≥ 2 weeks before start date.')],
)

SPECS['p5'] = dict(
    name='P5 – Development and release', ext='Customers',
    lanes=[('DV', 'Developers', False), ('SYS', 'CI/CD pipeline (system)', True), ('QA', 'QA tester', False),
           ('PM', 'Product manager', False)],
    nodes=[
        ('s', 'DV', 0, 0, 'start', 'Feature ready (pull request)', 0),
        ('t1', 'DV', 1, 0, 'task-user', 'Code review by a colleague', 1),
        ('t2', 'SYS', 2, 0, 'task-service', 'Build once in pipeline (container image)', 1),
        ('t3', 'SYS', 3, 0, 'task-script', 'Run automated tests (< 1 h)', 1),
        ('g1', 'SYS', 4, 0, 'xor', 'Tests green?', 0),
        ('t4', 'SYS', 5, 1, 'task-send', 'Block merge, notify developer', 1),
        ('t6', 'SYS', 5, 0, 'task-service', 'Deploy to staging automatically', 1),
        ('t7', 'QA', 6, 0, 'task-user', 'Exploratory test of new features only', 1),
        ('t8', 'PM', 7, 0, 'task-user', 'Approve release (one click)', 1),
        ('t9', 'SYS', 8, 0, 'task-service', 'Blue-green deploy, no downtime (any weekday)', 1),
        ('t10', 'SYS', 9, 0, 'task-service', 'Automatic health checks + monitoring', 1),
        ('g2', 'SYS', 10, 0, 'xor', 'Healthy?', 0),
        ('t11', 'SYS', 11, 1, 'task-service', 'Automatic rollback (switch back)', 1),
        ('e0', 'SYS', 12, 1, 'end', 'Rolled back in minutes', 0),
        ('t12', 'SYS', 11, 0, 'task-service', 'Generate release notes from tickets', 1),
        ('t13', 'SYS', 12, 0, 'task-send', 'Publish changelog / in-app notice', 1),
        ('e1', 'SYS', 13, 0, 'end', 'Release live', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 't3', ''), ('t3', 'g1', ''), ('g1', 't4', 'No'),
           ('t4', 't1', 'Fix and push again'), ('g1', 't6', 'Yes'), ('t6', 't7', ''), ('t7', 't8', ''),
           ('t8', 't9', ''), ('t9', 't10', ''), ('t10', 'g2', ''), ('g2', 't11', 'No'), ('t11', 'e0', ''),
           ('g2', 't12', 'Yes'), ('t12', 't13', ''), ('t13', 'e1', '')],
    msgs=[('t13', 'EXT', 'Release notes')],
    notes=[('t2', "Same build everywhere: no more 'works on my machine'."),
           ('t3', '2 days manual testing → < 1 h automated.'),
           ('t9', 'Friday 22:00 + 3 h downtime → office hours, zero downtime.'),
           ('t11', 'Rollback by hand → automatic, in minutes.')],
)

SPECS['p6'] = dict(
    name='P6 – Customer support', ext='Customer (email / portal)',
    lanes=[('SYS', 'Helpdesk system', True), ('AG', 'Support agent', False), ('DV', 'Developer', False)],
    nodes=[
        ('s', 'SYS', 0, 0, 'start-msg', 'Customer request (email / portal)', 0),
        ('t1', 'SYS', 1, 0, 'task-service', 'Create ticket (owner, status, SLA)', 1),
        ('t2', 'SYS', 2, 0, 'task-send', 'Auto-reply: ticket no., portal link, help articles', 1),
        ('t3', 'SYS', 3, 0, 'task-service', 'Categorise and route to agent (rules / AI)', 1),
        ('t4', 'AG', 4, 0, 'task-user', 'Handle ticket with knowledge base + suggested answer', 1),
        ('g1', 'AG', 5, 0, 'xor', 'Can agent solve it?', 0),
        ('t5', 'AG', 6, 1, 'task-service', 'Escalate as linked Jira issue', 1),
        ('t6', 'DV', 7, 0, 'task-user', 'Investigate and fix', 0),
        ('t7', 'AG', 8, 0, 'task-send', 'Reply in ticket, status → solved', 1),
        ('t8', 'AG', 9, 0, 'task-user', 'Add answer to knowledge base (if new)', 1),
        ('t9', 'SYS', 10, 0, 'task-service', 'Close automatically + satisfaction survey', 1),
        ('e1', 'SYS', 11, 0, 'end', 'Case closed', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 't3', ''), ('t3', 't4', ''), ('t4', 'g1', ''),
           ('g1', 't5', 'No'), ('t5', 't6', ''), ('t6', 't7', ''), ('g1', 't7', 'Yes'), ('t7', 't8', ''),
           ('t8', 't9', ''), ('t9', 'e1', '')],
    msgs=[('EXT', 's', 'Request'), ('t2', 'EXT', 'Confirmation'), ('t7', 'EXT', 'Answer')],
    notes=[('t1', 'Every request has an owner + status: 12% unanswered → 0.'),
           ('t2', 'Instant confirmation; status visible in portal (30 calls/day → few).'),
           ('t3', 'Team lead no longer sorts (1.5 h/day). Alert if no reply in 4 h.'),
           ('t8', 'Knowledge base grows: fewer repeat questions.')],
)

SPECS['p7'] = dict(
    name='P7 – Billing and payment', ext='Customer',
    lanes=[('FI', 'Finance clerk', False), ('SYS', 'Billing system (automated)', True)],
    nodes=[
        ('s', 'SYS', 0, 0, 'start-timer', '1st working day of the month', 0),
        ('t1', 'SYS', 1, 0, 'task-service', 'Import usage data automatically (API)', 1),
        ('t2', 'SYS', 2, 0, 'task-service', 'Calculate amounts from price plans', 1),
        ('t3', 'FI', 3, 0, 'task-user', 'Review exceptions only (unusual amounts, new contracts)', 1),
        ('t4', 'SYS', 4, 0, 'task-send', 'Create + send invoices (PDF / e-invoice, direct debit)', 1),
        ('tm', 'SYS', 5, 0, 'catch-timer', 'Due date', 0),
        ('t5', 'SYS', 6, 0, 'task-service', 'Match payments via bank feed', 1),
        ('g1', 'SYS', 7, 0, 'xor', 'Payment status?', 0),
        ('t6', 'SYS', 8, 1, 'task-send', 'Automatic reminder (dunning level)', 1),
        ('t7', 'FI', 9, 0, 'task-user', 'Clarify unclear payment', 1),
        ('e1', 'SYS', 10, 0, 'end', 'Invoice paid', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 't3', ''), ('t3', 't4', ''), ('t4', 'tm', ''),
           ('tm', 't5', ''), ('t5', 'g1', ''), ('g1', 'e1', 'Paid'), ('g1', 't6', 'Not paid'),
           ('t6', 'tm', ''), ('g1', 't7', 'Unclear'), ('t7', 'e1', '')],
    msgs=[('t4', 'EXT', 'Invoice'), ('t6', 'EXT', 'Reminder')],
    notes=[('t1', 'Developers no longer interrupted every month.'),
           ('t3', 'Human check on exceptions only. 8 person-days → ~0.5 day.'),
           ('t4', 'All ~900 invoices out on day 1, no typing errors.'),
           ('t5', '1 day matching, 3% mistakes → automatic, exceptions only.')],
)

SPECS['p10'] = dict(
    name='P10 – Monthly management reporting', ext=None,
    lanes=[('SYS', 'Data platform + Power BI (system)', True), ('DH', 'Department heads (data owners)', False),
           ('CT', 'Controller', False), ('MT', 'Management team', False)],
    nodes=[
        ('s', 'SYS', 0, 0, 'start-timer', 'Every night', 0),
        ('t1', 'SYS', 1, 0, 'task-service', 'Load data from CRM, helpdesk, billing, HR', 1),
        ('t2', 'SYS', 2, 0, 'task-service', 'Calculate KPIs with one shared definition each', 1),
        ('t3', 'SYS', 3, 0, 'task-script', 'Run data-quality checks', 1),
        ('g1', 'SYS', 4, 0, 'xor', 'Data issue?', 0),
        ('t4', 'DH', 5, 0, 'task-user', 'Fix data at the source (alerted automatically)', 1),
        ('g2', 'SYS', 6, 0, 'xor', '', 0),
        ('t5', 'SYS', 7, 0, 'task-service', 'Refresh live KPI dashboard', 1),
        ('e0', 'SYS', 8, 0, 'end', 'Dashboard up to date', 0),
        ('s2', 'CT', 0, 0, 'start-timer', '1st working day of the month', 0),
        ('t6', 'CT', 1, 0, 'task-user', 'Analyse trends, write commentary in dashboard', 1),
        ('t7', 'MT', 2, 0, 'task-user', 'Discuss figures in meeting (live dashboard)', 1),
        ('e1', 'MT', 3, 0, 'end', 'Report presented', 0),
    ],
    flows=[('s', 't1', ''), ('t1', 't2', ''), ('t2', 't3', ''), ('t3', 'g1', ''), ('g1', 't4', 'Yes'),
           ('t4', 'g2', ''), ('g1', 'g2', 'No'), ('g2', 't5', ''), ('t5', 'e0', ''),
           ('s2', 't6', ''), ('t6', 't7', ''), ('t7', 'e1', '')],
    msgs=[],
    notes=[('t2', "One-time: KPI glossary agreed (e.g. 'active customer'), owned by the controller."),
           ('t1', 'No more Excel emails, chasing or copy-paste (3 days/month → 0).'),
           ('t5', 'Numbers max. 1 day old (was: ~2 weeks, ready on day 13).'),
           ('t6', 'Controller spends time on analysis, not on copy-paste.')],
)

# ---------------------------------------------------------------- styles (same look as the as-is pages)
EVT_PTS = 'points=[[0.145,0.145,0],[0.5,0,0],[0.855,0.145,0],[1,0.5,0],[0.855,0.855,0],[0.5,1,0],[0.145,0.855,0],[0,0.5,0]];'
TASK_PTS = ('points=[[0.25,0,0],[0.5,0,0],[0.75,0,0],[1,0.25,0],[1,0.5,0],[1,0.75,0],[0.75,1,0],[0.5,1,0],'
            '[0.25,1,0],[0,0.75,0],[0,0.5,0],[0,0.25,0]];')
GW_PTS = 'points=[[0.25,0.25,0],[0.5,0,0],[0.75,0.25,0],[1,0.5,0],[0.75,0.75,0],[0.5,1,0],[0.25,0.75,0],[0,0.5,0]];'
SEQ = ('edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;'
       'fontSize=10;labelBackgroundColor=#FFFFFF;')
MSG = ('dashed=1;dashPattern=8 4;endArrow=blockThin;endFill=0;startArrow=oval;startFill=0;endSize=8;startSize=5;'
       'html=1;fontSize=10;labelBackgroundColor=#FFFFFF;fontColor=#555555;strokeColor=#555555;')

COL0, COLW = 130, 165          # centre x of column 0 inside a lane, column width
ROW0, ROWH = 75, 115           # centre y of row 0 inside a lane, row height
LANE_H1 = 150


def fill(new):
    return f'fillColor={NEW_FILL};strokeColor={NEW_STROKE};' if new else 'fillColor=#FFFFFF;'


def node_style(kind, new):
    if kind.startswith('task-'):
        marker = kind[5:]
        return (TASK_PTS + 'shape=mxgraph.bpmn.task2;whiteSpace=wrap;rectStyle=rounded;size=10;html=1;container=1;'
                f'expand=0;collapsible=0;taskMarker={marker};fontSize=11;' + fill(new))
    if kind in ('xor', 'and'):
        gw = 'exclusive' if kind == 'xor' else 'parallel'
        return (GW_PTS + 'shape=mxgraph.bpmn.gateway2;html=1;verticalLabelPosition=top;labelPosition=right;'
                'labelBackgroundColor=none;verticalAlign=bottom;align=left;spacingLeft=-18;perimeter=rhombusPerimeter;'
                f'outlineConnect=0;outline=none;symbol=none;gwType={gw};fontSize=10;' + fill(new))
    outline, symbol = {
        'start': ('standard', 'general'), 'start-msg': ('standard', 'message'),
        'start-timer': ('standard', 'timer'), 'end': ('end', 'general'),
        'catch-msg': ('catching', 'message'), 'catch-timer': ('catching', 'timer'),
    }[kind]
    if kind == 'start':
        symbol = 'general'
    return (EVT_PTS + 'shape=mxgraph.bpmn.event;html=1;verticalLabelPosition=bottom;labelBackgroundColor=none;'
            'verticalAlign=top;align=center;perimeter=ellipsePerimeter;outlineConnect=0;aspect=fixed;'
            f'outline={outline};symbol={symbol};fontSize=10;' + fill(new))


def size(kind):
    if kind.startswith('task-'):
        return 120, 70
    if kind in ('xor', 'and'):
        return 50, 50
    return 40, 40


def cell(cid, value, style, parent, x, y, w, h):
    return (f'<mxCell id="{cid}" value="{escape(value, {chr(34): "&quot;"})}" style="{style}" vertex="1" '
            f'parent="{parent}"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')


def edge(cid, value, style, src, tgt, pts=()):
    arr = ''
    if pts:
        arr = '<Array as="points">' + ''.join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in pts) + '</Array>'
    return (f'<mxCell id="{cid}" value="{escape(value)}" style="{style}" edge="1" parent="1" source="{src}" '
            f'target="{tgt}"><mxGeometry relative="1" as="geometry">{arr}</mxGeometry></mxCell>')


def port(x, y):
    return f'exitX={x};exitY={y};exitDx=0;exitDy=0;'


def entry(x, y):
    return f'entryX={x};entryY={y};entryDx=0;entryDy=0;'


def build_page(pid, spec):
    P = f'{pid}tb'
    out = []
    lanes = spec['lanes']
    rows = {k: 1 for k, _, _ in lanes}
    for n in spec['nodes']:
        rows[n[1]] = max(rows[n[1]], n[3] + 1)
    lane_h = {k: LANE_H1 + (rows[k] - 1) * ROWH for k in rows}
    max_col = max(n[2] for n in spec['nodes'])
    width = COL0 + COLW * max_col + 140 + 30
    pool_x = 40
    pool_y = 170 if spec['ext'] else 70
    pool_h = sum(lane_h.values())

    out.append(cell(f'{P}-title', f"{spec['name']} (TO-BE – reference solution)",
                    'text;html=1;align=left;verticalAlign=top;fontSize=20;fontStyle=1;whiteSpace=wrap;fontColor=#1B5E20;',
                    '1', 40, 10, 900, 34))
    out.append(cell(f'{P}-legend', 'Green = new or changed step. Purple lane = automated by IT systems.',
                    'text;html=1;align=left;verticalAlign=top;fontSize=11;fontColor=#555555;whiteSpace=wrap;',
                    '1', 40, 40 if spec['ext'] else 42, 700, 20))
    if spec['ext']:
        out.append(cell(f'{P}-ext', spec['ext'], 'rounded=0;whiteSpace=wrap;html=1;fontStyle=1;fontSize=12;'
                        'fillColor=#F5F5F5;strokeColor=#333333;strokeWidth=1;', '1', pool_x, 70, width + 30, 50))
    out.append(cell(f'{P}-pool', 'Orbitask', 'swimlane;html=1;startSize=30;horizontal=0;fontStyle=1;fontSize=13;'
                    'collapsible=0;swimlaneFillColor=#FFFFFF;fillColor=#E6E6E6;strokeColor=#333333;',
                    '1', pool_x, pool_y, width + 30, pool_h))
    lane_y = {}
    y = 0
    ci = 0
    for key, label, is_sys in lanes:
        color = SYS_COLOR if is_sys else LANE_COLORS[ci % len(LANE_COLORS)]
        if not is_sys:
            ci += 1
        out.append(cell(f'{P}-lane-{key}', label, 'swimlane;html=1;startSize=30;horizontal=0;fontSize=11;fontStyle=1;'
                        f'collapsible=0;swimlaneFillColor=#FFFFFF;fillColor={color};strokeColor=#666666;whiteSpace=wrap;',
                        f'{P}-pool', 30, y, width, lane_h[key]))
        lane_y[key] = y
        y += lane_h[key]

    # absolute geometry of every node
    geo = {}
    for nid, lane, col, row, kind, label, new in spec['nodes']:
        w, h = size(kind)
        cx, cy = COL0 + COLW * col, ROW0 + ROWH * row
        lx, ly = cx - w / 2, cy - h / 2
        out.append(cell(f'{P}-{nid}', label, node_style(kind, new), f'{P}-lane-{lane}', lx, ly, w, h))
        ax, ay = pool_x + 30 + lx, pool_y + lane_y[lane] + ly
        geo[nid] = dict(x=ax, y=ay, w=w, h=h, cx=ax + w / 2, cy=ay + h / 2, kind=kind, label=label)

    pool_bottom = pool_y + pool_h
    for i, (a, b, label) in enumerate(spec['flows']):
        s, t = geo[a], geo[b]
        gw = s['kind'] in ('xor', 'and')
        pts = ()
        if t['cx'] < s['cx'] - 5:                         # loop back: go under both, then up into the target
            yb = max(s['y'] + s['h'], t['y'] + t['h']) + 22
            st = port(0.5, 1) + entry(0.5, 1)
            pts = ((s['cx'], yb), (t['cx'], yb))
        elif abs(t['cy'] - s['cy']) < 5:                  # straight right
            st = port(1, 0.5) + entry(0, 0.5)
        elif abs(t['cx'] - s['cx']) < 5:                  # straight down / up
            st = port(0.5, 1 if t['cy'] > s['cy'] else 0) + entry(0.5, 0 if t['cy'] > s['cy'] else 1)
        elif gw:                                          # gateway branch: leave down/up, enter from the left
            st = port(0.5, 1 if t['cy'] > s['cy'] else 0) + entry(0, 0.5)
            pts = ((s['cx'], t['cy']),)
        elif t['kind'] in ('xor', 'and'):                 # into a join gateway: enter from below/above
            st = port(1, 0.5) + entry(0.5, 0 if t['cy'] > s['cy'] else 1)
            pts = ((t['cx'], s['cy']),)
        else:                                             # to another lane: right, then down/up into the target
            st = port(1, 0.5) + entry(0.5, 0 if t['cy'] > s['cy'] else 1)
            pts = ((t['cx'], s['cy']),)
        out.append(edge(f'{P}-f{i}', label, SEQ + st, f'{P}-{a}', f'{P}-{b}', pts))

    ext_w = width + 30
    for i, (a, b, label) in enumerate(spec['msgs']):
        if a == 'EXT':
            n = geo[b]
            st = port(round((n['cx'] - pool_x) / ext_w, 4), 1) + entry(0.5, 0)
            out.append(edge(f'{P}-m{i}', label, MSG + st, f'{P}-ext', f'{P}-{b}'))
        else:
            n = geo[a]
            st = port(0.75 if n['kind'].startswith('task-') else 0.5, 0) + entry(round((n['cx'] + 20 - pool_x) / ext_w, 4), 1)
            out.append(edge(f'{P}-m{i}', label, MSG + st, f'{P}-{a}', f'{P}-ext'))

    nx_end = 0
    for i, (target, text) in enumerate(sorted(spec['notes'], key=lambda n: geo[n[0]]['cx'])):
        n = geo[target]
        x = max(n['cx'] - 85, nx_end + 15)
        nx_end = x + 170
        # A dotted connector would cross other shapes when the step sits in an upper lane: then name the step in
        # the note instead of drawing the line.
        lo, hi = min(x + 85, n['cx']) - 4, max(x + 85, n['cx']) + 4
        blocked = any(o is not n and o['x'] < hi and o['x'] + o['w'] > lo and o['y'] > n['y'] + n['h']
                      for o in geo.values())
        value = f"<b>{escape(n['label'])}:</b> {escape(text)}" if blocked else escape(text)
        out.append(cell(f'{P}-n{i}', value, 'shape=partialRectangle;html=1;whiteSpace=wrap;right=0;fillColor=#E8F5E9;'
                        'align=left;verticalAlign=middle;spacingLeft=6;spacingRight=4;fontSize=10;strokeColor=#2E7D32;'
                        'fontColor=#1B5E20;', '1', x, pool_bottom + 50, 170, 64))
        if blocked:
            continue
        out.append(f'<mxCell id="{P}-nl{i}" value="" style="endArrow=none;dashed=1;dashPattern=1 3;html=1;'
                   f'strokeColor=#66BB6A;exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;" '
                   f'edge="1" parent="1" source="{P}-n{i}" target="{P}-{target}"><mxGeometry relative="1" '
                   f'as="geometry"/></mxCell>')

    body = ''.join(out)
    name = escape(f"{spec['name']} – TO-BE (solution)")
    return (f'<diagram id="{pid}-tobe" name="{name}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" '
            f'guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0">'
            f'<root><mxCell id="0"/><mxCell id="1" parent="0"/>{body}</root></mxGraphModel></diagram>')


def main():
    src = open(AS_IS, encoding='utf8').read()
    for pid, spec in SPECS.items():
        m = re.search(rf'<diagram id="{pid}"[\s\S]*?</diagram>', src)
        if not m:
            raise SystemExit(f'page {pid} not found in as-is file')
        src = src[:m.end()] + build_page(pid, spec) + src[m.end():]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf8', newline='') as f:
        f.write(src)
    print(f'wrote {OUT} ({len(SPECS)} to-be pages)')


if __name__ == '__main__':
    main()
