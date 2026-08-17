import { Affix, Alert, Button, Stack } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { finishReading } from "../api/client.js";
import { UNCOMMITTED_CHANGES_QUERY_KEY } from "../domain/uncommitted-changes.js";

/**
 * The fixed bottom-right `Finish reading` button (PRD §6.1, §6.3). Success
 * and failure are both reported inline, right here — there is no pull
 * request and no redirect, so the session simply stays on this page
 * either way. A failure never resets `hasUncommittedChanges`: the local
 * files are already untouched by the server's fail-closed contract
 * (#20/#21), and the UI must not pretend otherwise.
 */
export function FinishReadingButton() {
  const queryClient = useQueryClient();
  const { data: hasUncommittedChanges } = useQuery({
    queryKey: UNCOMMITTED_CHANGES_QUERY_KEY,
    queryFn: () => false,
    initialData: false,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: finishReading,
    onSuccess: (data) => {
      queryClient.setQueryData(UNCOMMITTED_CHANGES_QUERY_KEY, data.hasUncommittedChanges);
    },
  });

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUncommittedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUncommittedChanges]);

  return (
    <Affix position={{ bottom: 20, right: 20 }}>
      <Stack gap="xs" align="flex-end">
        {mutation.isSuccess && (
          <Alert role="alert" color="accent" variant="filled" title="Finished reading">
            {mutation.data.committed
              ? "Your reading state was committed and pushed."
              : "Nothing to push — you're already up to date."}
          </Alert>
        )}
        {mutation.isError && (
          <Alert role="alert" color="warning" variant="filled" title="Finish reading failed">
            {mutation.error.message}
          </Alert>
        )}
        <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
          Finish reading
        </Button>
      </Stack>
    </Affix>
  );
}
