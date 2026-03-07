import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({ message = "Gagal memuat data. Silakan coba lagi.", onRetry }: QueryErrorProps) {
  return (
    <Card data-testid="query-error">
      <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-md bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md" data-testid="text-error-message">{message}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} data-testid="button-retry">
            Coba Lagi
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
