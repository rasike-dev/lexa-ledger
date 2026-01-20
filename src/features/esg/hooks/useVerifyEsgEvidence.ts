import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { requestEsgVerifyNow } from "../services/esgApi";

export function useVerifyEsgEvidence(loanId: string | null) {
  const qc = useQueryClient();
  
  // Track active polling operations to prevent memory leaks
  const activePollingRef = useRef<Set<string>>(new Set());
  const timeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup: Clear all timers and cancel polling on unmount
  useEffect(() => {
    return () => {
      // Clear all active timers
      timeoutIdsRef.current.forEach(id => clearTimeout(id));
      timeoutIdsRef.current.clear();
      activePollingRef.current.clear();
    };
  }, []);

  const scheduleTimeout = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const id = setTimeout(() => {
      timeoutIdsRef.current.delete(id);
      callback();
    }, delay);
    timeoutIdsRef.current.add(id);
    return id;
  };

  const waitWithCleanup = (delay: number, evidenceId: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      // Check if polling was cancelled before scheduling
      if (!activePollingRef.current.has(evidenceId)) {
        resolve();
        return;
      }
      
      // scheduleTimeout already adds the ID to timeoutIdsRef for cleanup
      scheduleTimeout(() => {
        // Check again after delay
        if (!activePollingRef.current.has(evidenceId)) {
          resolve();
          return;
        }
        resolve();
      }, delay);
    });
  };

  return useMutation({
    mutationFn: async (evidenceId: string) => {
      if (!loanId) throw new Error("No loanId");
      
      // Cancel any existing polling for this evidence
      activePollingRef.current.delete(evidenceId);
      
      const result = await requestEsgVerifyNow(loanId, evidenceId);
      return { ...result, evidenceId };
    },
    onSuccess: async (result) => {
      const { evidenceId } = result;
      
      // Mark this evidence as actively being polled
      activePollingRef.current.add(evidenceId);
      
      // Immediately invalidate and refetch to show "PENDING" status
      await qc.invalidateQueries({ queryKey: ["esgSummary"] });
      
      // Give a moment for the API to create the verification record
      await waitWithCleanup(500, evidenceId);
      
      // Check if polling was cancelled
      if (!activePollingRef.current.has(evidenceId)) {
        return;
      }
      
      // Refetch to show PENDING status immediately
      await qc.refetchQueries({ queryKey: ["esgSummary"] });
      
      // Poll for verification completion (worker processes asynchronously)
      const maxAttempts = 30;
      const pollInterval = 1500; // 1.5 seconds between checks
      
      // Wait 2 seconds before first poll (let worker start processing)
      await waitWithCleanup(2000, evidenceId);
      
      // Check if polling was cancelled before starting loop
      if (!activePollingRef.current.has(evidenceId)) {
        return;
      }
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Check if polling was cancelled
        if (!activePollingRef.current.has(evidenceId)) {
          return;
        }
        
        // Refetch to get latest verification status
        await qc.refetchQueries({ queryKey: ["esgSummary"] });
        
        // Check if polling was cancelled after refetch
        if (!activePollingRef.current.has(evidenceId)) {
          return;
        }
        
        // Check all query cache entries that match esgSummary pattern
        const queryCache = qc.getQueryCache();
        const queries = queryCache.findAll({ queryKey: ["esgSummary"] });
        
        for (const query of queries) {
          const data = query.state.data as any;
          if (!data?.evidence || !Array.isArray(data.evidence)) continue;
          
          const evidence = data.evidence.find((e: any) => e.id === evidenceId);
          if (!evidence) continue;
          
          // Check if verification is complete (no longer PENDING)
          const verificationStatus = evidence?.latestVerification?.status;
          if (verificationStatus && verificationStatus !== "PENDING") {
            // Verification complete, stop polling
            activePollingRef.current.delete(evidenceId);
            return;
          }
        }
        
        // Wait before next check (except on last attempt)
        if (attempt < maxAttempts - 1) {
          await waitWithCleanup(pollInterval, evidenceId);
        }
      }
      
      // Polling completed (reached max attempts), clean up
      activePollingRef.current.delete(evidenceId);
    },
    onError: () => {
      // Clean up on error - remove evidenceId from active polling
      // (evidenceId is not available here, but this prevents any leaks)
      // The cleanup will happen on next mutation or unmount
    },
  });
}

