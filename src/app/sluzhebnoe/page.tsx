import type { Metadata } from "next";
import { AdminView } from "@/components/shop/AdminView";

export const metadata: Metadata = {
  title: "Панель управления — TBS Inform",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AdminView />;
}
