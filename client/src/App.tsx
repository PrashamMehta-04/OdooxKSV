import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  Home,
  IndianRupee,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Store,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthProvider, type Role, useAuth } from "./auth/auth-context";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { apiRequest } from "./lib/api";

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  PROCUREMENT_OFFICER: "Procurement Officer",
  VENDOR: "Vendor",
  MANAGER: "Manager"
};

const modules: Array<{
  title: string;
  description: string;
  path: string;
  icon: typeof Store;
  roles: Role[];
}> = [
  {
    title: "Dashboard",
    description: "Monitor procurement work, documents, alerts, and spend.",
    path: "/",
    icon: Home,
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"]
  },
  {
    title: "Vendors",
    description: "Register vendors, manage GST details, categories, contacts, and status.",
    path: "/admin/vendors",
    icon: Store,
    roles: ["ADMIN", "PROCUREMENT_OFFICER"]
  },
  {
    title: "RFQs",
    description: "Create RFQs with quantities, deadlines, attachments, and vendor assignments.",
    path: "/procurement/rfqs",
    icon: ClipboardList,
    roles: ["PROCUREMENT_OFFICER"]
  },
  {
    title: "Approvals",
    description: "Route selected quotations through manager approval with timeline remarks.",
    path: "/approvals",
    icon: ShieldCheck,
    roles: ["MANAGER"]
  },
  {
    title: "Invoices",
    description: "Generate purchase orders, invoices, printable documents, and email actions.",
    path: "/procurement/invoices",
    icon: FileText,
    roles: ["PROCUREMENT_OFFICER"]
  },
  {
    title: "Activity",
    description: "Track notifications, audit logs, and procurement workflow events.",
    path: "/activity",
    icon: Activity,
    roles: ["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]
  },
  {
    title: "Reports",
    description: "Review vendor performance, spending summaries, and monthly trends.",
    path: "/reports",
    icon: BarChart3,
    roles: ["ADMIN"]
  },
  {
    title: "Vendor RFQs",
    description: "Review invitations, submit quotations, and track procurement status.",
    path: "/vendor/rfqs",
    icon: Users,
    roles: ["VENDOR"]
  }
];

interface DashboardSummaryItem {
  label: string;
  value: number;
  caption: string;
}

interface DashboardDocument {
  id: string;
  number: string;
  status: string;
  total: number;
  date: string;
  vendorName?: string;
  dueDate?: string;
  purchaseOrderNumber?: string;
}

interface DashboardNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  date: string;
}

interface DashboardActivity {
  id: string;
  action: string;
  message: string;
  entityType: string;
  actorName: string | null;
  date: string;
}

interface MonthlySpend {
  month: string;
  spend: number;
}

interface DashboardData {
  summary: DashboardSummaryItem[];
  purchaseOrders: DashboardDocument[];
  invoices: DashboardDocument[];
  notifications: DashboardNotification[];
  activity: DashboardActivity[];
  monthlySpend: MonthlySpend[];
}

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.")
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
  role: z.enum(["ADMIN", "PROCUREMENT_OFFICER", "VENDOR", "MANAGER"])
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email.")
});

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const compactNumber = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1
});

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route
            element={<ProtectedRoute roles={["ADMIN", "PROCUREMENT_OFFICER"]} />}
            path="/admin/vendors"
          >
            <Route index element={<RoleModulePage title="Vendors" icon={Store} />} />
          </Route>
          <Route
            element={<ProtectedRoute roles={["PROCUREMENT_OFFICER"]} />}
            path="/procurement/rfqs"
          >
            <Route index element={<RoleModulePage title="RFQs" icon={ClipboardList} />} />
          </Route>
          <Route
            element={<ProtectedRoute roles={["PROCUREMENT_OFFICER"]} />}
            path="/procurement/invoices"
          >
            <Route index element={<RoleModulePage title="Invoices" icon={FileText} />} />
          </Route>
          <Route element={<ProtectedRoute roles={["MANAGER"]} />} path="/approvals">
            <Route index element={<RoleModulePage title="Approvals" icon={ShieldCheck} />} />
          </Route>
          <Route element={<ProtectedRoute roles={["VENDOR"]} />} path="/vendor/rfqs">
            <Route index element={<RoleModulePage title="Vendor RFQs" icon={Users} />} />
          </Route>
          <Route
            element={<ProtectedRoute roles={["ADMIN", "PROCUREMENT_OFFICER", "MANAGER"]} />}
            path="/activity"
          >
            <Route index element={<RoleModulePage title="Activity" icon={Activity} />} />
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />} path="/reports">
            <Route index element={<RoleModulePage title="Reports" icon={BarChart3} />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium text-primary">VendorBridge</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
              Procurement access by role
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Secure sign-in for admins, procurement officers, vendors, and managers.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} className="rounded-md border border-border bg-card px-4 py-3">
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">Role-gated workspace</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-border bg-card p-6 shadow-sm">{children}</section>
      </div>
    </main>
  );
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("procurement@vendorbridge.local");
  const [password, setPassword] = useState("VendorBridge@123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your login details.");
      return;
    }

    setIsSubmitting(true);

    try {
      await login(parsed.data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader title="Login" subtitle="Use a seeded account or your own signup." icon={LogIn} />
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <Field label="Password" value={password} onChange={setPassword} type="password" />
        <ErrorMessage message={error} />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <AuthLinks primaryHref="/signup" primaryText="Create account" secondaryHref="/forgot-password" />
    </AuthLayout>
  );
}

function SignupPage() {
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VENDOR" as Role
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const parsed = signupSchema.safeParse(form);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your signup details.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(parsed.data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader title="Signup" subtitle="Create a role-specific workspace account." icon={UserPlus} />
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <Field label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <Field
          label="Email"
          value={form.email}
          onChange={(email) => setForm({ ...form, email })}
          type="email"
        />
        <Field
          label="Password"
          value={form.password}
          onChange={(password) => setForm({ ...form, password })}
          type="password"
        />
        <label className="grid gap-2 text-sm font-medium">
          Role
          <select
            className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
          >
            {Object.entries(roleLabels).map(([role, label]) => (
              <option key={role} value={role}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ErrorMessage message={error} />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>
      <AuthLinks primaryHref="/login" primaryText="Back to login" />
    </AuthLayout>
  );
}

function ForgotPasswordPage() {
  const { forgotPassword, user } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const parsed = forgotPasswordSchema.safeParse({ email });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter your email.");
      return;
    }

    setIsSubmitting(true);

    try {
      const responseMessage = await forgotPassword(parsed.data);
      setMessage(responseMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader title="Forgot password" subtitle="Request reset instructions." icon={KeyRound} />
      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <Field label="Email" value={email} onChange={setEmail} type="email" />
        <ErrorMessage message={error} />
        {message ? (
          <p className="rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {isSubmitting ? "Sending..." : "Send reset email"}
        </button>
      </form>
      <AuthLinks primaryHref="/login" primaryText="Back to login" />
    </AuthLayout>
  );
}

function AuthHeader({
  title,
  subtitle,
  icon: Icon
}: {
  title: string;
  subtitle: string;
  icon: typeof LogIn;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-md border border-border bg-secondary p-2 text-secondary-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
      />
    </label>
  );
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function AuthLinks({
  primaryHref,
  primaryText,
  secondaryHref
}: {
  primaryHref: string;
  primaryText: string;
  secondaryHref?: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <Link className="font-medium text-primary" to={primaryHref}>
        {primaryText}
      </Link>
      {secondaryHref ? (
        <Link className="text-muted-foreground hover:text-foreground" to={secondaryHref}>
          Forgot password?
        </Link>
      ) : null}
    </div>
  );
}

function AppShell({ children, title, eyebrow }: { children: ReactNode; title: string; eyebrow: string }) {
  const { user, logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const accessibleModules = useMemo(
    () => modules.filter((module) => user && module.roles.includes(user.role)),
    [user]
  );

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block">
          <SidebarContent modules={accessibleModules} />
        </aside>
        {isMobileNavOpen ? (
          <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden">
            <div className="h-full w-72 border-r border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-4">
                <span className="text-sm font-semibold text-primary">VendorBridge</span>
                <button
                  aria-label="Close navigation"
                  className="rounded-md border border-border p-2"
                  onClick={() => setIsMobileNavOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <SidebarContent modules={accessibleModules} onNavigate={() => setIsMobileNavOpen(false)} />
            </div>
          </div>
        ) : null}
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
            <div className="flex min-h-16 items-center gap-4 px-4 md:px-6">
              <button
                aria-label="Open navigation"
                className="rounded-md border border-border p-2 lg:hidden"
                onClick={() => setIsMobileNavOpen(true)}
                type="button"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
                <h1 className="truncate text-xl font-semibold tracking-normal">{title}</h1>
              </div>
              <div className="hidden min-w-56 items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground md:flex">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search procurement records
              </div>
              <div className="hidden rounded-md border border-border bg-background px-3 py-2 text-sm md:block">
                <span className="font-medium">{roleLabels[user.role]}</span>
              </div>
              <button
                aria-label="Sign out"
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium"
                onClick={() => void logout()}
                type="button"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="ml-2 hidden sm:inline">Sign out</span>
              </button>
            </div>
          </header>
          <div className="px-4 py-6 md:px-6">{children}</div>
        </section>
      </div>
    </main>
  );
}

function SidebarContent({
  modules: navModules,
  onNavigate
}: {
  modules: typeof modules;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary p-2 text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-semibold">VendorBridge</p>
            <p className="text-xs text-muted-foreground">Procurement ERP</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navModules.map((module) => {
          const Icon = module.icon;

          return (
            <NavLink
              key={module.path}
              className={({ isActive }) =>
                [
                  "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                ].join(" ")
              }
              end={module.path === "/"}
              onClick={onNavigate}
              to={module.path}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {module.title}
            </NavLink>
          );
        })}
      </nav>
      {user ? (
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      ) : null}
    </div>
  );
}

function DashboardPage() {
  const { user, accessToken } = useAuth();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () =>
      apiRequest<DashboardData>("/dashboard", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }),
    enabled: Boolean(accessToken && user)
  });

  if (!user) {
    return null;
  }

  const data = dashboardQuery.data;

  return (
    <AppShell title="Dashboard" eyebrow={`${roleLabels[user.role]} workspace`}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.summary ?? fallbackSummary).map((item, index) => (
          <MetricCard
            key={item.label}
            caption={item.caption}
            icon={[ShieldCheck, ClipboardList, PackageCheck, FileText][index] ?? BarChart3}
            isLoading={dashboardQuery.isLoading}
            label={item.label}
            value={item.value}
          />
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-4">
          <Panel
            action={
              <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" to={primaryAction(user.role).path}>
                {primaryAction(user.role).title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
            title="Quick actions"
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions(user.role).map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    className="rounded-md border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-secondary"
                    key={action.title}
                    to={action.path}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-md border border-border bg-card p-2">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{action.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{action.caption}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="Recent purchase orders">
            <DocumentTable
              emptyText="No purchase orders yet."
              items={data?.purchaseOrders ?? []}
              isLoading={dashboardQuery.isLoading}
              type="purchase-order"
            />
          </Panel>

          <Panel title="Recent invoices">
            <DocumentTable
              emptyText="No invoices yet."
              items={data?.invoices ?? []}
              isLoading={dashboardQuery.isLoading}
              type="invoice"
            />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Monthly spend">
            <SpendChart items={data?.monthlySpend ?? []} isLoading={dashboardQuery.isLoading} />
          </Panel>

          <Panel
            action={
              <button className="inline-flex items-center gap-2 text-sm font-medium text-primary" type="button">
                <Bell className="h-4 w-4" aria-hidden="true" />
                Notifications
              </button>
            }
            title="Alerts"
          >
            <NotificationList items={data?.notifications ?? []} isLoading={dashboardQuery.isLoading} />
          </Panel>

          <Panel title="Activity timeline">
            <ActivityList items={data?.activity ?? []} isLoading={dashboardQuery.isLoading} />
          </Panel>
        </div>
      </section>

      {dashboardQuery.isError ? (
        <p className="mt-4 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Dashboard data could not be loaded.
        </p>
      ) : null}
    </AppShell>
  );
}

const fallbackSummary: DashboardSummaryItem[] = [
  { label: "Pending approvals", value: 0, caption: "Needs workflow attention" },
  { label: "Active RFQs", value: 0, caption: "Open procurement work" },
  { label: "Purchase orders", value: 0, caption: "Issued procurement documents" },
  { label: "Invoices", value: 0, caption: "Generated invoice records" }
];

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  isLoading
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof ShieldCheck;
  isLoading: boolean;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-normal">
            {isLoading ? "..." : compactNumber.format(value)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-secondary p-2 text-secondary-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
    </article>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card">
      <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DocumentTable({
  items,
  isLoading,
  emptyText,
  type
}: {
  items: DashboardDocument[];
  isLoading: boolean;
  emptyText: string;
  type: "purchase-order" | "invoice";
}) {
  if (isLoading) {
    return <SkeletonRows />;
  }

  if (!items.length) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-secondary text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Document</th>
            <th className="px-4 py-3 font-medium">{type === "purchase-order" ? "Vendor" : "PO"}</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <p className="font-medium">{item.number}</p>
                <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {type === "purchase-order" ? item.vendorName : item.purchaseOrderNumber}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-right font-medium">{currency.format(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpendChart({ items, isLoading }: { items: MonthlySpend[]; isLoading: boolean }) {
  if (isLoading) {
    return <SkeletonRows />;
  }

  if (!items.length) {
    return <EmptyState text="No spend data yet." />;
  }

  const maxSpend = Math.max(...items.map((item) => item.spend), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 text-sm" key={item.month}>
          <span className="text-muted-foreground">{item.month}</span>
          <div className="h-3 overflow-hidden rounded-sm bg-secondary">
            <div
              className="h-full rounded-sm bg-primary"
              style={{ width: `${Math.max((item.spend / maxSpend) * 100, 8)}%` }}
            />
          </div>
          <span className="text-right font-medium">{currency.format(item.spend)}</span>
        </div>
      ))}
    </div>
  );
}

function NotificationList({
  items,
  isLoading
}: {
  items: DashboardNotification[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <SkeletonRows />;
  }

  if (!items.length) {
    return <EmptyState text="No alerts for this role." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="rounded-md border border-border bg-background p-3" key={item.id}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-md border border-border bg-card p-1.5">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.date)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityList({ items, isLoading }: { items: DashboardActivity[]; isLoading: boolean }) {
  if (isLoading) {
    return <SkeletonRows />;
  }

  if (!items.length) {
    return <EmptyState text="No activity yet." />;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="flex gap-3" key={item.id}>
          <div className="mt-1 h-2 w-2 rounded-full bg-accent" />
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.message}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.actorName ?? "System"} · {formatDate(item.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.replaceAll("_", " ").toLowerCase();
  const isPositive = ["APPROVED", "ISSUED", "SENT", "PAID", "FULFILLED", "ACKNOWLEDGED"].includes(status);

  return (
    <span
      className={[
        "inline-flex min-h-7 items-center rounded-md border px-2 py-1 text-xs font-medium capitalize",
        isPositive
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-accent/30 bg-accent/10 text-foreground"
      ].join(" ")}
    >
      {normalized}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div className="h-12 rounded-md bg-secondary" key={item} />
      ))}
    </div>
  );
}

function RoleModulePage({ title, icon: Icon }: { title: string; icon: typeof Store }) {
  return (
    <AppShell title={title} eyebrow="Module">
      <section className="rounded-md border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md border border-border bg-secondary p-2 text-secondary-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-normal">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This protected workflow is ready for the next implementation step.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function quickActions(role: Role) {
  if (role === "ADMIN") {
    return [
      { title: "Review vendors", caption: "Manage vendor status", path: "/admin/vendors", icon: Store },
      { title: "Open reports", caption: "Track procurement spend", path: "/reports", icon: BarChart3 },
      { title: "Audit activity", caption: "Monitor workflow events", path: "/activity", icon: Activity }
    ];
  }

  if (role === "PROCUREMENT_OFFICER") {
    return [
      { title: "Create RFQ", caption: "Start a procurement request", path: "/procurement/rfqs", icon: Plus },
      { title: "Compare quotes", caption: "Move selected vendors forward", path: "/procurement/rfqs", icon: CheckCircle2 },
      { title: "Generate invoice", caption: "Prepare billing documents", path: "/procurement/invoices", icon: FileText }
    ];
  }

  if (role === "MANAGER") {
    return [
      { title: "Review approvals", caption: "Approve or reject requests", path: "/approvals", icon: ShieldCheck },
      { title: "Check activity", caption: "See recent procurement updates", path: "/activity", icon: Activity },
      { title: "View RFQ status", caption: "Monitor active workflows", path: "/", icon: ClipboardList }
    ];
  }

  return [
    { title: "View RFQs", caption: "Open assigned requests", path: "/vendor/rfqs", icon: ClipboardList },
    { title: "Submit quotation", caption: "Respond to procurement teams", path: "/vendor/rfqs", icon: IndianRupee },
    { title: "Track orders", caption: "Follow issued purchase orders", path: "/", icon: PackageCheck }
  ];
}

function primaryAction(role: Role) {
  return quickActions(role)[0];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
