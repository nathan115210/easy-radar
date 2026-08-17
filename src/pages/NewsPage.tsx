import { Pagination, SegmentedControl, Stack, Tabs, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { getNews } from "../api/client.js";
import { CollectionStatusAlert } from "../components/CollectionStatusAlert.js";
import { NewsCard } from "../components/NewsCard.js";
import { CATEGORIES, CATEGORY_LABELS } from "../domain/category-labels.js";
import type { Category, NewsStateFilter } from "../../shared/schemas/index.js";

const route = getRouteApi("/");

/**
 * Main page (PRD §6.1), in layout order: collection status alert, category
 * tabs, state filter, news cards, pagination, and a fixed "Finish reading"
 * button. #17 owns the tabs, filter, pagination, and the URL state
 * (category/state/page) they read and write; #18 owns the news card
 * itself (`NewsCard`); #19 owns the alert (`CollectionStatusAlert`). The
 * finish-reading button (#21) is built in its own issue and only has its
 * layout slot reserved here.
 */
export function NewsPage() {
  const { category, state, page } = route.useSearch();
  const navigate = route.useNavigate();

  const queryKey = ["news", category, state, page];
  const { data, isPending, isError } = useQuery({
    queryKey,
    queryFn: () => getNews({ category, state, page }),
  });

  function setCategory(next: string | null) {
    if (next === null) return;
    void navigate({
      search: (prev) => ({ ...prev, category: next as Category, page: 1 }),
    });
  }

  function setState(next: string) {
    void navigate({
      search: (prev) => ({ ...prev, state: next as NewsStateFilter, page: 1 }),
    });
  }

  function setPage(next: number) {
    void navigate({ search: (prev) => ({ ...prev, page: next }) });
  }

  const counts = data?.counts;

  return (
    <Stack gap="md" p="md">
      <Title order={1}>News</Title>

      <CollectionStatusAlert />

      <Tabs value={category} onChange={setCategory}>
        <Tabs.List>
          {CATEGORIES.map((c) => (
            <Tabs.Tab key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <SegmentedControl
        value={state}
        onChange={setState}
        data={[
          { value: "all", label: `All (${counts?.all ?? 0})` },
          { value: "unread", label: `Unread (${counts?.unread ?? 0})` },
          { value: "read", label: `Read (${counts?.read ?? 0})` },
        ]}
      />

      {isError && <Text c="red">Failed to load news.</Text>}
      {isPending && <Text c="dimmed">Loading…</Text>}

      {data && (
        <Stack gap="xs">
          {data.items.length === 0 && <Text c="dimmed">No items.</Text>}
          {data.items.map((item) => (
            <NewsCard key={item.id} item={item} queryKey={queryKey} />
          ))}
        </Stack>
      )}

      {data && data.totalPages > 1 && (
        <Pagination value={data.page} onChange={setPage} total={data.totalPages} />
      )}

      {/* Fixed "Finish reading" button lands in #21. */}
    </Stack>
  );
}
