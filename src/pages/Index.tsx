import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function IndexPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("users").select("*");
      if (error) console.error("Error fetching users:", error);
      else setUsers(data);
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h1>Test Users from Supabase</h1>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.name} ({u.role})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default IndexPage;
