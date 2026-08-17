import { Stack, Text, Title } from "@mantine/core";

/**
 * Placeholder for the main page (PRD §6.1). Category tabs, state filter,
 * news cards, and pagination are built in #17-#19; this issue is only
 * responsible for the routed shell and typed search params reaching here.
 */
export function NewsPage() {
  return (
    <Stack gap="xs" p="md">
      <Title order={1}>News</Title>
      <Text c="dimmed">Category tabs, news cards, and pagination land in later issues.</Text>
    </Stack>
  );
}
