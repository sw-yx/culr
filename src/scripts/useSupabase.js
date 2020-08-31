import React from "react";

// Create a single supabase client for interacting with your database
let supabase = null;

async function getSupabase() {
  console.log({ supabase });
  if (supabase) return supabase;
  const { createClient } = await import("@supabase/supabase-js");
  supabase = createClient(
    "https://prbbdrccikgqlammpkuh.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTU5ODkwNzc0NSwiZXhwIjoxOTE0NDgzNzQ1fQ.pnOVs512fcNZEk2RhmT0hAKJd6SwEXc0ZXVqdNxYswM"
  );
  console.log(2, { supabase });
  return supabase;
}

export function useSupabase() {
  const [_user, setUser] = useLocalStorage("user", null);
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    (async function () {
      if (!_user) return;
      let { body: search_history } = await (await getSupabase())
        .from("search_history")
        .select("*")
        .eq("name", _user.id);
      setHistory(search_history.map((x) => x.data));
    })();
  }, [_user]);

  async function createUser(email, pw) {
    const {
      body: { user },
    } = await (await getSupabase()).auth.signup(email, pw);
    setUser(user);
  }

  async function loginUser(email, pw) {
    const {
      body: { user },
    } = await (await getSupabase()).auth.login(email, pw);

    setUser(user);
  }

  async function logout() {
    await (await getSupabase()).auth.logout();
    setUser(null);
    setHistory([]);
  }

  async function deleteRow(keyword) {
    let deleted = await (await getSupabase())
      .from("search_history")
      .delete()
      .eq("name", _user.id)
      .eq("data", JSON.stringify(keyword));
    setHistory(history.filter((x) => x !== keyword));
  }

  async function addHistory(keyword) {
    const newHistory = [...history, keyword];
    await (await getSupabase())
      .from("search_history")
      .insert([{ name: _user.id, data: keyword }]);
    setHistory(newHistory);
  }
  return {
    createUser,
    deleteRow,
    loginUser,
    addHistory,
    history,
    logout,
    user: _user,
  };
}

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}
