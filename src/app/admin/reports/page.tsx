import ReportsQueue from "./ReportsQueue";

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Reports</h1>
      <ReportsQueue />
    </div>
  );
}
