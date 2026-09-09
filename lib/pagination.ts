interface PageResult<T, E> {
  data: T[] | null;
  error: E | null;
}

/** Fetch every API page; never return a partial export as a success. */
export async function collectPages<T, E>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T, E>>,
  pageSize = 500,
): Promise<PageResult<T, E>> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('Invalid page size');
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return { data: rows, error: null };
  }
}
