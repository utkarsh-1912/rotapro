
import { AppLayout } from "@/components/app-layout";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
