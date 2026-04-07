import { DataProvider } from "@refinedev/core";
import { supabase } from "../../app/libs/supabaseClient";

export const dataProvider: DataProvider = {
  getApiUrl: () => {
    return "";
  },

 getList: async ({ resource, pagination }) => {
  const { currentPage = 1, pageSize = 10 } = pagination ?? {};

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from(resource)
    .select("*", { count: "exact" })
    .range(from, to);

  if (error) throw error;

  return {
    data,
    total: count || 0,
  };
},

  getOne: async ({ resource, id }) => {
    const { data, error } = await supabase
      .from(resource)
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data, error } = await supabase
      .from(resource)
      .insert(variables as any)
      .select()
      .single();

    if (error) throw error;

    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data, error } = await supabase
      .from(resource)
      .update(variables as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data, error } = await supabase
      .from(resource)
      .delete()
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return { data };
  },
};
