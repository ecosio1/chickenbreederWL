import Link from "next/link";
import { Button } from "../../src/ui/button";

export default function NotFoundPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-black/70">The page you’re looking for doesn’t exist.</p>
      <Link href="/">
        <Button variant="secondary">Go home</Button>
      </Link>
    </div>
  );
}
