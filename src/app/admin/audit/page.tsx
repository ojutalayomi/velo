import AuditLog from "./AuditLog";

export default function AuditPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Audit log</h1>
      <AuditLog />
    </div>
  );
}
