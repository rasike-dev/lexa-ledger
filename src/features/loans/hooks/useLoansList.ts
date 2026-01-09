import { useQuery } from "@tanstack/react-query";
import { fetchLoansHttp } from "../services/httpLoansApi";

export function useLoansList() {
  return useQuery({
    queryKey: ["loansList"],
    queryFn: fetchLoansHttp,
  });
}

