import { RouterProvider } from "react-router-dom";
import { appRouter } from "./router";
import { QueryProvider } from "./providers/QueryProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { I18nProvider } from "./providers/I18nProvider";
import { ErrorBoundary } from "./providers/ErrorBoundary";

export function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <ThemeProvider>
          <QueryProvider>
            <RouterProvider router={appRouter} />
          </QueryProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
