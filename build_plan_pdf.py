"""
Nexus - Architecture & Build Plan PDF generator.

Produces: Nexus_Architecture_Build_Plan.pdf
Style aligned with Nexus Engineering Documentation (blue headings, clean tables).
"""
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
    TableStyle, PageBreak, KeepTogether, Preformatted,
)
from reportlab.pdfgen import canvas

OUT = r"C:\Users\rayya\Desktop\Nexus\Nexus_Architecture_Build_Plan.pdf"

# ---------- Colors ----------
NAVY = colors.HexColor("#12305B")
BLUE = colors.HexColor("#1F6FB8")
TEAL = colors.HexColor("#2FA3A3")
LIGHT = colors.HexColor("#F1F5F9")
BORDER = colors.HexColor("#CBD5E1")
MUTED = colors.HexColor("#6B7280")
INK = colors.HexColor("#0F172A")

# ---------- Styles ----------
base = getSampleStyleSheet()

def pstyle(name, **kw):
    return ParagraphStyle(name=name, parent=base["Normal"], **kw)

S = {
    "title":   pstyle("title",   fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=NAVY),
    "subtitle":pstyle("subtitle",fontName="Helvetica",      fontSize=14, leading=18, textColor=BLUE),
    "h1":      pstyle("h1",      fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY, spaceBefore=18, spaceAfter=8),
    "h2":      pstyle("h2",      fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=BLUE, spaceBefore=12, spaceAfter=6),
    "h3":      pstyle("h3",      fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=NAVY, spaceBefore=8,  spaceAfter=3),
    "body":    pstyle("body",    fontName="Helvetica",      fontSize=10, leading=14, textColor=INK, alignment=TA_JUSTIFY, spaceAfter=6),
    "bullet":  pstyle("bullet",  fontName="Helvetica",      fontSize=10, leading=14, textColor=INK, leftIndent=14, bulletIndent=4, spaceAfter=2),
    "small":   pstyle("small",   fontName="Helvetica",      fontSize=9,  leading=12, textColor=MUTED),
    "code":    pstyle("code",    fontName="Courier",        fontSize=9,  leading=12, textColor=INK, backColor=LIGHT, leftIndent=6, rightIndent=6, spaceAfter=6),
    "caption": pstyle("caption", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=MUTED, alignment=TA_CENTER, spaceAfter=10),
    "tocH1":   pstyle("tocH1",   fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=NAVY),
    "tocH2":   pstyle("tocH2",   fontName="Helvetica",      fontSize=10, leading=14, textColor=INK, leftIndent=14),
    "coverMeta": pstyle("coverMeta", fontName="Helvetica",  fontSize=10, leading=14, textColor=MUTED, alignment=TA_CENTER),
}

# ---------- Helpers ----------
def P(txt, style="body"):
    return Paragraph(txt, S[style])

def BULLETS(items, style="bullet"):
    return [Paragraph(f"• {x}", S[style]) for x in items]

def H1(n, title):
    prefix = f"{n}. " if n else ""
    return Paragraph(f"{prefix}{title}", S["h1"])

def H2(n, title):
    return Paragraph(f"{n} {title}", S["h2"])

def H3(title):
    return Paragraph(title, S["h3"])

def TBL(data, col_widths=None, header=True, zebra=True, shrink=False):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("FONT",       (0, 0), (-1, -1), "Helvetica", 9),
        ("TEXTCOLOR",  (0, 0), (-1, -1), INK),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",(0, 0), (-1, -1), 5),
        ("RIGHTPADDING",(0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LINEBELOW",  (0, 0), (-1, -1), 0.3, BORDER),
        ("BOX",        (0, 0), (-1, -1), 0.5, BORDER),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONT",       (0, 0), (-1, 0), "Helvetica-Bold", 9),
        ]
    if zebra:
        for r in range(1, len(data)):
            if r % 2 == 0:
                style.append(("BACKGROUND", (0, r), (-1, r), LIGHT))
    if shrink:
        style += [("FONT", (0, 0), (-1, -1), "Helvetica", 8)]
        if header:
            style += [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8)]
    t.setStyle(TableStyle(style))
    return t

def CODE(txt):
    return Preformatted(txt, S["code"])

def SP(h=6):
    return Spacer(1, h)

# ---------- Page decorations ----------
def draw_header_footer(canv: canvas.Canvas, doc):
    canv.saveState()
    # Header
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.5)
    canv.line(20*mm, 285*mm, 190*mm, 285*mm)
    canv.setFont("Helvetica", 8)
    canv.setFillColor(MUTED)
    canv.drawString(20*mm, 287*mm, "NEXUS — Architecture & Build Plan")
    canv.drawRightString(190*mm, 287*mm, "PT Global Dataverse Indonesia")
    # Footer
    canv.line(20*mm, 15*mm, 190*mm, 15*mm)
    canv.setFont("Helvetica", 8)
    canv.setFillColor(MUTED)
    canv.drawString(20*mm, 10*mm, "CONFIDENTIAL — FOR REVIEW & APPROVAL")
    canv.drawRightString(190*mm, 10*mm, f"Page {doc.page}")
    canv.restoreState()

def draw_cover(canv: canvas.Canvas, doc):
    canv.saveState()
    # Background band
    canv.setFillColor(NAVY)
    canv.rect(0, 190*mm, 210*mm, 107*mm, fill=1, stroke=0)
    # Circle accent
    canv.setFillColor(BLUE)
    canv.circle(185*mm, 250*mm, 45*mm, fill=1, stroke=0)
    # Teal bar
    canv.setFillColor(TEAL)
    canv.rect(20*mm, 140*mm, 60*mm, 1.5*mm, fill=1, stroke=0)
    # Labels
    canv.setFillColor(TEAL)
    canv.setFont("Helvetica-Bold", 10)
    canv.drawString(20*mm, 265*mm, "P T   G L O B A L   D A T A V E R S E   I N D O N E S I A")
    # Title
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica-Bold", 38)
    canv.drawString(20*mm, 235*mm, "NEXUS")
    canv.setFont("Helvetica", 18)
    canv.drawString(20*mm, 222*mm, "Architecture & Build Plan")
    canv.setFont("Helvetica-Oblique", 13)
    canv.setFillColor(colors.HexColor("#B7D9F2"))
    canv.drawString(20*mm, 210*mm, "GDI Client Operating System — design for engineering review")
    # Meta
    canv.setFont("Helvetica-Bold", 10)
    canv.setFillColor(NAVY)
    canv.drawString(20*mm, 130*mm, "DOCUMENT CONTROL")
    canv.setFont("Helvetica", 10)
    canv.setFillColor(INK)
    meta = [
        ("Document", "Nexus Architecture & Build Plan"),
        ("Version",  "v1.0 — Draft for Approval"),
        ("Date",     "April 2026"),
        ("Status",   "PENDING REVIEW"),
        ("Owner",    "Engineering — PT Global Dataverse Indonesia"),
        ("Reviewers","CTO / Head of Engineering / Product"),
        ("Supersedes","—"),
        ("Aligned with","Nexus Engineering Documentation v1.0"),
        ("Design methodology","Arcforge (graph-based) — github.com/ysz7/Arcforge"),
    ]
    y = 122*mm
    for k, v in meta:
        canv.setFont("Helvetica-Bold", 9); canv.setFillColor(NAVY)
        canv.drawString(20*mm, y, k)
        canv.setFont("Helvetica", 9); canv.setFillColor(INK)
        canv.drawString(65*mm, y, v)
        y -= 6*mm
    # Bottom strip
    canv.setFillColor(NAVY)
    canv.rect(0, 0, 210*mm, 18*mm, fill=1, stroke=0)
    canv.setFillColor(colors.white)
    canv.setFont("Helvetica", 9)
    canv.drawCentredString(105*mm, 8*mm, "CONFIDENTIAL — INTERNAL REVIEW ONLY · contact@dataverseindonesia.co.id · Bandung, West Java, Indonesia")
    canv.restoreState()

# ---------- Build doc ----------
def build():
    doc = BaseDocTemplate(
        OUT, pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm, topMargin=22*mm, bottomMargin=20*mm,
        title="Nexus — Architecture & Build Plan",
        author="PT Global Dataverse Indonesia",
        subject="Architecture design and build plan for Nexus (GDI-COS)",
    )
    frame_cover = Frame(0, 0, 210*mm, 297*mm, id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    frame_body  = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame_cover], onPage=draw_cover),
        PageTemplate(id="body",  frames=[frame_body],  onPage=draw_header_footer),
    ])

    story = []
    # Cover is drawn by onPage
    story.append(PageBreak())  # move to 'body' template
    # Switch template
    from reportlab.platypus.flowables import PageBreakIfNotEmpty
    from reportlab.platypus.doctemplate import NextPageTemplate
    story.insert(0, NextPageTemplate("body"))

    # --- Executive Summary ---
    story += [
        H1("", "Executive Summary"),
        P("Nexus is GDI's Client Operating System (GDI-COS) — a single platform that manages the full client lifecycle from AI-powered discovery through delivery, billing and long-term retention. This document translates the approved engineering documentation into an <b>executable architecture and build plan</b> suitable for engineering review and budget approval."),
        P("The plan follows the <b>Arcforge methodology</b>: architecture is designed as a graph of <i>components</i> (nodes) and <i>dependencies</i> (edges) so the design itself is AI-exportable and directly consumable by code-generation workflows. The graph is decomposed at three levels (system context → container → component) and complemented by a data model, API contracts, MCP server catalogue, infrastructure blueprint, security controls, observability plan and a phased build schedule."),
        P("<b>Scope.</b> We will deliver Nexus as a modular monolith on Next.js + TypeScript + PostgreSQL, hosted on AWS (Fargate), with an MCP layer that lets internal AI agents interact with Nexus safely. The build is divided into four phases mirroring the phased plan in the engineering documentation (MVP lead acquisition, client operations, deal closure, scale/monitoring)."),
        P("<b>Timeline.</b> 16 weeks of core build + 2 weeks hypercare. First client traffic on the Phase-1 MVP is targeted for <b>Week 6</b>."),
        P("<b>Team &amp; cost.</b> A blended team of 5.0 FTE across tech lead, full-stack, frontend, platform/DevOps, design and QA. Indicative all-in cost: <b>IDR 1.7B – 2.3B</b> for build, plus ~<b>USD 480 – 720 per month</b> for production cloud infrastructure at steady state."),
        P("<b>Decision requested.</b> Approval to proceed with Phase 1 (<i>AI Intake + Scheduling + Lead Management</i>) under this plan, with subsequent phases gated on Phase-1 acceptance."),
    ]

    # --- Table of Contents ---
    story += [PageBreak(), H1("", "Table of Contents")]
    toc = [
        ("1", "Introduction & Scope"),
        ("2", "Design Principles (Arcforge-aligned)"),
        ("3", "System Context (C4 L1)"),
        ("4", "Container Architecture (C4 L2)"),
        ("5", "Component Graph — Arcspec"),
        ("6", "Data Model & Schema"),
        ("7", "API Design"),
        ("8", "MCP Architecture"),
        ("9", "Infrastructure & Deployment"),
        ("10", "Security & Compliance"),
        ("11", "Observability & Operations"),
        ("12", "Testing & Quality Strategy"),
        ("13", "Build Plan & Milestones"),
        ("14", "Team, Cost & Timeline"),
        ("15", "Risks & Mitigations"),
        ("16", "Architecture Decision Records (ADRs)"),
        ("17", "Repository & Folder Structure"),
        ("18", "Next Steps & Approval"),
    ]
    for n, t in toc:
        story.append(Paragraph(f"<b>{n}.</b>&nbsp;&nbsp;{t}", S["tocH1"]))

    # ============================================================
    # 1. Introduction & Scope
    # ============================================================
    story += [PageBreak(), H1("1", "Introduction & Scope")]
    story += [H2("1.1", "Document purpose")]
    story += [P("This document is the authoritative engineering plan for the Nexus platform. It is derived from, and consistent with, the approved <i>Nexus Engineering Documentation v1.0</i> (April 2026) and expands it into: a concrete component graph, data model, API and MCP specifications, infrastructure design, security and observability controls, a testing strategy, and a week-by-week build plan with team, cost and risk sections.")]
    story += [P("The document is written for three audiences: (a) the <b>engineering team</b> building Nexus, (b) the <b>review committee</b> approving the project, and (c) <b>external reviewers</b> (client or audit) who need to understand how Nexus is built and operated.")]

    story += [H2("1.2", "In scope")]
    story += BULLETS([
        "All modules defined in the Engineering Documentation §9: AI Intake, Lead Management, Scheduling, Client Workspace, Ticketing, Contract, Billing, Monitoring (Phase 3).",
        "MCP server layer to expose Nexus domain actions and knowledge to internal AI agents (AI Intake, admin agents).",
        "End-to-end infrastructure on AWS (VPC, ECS Fargate, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront).",
        "CI/CD pipeline, IaC (Terraform), environments (dev/staging/prod), observability, backup and DR.",
        "Security controls aligned to OWASP ASVS L2 and Indonesian Personal Data Protection Law (UU PDP).",
        "WhatsApp Business API + email-based notification dispatcher.",
        "Integration with Google Calendar / Outlook, Stripe / Midtrans, DocuSign / Adobe Sign.",
    ])

    story += [H2("1.3", "Out of scope (for v1)")]
    story += BULLETS([
        "Native mobile applications. Nexus is fully web-native; responsive design covers mobile browsers.",
        "Multi-language UI beyond Bahasa Indonesia and English. Additional locales can be added post-GA.",
        "Tenant-isolation across multiple GDI brands. Single-tenant in v1 with tenancy hooks reserved in the schema.",
        "Direct integration with external ERPs. Export API is in scope; bi-directional ERP sync is a Phase-4 extension.",
    ])

    story += [H2("1.4", "Success criteria")]
    story += [TBL([
        ["Criterion", "Target"],
        ["Phase-1 MVP live for real visitor traffic", "Week 6"],
        ["Full platform Go-Live (all phases)", "Week 16"],
        ["p95 API latency, authenticated routes", "< 500 ms"],
        ["Uptime SLO (prod)", "≥ 99.5%"],
        ["Lead-to-qualified-decision cycle time", "≤ 48 h median"],
        ["Request SLA adherence (Critical ≤ 2 h)", "≥ 95% of tickets"],
        ["WhatsApp delivery success rate", "≥ 98%"],
        ["Automated test coverage (services)", "≥ 80%"],
        ["Zero critical OWASP issues open at Go-Live", "Hard gate"],
    ], col_widths=[100*mm, 60*mm])]

    # ============================================================
    # 2. Design Principles
    # ============================================================
    story += [PageBreak(), H1("2", "Design Principles (Arcforge-aligned)")]
    story += [P("The Engineering Documentation established five product principles. This plan adds five <b>engineering</b> principles, aligned with the Arcforge design philosophy of making architecture a first-class, graph-shaped artifact.")]
    story += [H2("2.1", "Product principles (restated)")]
    story += BULLETS([
        "<b>One identity per client</b> — a single client record persists across all lifecycle stages.",
        "<b>Continuous lifecycle</b> — no switching between disconnected systems.",
        "<b>Automation supports decisions</b> — automate state, keep judgement human.",
        "<b>Clean client UX, powerful internal backend</b> — asymmetric surface for clients vs staff.",
        "<b>Progressive enhancement</b> — each phase adds capability without breaking earlier ones.",
    ])
    story += [H2("2.2", "Engineering principles")]
    story += BULLETS([
        "<b>Graph-first architecture.</b> Every component is a node; every dependency is an edge. The whole system is expressible as a single <i>.arcspec</i>-style graph so that the architecture is navigable, reviewable and AI-consumable.",
        "<b>Modular monolith first.</b> One deployable for v1; clean module boundaries so individual services can be extracted later without rewriting domain logic.",
        "<b>Domain-driven boundaries.</b> Module seams follow the lifecycle stages (Intake, Scheduling, Workspace, Ticketing, Contracts, Billing, Monitoring).",
        "<b>State at the edge of the API.</b> All state transitions are validated server-side; clients are never trusted with state machines.",
        "<b>Everything is observable.</b> Every API call, every state change, every notification has a trace-id, a structured log and a metric. If we cannot graph it, we cannot operate it.",
    ])

    # ============================================================
    # 3. System Context (C4 L1)
    # ============================================================
    story += [PageBreak(), H1("3", "System Context (C4 L1)")]
    story += [P("The L1 view shows Nexus as a single box surrounded by the humans and external systems it talks to. This is the level at which we communicate with the business and external auditors.")]
    story += [CODE(r"""
                                              +--> WhatsApp Business API
                                              +--> SendGrid (email fallback)
            +-----------------------------+   +--> Google Calendar / Outlook
 Visitor -->|                             |   +--> Stripe / Midtrans
 Prospect ->|    N E X U S   (GDI-COS)    |<->+--> DocuSign / Adobe Sign
 Client   ->|                             |   +--> Anthropic Claude
 Engineer ->|                             |   +--> AWS (CloudWatch, S3, ...)
 Admin    ->|                             |   +--> Sentry
            +--+----+----+----+-----+-----+
               |    |    |    |     |
               v    v    v    v     v
         PostgreSQL Redis S3  Graf.  Sentry
""")]
    story += [P("<b>Actors.</b> Five roles consume Nexus: anonymous <i>Visitors</i>, registered but unqualified <i>Prospects</i>, qualified <i>Clients</i>, internal <i>Engineers</i> and <i>Admin/GDI</i> staff.")]
    story += [P("<b>External systems.</b> Nine external dependencies with clearly bounded integration points. Each dependency has an owner, a fallback strategy and a health check (see §10 and §11).")]
    story += [TBL([
        ["Integration", "Direction", "Purpose", "Fallback / Risk posture"],
        ["WhatsApp Business API", "Outbound", "Primary notifications", "Email fallback; queue with retry + DLQ"],
        ["SendGrid (SMTP)", "Outbound", "Email fallback, long-form docs", "Secondary provider on standby"],
        ["Google Calendar / Outlook", "Bi-directional", "Availability + booking sync", "Manual reschedule path"],
        ["Stripe", "Bi-directional", "International card payments", "Midtrans for IDR / domestic"],
        ["Midtrans", "Bi-directional", "Domestic IDR payments, VA, QRIS", "Stripe as international alt."],
        ["DocuSign / Adobe Sign", "Outbound + webhook", "E-signature on contracts", "PDF + wet-sign flow reserved"],
        ["Anthropic Claude", "Outbound", "AI Intake + admin agents", "Rule-based intake form as fallback"],
        ["AWS (CloudWatch, S3, etc.)", "Bi-directional", "Cloud services", "Multi-AZ, multi-region-ready"],
        ["Sentry", "Outbound", "Error tracking", "Self-hosted GlitchTip on standby"],
    ], col_widths=[42*mm, 22*mm, 48*mm, 58*mm], shrink=True)]

    # ============================================================
    # 4. Container Architecture (C4 L2)
    # ============================================================
    story += [PageBreak(), H1("4", "Container Architecture (C4 L2)")]
    story += [P("Inside the Nexus box sit ten deployable units plus two data stores and one object store. All user traffic enters via CloudFront → ALB → Next.js. Internal service-to-service traffic stays in the VPC.")]
    story += [CODE(r"""
                    [ CloudFront ]                        [ Route53 ]
                         |
                     (HTTPS / WAF)
                         v
                    [  ALB   ]
                         |
         +---------------+---------------+
         |                               |
    [ Nexus Web ]                  [ Nexus API ]
    Next.js 14 SSR                 Next.js Route Handlers (BFF)
    tRPC client                    + tRPC server
         |                               |
         +---------------+---------------+
                         |
                    [ Service Bus ]
                  (in-process EventEmitter
                   + Redis Streams)
                         |
    +-----+-----+-----+-----+-----+-----+-----+-----+-----+
    |     |     |     |     |     |     |     |     |     |
  IAM  Intake Sched Proj Ticket Docs Bill Notify Mon   AI-Orch
                                                        |
                                                   (MCP clients
                                                    → MCP servers)
                         |
          +--------------+--------------+
          |              |              |
    [ PostgreSQL 16 ] [ Redis 7 ]  [  S3 bucket ]
      Multi-AZ         cache +      versioned +
                       queue        encrypted
""")]
    story += [H2("4.1", "Container catalogue")]
    ccell = pstyle("ccell", fontName="Helvetica", fontSize=8, leading=10, textColor=INK)
    def CC(s): return Paragraph(s, ccell)
    story += [TBL([
        ["Container", "Tech", "Responsibility", "Scaling"],
        [CC("Nexus Web"), CC("Next.js 14 (App Router)"), CC("Public site, client portal, admin UI"), CC("HPA on CPU 60%")],
        [CC("Nexus API"), CC("Next.js Route Handlers + tRPC"), CC("BFF for web; REST facade for integrations"), CC("HPA on RPS")],
        [CC("IAM Service"), CC("Node.js module"), CC("AuthN/Z, sessions, RBAC, audit"), CC("Shared")],
        [CC("Intake Service"), CC("Node.js module"), CC("AI conversation + lead capture"), CC("Shared")],
        [CC("Scheduling Service"), CC("Node.js module"), CC("Availability, booking, calendar sync"), CC("Shared")],
        [CC("Project Service"), CC("Node.js module"), CC("Projects, milestones, tasks, deliverables"), CC("Shared")],
        [CC("Ticketing Service"), CC("Node.js module"), CC("Requests lifecycle + SLA"), CC("Shared")],
        [CC("Documents Service"), CC("Node.js module"), CC("Contracts, versions, e-sign orchestration"), CC("Shared")],
        [CC("Billing Service"), CC("Node.js module"), CC("Invoices, subscriptions, payments"), CC("Shared")],
        [CC("Notification Dispatcher"), CC("BullMQ worker"), CC("Fan-out to WhatsApp / email"), CC("Queue depth based")],
        [CC("Monitoring Agent"), CC("Node.js worker"), CC("Poll client infra; push to Prometheus"), CC("Shared (Phase 3)")],
        [CC("AI Orchestrator"), CC("Node.js module"), CC("Claude calls + MCP client + tool router"), CC("Shared")],
    ], col_widths=[34*mm, 36*mm, 62*mm, 28*mm], shrink=True)]
    story += [H2("4.2", "Why modular monolith, not microservices (yet)")]
    story += BULLETS([
        "Team size at launch is 5 FTE — operational overhead of microservices would dominate delivery.",
        "Domain is well understood end-to-end; we gain more from colocated transactions than from physical separation.",
        "Seams are drawn along lifecycle domains; any module can be lifted into its own service when load or team shape justifies it (likely candidates: Notification Dispatcher, Monitoring Agent).",
        "Single deployment means zero distributed-transaction complexity — SLAs for the MVP are easier to honour.",
    ])

    # ============================================================
    # 5. Component Graph (Arcspec)
    # ============================================================
    story += [PageBreak(), H1("5", "Component Graph — Arcspec")]
    story += [P("Following the Arcforge methodology, the detailed design is expressed as a graph. Each <b>node</b> is a component with a type (<tt>service</tt>, <tt>model</tt>, <tt>controller</tt>, <tt>worker</tt>, <tt>mcp</tt>, <tt>integration</tt>). Each <b>edge</b> declares a typed relation (<tt>depends</tt>, <tt>handles</tt>, <tt>has-many</tt>, <tt>emits</tt>, <tt>subscribes</tt>, <tt>calls</tt>).")]
    story += [P("This graph is the single source of truth for the architecture and is the artifact we intend to export via Arcspec to drive AI-assisted code generation.")]
    story += [H2("5.1", "Node inventory (abridged)")]
    story += [TBL([
        ["Node ID", "Type", "Module", "Notes"],
        ["ctl.intake.conversation", "controller", "Intake", "POST /api/intake/messages"],
        ["svc.intake.orchestrator", "service", "Intake", "Calls AI Orchestrator + Lead repo"],
        ["svc.intake.classifier", "service", "Intake", "Maps AI output to service categories"],
        ["model.lead", "model", "Intake", "Lead aggregate root"],
        ["ctl.scheduling.bookings", "controller", "Scheduling", "POST /api/bookings"],
        ["svc.scheduling.availability", "service", "Scheduling", "Merges staff + integration calendars"],
        ["svc.scheduling.sync", "service", "Scheduling", "Google/Outlook bi-directional"],
        ["worker.scheduling.reminders", "worker", "Scheduling", "T-24h, T-1h reminders"],
        ["ctl.projects.board", "controller", "Projects", "GET/PATCH /api/projects/:id"],
        ["svc.projects.state", "service", "Projects", "State machine: Pre-Dev → Maintenance"],
        ["model.project", "model", "Projects", "Aggregate root, owns milestones/tasks"],
        ["ctl.tickets.requests", "controller", "Ticketing", "CRUD + transitions"],
        ["svc.tickets.sla", "service", "Ticketing", "Priority → response-target engine"],
        ["worker.tickets.escalation", "worker", "Ticketing", "SLA breach escalation"],
        ["ctl.docs.contracts", "controller", "Documents", "POST /api/contracts"],
        ["svc.docs.templating", "service", "Documents", "Handlebars-based contract render"],
        ["svc.docs.signature", "service", "Documents", "DocuSign adapter + webhook handler"],
        ["ctl.billing.invoices", "controller", "Billing", "CRUD invoices"],
        ["svc.billing.subscriptions", "service", "Billing", "Recurring billing engine"],
        ["svc.billing.payments", "service", "Billing", "Stripe + Midtrans adapters"],
        ["svc.notify.dispatch", "service", "Notifications", "Channel router + retry"],
        ["worker.notify.whatsapp", "worker", "Notifications", "WA Business API sender"],
        ["worker.notify.email", "worker", "Notifications", "SendGrid sender"],
        ["svc.ai.orchestrator", "service", "AI", "Claude chat loop + MCP client"],
        ["mcp.nexus-crm", "mcp", "AI", "Lead/Client/Project tools"],
        ["mcp.nexus-scheduling", "mcp", "AI", "Availability + booking tools"],
        ["mcp.nexus-docs", "mcp", "AI", "Draft contracts, signature status"],
        ["mcp.nexus-billing", "mcp", "AI", "Invoices + subscriptions"],
        ["mcp.nexus-knowledge", "mcp", "AI", "Service catalog, pricing, case studies"],
        ["int.calendar.google", "integration", "Integrations", "OAuth + Calendar API"],
        ["int.payments.midtrans", "integration", "Integrations", "Snap + Core API"],
        ["int.esign.docusign", "integration", "Integrations", "Envelope + webhook"],
        ["int.wa.meta", "integration", "Integrations", "Cloud API, approved templates"],
    ], col_widths=[52*mm, 20*mm, 24*mm, 64*mm], shrink=True)]
    story += [H2("5.2", "Critical edges (arcspec fragment)")]
    story += [CODE(r"""// Arcspec: Nexus core graph (excerpt)
node mcp.nexus-crm           { type: mcp }
node svc.ai.orchestrator     { type: service }
node ctl.intake.conversation { type: controller }
node svc.intake.orchestrator { type: service }
node model.lead              { type: model }
node svc.notify.dispatch     { type: service }
node worker.notify.whatsapp  { type: worker }
node int.wa.meta             { type: integration }

edge ctl.intake.conversation -> svc.intake.orchestrator   [handles]
edge svc.intake.orchestrator -> svc.ai.orchestrator       [calls]
edge svc.ai.orchestrator     -> mcp.nexus-crm             [uses-mcp]
edge svc.intake.orchestrator -> model.lead                [writes]
edge svc.intake.orchestrator -> svc.notify.dispatch       [emits lead.created]
edge svc.notify.dispatch     -> worker.notify.whatsapp    [queues]
edge worker.notify.whatsapp  -> int.wa.meta               [calls]
""")]
    story += [H2("5.3", "Event contracts (inter-module emits)")]
    story += [TBL([
        ["Event", "Emitter", "Typical subscribers", "Payload summary"],
        ["lead.created", "Intake", "Notifications, Admin UI", "lead_id, source, summary"],
        ["lead.qualified", "Admin / Intake", "Projects (bootstrap), Notifications", "lead_id → client_id"],
        ["meeting.booked", "Scheduling", "Notifications, Calendar sync", "meeting_id, parties, slot"],
        ["project.state_changed", "Projects", "Notifications, Analytics", "project_id, from, to"],
        ["request.created", "Ticketing", "Notifications, SLA engine", "request_id, priority"],
        ["request.sla_breached", "SLA worker", "Notifications, Admin escalations", "request_id, breach_by"],
        ["document.sent_for_signature", "Documents", "Notifications", "doc_id, recipient"],
        ["document.signed", "DocuSign webhook", "Projects, Billing, Notifications", "doc_id, signed_at"],
        ["invoice.issued", "Billing", "Notifications (email w/PDF)", "invoice_id, amount"],
        ["payment.received", "Billing", "Notifications, Finance", "payment_id, invoice_id"],
    ], col_widths=[38*mm, 28*mm, 48*mm, 46*mm], shrink=True)]

    # ============================================================
    # 6. Data Model
    # ============================================================
    story += [PageBreak(), H1("6", "Data Model & Schema")]
    story += [P("PostgreSQL 16 is the primary store. All entities use UUID v7 primary keys, <tt>created_at</tt> / <tt>updated_at</tt> / <tt>created_by</tt> audit columns, and a soft-delete pattern for client and project aggregates. State transitions are captured in <tt>state_history</tt> tables for every aggregate that owns a state machine.")]
    story += [H2("6.1", "Entity map")]
    story += [CODE(r"""
organizations --< clients --< projects --< milestones --< tasks
                       |         |-------< deliverables
                       |         |-------< requests --< request_comments
                       |         |-------< documents --< document_versions
                       |         |                   \-< signature_requests
                       |         |-------< invoices --< invoice_lines
                       |         |-------< subscriptions --< payments
                       |         \-------< infrastructure_hosts (Phase 3)
                       \---< leads (pre-qualification)

users --< user_roles >-- roles
users --< sessions
meetings (links user + client + project)
notifications --< notification_deliveries
ai_conversations --< ai_messages --< ai_tool_calls
audit_logs (append-only)
state_history (append-only, polymorphic)
""")]
    story += [H2("6.2", "Core tables (selected DDL)")]
    story += [CODE(r"""CREATE TABLE clients (
  id            UUID PRIMARY KEY DEFAULT uuidv7(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  state         client_state NOT NULL DEFAULT 'new',
  type          client_type,            -- project | maintenance | subscription
  owner_user_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuidv7(),
  client_id   UUID NOT NULL REFERENCES clients(id),
  name        TEXT NOT NULL,
  state       project_state NOT NULL DEFAULT 'pre_dev',
  started_at  TIMESTAMPTZ,
  closed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requests (
  id           UUID PRIMARY KEY DEFAULT uuidv7(),
  project_id   UUID NOT NULL REFERENCES projects(id),
  title        TEXT NOT NULL,
  category     request_category NOT NULL,
  priority     request_priority NOT NULL,
  state        request_state NOT NULL DEFAULT 'submitted',
  assigned_to  UUID REFERENCES users(id),
  sla_due_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE state_history (
  id             UUID PRIMARY KEY DEFAULT uuidv7(),
  aggregate_kind TEXT NOT NULL,  -- 'client' | 'project' | 'request'
  aggregate_id   UUID NOT NULL,
  from_state     TEXT,
  to_state       TEXT NOT NULL,
  actor_user_id  UUID,
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
""")]
    story += [H2("6.3", "Enumerations")]
    story += [TBL([
        ["Enum", "Values"],
        ["client_state", "new, qualified, active, inactive"],
        ["project_state", "pre_dev, development, poc, live, maintenance"],
        ["request_state", "submitted, assigned, in_progress, waiting, completed, cancelled"],
        ["request_category", "bug, access, feature, maintenance, billing"],
        ["request_priority", "critical, high, medium, low"],
        ["client_type", "project, maintenance, subscription"],
        ["notification_channel", "whatsapp, email, in_app"],
    ], col_widths=[42*mm, 118*mm])]

    # ============================================================
    # 7. API Design
    # ============================================================
    story += [PageBreak(), H1("7", "API Design")]
    story += [P("Nexus exposes two API surfaces. <b>Internal</b> (consumed by Nexus Web) uses tRPC for maximum type-safety. <b>External</b> (consumed by integrations, webhooks and possibly partners) uses versioned REST (<tt>/api/v1/...</tt>) with OpenAPI 3.1 specifications generated from Zod schemas.")]
    story += [H2("7.1", "Conventions")]
    story += BULLETS([
        "Every endpoint carries a <tt>X-Request-Id</tt> header that is propagated to logs and traces.",
        "Pagination is cursor-based (<tt>?cursor=...&amp;limit=...</tt>). Limit capped at 200, default 50.",
        "Errors return an RFC 7807 <tt>application/problem+json</tt> body with a stable <tt>code</tt> field.",
        "Rate limits: <b>60 req/min</b> per IP for public endpoints, <b>600 req/min</b> per user for authenticated endpoints.",
        "All mutating endpoints require an <tt>Idempotency-Key</tt> header; duplicates return the original result.",
    ])
    story += [H2("7.2", "Representative endpoint contract")]
    story += [CODE(r"""POST /api/v1/intake/messages
Idempotency-Key: 8b0c... (required)
Authorization: (optional — anonymous allowed)
Content-Type: application/json

{
  "conversation_id": "uuid?",         // null to start new
  "text": "We need help with our HR system.",
  "locale": "id-ID"
}

200 OK
{
  "conversation_id": "uuid",
  "reply": "Thanks — tell me the company size ...",
  "lead_draft": {
    "service_category": "HRIS",
    "urgency": "medium",
    "estimated_budget_band": "50-150M_IDR"
  },
  "next_action": "continue" | "submit_lead" | "book_meeting"
}

Errors (RFC 7807):
  400 invalid_input         — failed Zod validation
  429 rate_limited          — per-IP cap
  503 ai_upstream_unavailable — Claude timeout → form fallback
""")]
    story += [H2("7.3", "Webhook inbound endpoints")]
    story += [TBL([
        ["Endpoint", "Provider", "Signature verification", "Purpose"],
        ["/api/webhooks/stripe", "Stripe", "Stripe-Signature HMAC", "Payment events"],
        ["/api/webhooks/midtrans", "Midtrans", "Signature-Key SHA-512", "Payment events"],
        ["/api/webhooks/docusign", "DocuSign Connect", "HMAC SHA-256", "Envelope status"],
        ["/api/webhooks/wa", "Meta WhatsApp", "X-Hub-Signature-256", "Delivery receipts, inbound msgs"],
        ["/api/webhooks/calendar", "Google / Graph", "OAuth + channel id", "Calendar change notifications"],
    ], col_widths=[45*mm, 30*mm, 40*mm, 45*mm], shrink=True)]

    # ============================================================
    # 8. MCP Architecture
    # ============================================================
    story += [PageBreak(), H1("8", "MCP Architecture")]
    story += [P("<b>MCP (Model Context Protocol)</b> is the mechanism by which Nexus exposes domain actions and knowledge to LLMs in a safe, auditable way. Rather than letting the AI Intake agent generate free-form SQL or call internal APIs directly, every capability is packaged as a <i>tool</i> with a declarative schema. This gives us three properties we need for a client-facing AI: (a) <b>predictable inputs</b>, (b) <b>auditable outputs</b>, and (c) <b>policy-enforced authorization</b>.")]
    story += [H2("8.1", "Topology")]
    story += [CODE(r"""
                              +--> [ MCP Server: nexus-crm       ]
                              |
  [ AI Orchestrator ]         +--> [ MCP Server: nexus-scheduling]
  (MCP client, stdio over --->+
   loopback or mTLS TLS)      +--> [ MCP Server: nexus-docs      ]
                              |
                              +--> [ MCP Server: nexus-billing   ]
                              |
                              +--> [ MCP Server: nexus-knowledge ]

  Each MCP server runs in-cluster, authenticated via mTLS + service
  account, with its own policy file declaring which roles can call
  which tools.
""")]
    story += [H2("8.2", "Server catalogue")]
    mcell = pstyle("mcell", fontName="Helvetica", fontSize=8, leading=10, textColor=INK)
    def M(s): return Paragraph(s, mcell)
    story += [TBL([
        ["Server", "Tools (examples)", "Resources", "Consumers"],
        [M("nexus-crm"), M("create_lead, qualify_lead, search_clients, get_client_summary"),
         M("client_profile://{id}, project_status://{id}"),
         M("AI Intake, Admin agent")],
        [M("nexus-scheduling"), M("check_availability, book_meeting, cancel_meeting, list_meetings"),
         M("staff_calendar://{user_id}"),
         M("AI Intake, Scheduling bot")],
        [M("nexus-docs"), M("draft_nda, draft_msa, send_for_signature, get_signature_status"),
         M("template_library://*"),
         M("Admin agent")],
        [M("nexus-billing"), M("generate_invoice, list_invoices, get_invoice_status, list_subscriptions"),
         M("invoice://{id}"),
         M("Admin agent, Finance")],
        [M("nexus-knowledge"), M("search_case_studies"),
         M("service_catalog://, pricing_templates://, case_studies://*"),
         M("AI Intake (read-only)")],
    ], col_widths=[28*mm, 58*mm, 40*mm, 34*mm], shrink=True)]
    story += [H2("8.3", "Tool schema example")]
    story += [CODE(r"""// nexus-crm · tool: qualify_lead
{
  "name": "qualify_lead",
  "description": "Mark a lead as proceed / delay / reject after internal review.",
  "input_schema": {
    "type": "object",
    "required": ["lead_id", "decision"],
    "properties": {
      "lead_id":  { "type": "string", "format": "uuid" },
      "decision": { "enum": ["proceed", "delay", "reject"] },
      "notes":    { "type": "string", "maxLength": 2000 }
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "client_id":  { "type": ["string","null"], "format": "uuid" },
      "new_state":  { "enum": ["qualified", "inactive", "archived"] }
    }
  },
  "policy": {
    "allowed_roles": ["admin"],
    "audit": true,
    "rate_limit": "30/min per user"
  }
}
""")]
    story += [H2("8.4", "Safety rails")]
    story += BULLETS([
        "<b>No free-form SQL or shell.</b> The only way the LLM talks to Nexus is via declared tools.",
        "<b>Scoped authorization.</b> Each MCP server evaluates RBAC policy per call using the caller's JWT claims; public (anonymous) AI Intake is limited to <tt>nexus-knowledge</tt> and selected read-only scoping tools.",
        "<b>Audit trail.</b> Every tool call writes to <tt>ai_tool_calls</tt> with input hash, output hash, latency, and policy decision.",
        "<b>PII boundaries.</b> Tool outputs are field-filtered per role; e.g. <tt>search_clients</tt> never returns phone numbers to the public AI Intake context.",
        "<b>Prompt-injection defence.</b> MCP tool outputs are treated as data, never concatenated back into the system prompt verbatim.",
    ])

    # ============================================================
    # 9. Infrastructure & Deployment
    # ============================================================
    story += [PageBreak(), H1("9", "Infrastructure & Deployment")]
    story += [H2("9.1", "Target environments")]
    story += [TBL([
        ["Environment", "Purpose", "Sizing (steady state)", "Data"],
        ["local", "Developer laptops", "docker-compose (pg, redis, minio)", "Synthetic seed"],
        ["dev", "Shared integration", "1 × t3.small ECS task", "Synthetic seed, refreshed daily"],
        ["staging", "Pre-prod + UAT", "2 × t3.small, RDS db.t3.small Multi-AZ", "Anonymised prod snapshot"],
        ["prod", "Production", "2 × t3.medium (auto-scale 2–6), RDS db.t3.medium Multi-AZ, Redis cluster", "Live"],
    ], col_widths=[25*mm, 38*mm, 62*mm, 35*mm], shrink=True)]
    story += [H2("9.2", "AWS reference architecture")]
    story += [CODE(r"""
Region: ap-southeast-3 (Jakarta)  |  DR target: ap-southeast-1 (Singapore)

VPC 10.0.0.0/16
 |-- Public subnets  (A,B,C) -- ALB, NAT Gateway
 |-- Private subnets (A,B,C) -- ECS tasks, RDS, ElastiCache
 +-- Endpoint subnets        -- VPC endpoints for S3, ECR, Secrets Manager

Compute:
  ECS Fargate cluster         → web, api, workers (separate task definitions)
  Auto-scaling target 60% CPU

Data:
  RDS PostgreSQL 16 Multi-AZ  → 100 GB gp3 baseline, automated backups (7d)
  ElastiCache Redis 7 cluster → 2 shards x 2 nodes
  S3 (nexus-docs-prod)        → versioning + AES-256 KMS, lifecycle to Glacier at 365d

Edge:
  CloudFront + AWS WAF        → managed rules + rate-based rule 500 rps/IP
  Route 53                    → nexus.dataverseindonesia.co.id

Security:
  Secrets Manager             → rotated every 90 days
  KMS CMKs                    → per-environment
  IAM                         → least-privilege, no long-lived keys in CI

Observability:
  CloudWatch Logs (30d hot / 365d cold in S3)
  Grafana Cloud Loki (apps)   + Prometheus (metrics) + Tempo (traces)
  Sentry (errors)
""")]
    story += [H2("9.3", "CI/CD")]
    story += BULLETS([
        "GitHub Actions pipeline: lint → unit → build → SAST → container → push to ECR → deploy.",
        "Trunk-based development with short-lived feature branches; PRs require one review + green CI.",
        "Automatic deploy to <b>staging</b> on merge to <tt>main</tt>. Prod deploy is <b>manual approval</b> with protected environment.",
        "Blue/green via ECS deployment controller; 10-minute bake + auto-rollback on CloudWatch alarm trip.",
        "Database migrations run as a pre-deployment ECS task; migrations are additive-only (expand → migrate → contract).",
    ])
    story += [H2("9.4", "Infrastructure as Code")]
    story += BULLETS([
        "All AWS resources defined in Terraform; modules per environment; remote state in S3 with DynamoDB locking.",
        "Reusable modules: <tt>network/</tt>, <tt>ecs-service/</tt>, <tt>rds-postgres/</tt>, <tt>redis/</tt>, <tt>s3-bucket/</tt>, <tt>observability/</tt>.",
        "Terraform runs via <b>Atlantis</b> on PR; no local <tt>terraform apply</tt> for shared environments.",
    ])
    story += [H2("9.5", "Backup, restore & DR")]
    story += [TBL([
        ["Asset", "RPO", "RTO", "Mechanism"],
        ["PostgreSQL", "5 min", "1 h", "RDS automated snapshots + PITR + cross-region copy"],
        ["S3 documents", "< 1 min", "5 min", "Versioning + cross-region replication"],
        ["Redis", "Best effort", "15 min", "Replication + warm standby (cache is rebuildable)"],
        ["Application code", "0", "10 min", "Container images in ECR with cross-region replication"],
        ["Secrets", "0", "10 min", "Secrets Manager replicated"],
    ], col_widths=[38*mm, 20*mm, 20*mm, 82*mm], shrink=True)]

    # ============================================================
    # 10. Security & Compliance
    # ============================================================
    story += [PageBreak(), H1("10", "Security & Compliance")]
    story += [H2("10.1", "Authentication & authorization")]
    story += BULLETS([
        "Session-based auth for browsers (HttpOnly, Secure, SameSite=Lax cookie, 7d refresh).",
        "API tokens (short-lived 15m access JWT + 7d refresh) for integrations and MCP clients.",
        "Passwords: Argon2id, minimum 12 chars, HIBP-style breached-password check at signup.",
        "MFA (TOTP) required for Admin and Engineer roles; optional for Clients.",
        "RBAC matrix per Engineering Doc §8.3; enforcement at API layer using a policy middleware.",
    ])
    story += [H2("10.2", "Data protection")]
    story += BULLETS([
        "TLS 1.2+ everywhere; HSTS with 1-year max-age.",
        "At-rest encryption: RDS and S3 via KMS CMKs; application-level encryption (pgcrypto) for phone numbers and national IDs.",
        "PII minimisation: AI Intake does not persist raw conversation text beyond 30 days unless lead is qualified.",
        "Backups encrypted with a separate CMK; keys rotated annually.",
        "Access logs and audit logs retained 1 year (prod) / 30 days (lower envs).",
    ])
    story += [H2("10.3", "OWASP ASVS L2 controls")]
    story += [TBL([
        ["Category", "Controls"],
        ["V2 AuthN",   "Argon2id, rate-limit on login, account lockout, MFA for privileged roles"],
        ["V3 Session", "Rotating session IDs on privilege change, 7d idle timeout, revocation on logout"],
        ["V4 AuthZ",   "Deny-by-default, centralised policy, row-level ownership checks"],
        ["V5 Input",   "Zod schemas on every handler, prepared statements, output encoding in React by default"],
        ["V7 Crypto",  "KMS-managed keys, no home-brew crypto"],
        ["V8 Errors",  "Structured error objects; never leak stack traces to clients"],
        ["V9 Comms",   "TLS 1.2+, HSTS, certificate pinning for webhook egress"],
        ["V10 Malicious code", "Signed container images, Dependabot, Semgrep SAST in CI"],
        ["V11 Business logic", "State machine enforced server-side; idempotency keys"],
        ["V12 Files",  "S3 presigned URLs, virus scan via ClamAV on upload (Phase 2)"],
    ], col_widths=[30*mm, 130*mm], shrink=True)]
    story += [H2("10.4", "Indonesian PDP Law alignment")]
    story += BULLETS([
        "Data Controller registered; data inventory maintained in <tt>docs/data-inventory.md</tt>.",
        "Lawful basis per data flow documented (consent for marketing, contract for client ops, legitimate interest for audit).",
        "DSR workflow: access / rectify / erase / port — SLA 30 days, exposed via client portal.",
        "Data residency: Jakarta region (ap-southeast-3) primary; DR to Singapore requires contractual consent (covered in MSA template).",
        "Breach notification workflow documented; 72-hour notification pipeline to DPO + PDP authority.",
    ])

    # ============================================================
    # 11. Observability & Operations
    # ============================================================
    story += [PageBreak(), H1("11", "Observability & Operations")]
    story += [H2("11.1", "Three pillars")]
    story += [TBL([
        ["Pillar", "Tooling", "What we capture"],
        ["Metrics", "Prometheus + Grafana", "RED per endpoint, DB pool, queue depth, WA delivery ratio, business KPIs"],
        ["Logs", "pino JSON → Loki", "Structured logs with trace_id, user_id, request_id"],
        ["Traces", "OpenTelemetry → Tempo", "End-to-end trace across web → api → service → DB → integration"],
        ["Errors", "Sentry", "Unhandled exceptions with source maps and user context"],
        ["Uptime", "UptimeRobot + statuspage.io", "Public status page for clients"],
    ], col_widths=[25*mm, 40*mm, 95*mm], shrink=True)]
    story += [H2("11.2", "Service Level Objectives")]
    story += [TBL([
        ["SLO", "Target", "Window", "Error budget policy"],
        ["API availability", "99.5%", "Rolling 30d", "Feature freeze if 50% budget burned in 7d"],
        ["p95 authenticated API latency", "< 500 ms", "Rolling 7d", "Perf investigation ticket if breached 3 days"],
        ["WhatsApp delivery success", "≥ 98%", "Rolling 7d", "Switch to email fallback + alert"],
        ["Request SLA — Critical", "≥ 95% ≤ 2 h", "Rolling 30d", "Weekly ops review"],
    ], col_widths=[55*mm, 22*mm, 25*mm, 58*mm], shrink=True)]
    story += [H2("11.3", "Runbooks & on-call")]
    story += BULLETS([
        "Runbooks live in the monorepo under <tt>/runbooks</tt> and are linked from each Grafana alert.",
        "On-call rotation: weekly, two-person (primary + secondary) across tech lead and senior engineers.",
        "Paging: Grafana Alerting → PagerDuty (or Opsgenie); separate severity-1 and severity-2 channels.",
        "Post-incident: blameless review template, action items tracked in <tt>incidents/</tt> folder.",
    ])

    # ============================================================
    # 12. Testing & Quality Strategy
    # ============================================================
    story += [PageBreak(), H1("12", "Testing & Quality Strategy")]
    story += [H2("12.1", "Test pyramid")]
    story += [TBL([
        ["Layer", "Tool", "Scope", "Target coverage"],
        ["Unit", "Vitest", "Pure functions, domain services", "≥ 80%"],
        ["Integration", "Vitest + Testcontainers (pg/redis)", "Service + real DB", "All happy paths + state transitions"],
        ["Contract", "Zod → OpenAPI → Dredd", "External REST + webhooks", "All published endpoints"],
        ["E2E", "Playwright", "Critical user journeys (intake, booking, ticket, invoice)", "Smoke + 12 flagship flows"],
        ["Load", "k6", "Pre-GA and quarterly regression", "2× expected peak"],
        ["Security", "Semgrep (SAST), OWASP ZAP (DAST), Snyk (SCA)", "CI + quarterly deep scan", "Zero critical at Go-Live"],
    ], col_widths=[20*mm, 50*mm, 62*mm, 28*mm], shrink=True)]
    story += [H2("12.2", "Quality gates")]
    story += BULLETS([
        "PRs cannot merge without green CI, 1 reviewer and no <b>critical</b> SAST findings.",
        "Every state transition has an integration test asserting that invalid transitions are rejected at the API layer.",
        "Every notification trigger has an integration test asserting that the correct channel + template is queued.",
        "Release tags require a <i>green staging E2E suite</i> within the previous 24h.",
    ])

    # ============================================================
    # 13. Build Plan & Milestones
    # ============================================================
    story += [PageBreak(), H1("13", "Build Plan & Milestones")]
    story += [P("The build is organised across the four phases defined in the Engineering Documentation. Weeks are numbered from project start (Week 0 = kickoff). Each milestone has an explicit <b>exit gate</b> that must be passed before the next phase starts.")]
    story += [H2("13.1", "Master schedule")]
    cell = pstyle("cell", fontName="Helvetica", fontSize=8, leading=10, textColor=INK)
    def C(s): return Paragraph(s, cell)
    story += [TBL([
        ["Week", "Phase", "Workstreams", "Milestone / Exit gate"],
        ["0", "Setup", C("Project kickoff, team onboarding, repo skeleton"), C("Kickoff signed, accounts issued")],
        ["1", "Setup", C("IaC baseline, CI/CD, DB schema v0.1, auth scaffold"), C("Dev env green; any engineer can deploy")],
        ["2", "Phase 1", C("AI Intake UX + Claude integration + nexus-knowledge MCP"), C("Intake prototype talks to Claude in staging")],
        ["3", "Phase 1", C("Lead Management CRUD + qualification flow + audit"), C("Admin can triage leads end-to-end in staging")],
        ["4", "Phase 1", C("Scheduling: availability, booking, Google/Outlook sync"), C("Real meeting booked in staging")],
        ["5", "Phase 1", C("Notification Dispatcher + WhatsApp + email fallback"), C("WA & email templates delivering in staging")],
        ["6", "Phase 1", C("Hardening, UAT, <b>Phase 1 GA</b>"), C("<b>GATE: Phase 1 accepted — live traffic on MVP</b>")],
        ["7", "Phase 2", C("Client Workspace shell + RBAC tightening"), C("Client logs in and sees own projects")],
        ["8", "Phase 2", C("Projects + milestones + tasks + deliverables"), C("State machine enforced end-to-end")],
        ["9", "Phase 2", C("Ticketing system + SLA engine + escalation worker"), C("Full ticket lifecycle with SLA timers")],
        ["10", "Phase 2", C("Documents module + S3 uploads + versioning"), C("<b>GATE: Phase 2 accepted</b>")],
        ["11", "Phase 3", C("Contracts module: templating + e-sign adapter"), C("NDA signed via DocuSign in staging")],
        ["12", "Phase 3", C("Billing: invoices + Stripe/Midtrans + webhooks"), C("First test payment settled end-to-end")],
        ["13", "Phase 3", C("Subscriptions + dunning + payment reminders"), C("<b>GATE: Phase 3 accepted</b>")],
        ["14", "Phase 4", C("Monitoring agent + client health dashboard"), C("Client sees health status, internal sees full telemetry")],
        ["15", "Phase 4", C("MCP polish, admin AI agent, analytics"), C("Admin agent answers ops questions correctly")],
        ["16", "Launch", C("UAT, pen test, runbooks, training"), C("<b>GATE: Platform GA</b>")],
        ["17-18", "Hypercare", C("Live support, bugfix, tuning"), C("Transition to steady-state ops")],
    ], col_widths=[14*mm, 18*mm, 70*mm, 58*mm], shrink=True)]
    story += [H2("13.2", "Definition of Done (per feature)")]
    story += BULLETS([
        "Code merged to <tt>main</tt> with green CI.",
        "Unit + integration tests written and passing.",
        "State transitions + notifications covered by tests.",
        "Observability: logs, metric, trace present; dashboard panel added.",
        "Feature flag wired for dark-launch; default off until validated.",
        "Documentation updated (user-facing for client features, runbook for ops features).",
    ])

    # ============================================================
    # 14. Team, Cost & Timeline
    # ============================================================
    story += [PageBreak(), H1("14", "Team, Cost & Timeline")]
    story += [H2("14.1", "Team composition")]
    story += [TBL([
        ["Role", "FTE", "Phases", "Responsibilities"],
        ["Tech Lead / Architect", "1.0", "All", "Architecture, code reviews, ADRs, stakeholder comms"],
        ["Senior Full-stack Engineer", "1.0", "All", "Services + integrations + MCP"],
        ["Full-stack Engineer", "1.0", "All", "Features across modules"],
        ["Frontend Engineer", "1.0", "1–4", "Client portal + admin UI"],
        ["Platform / DevOps Engineer", "1.0", "0–4", "AWS, Terraform, CI/CD, observability, security"],
        ["UI/UX Designer", "0.5", "0–4", "Flows, component library, accessibility"],
        ["QA / Test Engineer", "0.5", "1–4", "Test harness, E2E, load tests"],
        ["Product Manager", "0.5", "All", "Backlog, UAT, stakeholder management"],
    ], col_widths=[45*mm, 14*mm, 18*mm, 83*mm], shrink=True)]
    story += [H2("14.2", "Indicative build cost (16 + 2 weeks)")]
    story += [P("Costs below are planning estimates based on mid-market Jakarta/Bandung rates; final numbers depend on exact hires. FX assumption: IDR 16,000 / USD.")]
    story += [TBL([
        ["Role", "Blended monthly cost (IDR)", "Months (18w ≈ 4.5m)", "Subtotal (IDR)"],
        ["Tech Lead / Architect", "55,000,000", "4.5", "247,500,000"],
        ["Sr Full-stack Engineer", "40,000,000", "4.5", "180,000,000"],
        ["Full-stack Engineer", "28,000,000", "4.5", "126,000,000"],
        ["Frontend Engineer", "28,000,000", "4.5", "126,000,000"],
        ["Platform / DevOps", "38,000,000", "4.5", "171,000,000"],
        ["UI/UX Designer (0.5)", "15,000,000", "4.5", "67,500,000"],
        ["QA Engineer (0.5)", "12,500,000", "4.5", "56,250,000"],
        ["Product Manager (0.5)", "17,500,000", "4.5", "78,750,000"],
        ["Subtotal — labour", "", "", "1,053,000,000"],
        ["Tooling + licences (Sentry, DocuSign, etc.)", "", "", "~ 120,000,000"],
        ["Cloud infra (dev+staging+prod, 4.5m)", "", "", "~ 110,000,000"],
        ["External pen test + audit", "", "", "~ 90,000,000"],
        ["Contingency (15%)", "", "", "~ 205,000,000"],
        ["TOTAL (indicative)", "", "", "≈ 1,578,000,000 IDR"],
    ], col_widths=[55*mm, 36*mm, 30*mm, 39*mm], shrink=True)]
    story += [P("<b>Bounded range:</b> <b>IDR 1.4B – 2.3B</b> depending on seniority mix, vendor choices (DocuSign vs open-source), and external audit scope. Approx <b>USD 88k – 145k</b>.")]
    story += [H2("14.3", "Steady-state run cost (post-launch)")]
    story += [TBL([
        ["Cost centre", "Monthly (USD)", "Notes"],
        ["AWS compute (ECS Fargate 2–6 tasks)", "120 – 260", "Auto-scaling"],
        ["RDS Postgres Multi-AZ db.t3.medium", "140", "100 GB gp3"],
        ["ElastiCache Redis", "60", "Small cluster"],
        ["S3 + CloudFront + data transfer", "40 – 80", "Documents + static assets"],
        ["CloudWatch + Sentry + Grafana Cloud", "80 – 120", "Logs/metrics/errors"],
        ["WhatsApp Business API (conversation fees)", "variable", "Approx USD 0.01–0.03 per session"],
        ["DocuSign seats + envelopes", "40 – 120", "Alternative: Adobe or open-source"],
        ["Anthropic Claude usage", "50 – 200", "Depends on intake volume"],
        ["Total estimated prod run cost", "≈ 530 – 920 / month", ""],
    ], col_widths=[70*mm, 32*mm, 58*mm], shrink=True)]

    # ============================================================
    # 15. Risks & Mitigations
    # ============================================================
    story += [PageBreak(), H1("15", "Risks & Mitigations")]
    rcell = pstyle("rcell", fontName="Helvetica", fontSize=8, leading=10, textColor=INK)
    def R(s): return Paragraph(s, rcell)
    story += [TBL([
        ["Risk", "Lik.", "Imp.", "Mitigation"],
        [R("WhatsApp Business API verification / template approval delay"), "Med", "High", R("Start Meta Business verification on Day 0; keep email fallback in Phase 1")],
        [R("DocuSign costs exceed budget"), "Med", "Med", R("Evaluate Adobe Sign; keep open-source fallback (BoxyHQ / DocSeal) warm")],
        [R("AI Intake produces wrong service classification"), "Med", "Med", R("Classifier guardrails + human-in-the-loop in Lead qualification stage")],
        [R("PDP Law interpretation changes"), "Low", "High", R("Quarterly legal review; data residency kept in ap-southeast-3")],
        [R("Scope creep across phases"), "High", "High", R("Hard exit-gates per phase; flag-gated non-MVP work")],
        [R("Key-person risk (tech lead)"), "Med", "High", R("ADR practice + pair reviews; bus factor >= 2 on each module")],
        [R("Data migration from legacy tools"), "Med", "Med", R("Week 7 carve-out; idempotent importer; dry-run on prod snapshot")],
        [R("Cloud cost overrun"), "Low", "Med", R("Per-env budget alarms at 70 / 90 / 100% of monthly cap")],
        [R("Pen-test critical finding late"), "Low", "High", R("Mid-phase security review (Week 10) + final pen test Week 15")],
        [R("Integration flakiness (Calendar / Stripe webhook)"), "Med", "Med", R("Signed webhooks, replay log, dead-letter queue, idempotency")],
    ], col_widths=[64*mm, 12*mm, 12*mm, 72*mm], shrink=True)]

    # ============================================================
    # 16. ADRs
    # ============================================================
    story += [PageBreak(), H1("16", "Architecture Decision Records (ADRs)")]
    story += [P("ADRs are short decision memos stored in <tt>/docs/adr/NNNN-title.md</tt>. The initial set — captured below — codifies the big choices this plan makes. Every ADR lists context, decision, consequences, and status.")]
    adrs = [
        ("ADR-0001", "Modular monolith over microservices for v1", "Accepted"),
        ("ADR-0002", "Next.js (App Router) as both web and API layer", "Accepted"),
        ("ADR-0003", "PostgreSQL 16 as primary store; no NoSQL in v1", "Accepted"),
        ("ADR-0004", "Redis + BullMQ for async jobs; no Kafka in v1", "Accepted"),
        ("ADR-0005", "tRPC internally, REST + OpenAPI externally", "Accepted"),
        ("ADR-0006", "MCP as the only AI-to-Nexus contract", "Accepted"),
        ("ADR-0007", "Claude (Anthropic) as primary LLM; abstraction keeps swap possible", "Accepted"),
        ("ADR-0008", "WhatsApp Business API primary, email fallback — not the reverse", "Accepted"),
        ("ADR-0009", "Terraform + Atlantis over CDK; AWS-only in v1", "Accepted"),
        ("ADR-0010", "ECS Fargate over EKS for operational simplicity at this team size", "Accepted"),
        ("ADR-0011", "UUID v7 keys (time-ordered) over bigserial", "Accepted"),
        ("ADR-0012", "State transitions enforced only at API layer; UI is advisory", "Accepted"),
        ("ADR-0013", "Multi-AZ RDS from day 1; cross-region DR post-GA", "Accepted"),
        ("ADR-0014", "Feature flags via in-house table + SDK (no third-party SaaS)", "Accepted"),
        ("ADR-0015", "DocuSign as preferred e-sign; keep open-source escape hatch", "Accepted"),
    ]
    story += [TBL([["ID", "Decision", "Status"]] + [list(a) for a in adrs], col_widths=[22*mm, 118*mm, 20*mm], shrink=True)]

    # ============================================================
    # 17. Repository & Folder Structure
    # ============================================================
    story += [PageBreak(), H1("17", "Repository & Folder Structure")]
    story += [P("Single monorepo; package boundaries enforced by <tt>pnpm</tt> workspaces and <tt>eslint-plugin-boundaries</tt>.")]
    story += [CODE(r"""nexus/
|-- apps/
|   |-- web/                 # Next.js app (SSR pages + BFF route handlers)
|   +-- workers/             # BullMQ workers (notify, sla, monitoring)
|-- packages/
|   |-- core/                # domain types, zod schemas, state machines
|   |-- db/                  # drizzle schema, migrations, repositories
|   |-- auth/                # session + JWT + RBAC policy engine
|   |-- intake/              # AI Intake service + classifier
|   |-- scheduling/          # availability + booking + calendar adapters
|   |-- projects/            # projects, milestones, tasks, deliverables
|   |-- tickets/             # requests + SLA engine
|   |-- docs/                # contracts + templating + e-sign adapters
|   |-- billing/             # invoices + subscriptions + payment adapters
|   |-- notify/              # dispatcher + WhatsApp + email senders
|   |-- monitoring/          # Phase 3 monitoring agent
|   +-- ai/                  # Claude orchestrator + MCP client
|-- mcp-servers/
|   |-- nexus-crm/
|   |-- nexus-scheduling/
|   |-- nexus-docs/
|   |-- nexus-billing/
|   +-- nexus-knowledge/
|-- infra/                   # Terraform modules and envs
|   |-- modules/
|   +-- envs/{dev,staging,prod}/
|-- docs/
|   |-- adr/                 # NNNN-title.md
|   |-- runbooks/
|   |-- arcspec/             # the architecture graph, machine-readable
|   +-- data-inventory.md
|-- .github/workflows/       # CI/CD
|-- docker-compose.yml       # local dev stack
+-- pnpm-workspace.yaml
""")]

    # ============================================================
    # 18. Next Steps & Approval
    # ============================================================
    story += [PageBreak(), H1("18", "Next Steps & Approval")]
    story += [H2("18.1", "Decision requested")]
    story += BULLETS([
        "Approve this plan as the v1.0 engineering baseline for Nexus.",
        "Authorise Phase 1 build (Weeks 0–6) and associated budget.",
        "Nominate a review committee (CTO, Head of Engineering, Product Lead).",
        "Confirm preferred vendors for the three decision points flagged in §16 (e-sign, payments, LLM).",
    ])
    story += [H2("18.2", "If approved — what happens in the first 72 hours")]
    story += BULLETS([
        "Create GitHub org + monorepo scaffold; bootstrap pnpm workspace and base packages.",
        "Provision AWS accounts (dev, staging, prod) via Organizations; apply baseline guardrails.",
        "Bootstrap Terraform backend (S3 + DynamoDB) and commit initial modules.",
        "Stand up Sentry, Grafana Cloud, and Sentry/PagerDuty integrations.",
        "Open Meta Business verification + DocuSign/Stripe/Midtrans merchant onboarding in parallel.",
        "Kick off AI Intake design spike: prompt engineering + Claude + <tt>nexus-knowledge</tt> MCP.",
    ])
    story += [H2("18.3", "If not approved")]
    story += BULLETS([
        "The engineering documentation remains the product specification.",
        "This document is archived at v1.0 DRAFT and superseded only by a new approved plan.",
        "No infrastructure costs are incurred.",
    ])
    story += [H2("18.4", "Sign-off")]
    story += [TBL([
        ["Role", "Name", "Decision", "Date", "Signature"],
        ["CTO / Head of Engineering", " ", " ", " ", " "],
        ["Head of Product", " ", " ", " ", " "],
        ["Chief Executive Officer", " ", " ", " ", " "],
        ["Engineering — Author", " ", " ", " ", " "],
    ], col_widths=[42*mm, 34*mm, 22*mm, 22*mm, 40*mm])]

    story += [SP(20), Paragraph("<i>Nexus is the foundation for GDI's evolution into a platform-driven technology partner. This plan is the first stone.</i>", S["caption"])]

    # Build
    doc.build(story)
    print("OK ->", OUT)

if __name__ == "__main__":
    build()
