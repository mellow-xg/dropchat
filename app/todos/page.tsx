import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function TodosPage() {
  const supabase = createClient(await cookies());
  const { data: verifiedToken } = await supabase.auth.getClaims();
  const claims = verifiedToken?.claims;

  if (!claims?.sub) redirect("/");

  const { data: todos, error } = await supabase.from("todos").select("id, name");

  if (error) {
    return <p className="p-6 text-sm text-red-700">Could not load todos.</p>;
  }

  return (
    <main className="min-h-dvh bg-zinc-950 p-6 text-zinc-100">
      <h1 className="mb-4 text-xl font-semibold">Todos</h1>
      <ul className="list-disc space-y-2 pl-5">
        {todos?.map((todo) => <li key={todo.id}>{todo.name}</li>)}
      </ul>
    </main>
  );
}

