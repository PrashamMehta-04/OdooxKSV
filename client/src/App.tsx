import { Activity, BarChart3, ClipboardList, FileText, ShieldCheck, Store } from "lucide-react";

const modules = [
  {
    title: "Vendors",
    description: "Register vendors, manage GST details, categories, contacts, and status.",
    icon: Store
  },
  {
    title: "RFQs",
    description: "Create RFQs with quantities, deadlines, attachments, and vendor assignments.",
    icon: ClipboardList
  },
  {
    title: "Approvals",
    description: "Route selected quotations through manager approval with timeline remarks.",
    icon: ShieldCheck
  },
  {
    title: "Invoices",
    description: "Generate purchase orders, invoices, printable documents, and email actions.",
    icon: FileText
  },
  {
    title: "Activity",
    description: "Track notifications, audit logs, and procurement workflow events.",
    icon: Activity
  },
  {
    title: "Reports",
    description: "Review vendor performance, spending summaries, and monthly trends.",
    icon: BarChart3
  }
];

export function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-24 max-w-7xl flex-col justify-center gap-2 px-6 py-6">
          <p className="text-sm font-medium text-muted-foreground">Procurement ERP</p>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">VendorBridge</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage vendor relationships, procurement requests, approvals, purchase orders,
                invoices, and operational visibility from one workspace.
              </p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3 text-sm">
              <span className="font-medium">Live workspace</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-8 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <article key={module.title} className="rounded-md border border-border bg-card p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-md border border-border bg-secondary p-2 text-secondary-foreground">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">{module.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {module.description}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
