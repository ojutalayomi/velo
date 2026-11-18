import UsersAdmin from "./UsersAdmin";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Admin · Users</h1>
      <UsersAdmin />
    </div>
  );
}
