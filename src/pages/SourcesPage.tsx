import { Stack, Text, Title } from "@mantine/core";

/**
 * Placeholder for the read-only Sources page (PRD §6.4); the real listing
 * is built in #25.
 */
export function SourcesPage() {
  return (
    <Stack gap="xs" p="md">
      <Title order={1}>Sources</Title>
      <Text c="dimmed">The source inventory listing lands in a later issue.</Text>
    </Stack>
  );
}
