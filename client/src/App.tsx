import {
  Activity,
  ArrowRight,
  BarChart3,
  ClipboardList,
  FileText,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Store,
  UserPlus,
  Users
} from "lucide-react";
import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthProvider, type Role, useAuth } from "./auth/auth-context";
import { ProtectedRoute } from "./auth/ProtectedRoute";

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

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<WorkspacePage />} />
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
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

function WorkspacePage() {
  const { user, logout } = useAuth();
  const accessibleModules = useMemo(
    () => modules.filter((module) => user && module.roles.includes(user.role)),
    [user]
  );

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-card">
        <div className="mx-auto flex min-h-24 max-w-7xl flex-col justify-center gap-4 px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">VendorBridge</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">Workspace</h1>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium"
              onClick={() => void logout()}
              type="button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Signed in as {user.name} with {roleLabels[user.role]} access.
              </p>
            </div>
            <div className="rounded-md border border-border bg-background px-4 py-3 text-sm font-medium">
              {user.email}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <nav className="flex flex-wrap gap-2">
          {accessibleModules.map((module) => (
            <NavLink
              key={module.path}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              to={module.path}
            >
              {module.title}
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-8 md:grid-cols-2 xl:grid-cols-3">
        {accessibleModules.map((module) => {
          const Icon = module.icon;

          return (
            <Link key={module.title} className="rounded-md border border-border bg-card p-5" to={module.path}>
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
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}

function RoleModulePage({ title, icon: Icon }: { title: string; icon: typeof Store }) {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link className="text-sm font-medium text-primary" to="/">
            VendorBridge
          </Link>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-start gap-4 rounded-md border border-border bg-card p-5">
          <div className="rounded-md border border-border bg-secondary p-2 text-secondary-foreground">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{user ? roleLabels[user.role] : ""}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              This route is protected and ready for the next workflow step.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
